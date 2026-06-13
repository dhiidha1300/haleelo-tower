<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Booking extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'booking_code', 'type', 'product_id',
        'client_name', 'client_company', 'client_email', 'client_phone', 'client_national_id',
        'session_type', 'booking_date', 'start_time', 'end_time',
        'recurring', 'recurrence_rule', 'recurrence_group_id',
        'catering_package_id', 'dj_requested', 'cameraman_requested', 'extra_services',
        'base_price', 'catering_price', 'dj_price', 'cameraman_price', 'extras_price', 'total_price',
        'status', 'payment_status', 'notes', 'rejection_reason', 'created_by_user_id',
    ];

    protected $casts = [
        'booking_date'    => 'date',
        'recurring'       => 'boolean',
        'dj_requested'    => 'boolean',
        'cameraman_requested' => 'boolean',
        'recurrence_rule' => 'array',
        'extra_services'  => 'array',
        'base_price'      => 'decimal:2',
        'catering_price'  => 'decimal:2',
        'dj_price'        => 'decimal:2',
        'cameraman_price' => 'decimal:2',
        'extras_price'    => 'decimal:2',
        'total_price'     => 'decimal:2',
    ];

    public function product(): BelongsTo
    {
        return $this->belongsTo(Space::class, 'product_id');
    }

    public function cateringPackage(): BelongsTo
    {
        return $this->belongsTo(CateringPackage::class);
    }

    public function statusLogs(): HasMany
    {
        return $this->hasMany(BookingStatusLog::class)->orderBy('created_at');
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_user_id');
    }

    public function services(): HasMany
    {
        return $this->hasMany(\App\Models\BookingService::class);
    }

    public function scopeByStatus($query, string $status)
    {
        return $query->where('status', $status);
    }

    public function scopePendingAdmin($query)
    {
        return $query->where('status', 'admin_pending');
    }

    public function scopePendingFinance($query)
    {
        return $query->where('status', 'accountant_pending');
    }
}
