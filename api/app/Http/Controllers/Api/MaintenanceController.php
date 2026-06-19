<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\MaintenanceRequest;
use App\Services\AuditService;
use App\Services\MaintenanceService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;

class MaintenanceController extends Controller
{
    public function __construct(
        private MaintenanceService $maintenance,
        private AuditService $audit
    ) {}

    public function index(Request $request): JsonResponse
    {
        $query = MaintenanceRequest::with(['space', 'tenant', 'assignedEmployee', 'vendor'])->withCount('photos')->latest();
        if ($request->filled('status'))   $query->where('status', $request->input('status'));
        if ($request->filled('category')) $query->where('category', $request->input('category'));

        $rows = $query->get()->map(fn ($m) => [
            'id'            => $m->id,
            'request_code'  => $m->request_code,
            'title'         => $m->title,
            'category'      => $m->category,
            'priority'      => $m->priority,
            'status'        => $m->status,
            'job_type'      => $m->job_type,
            'location'      => $m->space?->name ?? $m->location_text ?? '—',
            'tenant'        => $m->tenant?->company_name,
            'assignee'      => $m->assignedEmployee?->full_name ?? $m->vendor?->name,
            'estimated_cost'=> $m->estimated_cost,
            'photos_count'  => $m->photos_count,
            'created_at'    => $m->created_at?->toDateString(),
        ]);

        return response()->json(['requests' => $rows]);
    }

    public function show(MaintenanceRequest $maintenance): JsonResponse
    {
        $maintenance->load(['space.floor', 'tenant', 'assignedEmployee', 'vendor', 'vendorBill', 'createdBy', 'photos']);

        return response()->json(array_merge($maintenance->toArray(), [
            'space_name'   => $maintenance->space?->name,
            'location'     => $maintenance->space?->name ?? $maintenance->location_text,
            'tenant_name'  => $maintenance->tenant?->company_name,
            'assignee'     => $maintenance->assignedEmployee?->full_name ?? $maintenance->vendor?->name,
            'vendor_bill_code' => $maintenance->vendorBill?->bill_code,
            'before_photos'=> $maintenance->photos->where('phase', 'before')->map(fn ($p) => ['id' => $p->id, 'url' => $p->file_url])->values(),
            'after_photos' => $maintenance->photos->where('phase', 'after')->map(fn ($p) => ['id' => $p->id, 'url' => $p->file_url])->values(),
        ]));
    }

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'title'         => 'required|string|max:255',
            'category'      => 'required|in:ac,electrical,cleaning,plumbing,equipment,other',
            'priority'      => 'nullable|in:low,normal,high',
            'description'   => 'nullable|string',
            'space_id'      => 'nullable|exists:spaces,id',
            'location_text' => 'nullable|string|max:255',
            'tenant_id'     => 'nullable|exists:tenants,id',
            'photos'        => 'nullable|array',
            'photos.*'      => 'image|max:5120',
        ]);

        $req = $this->maintenance->create($request->all(), Auth::user(), $request->file('photos', []));
        $this->audit->log('created', MaintenanceRequest::class, (int) $req->id, null, $req->toArray());

        return response()->json($this->show($req)->getData(), 201);
    }

    public function assign(Request $request, MaintenanceRequest $maintenance): JsonResponse
    {
        $request->validate(['employee_id' => 'required|exists:employees,id']);
        $this->maintenance->assignInternal($maintenance, (int) $request->input('employee_id'), Auth::user());
        $this->audit->log('updated', MaintenanceRequest::class, (int) $maintenance->id, null, ['job_type' => 'internal']);
        return response()->json($this->show($maintenance->fresh())->getData());
    }

    public function outsource(Request $request, MaintenanceRequest $maintenance): JsonResponse
    {
        $request->validate([
            'vendor_id' => 'required|exists:vendors,id',
            'cost'      => 'required|numeric|min:0',
            'bill_date' => 'nullable|date',
            'due_date'  => 'nullable|date',
        ]);

        try {
            $this->maintenance->outsource($maintenance, $request->all(), Auth::user());
            $this->audit->log('updated', MaintenanceRequest::class, (int) $maintenance->id, null, ['job_type' => 'outsourced']);
            return response()->json($this->show($maintenance->fresh())->getData());
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Failed to outsource: ' . $e->getMessage()], 422);
        }
    }

    public function resolve(Request $request, MaintenanceRequest $maintenance): JsonResponse
    {
        $request->validate([
            'resolution_notes' => 'nullable|string',
            'photos'           => 'nullable|array',
            'photos.*'         => 'image|max:5120',
        ]);

        $this->maintenance->resolve($maintenance, $request->input('resolution_notes'), $request->file('photos', []), Auth::user());
        $this->audit->log('updated', MaintenanceRequest::class, (int) $maintenance->id, null, ['status' => 'resolved']);
        return response()->json($this->show($maintenance->fresh())->getData());
    }

    public function cancel(MaintenanceRequest $maintenance): JsonResponse
    {
        $this->maintenance->cancel($maintenance);
        $this->audit->log('updated', MaintenanceRequest::class, (int) $maintenance->id, null, ['status' => 'cancelled']);
        return response()->json(['message' => 'Maintenance request cancelled.']);
    }

    /** Printable before/after report (photos embedded as data URIs). */
    public function report(MaintenanceRequest $maintenance)
    {
        $maintenance->load(['space.floor', 'tenant', 'assignedEmployee', 'vendor', 'vendorBill', 'createdBy', 'photos']);

        $disk = \App\Support\FileStorage::disk();
        $embed = function ($photos) use ($disk) {
            return $photos->map(function ($p) use ($disk) {
                $key = $p->getRawOriginal('file_url');
                try {
                    $bytes = Storage::disk($disk)->get($key);
                    $mime  = Storage::disk($disk)->mimeType($key) ?: 'image/jpeg';
                    return 'data:' . $mime . ';base64,' . base64_encode($bytes);
                } catch (\Throwable $e) { return null; }
            })->filter()->values()->all();
        };

        $building = [
            'name'    => \App\Models\SystemSetting::get('building_name', 'Haleelo Tower'),
            'address' => \App\Models\SystemSetting::get('address', ''),
        ];

        $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadView('pdfs.maintenance', [
            'm'        => $maintenance,
            'building' => $building,
            'before'   => $embed($maintenance->photos->where('phase', 'before')),
            'after'    => $embed($maintenance->photos->where('phase', 'after')),
        ]);

        return response($pdf->output(), 200, [
            'Content-Type'        => 'application/pdf',
            'Content-Disposition' => 'inline; filename="' . $maintenance->request_code . '.pdf"',
        ]);
    }
}
