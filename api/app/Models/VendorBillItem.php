<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class VendorBillItem extends Model
{
    protected $fillable = [
        'bill_id', 'description', 'quantity', 'unit_price', 'line_total', 'expense_account_id',
    ];

    protected $casts = [
        'quantity'   => 'decimal:2',
        'unit_price' => 'decimal:2',
        'line_total' => 'decimal:2',
    ];

    public function bill(): BelongsTo
    {
        return $this->belongsTo(VendorBill::class, 'bill_id');
    }

    public function expenseAccount(): BelongsTo
    {
        return $this->belongsTo(ChartOfAccount::class, 'expense_account_id');
    }
}
