<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use App\Services\AuditService;
use App\Services\TenantService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class TenantController extends Controller
{
    public function __construct(
        private TenantService $tenantService,
        private AuditService $auditService
    ) {}

    public function index(Request $request): JsonResponse
    {
        $query = Tenant::withCount(['leases', 'documents']);

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }
        if ($request->filled('type')) {
            $query->where('type', $request->input('type'));
        }
        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('company_name', 'like', "%$search%")
                  ->orWhere('contact_person_name', 'like', "%$search%")
                  ->orWhere('email', 'like', "%$search%");
            });
        }

        return response()->json($query->latest()->paginate(25));
    }

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'company_name'        => 'required|string|max:255',
            'contact_person_name' => 'required|string|max:255',
            'email'               => 'required|email',
            'phone'               => 'required|string|max:20',
            'national_id'         => 'nullable|string|max:50',
            'type'                => 'required|in:office,educational,conference_client',
            'status'              => 'nullable|in:pending,active,terminated',
        ]);

        try {
            $tenant = $this->tenantService->createTenant($request->all());
            $this->auditService->log('created', Tenant::class, (int) $tenant->id, null, $tenant->toArray());

            return response()->json($tenant, 201);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Error', 'message' => $e->getMessage()], 422);
        }
    }

    public function show(Tenant $tenant): JsonResponse
    {
        return response()->json($this->tenantService->getTenantWithRelations($tenant));
    }

    public function update(Request $request, Tenant $tenant): JsonResponse
    {
        $request->validate([
            'company_name'        => 'sometimes|string|max:255',
            'contact_person_name' => 'sometimes|string|max:255',
            'email'               => 'sometimes|email',
            'phone'               => 'sometimes|string|max:20',
            'national_id'         => 'nullable|string|max:50',
            'type'                => 'sometimes|in:office,educational,conference_client',
            'status'              => 'sometimes|in:pending,active,terminated',
        ]);

        $old    = $tenant->toArray();
        $tenant = $this->tenantService->updateTenant($tenant, $request->all());
        $this->auditService->log('updated', Tenant::class, (int) $tenant->id, $old, $tenant->toArray());

        return response()->json($tenant);
    }

    public function uploadDocument(Request $request, Tenant $tenant): JsonResponse
    {
        $request->validate([
            'document'    => 'required|file|mimes:pdf,jpg,jpeg,png|max:10240',
            'type'        => 'required|in:lease_agreement,kyc,business_registration,notarised,other',
            'expiry_date' => 'nullable|date',
        ]);

        $doc = $this->tenantService->uploadDocument(
            $tenant,
            $request->file('document'),
            $request->input('type'),
            Auth::user(),
            $request->input('expiry_date')
        );

        return response()->json($doc, 201);
    }

    public function generatePortalCredentials(Tenant $tenant): JsonResponse
    {
        $credentials = $this->tenantService->generatePortalCredentials($tenant);

        return response()->json([
            'message'  => "Portal access granted to {$tenant->email}.",
            'email'    => $credentials['email'],
            'password' => $credentials['password'],
        ]);
    }

    public function destroy(Tenant $tenant): JsonResponse
    {
        $this->auditService->log('deleted', Tenant::class, (int) $tenant->id, $tenant->toArray(), null);
        $tenant->update(['status' => 'terminated']);
        $tenant->delete();

        return response()->json(['message' => 'Tenant deactivated.']);
    }
}
