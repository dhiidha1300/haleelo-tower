<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OvertimeRecord extends Model
{
    protected $fillable = [
        'employee_id', 'payroll_run_id', 'date', 'hours', 'rate_multiplier', 'total_amount',
    ];

    protected $casts = [
        'date'            => 'date',
        'hours'           => 'decimal:2',
        'rate_multiplier' => 'decimal:2',
        'total_amount'    => 'decimal:2',
    ];

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }
}
