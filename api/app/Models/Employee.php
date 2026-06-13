<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Employee extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'employee_code', 'full_name', 'job_title', 'department', 'employment_type',
        'base_salary', 'daily_rate', 'phone', 'email', 'start_date', 'status', 'contract_file_url',
    ];

    protected $casts = [
        'base_salary' => 'decimal:2',
        'daily_rate'  => 'decimal:2',
        'start_date'  => 'date',
    ];

    public function attendanceLogs(): HasMany
    {
        return $this->hasMany(AttendanceLog::class);
    }

    public function leaveRequests(): HasMany
    {
        return $this->hasMany(LeaveRequest::class);
    }

    public function payslips(): HasMany
    {
        return $this->hasMany(Payslip::class);
    }

    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }
}
