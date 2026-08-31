<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Food;
use App\Models\Invoice;
use App\Models\InvoiceFood;
use Illuminate\Http\Request;

class InvoiceFoodController extends Controller
{
    public function index($invoiceId)
    {
        $invoice = Invoice::find($invoiceId);

        if (!$invoice) {
            return $this->error('Invoice not found', 404);
        }

        $invoiceFoods = InvoiceFood::where('invoice_id', $invoiceId)
            ->with('food')
            ->get();

        return $this->success($invoiceFoods, 'Invoice items retrieved successfully');
    }

    public function store(Request $request, $invoiceId)
    {
        $invoice = Invoice::find($invoiceId);

        if (!$invoice) {
            return $this->error('Invoice not found', 404);
        }

        if ($invoice->status !== 'pending') {
            return $this->error('Cannot add items to a completed or cancelled invoice', 409);
        }

        $validated = $request->validate([
            'food_id' => 'required|integer|exists:foods,id',
            'person_number' => 'required|integer|min:1|max:8',
            'quantity' => 'required|integer|min:1',
            'note' => 'nullable|string',
        ]);

        $food = Food::find($validated['food_id']);

        if (!$food || !$food->is_available) {
            return $this->error('This food item is currently unavailable', 409);
        }

        $existingInvoiceFood = InvoiceFood::where('invoice_id', $invoice->id)
            ->where('food_id', $food->id)
            ->where('person_number', $validated['person_number'])
            ->whereIn('status', ['pending', 'preparing', 'ready', 'served'])
            ->first();

        if ($existingInvoiceFood) {
            $existingInvoiceFood->quantity += $validated['quantity'];
            $existingInvoiceFood->note = $validated['note'] ?? $existingInvoiceFood->note;
            $existingInvoiceFood->save();

            return $this->success($existingInvoiceFood->fresh()->load('food'), 'Invoice item updated successfully');
        }

        $invoiceFood = InvoiceFood::create([
            'invoice_id' => $invoice->id,
            'food_id' => $food->id,
            'person_number' => $validated['person_number'],
            'quantity' => $validated['quantity'],
            'unit_price' => $food->price,
            'status' => 'pending',
            'note' => $validated['note'] ?? null,
        ]);

        return $this->success($invoiceFood->load('food'), 'Item added to invoice successfully', 201);
    }

    public function update(Request $request, $invoiceId, $foodItemId)
    {
        $invoice = Invoice::find($invoiceId);

        if (!$invoice) {
            return $this->error('Invoice not found', 404);
        }

        if ($invoice->status !== 'pending') {
            return $this->error('Cannot modify items on a completed or cancelled invoice', 409);
        }

        $invoiceFood = InvoiceFood::where('invoice_id', $invoiceId)
            ->where('id', $foodItemId)
            ->first();

        if (!$invoiceFood) {
            return $this->error('Invoice item not found', 404);
        }

        $validated = $request->validate([
            'quantity' => 'sometimes|integer|min:1',
            'status' => 'sometimes|string|in:pending,preparing,ready,served,cancelled',
            'note' => 'nullable|string',
        ]);

        $invoiceFood->update($validated);

        return $this->success($invoiceFood->load('food'), 'Invoice item updated successfully');
    }

    public function destroy($invoiceId, $foodItemId)
    {
        $invoice = Invoice::find($invoiceId);

        if (!$invoice) {
            return $this->error('Invoice not found', 404);
        }

        if ($invoice->status !== 'pending') {
            return $this->error('Cannot modify items on a completed or cancelled invoice', 409);
        }

        $invoiceFood = InvoiceFood::where('invoice_id', $invoiceId)
            ->where('id', $foodItemId)
            ->first();

        if (!$invoiceFood) {
            return $this->error('Invoice item not found', 404);
        }

        $invoiceFood->update(['status' => 'cancelled']);

        return $this->success(null, 'Invoice item cancelled successfully');
    }
}
