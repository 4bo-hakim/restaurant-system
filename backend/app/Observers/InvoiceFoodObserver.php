<?php

namespace App\Observers;

use App\Models\InvoiceFood;

class InvoiceFoodObserver
{
    /**
     * Handle the InvoiceFood "saved" event.
     */
    public function saved(InvoiceFood $invoiceFood): void
    {
        $this->recalculateInvoiceTotal($invoiceFood->invoice_id);
    }

    /**
     * Handle the InvoiceFood "deleted" event.
     */
    public function deleted(InvoiceFood $invoiceFood): void
    {
        $this->recalculateInvoiceTotal($invoiceFood->invoice_id);
    }

    /**
     * Recalculate the invoice total.
     */
    private function recalculateInvoiceTotal(int $invoiceId): void
    {
        $invoice = \App\Models\Invoice::find($invoiceId);

        if (!$invoice) {
            return;
        }

        $total = $invoice->invoiceFoods()
            ->where('status', '!=', 'cancelled')
            ->get()
            ->sum(function ($item) {
                return $item->unit_price * $item->quantity;
            });

        $total -= $invoice->discount ?? 0;
        $total = max(0, $total); // Ensure total is not negative

        $invoice->update(['total' => $total]);
    }
}
