<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\SecurityDeposit;
use App\Services\AuditService;
use App\Services\PaymentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class PaymentController extends Controller
{
    public function __construct(
        private PaymentService $paymentService,
        private AuditService $auditService
    ) {}

    public function index(Request $request): JsonResponse
    {
        $query = Payment::with(['invoice', 'vendorBill', 'account', 'createdBy']);

        if ($request->filled('type')) {
            $query->where('type', $request->input('type'));
        }
        if ($request->filled('method')) {
            $query->where('payment_method', $request->input('method'));
        }
        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where('payment_code', 'like', "%$search%")
                  ->orWhere('reference_number', 'like', "%$search%");
        }

        $paginator = $query->latest('payment_date')->latest('id')->paginate(25);

        $paginator->getCollection()->transform(fn ($p) => [
            'id'             => $p->id,
            'payment_code'   => $p->payment_code,
            'type'           => $p->type,
            'invoice_code'   => $p->invoice?->invoice_code,
            'vendor_bill_code' => $p->vendorBill?->bill_code,
            'document_code'  => $p->invoice?->invoice_code ?? $p->vendorBill?->bill_code,
            'amount'         => $p->amount,
            'payment_date'   => $p->payment_date?->toDateString(),
            'payment_method' => $p->payment_method,
            'account_name'   => $p->account?->name,
            'reference'      => $p->reference_number,
            'recorded_by'    => $p->createdBy?->name,
        ]);

        return response()->json($paginator);
    }

    public function recordForInvoice(Request $request, Invoice $invoice): JsonResponse
    {
        $request->validate([
            'amount'           => 'required|numeric|min:0.01',
            'payment_date'     => 'required|date',
            'payment_method'   => 'required|in:edahab,zaad,bank_transfer,cheque,cash',
            'account_id'       => 'required|exists:accounts,id',
            'reference_number' => 'nullable|string|max:100',
            'notes'            => 'nullable|string',
        ]);

        try {
            $payment = $this->paymentService->recordCustomerReceipt($invoice, $request->all(), Auth::user());
            $this->auditService->log('created', Payment::class, (int) $payment->id, null, $payment->toArray());

            // Send a receipt over WhatsApp if the Receipts channel includes it (best-effort).
            $comm = app(\App\Services\CommunicationService::class);
            if ($comm->wantsWhatsapp('receipts') && ($invoice->bill_to_phone || $invoice->tenant?->phone)) {
                try { $comm->whatsappReceipt($payment->fresh('invoice')); }
                catch (\Throwable $e) { \Illuminate\Support\Facades\Log::warning('WhatsApp receipt failed', ['payment' => $payment->id, 'error' => $e->getMessage()]); }
            }

            return response()->json([
                'message' => 'Payment recorded.',
                'payment' => $payment,
                'invoice' => [
                    'status'      => $invoice->fresh()->status,
                    'amount_paid' => $invoice->fresh()->amountPaid(),
                    'balance_due' => $invoice->fresh()->balanceDue(),
                ],
            ], 201);
        } catch (\InvalidArgumentException $e) {
            return response()->json(['error' => 'Validation Error', 'message' => $e->getMessage()], 422);
        }
    }

    /** Receipt/payment voucher PDF for a payment (#151). */
    public function voucher(Payment $payment)
    {
        return response($this->paymentService->voucherPdf($payment), 200, [
            'Content-Type'        => 'application/pdf',
            'Content-Disposition' => 'inline; filename="' . $payment->payment_code . '.pdf"',
        ]);
    }

    public function receiveDeposit(Request $request, SecurityDeposit $deposit): JsonResponse
    {
        $request->validate([
            'account_id' => 'required|exists:accounts,id',
            'date'       => 'required|date',
        ]);

        try {
            $deposit = $this->paymentService->recordDepositReceipt($deposit, $request->all(), Auth::user());
            return response()->json(['message' => 'Deposit receipt recorded.', 'deposit' => $deposit]);
        } catch (\InvalidArgumentException $e) {
            return response()->json(['error' => 'Validation Error', 'message' => $e->getMessage()], 422);
        }
    }

    public function returnDeposit(Request $request, SecurityDeposit $deposit): JsonResponse
    {
        $request->validate([
            'account_id' => 'required|exists:accounts,id',
            'date'       => 'required|date',
            'notes'      => 'nullable|string',
        ]);

        try {
            $deposit = $this->paymentService->returnSecurityDeposit($deposit, $request->all(), Auth::user());
            return response()->json(['message' => 'Deposit returned.', 'deposit' => $deposit]);
        } catch (\InvalidArgumentException $e) {
            return response()->json(['error' => 'Validation Error', 'message' => $e->getMessage()], 422);
        }
    }
}
