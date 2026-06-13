<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Payslip extends Model
{
    protected $fillable = [
        'payslip_code', 'payroll_run_id', 'employee_id', 'working_days_in_month',
        'days_worked', 'base_pay', 'overtime_pay', 'gross_pay', 'total_deductions',
        'net_pay', 'pdf_file_url', 'sent_via_whatsapp', 'sent_via_email',
    ];

    protected $casts = [
        'working_days_in_month' => 'integer',
        'days_worked'           => 'integer',
        'base_pay'              => 'decimal:2',
        'overtime_pay'          => 'decimal:2',
        'gross_pay'             => 'decimal:2',
        'total_deductions'      => 'decimal:2',
        'net_pay'               => 'decimal:2',
        'sent_via_whatsapp'     => 'boolean',
        'sent_via_email'        => 'boolean',
    ];

    public function payrollRun(): BelongsTo
    {
        return $this->belongsTo(PayrollRun::class);
    }

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }
}
