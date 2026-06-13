<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Lease;
use App\Services\AuditService;
use App\Services\LeaseService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;

class LeaseController extends Controller
{
    public function __construct(
        private LeaseService $leaseService,
        private AuditService $auditService
    ) {}

    public function index(Request $request): JsonResponse
    {
        $query = Lease::with(['tenant', 'space.floor']);

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }
        if ($request->filled('tenant_id')) {
            $query->where('tenant_id', $request->input('tenant_id'));
        }
        if ($request->filled('billing_cycle')) {
            $query->where('billing_cycle', $request->input('billing_cycle'));
        }
        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where('lease_code', 'like', "%$search%")
                  ->orWhereHas('tenant', fn($q) => $q->where('company_name', 'like', "%$search%"));
        }

        return response()->json($query->latest()->paginate(25));
    }

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'tenant_id'               => 'required|exists:tenants,id',
            'space_id'                => 'required|exists:spaces,id',
            'start_date'              => 'required|date',
            'end_date'                => 'required|date|after:start_date',
            'billing_cycle'           => 'required|in:monthly,semester',
            'monthly_rent'            => 'required_if:billing_cycle,monthly|nullable|numeric|min:0',
            'semester_amount'         => 'required_if:billing_cycle,semester|nullable|numeric|min:0',
            'security_deposit_amount' => 'nullable|numeric|min:0',
            'security_deposit_received_date' => 'nullable|date',
            'contract_file_url'       => 'nullable|string',
        ]);

        try {
            $lease = $this->leaseService->createLease($request->all(), Auth::user());

            return response()->json($lease, 201);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Error', 'message' => $e->getMessage()], 422);
        }
    }

    public function show(Lease $lease): JsonResponse
    {
        return response()->json($this->leaseService->getLeaseWithDetails($lease));
    }

    public function update(Request $request, Lease $lease): JsonResponse
    {
        $request->validate([
            'end_date'                => 'sometimes|date|after:start_date',
            'monthly_rent'            => 'nullable|numeric|min:0',
            'semester_amount'         => 'nullable|numeric|min:0',
            'security_deposit_status' => 'sometimes|in:held,returned,applied',
            'contract_file_url'       => 'nullable|string',
            'external_contract_url'   => 'nullable|string',
        ]);

        $old = $lease->toArray();
        $lease->update(array_filter($request->only([
            'end_date', 'monthly_rent', 'semester_amount',
            'security_deposit_status', 'contract_file_url', 'external_contract_url',
        ]), fn($v) => $v !== null));

        $this->auditService->log('updated', Lease::class, (int) $lease->id, $old, $lease->fresh()->toArray());

        return response()->json($this->leaseService->getLeaseWithDetails($lease->fresh()));
    }

    public function uploadDocument(Request $request, Lease $lease): JsonResponse
    {
        $request->validate([
            'document'  => 'required|file|mimes:pdf,jpg,jpeg,png|max:10240',
            'doc_type'  => 'required|in:contract,external_contract',
        ]);

        $path  = $request->file('document')->store("leases/{$lease->id}/docs", 'public');
        $url   = Storage::disk('public')->url($path);
        $field = $request->input('doc_type') === 'external_contract' ? 'external_contract_url' : 'contract_file_url';

        $lease->update([$field => $url]);

        return response()->json([
            'message' => 'Document uploaded.',
            'url'     => $url,
            'field'   => $field,
        ]);
    }

    public function approve(Lease $lease): JsonResponse
    {
        try {
            $lease = $this->leaseService->approveLease($lease, Auth::user());
            return response()->json($this->leaseService->getLeaseWithDetails($lease));
        } catch (\InvalidArgumentException $e) {
            return response()->json(['error' => 'Validation Error', 'message' => $e->getMessage()], 422);
        }
    }

    public function reject(Request $request, Lease $lease): JsonResponse
    {
        $request->validate(['reason' => 'required|string']);

        try {
            $lease = $this->leaseService->rejectLease($lease, Auth::user(), $request->input('reason'));
            return response()->json($this->leaseService->getLeaseWithDetails($lease));
        } catch (\InvalidArgumentException $e) {
            return response()->json(['error' => 'Validation Error', 'message' => $e->getMessage()], 422);
        }
    }

    public function terminate(Request $request, Lease $lease): JsonResponse
    {
        $request->validate(['reason' => 'nullable|string']);

        $lease = $this->leaseService->terminateLease($lease, Auth::user(), $request->input('reason', ''));

        return response()->json($lease);
    }
}
