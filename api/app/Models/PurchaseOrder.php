<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PurchaseOrder extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'po_code', 'vendor_id', 'order_date', 'expected_delivery_date',
        'status', 'total_estimated_amount', 'notes', 'created_by',
    ];

    protected $casts = [
        'order_date'             => 'date',
        'expected_delivery_date' => 'date',
        'total_estimated_amount' => 'decimal:2',
    ];

    public function vendor(): BelongsTo
    {
        return $this->belongsTo(Vendor::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(PurchaseOrderItem::class, 'po_id');
    }

    public function bills(): HasMany
    {
        return $this->hasMany(VendorBill::class, 'po_id');
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
