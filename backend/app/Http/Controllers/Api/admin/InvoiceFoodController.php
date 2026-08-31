<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
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

    public function update(Request $request, $invoiceId, $foodItemId)
    {
        $invoice = Invoice::find($invoiceId);

        if (!$invoice) {
            return $this->error('Invoice not found', 404);
        }

        $invoiceFood = InvoiceFood::where('invoice_id', $invoiceId)
            ->where('id', $foodItemId)
            ->first();

        if (!$invoiceFood) {
            return $this->error('Invoice item not found', 404);
        }

        $validated = $request->validate([
            'quantity' => 'sometimes|integer|min:1',
            'status' => 'sometimes|string|in:pending,cancelled',
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

        $invoiceFood = InvoiceFood::where('invoice_id', $invoiceId)
            ->where('id', $foodItemId)
            ->first();

        if (!$invoiceFood) {
            return $this->error('Invoice item not found', 404);
        }

        // Soft delete by changing status to cancelled
        $invoiceFood->update(['status' => 'cancelled']);

        return $this->success(null, 'Invoice item cancelled successfully');
    }
}
