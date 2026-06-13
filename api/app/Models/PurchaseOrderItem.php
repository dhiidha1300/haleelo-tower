<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PurchaseOrderItem extends Model
{
    protected $fillable = [
        'po_id', 'description', 'quantity', 'estimated_unit_price', 'line_total', 'expense_account_id',
    ];

    protected $casts = [
        'quantity'             => 'decimal:2',
        'estimated_unit_price' => 'decimal:2',
        'line_total'           => 'decimal:2',
    ];

    public function purchaseOrder(): BelongsTo
    {
        return $this->belongsTo(PurchaseOrder::class, 'po_id');
    }

    public function expenseAccount(): BelongsTo
    {
        return $this->belongsTo(ChartOfAccount::class, 'expense_account_id');
    }
}
