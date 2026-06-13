<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ElectricityReading extends Model
{
    protected $fillable = [
        'electricity_bill_code', 'tenant_id', 'space_id', 'reading_date',
        'billing_period_month', 'previous_reading', 'current_reading', 'kwh_consumed',
        'rate_id', 'rate_per_kwh', 'total_charge', 'invoice_id', 'status', 'created_by',
    ];

    protected $casts = [
        'reading_date'     => 'date',
        'previous_reading' => 'decimal:2',
        'current_reading'  => 'decimal:2',
        'kwh_consumed'     => 'decimal:2',
        'rate_per_kwh'     => 'decimal:4',
        'total_charge'     => 'decimal:2',
    ];

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function space(): BelongsTo
    {
        return $this->belongsTo(Space::class);
    }

    public function invoice(): BelongsTo
    {
        return $this->belongsTo(Invoice::class);
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
