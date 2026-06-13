<?php

namespace App\Services;

use App\Models\Lease;
use App\Models\SecurityDeposit;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Support\Facades\Log;

class LeaseService
{
    public function __construct(
        private ReferenceCodeService $refService,
        private AuditService $auditService
    ) {}

    /**
     * Create a lease request. Per Section 7.3.1 the lease starts as
     * 'pending_approval' and only becomes active once an Admin approves it.
     * The security deposit record and tenant activation happen at approval time.
     */
    public function createLease(array $data, User $createdBy): Lease
    {
        $lease = Lease::create([
            'tenant_id'               => $data['tenant_id'],
            'space_id'                => $data['space_id'],
            'lease_code'              => $this->refService->generate('LS'),
            'start_date'              => $data['start_date'],
            'end_date'                => $data['end_date'],
            'monthly_rent'            => $data['monthly_rent'] ?? null,
            'semester_amount'         => $data['semester_amount'] ?? null,
            'billing_cycle'           => $data['billing_cycle'],
            'status'                  => 'pending_approval',
            'security_deposit_amount' => $data['security_deposit_amount'] ?? 0,
            'security_deposit_status' => 'held',
            'contract_file_url'       => $data['contract_file_url'] ?? null,
            'created_by_user_id'      => $createdBy->id,
        ]);

        // Record the security deposit (collected upfront during onboarding)
        if (($data['security_deposit_amount'] ?? 0) > 0) {
            SecurityDeposit::create([
                'lease_id'      => $lease->id,
                'tenant_id'     => $lease->tenant_id,
                'amount'        => $data['security_deposit_amount'],
                'status'        => 'held',
                'received_date' => $data['security_deposit_received_date'] ?? now()->toDateString(),
            ]);
        }

        $this->auditService->log('created', Lease::class, (int) $lease->id, null, $lease->toArray());

        return $lease->load(['tenant', 'space.floor', 'createdBy']);
    }

    /**
     * Approve a pending lease: activate it and activate the tenant
     * (pending -> active), triggering onboarding readiness.
     */
    public function approveLease(Lease $lease, User $approver): Lease
    {
        if ($lease->status !== 'pending_approval') {
            throw new \InvalidArgumentException('Only leases pending approval can be approved.');
        }

        $lease->update([
            'status'              => 'active',
            'approved_by_user_id' => $approver->id,
            'approved_at'         => now(),
        ]);

        // Activate the tenant (pending -> active) on first approved lease
        $tenant = Tenant::find($lease->tenant_id);
        if ($tenant && $tenant->status === 'pending') {
            $tenant->update(['status' => 'active']);
        }

        $this->auditService->log('approved', Lease::class, (int) $lease->id, ['status' => 'pending_approval'], ['status' => 'active']);

        return $lease->fresh()->load(['tenant', 'space.floor', 'createdBy', 'approvedBy']);
    }

    public function rejectLease(Lease $lease, User $user, string $reason): Lease
    {
        if ($lease->status !== 'pending_approval') {
            throw new \InvalidArgumentException('Only leases pending approval can be rejected.');
        }

        $lease->update([
            'status'           => 'rejected',
            'rejection_reason' => $reason,
        ]);

        $this->auditService->log('rejected', Lease::class, (int) $lease->id, ['status' => 'pending_approval'], ['status' => 'rejected', 'reason' => $reason]);

        return $lease->fresh();
    }

    public function terminateLease(Lease $lease, User $user, string $reason = ''): Lease
    {
        $lease->update(['status' => 'terminated']);
        $this->auditService->log('updated', Lease::class, (int) $lease->id, ['status' => 'active'], ['status' => 'terminated', 'reason' => $reason]);

        return $lease->fresh();
    }

    public function updateLeaseStatuses(): int
    {
        return Lease::active()
            ->whereDate('end_date', '<', now()->toDateString())
            ->update(['status' => 'expired']);
    }

    public function sendRenewalReminders(): int
    {
        $leases = Lease::expiringSoon(10)->with(['tenant', 'space'])->get();

        foreach ($leases as $lease) {
            try {
                dispatch(new \App\Jobs\SendLeaseRenewalReminderJob($lease));
                $lease->update(['renewal_reminder_sent' => true]);
            } catch (\Exception $e) {
                Log::error('Failed to dispatch lease renewal reminder', [
                    'lease_id' => $lease->id,
                    'error'    => $e->getMessage(),
                ]);
            }
        }

        return $leases->count();
    }

    public function getLeaseWithDetails(Lease $lease): array
    {
        $lease->load(['tenant', 'space.floor', 'createdBy', 'securityDeposits']);

        return $lease->toArray();
    }
}
