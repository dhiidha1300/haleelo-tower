<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LeaveRequest extends Model
{
    protected $fillable = [
        'employee_id', 'leave_type', 'start_date', 'end_date', 'days_count',
        'status', 'reason', 'approved_by',
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date'   => 'date',
        'days_count' => 'integer',
    ];

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }
}
