<?php

namespace App\Services;

use App\Models\Invoice;
use App\Models\Payment;
use App\Models\PurchaseOrder;
use App\Models\SystemSetting;
use App\Support\FileStorage;

/**
 * Resolves the per-category communication channel and delivers documents over
 * WhatsApp. PDFs are uploaded to the (private) uploads disk and sent as a media
 * link — the signed URL lets WhatsApp fetch them without making the bucket public.
 */
class CommunicationService
{
    public function __construct(
        private WhatsAppService $whatsapp,
        private InvoiceService $invoices,
        private PaymentService $payments
    ) {}

    private function money($v): string
    {
        return '$' . number_format((float) $v, 2);
    }

    /** 'email' | 'whatsapp' | 'both' for a category: invoicing, receipts, notices. */
    public function channelFor(string $category): string
    {
        return SystemSetting::get("comm_channel_{$category}", 'email');
    }

    public function wantsWhatsapp(string $category): bool
    {
        return in_array($this->channelFor($category), ['whatsapp', 'both'], true);
    }

    public function wantsEmail(string $category): bool
    {
        return in_array($this->channelFor($category), ['email', 'both'], true);
    }

    /**
     * Send an invoice over WhatsApp using the `invoice_issued` template (§21.4.1).
     * Header: Document (invoice PDF). Body {{1}}=client, {{2}}=invoice code,
     * {{3}}=amount due, {{4}}=due date.
     */
    public function whatsappInvoice(Invoice $invoice): bool
    {
        $phone = $invoice->bill_to_phone ?: $invoice->tenant?->phone;
        if (!$phone) {
            throw new \RuntimeException('No phone number on this invoice to send to.');
        }

        $url = FileStorage::url(FileStorage::putContents("invoices/sent/{$invoice->invoice_code}.pdf", $this->invoices->generatePdf($invoice)));

        return $this->whatsapp->sendTemplate($phone, 'invoice_issued', [
            $invoice->billToName(),
            $invoice->invoice_code,
            $this->money($invoice->balanceDue()),
            $invoice->due_date?->format('d M Y') ?? '—',
        ], $url, "{$invoice->invoice_code}.pdf");
    }

    /**
     * Send a Purchase Order to its vendor using the `purchase_order` template.
     * Header: Document (PO PDF). Body {{1}}=vendor, {{2}}=PO code, {{3}}=date, {{4}}=total.
     */
    public function whatsappPurchaseOrder(PurchaseOrder $po, string $pdfBytes): bool
    {
        $phone = $po->vendor?->phone;
        if (!$phone) {
            throw new \RuntimeException('This vendor has no phone number on file.');
        }

        $url = FileStorage::url(FileStorage::putContents("purchase-orders/sent/{$po->po_code}.pdf", $pdfBytes));

        return $this->whatsapp->sendTemplate($phone, 'purchase_order', [
            $po->vendor->name,
            $po->po_code,
            $po->order_date?->format('d M Y') ?? '—',
            $this->money($po->total_estimated_amount),
        ], $url, "{$po->po_code}.pdf");
    }

    /**
     * Send a payment receipt using the `payment_receipt` template.
     * Header: Document (voucher PDF). Body {{1}}=payer, {{2}}=amount, {{3}}=date, {{4}}=reference.
     */
    public function whatsappReceipt(Payment $payment): bool
    {
        $invoice = $payment->invoice;
        $phone   = $invoice?->bill_to_phone ?: $invoice?->tenant?->phone;
        if (!$phone) {
            throw new \RuntimeException('No phone number on the related invoice to send the receipt to.');
        }

        $url = FileStorage::url(FileStorage::putContents("receipts/sent/{$payment->payment_code}.pdf", $this->payments->voucherPdf($payment)));

        return $this->whatsapp->sendTemplate($phone, 'payment_receipt', [
            $invoice?->billToName() ?? 'Customer',
            $this->money($payment->amount),
            $payment->payment_date?->format('d M Y') ?? '—',
            $payment->reference_number ?: $payment->payment_code,
        ], $url, "{$payment->payment_code}.pdf");
    }
}
