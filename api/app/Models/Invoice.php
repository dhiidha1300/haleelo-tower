<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Invoice extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'invoice_code', 'type', 'tenant_id', 'lease_id', 'booking_id',
        'bill_to_name', 'bill_to_email', 'bill_to_phone',
        'issue_date', 'due_date', 'billing_period_start', 'billing_period_end',
        'lpo_number', 'subtotal', 'total_amount', 'status',
        'payment_account_id', 'journal_entry_id', 'notes', 'sent_at', 'created_by',
    ];

    protected $casts = [
        'issue_date'           => 'date',
        'due_date'             => 'date',
        'billing_period_start' => 'date',
        'billing_period_end'   => 'date',
        'sent_at'              => 'datetime',
        'subtotal'             => 'decimal:2',
        'total_amount'         => 'decimal:2',
    ];

    public function lineItems(): HasMany
    {
        return $this->hasMany(InvoiceLineItem::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function lease(): BelongsTo
    {
        return $this->belongsTo(Lease::class);
    }

    public function booking(): BelongsTo
    {
        return $this->belongsTo(Booking::class);
    }

    public function paymentAccount(): BelongsTo
    {
        return $this->belongsTo(Account::class, 'payment_account_id');
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /** Amount already paid against this invoice. */
    public function amountPaid(): string
    {
        return (string) $this->payments()->sum('amount');
    }

    /** Outstanding balance. */
    public function balanceDue(): string
    {
        return bcsub((string) $this->total_amount, $this->amountPaid(), 2);
    }

    public function billToName(): string
    {
        return $this->bill_to_name
            ?? $this->tenant?->company_name
            ?? $this->booking?->client_name
            ?? 'Customer';
    }

    public function scopeOverdue($query)
    {
        return $query->whereIn('status', ['sent', 'partial'])
            ->whereDate('due_date', '<', now()->toDateString());
    }

    public function scopeUnpaid($query)
    {
        return $query->whereIn('status', ['sent', 'partial', 'overdue']);
    }
}
