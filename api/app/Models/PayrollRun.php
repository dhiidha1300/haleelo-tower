<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PayrollRun extends Model
{
    protected $fillable = [
        'run_code', 'month', 'department_filter', 'total_gross', 'total_deductions',
        'total_net', 'status', 'payment_account_id', 'journal_entry_id', 'finalized_at', 'created_by',
    ];

    protected $casts = [
        'total_gross'      => 'decimal:2',
        'total_deductions' => 'decimal:2',
        'total_net'        => 'decimal:2',
        'finalized_at'     => 'datetime',
    ];

    public function payslips(): HasMany
    {
        return $this->hasMany(Payslip::class);
    }

    public function deductions(): HasMany
    {
        return $this->hasMany(Deduction::class);
    }

    public function paymentAccount(): BelongsTo
    {
        return $this->belongsTo(Account::class, 'payment_account_id');
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
