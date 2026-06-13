<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Lease extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'tenant_id', 'space_id', 'lease_code',
        'start_date', 'end_date',
        'monthly_rent', 'semester_amount', 'billing_cycle', 'status',
        'rejection_reason',
        'security_deposit_amount', 'security_deposit_status',
        'contract_signed_online', 'contract_file_url', 'external_contract_url',
        'renewal_reminder_sent', 'created_by_user_id',
        'approved_by_user_id', 'approved_at',
    ];

    protected $casts = [
        'start_date'              => 'date',
        'end_date'                => 'date',
        'approved_at'             => 'datetime',
        'monthly_rent'            => 'decimal:2',
        'semester_amount'         => 'decimal:2',
        'security_deposit_amount' => 'decimal:2',
        'contract_signed_online'  => 'boolean',
        'renewal_reminder_sent'   => 'boolean',
    ];

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function space(): BelongsTo
    {
        return $this->belongsTo(Space::class);
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_user_id');
    }

    public function approvedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by_user_id');
    }

    public function scopePendingApproval($query)
    {
        return $query->where('status', 'pending_approval');
    }

    public function securityDeposits(): HasMany
    {
        return $this->hasMany(SecurityDeposit::class);
    }

    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    public function scopeExpiringSoon($query, int $days = 10)
    {
        return $query->where('status', 'active')
            ->whereDate('end_date', '<=', now()->addDays($days))
            ->where('renewal_reminder_sent', false);
    }
}
