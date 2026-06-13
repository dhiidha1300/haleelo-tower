<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InvoiceLineItem extends Model
{
    protected $fillable = [
        'invoice_id', 'description', 'quantity', 'unit_price', 'line_total',
        'account_code_id', 'electricity_reading_id',
    ];

    protected $casts = [
        'quantity'   => 'decimal:2',
        'unit_price' => 'decimal:2',
        'line_total' => 'decimal:2',
    ];

    public function invoice(): BelongsTo
    {
        return $this->belongsTo(Invoice::class);
    }

    public function accountCode(): BelongsTo
    {
        return $this->belongsTo(ChartOfAccount::class, 'account_code_id');
    }
}
