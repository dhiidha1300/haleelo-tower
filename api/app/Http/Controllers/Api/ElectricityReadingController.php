<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ElectricityReading;
use App\Services\AuditService;
use App\Services\ElectricityService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class ElectricityReadingController extends Controller
{
    public function __construct(
        private ElectricityService $electricityService,
        private AuditService $auditService
    ) {}

    public function index(Request $request): JsonResponse
    {
        $query = ElectricityReading::with(['tenant', 'space', 'invoice']);

        if ($request->filled('tenant_id')) {
            $query->where('tenant_id', $request->input('tenant_id'));
        }
        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }
        if ($request->filled('search')) {
            $query->where('electricity_bill_code', 'like', '%' . $request->input('search') . '%');
        }

        $paginator = $query->latest('reading_date')->paginate(25);

        $paginator->getCollection()->transform(fn ($r) => [
            'id'              => $r->id,
            'bill_code'       => $r->electricity_bill_code,
            'tenant_name'     => $r->tenant?->company_name,
            'space_name'      => $r->space?->name,
            'reading_date'    => $r->reading_date?->toDateString(),
            'period'          => $r->billing_period_month,
            'previous_reading'=> $r->previous_reading,
            'current_reading' => $r->current_reading,
            'kwh_consumed'    => $r->kwh_consumed,
            'rate_per_kwh'    => $r->rate_per_kwh,
            'total_charge'    => $r->total_charge,
            'status'          => $r->status,
            'invoice_code'    => $r->invoice?->invoice_code,
            'invoice_id'      => $r->invoice_id,
        ]);

        return response()->json($paginator);
    }

    /** Returns the last reading for a tenant+space so the form can auto-fill previous. */
    public function lastReading(Request $request): JsonResponse
    {
        $request->validate([
            'tenant_id' => 'required|exists:tenants,id',
            'space_id'  => 'required|exists:spaces,id',
        ]);

        $last = $this->electricityService->lastReading($request->integer('tenant_id'), $request->integer('space_id'));

        return response()->json([
            'previous_reading' => $last?->current_reading ?? 0,
            'last_date'        => $last?->reading_date?->toDateString(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'tenant_id'        => 'required|exists:tenants,id',
            'space_id'         => 'required|exists:spaces,id',
            'reading_date'     => 'required|date',
            'previous_reading' => 'nullable|numeric|min:0',
            'current_reading'  => 'required|numeric|min:0',
        ]);

        try {
            $reading = $this->electricityService->recordReading($request->all(), Auth::user());
            $this->auditService->log('created', ElectricityReading::class, (int) $reading->id, null, $reading->toArray());

            return response()->json($reading, 201);
        } catch (\InvalidArgumentException $e) {
            return response()->json(['error' => 'Validation Error', 'message' => $e->getMessage()], 422);
        }
    }

    public function generateInvoice(ElectricityReading $reading): JsonResponse
    {
        try {
            $invoice = $this->electricityService->generateInvoice($reading, Auth::user());
            return response()->json(['message' => 'Electricity invoice created.', 'invoice' => $invoice]);
        } catch (\InvalidArgumentException $e) {
            return response()->json(['error' => 'Validation Error', 'message' => $e->getMessage()], 422);
        }
    }

    /** Draft invoices a reading could be appended to (same tenant). */
    public function draftInvoices(ElectricityReading $reading): JsonResponse
    {
        $drafts = \App\Models\Invoice::where('status', 'draft')
            ->where(fn ($q) => $q->where('tenant_id', $reading->tenant_id)->orWhereNull('tenant_id'))
            ->latest()
            ->get(['id', 'invoice_code', 'type', 'total_amount']);

        return response()->json($drafts);
    }

    public function addToInvoice(Request $request, ElectricityReading $reading): JsonResponse
    {
        $request->validate(['invoice_id' => 'required|exists:invoices,id']);

        try {
            $invoice = $this->electricityService->addToInvoice($reading, \App\Models\Invoice::findOrFail($request->input('invoice_id')), Auth::user());
            return response()->json(['message' => 'Electricity added to invoice.', 'invoice' => $invoice]);
        } catch (\InvalidArgumentException $e) {
            return response()->json(['error' => 'Validation Error', 'message' => $e->getMessage()], 422);
        }
    }
}
