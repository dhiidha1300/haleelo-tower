<?php

namespace App\Services;

use App\Models\ChartOfAccount;
use App\Models\MaintenancePhoto;
use App\Models\MaintenanceRequest;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;

/**
 * Maintenance management: staff-logged requests with before/after photos,
 * internal assignment or outsourcing (which creates a linked vendor bill),
 * and a printable before/after report.
 */
class MaintenanceService
{
    public function __construct(
        private ReferenceCodeService $refService,
        private VendorBillService $vendorBills
    ) {}

    /** @param UploadedFile[] $beforePhotos */
    public function create(array $data, User $user, array $beforePhotos = []): MaintenanceRequest
    {
        return DB::transaction(function () use ($data, $user, $beforePhotos) {
            $req = MaintenanceRequest::create([
                'request_code'  => $this->refService->generate('MR'),
                'title'         => $data['title'],
                'category'      => $data['category'] ?? 'other',
                'priority'      => $data['priority'] ?? 'normal',
                'description'   => $data['description'] ?? null,
                'space_id'      => $data['space_id'] ?? null,
                'location_text' => $data['location_text'] ?? null,
                'tenant_id'     => $data['tenant_id'] ?? null,
                'status'        => 'open',
                'created_by'    => $user->id,
            ]);

            $this->storePhotos($req, 'before', $beforePhotos, $user);

            return $req->fresh('photos');
        });
    }

    /** @param UploadedFile[] $files */
    public function storePhotos(MaintenanceRequest $req, string $phase, array $files, User $user): void
    {
        foreach ($files as $file) {
            if (!$file instanceof UploadedFile) continue;
            $key = \App\Support\FileStorage::put($file, "maintenance/{$req->id}/{$phase}");
            MaintenancePhoto::create([
                'maintenance_request_id' => $req->id,
                'phase'       => $phase,
                'file_url'    => $key,
                'uploaded_by' => $user->id,
            ]);
        }
    }

    /** Assign the job to internal staff. */
    public function assignInternal(MaintenanceRequest $req, int $employeeId, User $user): MaintenanceRequest
    {
        $req->update([
            'job_type'             => 'internal',
            'assigned_employee_id' => $employeeId,
            'vendor_id'            => null,
            'status'               => 'in_progress',
        ]);
        return $req->fresh(['assignedEmployee']);
    }

    /** Outsource to a vendor — creates a linked vendor bill (COA 4020 Maintenance & Repairs). */
    public function outsource(MaintenanceRequest $req, array $data, User $user): MaintenanceRequest
    {
        return DB::transaction(function () use ($req, $data, $user) {
            $cost = (float) $data['cost'];
            $acct = ChartOfAccount::where('code', '4020')->value('id');

            $bill = $this->vendorBills->createBill([
                'vendor_id'          => $data['vendor_id'],
                'bill_date'          => $data['bill_date'] ?? now()->toDateString(),
                'due_date'           => $data['due_date'] ?? null,
                'expense_account_id' => $acct,
                'notes'              => "Maintenance {$req->request_code}: {$req->title}",
                'items'              => [[
                    'description'        => "Maintenance — {$req->title} ({$req->request_code})",
                    'quantity'           => 1,
                    'unit_price'         => $cost,
                    'expense_account_id' => $acct,
                ]],
            ], $user);

            $req->update([
                'job_type'       => 'outsourced',
                'vendor_id'      => $data['vendor_id'],
                'vendor_bill_id' => $bill->id,
                'estimated_cost' => $cost,
                'assigned_employee_id' => null,
                'status'         => 'in_progress',
            ]);

            return $req->fresh(['vendor', 'vendorBill']);
        });
    }

    /** @param UploadedFile[] $afterPhotos */
    public function resolve(MaintenanceRequest $req, ?string $notes, array $afterPhotos, User $user): MaintenanceRequest
    {
        $this->storePhotos($req, 'after', $afterPhotos, $user);
        $req->update([
            'status'           => 'resolved',
            'resolution_notes' => $notes,
            'resolved_at'      => now(),
        ]);
        return $req->fresh('photos');
    }

    public function cancel(MaintenanceRequest $req): MaintenanceRequest
    {
        $req->update(['status' => 'cancelled']);
        return $req;
    }
}
