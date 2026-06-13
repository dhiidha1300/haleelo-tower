<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class VendorBill extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'bill_code', 'vendor_id', 'po_id', 'bill_date', 'due_date', 'status',
        'total_amount', 'expense_account_id', 'payment_account_id',
        'receipt_file_url', 'journal_entry_id', 'notes', 'created_by',
    ];

    protected $casts = [
        'bill_date'    => 'date',
        'due_date'     => 'date',
        'total_amount' => 'decimal:2',
    ];

    public function vendor(): BelongsTo
    {
        return $this->belongsTo(Vendor::class);
    }

    public function purchaseOrder(): BelongsTo
    {
        return $this->belongsTo(PurchaseOrder::class, 'po_id');
    }

    public function items(): HasMany
    {
        return $this->hasMany(VendorBillItem::class, 'bill_id');
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class, 'vendor_bill_id');
    }

    public function paymentAccount(): BelongsTo
    {
        return $this->belongsTo(Account::class, 'payment_account_id');
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function amountPaid(): string
    {
        return (string) $this->payments()->sum('amount');
    }

    public function balanceDue(): string
    {
        return bcsub((string) $this->total_amount, $this->amountPaid(), 2);
    }

    public function scopeUnpaid($query)
    {
        return $query->whereIn('status', ['unpaid', 'partial']);
    }
}
