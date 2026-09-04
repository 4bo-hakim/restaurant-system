<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\InvoiceRequest;
use App\Models\Food;
use App\Models\Invoice;
use App\Models\InvoiceFood;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;

class InvoiceController extends Controller
{
    public function index()
    {
        $invoices = Invoice::with(['table', 'invoiceFoods.food'])->get();

        return $this->success($invoices, 'Invoices retrieved successfully');
    }

    public function show($id)
    {
        $invoice = Invoice::with(['table', 'invoiceFoods.food'])->find($id);

        if (!$invoice) {
            return $this->error('Invoice not found', 404);
        }

        return $this->success($invoice, 'Invoice retrieved successfully');
    }

    public function store(InvoiceRequest $request)
    {
        $validated = $request->validated();

        return DB::transaction(function () use ($validated) {
            $table_id = $validated['table_id'];

            // Lock to prevent race conditions
            $tableCheck = DB::table('invoices')
                ->where('table_id', $table_id)
                ->where('status', 'pending')
                ->lockForUpdate()
                ->first();

            if ($tableCheck) {
                return $this->error('An active invoice already exists for this table', 409);
            }

            $invoice = Invoice::create([
                'table_id' => $table_id,
                'created_by' => auth()->id(),
                'status' => 'pending',
                'discount' => $validated['discount'] ?? 0,
                'total' => 0,
            ]);

            // Create invoice items if provided
            if (!empty($validated['items'])) {
                foreach ($validated['items'] as $item) {
                    $food = Food::find($item['food_id']);

                    if (!$food || !$food->is_available) {
                        throw new \Exception('Food item not available: ' . $item['food_id']);
                    }

                    InvoiceFood::create([
                        'invoice_id' => $invoice->id,
                        'food_id' => $item['food_id'],
                        'person_number' => $item['person_number'],
                        'quantity' => $item['quantity'],
                        'unit_price' => $food->price,
                        'status' => 'pending',
                        'note' => $item['note'] ?? null,
                    ]);
                }
            }

            return $this->success($invoice->load(['table', 'invoiceFoods.food']), 'Invoice created successfully', 201);
        });
    }

    public function printBill($id)
    {
        $invoice = Invoice::with(['table', 'creator', 'invoiceFoods.food'])->find($id);

        if (!$invoice) {
            return $this->error('Invoice not found', 404);
        }

        $people = $invoice->invoiceFoods
            ->where('status', '!=', 'cancelled')
            ->groupBy('person_number')
            ->map(function ($items, $personNumber) {
                return [
                    'person_number' => (int) $personNumber,
                    'items' => $items->map(function ($item) {
                        return [
                            'food_name' => $item->food->name,
                            'quantity' => $item->quantity,
                            'unit_price' => $item->unit_price,
                            'line_total' => $item->unit_price * $item->quantity,
                        ];
                    })->values(),
                    'person_subtotal' => $items->sum(function ($item) {
                        return $item->unit_price * $item->quantity;
                    }),
                ];
            })->values();

        $subtotal = $people->sum('person_subtotal');

        return $this->success([
            'invoice_id' => $invoice->id,
            'table_number' => $invoice->table->table_number,
            'created_at' => $invoice->created_at,
            'served_by' => $invoice->creator?->name ?? 'QR Order',
            'people' => $people,
            'subtotal' => $subtotal,
            'discount' => $invoice->discount,
            'total' => $invoice->total,
            'status' => $invoice->status,
        ], 'Bill retrieved successfully');
    }

    public function update(InvoiceRequest $request, $id)
    {
        $invoice = Invoice::find($id);

        if (!$invoice) {
            return $this->error('Invoice not found', 404);
        }

        $validated = $request->validated();
        $discountChanged = isset($validated['discount']) && $validated['discount'] != $invoice->discount;

        $invoice->update($validated);

        // Recalculate total if discount changed
        if ($discountChanged) {
            $this->recalculateInvoiceTotal($invoice);
        }

        return $this->success($invoice->load(['table', 'invoiceFoods.food']), 'Invoice updated successfully');
    }

    public function destroy($id)
    {
        $invoice = Invoice::find($id);

        if (!$invoice) {
            return $this->error('Invoice not found', 404);
        }

        try {
            $invoice->delete();
        } catch (QueryException $e) {
            if ($e->getCode() == '23000') {
                return $this->error('Cannot delete invoice with existing items', 409);
            }
            throw $e;
        }

        return $this->success(null, 'Invoice deleted successfully');
    }

    /**
     * Recalculate invoice total based on invoice_food items.
     */
    private function recalculateInvoiceTotal(Invoice $invoice): void
    {
        $total = $invoice->invoiceFoods()
            ->where('status', '!=', 'cancelled')
            ->get()
            ->sum(function ($item) {
                return $item->unit_price * $item->quantity;
            });

        $total -= $invoice->discount ?? 0;
        $total = max(0, $total);

        $invoice->update(['total' => $total]);
    }
}
