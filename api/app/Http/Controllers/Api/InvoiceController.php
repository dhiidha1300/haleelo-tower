<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Invoice;
use App\Services\AuditService;
use App\Services\InvoiceService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class InvoiceController extends Controller
{
    public function __construct(
        private InvoiceService $invoiceService,
        private AuditService $auditService
    ) {}

    public function index(Request $request): JsonResponse
    {
        $query = Invoice::with(['tenant', 'booking'])->withCount('payments');

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }
        if ($request->filled('type')) {
            $query->where('type', $request->input('type'));
        }
        if ($request->filled('tenant_id')) {
            $query->where('tenant_id', $request->input('tenant_id'));
        }
        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('invoice_code', 'like', "%$search%")
                  ->orWhere('bill_to_name', 'like', "%$search%")
                  ->orWhereHas('tenant', fn ($t) => $t->where('company_name', 'like', "%$search%"));
            });
        }

        $paginator = $query->latest()->paginate(25);

        $paginator->getCollection()->transform(fn ($inv) => $this->summary($inv));

        return response()->json($paginator);
    }

    public function show(Invoice $invoice): JsonResponse
    {
        $invoice->load(['lineItems.accountCode', 'payments.account', 'tenant', 'booking', 'lease.space', 'createdBy']);

        return response()->json(array_merge($invoice->toArray(), [
            'bill_to'     => $invoice->billToName(),
            'amount_paid' => $invoice->amountPaid(),
            'balance_due' => $invoice->balanceDue(),
        ]));
    }

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'type'                => 'required|in:office_rent,educational,conference_hall,electricity,manual',
            'tenant_id'           => 'nullable|exists:tenants,id',
            'lease_id'            => 'nullable|exists:leases,id',
            'bill_to_name'        => 'required_without:tenant_id|nullable|string|max:255',
            'bill_to_email'       => 'nullable|email',
            'bill_to_phone'       => 'nullable|string|max:20',
            'issue_date'          => 'required|date',
            'due_date'            => 'nullable|date',
            'lpo_number'          => 'nullable|string|max:100',
            'notes'               => 'nullable|string',
            'lines'               => 'required|array|min:1',
            'lines.*.description' => 'required|string',
            'lines.*.quantity'    => 'nullable|numeric|min:0.01',
            'lines.*.unit_price'  => 'required|numeric|min:0',
            'lines.*.account_code_id' => 'nullable|exists:chart_of_accounts,id',
        ]);

        // If a tenant is selected, snapshot their contact info
        if ($request->filled('tenant_id')) {
            $tenant = \App\Models\Tenant::find($request->input('tenant_id'));
            $request->merge([
                'bill_to_name'  => $request->input('bill_to_name')  ?: $tenant?->company_name,
                'bill_to_email' => $request->input('bill_to_email') ?: $tenant?->email,
                'bill_to_phone' => $request->input('bill_to_phone') ?: $tenant?->phone,
            ]);
        }

        $invoice = $this->invoiceService->createManual($request->all(), Auth::user());
        $this->auditService->log('created', Invoice::class, (int) $invoice->id, null, $invoice->toArray());

        return response()->json($this->show($invoice)->getData(), 201);
    }

    public function send(Invoice $invoice): JsonResponse
    {
        try {
            $invoice = $this->invoiceService->markAsSent($invoice, Auth::user());
            $this->auditService->log('updated', Invoice::class, (int) $invoice->id, ['status' => 'draft'], ['status' => 'sent']);

            return response()->json($this->show($invoice)->getData());
        } catch (\InvalidArgumentException $e) {
            return response()->json(['error' => 'Validation Error', 'message' => $e->getMessage()], 422);
        }
    }

    public function pdf(Invoice $invoice)
    {
        $pdf = $this->invoiceService->generatePdf($invoice);

        return response($pdf, 200, [
            'Content-Type'        => 'application/pdf',
            'Content-Disposition' => 'inline; filename="' . $invoice->invoice_code . '.pdf"',
        ]);
    }

    public function destroy(Invoice $invoice): JsonResponse
    {
        if ($invoice->status !== 'draft') {
            return response()->json(['message' => 'Only draft invoices can be deleted. Cancel a sent invoice instead.'], 422);
        }
        $invoice->delete();
        return response()->json(['message' => 'Invoice deleted.']);
    }

    private function summary(Invoice $inv): array
    {
        return [
            'id'           => $inv->id,
            'invoice_code' => $inv->invoice_code,
            'type'         => $inv->type,
            'bill_to'      => $inv->billToName(),
            'issue_date'   => $inv->issue_date?->toDateString(),
            'due_date'     => $inv->due_date?->toDateString(),
            'total_amount' => $inv->total_amount,
            'amount_paid'  => $inv->amountPaid(),
            'balance_due'  => $inv->balanceDue(),
            'status'       => $inv->status,
        ];
    }
}
