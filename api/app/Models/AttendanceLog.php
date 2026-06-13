<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AttendanceLog extends Model
{
    protected $fillable = [
        'employee_id', 'month', 'working_days_in_month', 'days_worked', 'days_absent', 'late_arrivals',
    ];

    protected $casts = [
        'working_days_in_month' => 'integer',
        'days_worked'           => 'integer',
        'days_absent'           => 'integer',
        'late_arrivals'         => 'integer',
    ];

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }
}
