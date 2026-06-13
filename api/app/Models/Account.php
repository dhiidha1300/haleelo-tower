<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Account extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'chart_of_account_id', 'name', 'type', 'account_identifier', 'active', 'notes',
    ];

    protected $casts = [
        'active' => 'boolean',
    ];

    public function chartOfAccount(): BelongsTo
    {
        return $this->belongsTo(ChartOfAccount::class, 'chart_of_account_id');
    }

    public function transactions(): HasMany
    {
        return $this->hasMany(AccountTransaction::class);
    }

    public function scopeActive($query)
    {
        return $query->where('active', true);
    }

    /**
     * Computed balance from transaction history (never stored).
     * The 5 operating accounts are all ASSET accounts, so they are debit-normal:
     * a debit (money in) increases the balance, a credit (money out) decreases it.
     * This matches the plan §8.8 — e.g. a customer receipt DEBITS the cash account.
     */
    public function balance(?string $asOfDate = null): string
    {
        $query = $this->transactions()
            ->when($asOfDate, fn ($q) => $q->whereDate('transaction_date', '<=', $asOfDate));

        $debits  = (clone $query)->where('type', 'debit')->sum('amount');
        $credits = (clone $query)->where('type', 'credit')->sum('amount');

        return bcsub((string) $debits, (string) $credits, 2);
    }
}
