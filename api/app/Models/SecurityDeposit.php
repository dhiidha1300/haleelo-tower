<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SecurityDeposit extends Model
{
    protected $fillable = [
        'lease_id', 'tenant_id', 'amount', 'status',
        'received_date', 'returned_date', 'notes',
        'received_journal_id', 'return_journal_id',
    ];

    protected $casts = [
        'amount'        => 'decimal:2',
        'received_date' => 'date',
        'returned_date' => 'date',
    ];

    public function lease(): BelongsTo
    {
        return $this->belongsTo(Lease::class);
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }
}
