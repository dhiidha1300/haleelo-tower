<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ChartOfAccount extends Model
{
    use SoftDeletes;

    protected $table = 'chart_of_accounts';

    protected $fillable = [
        'code', 'name', 'type', 'parent_id', 'description', 'active', 'is_system',
    ];

    protected $casts = [
        'active'    => 'boolean',
        'is_system' => 'boolean',
    ];

    public function parent(): BelongsTo
    {
        return $this->belongsTo(ChartOfAccount::class, 'parent_id');
    }

    public function children(): HasMany
    {
        return $this->hasMany(ChartOfAccount::class, 'parent_id');
    }

    public function journalLines(): HasMany
    {
        return $this->hasMany(JournalEntryLine::class, 'account_id');
    }

    public function operatingAccount(): HasMany
    {
        return $this->hasMany(Account::class, 'chart_of_account_id');
    }

    public function scopeOfType($query, string $type)
    {
        return $query->where('type', $type);
    }

    public function scopeActive($query)
    {
        return $query->where('active', true);
    }

    /**
     * Net balance for this account from all journal lines.
     * Debit-normal accounts (asset, expense): debits − credits.
     * Credit-normal accounts (liability, equity, revenue): credits − debits.
     */
    public function balance(?string $asOfDate = null): string
    {
        $query = $this->journalLines()
            ->when($asOfDate, fn ($q) => $q->whereHas('journalEntry', fn ($e) => $e->whereDate('entry_date', '<=', $asOfDate)));

        $debits  = (clone $query)->where('type', 'debit')->sum('amount');
        $credits = (clone $query)->where('type', 'credit')->sum('amount');

        $isDebitNormal = in_array($this->type, ['asset', 'expense']);

        return $isDebitNormal
            ? bcsub((string) $debits, (string) $credits, 2)
            : bcsub((string) $credits, (string) $debits, 2);
    }
}
