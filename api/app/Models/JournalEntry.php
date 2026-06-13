<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Immutable, append-only. Never update or delete at the app layer.
 */
class JournalEntry extends Model
{
    protected $fillable = [
        'journal_code', 'entry_date', 'description', 'reference_code',
        'source', 'posted_by_user_id',
    ];

    protected $casts = [
        'entry_date' => 'date',
    ];

    public function lines(): HasMany
    {
        return $this->hasMany(JournalEntryLine::class);
    }

    public function postedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'posted_by_user_id');
    }

    public function accountTransactions(): HasMany
    {
        return $this->hasMany(AccountTransaction::class);
    }

    public function scopeBySource($query, string $source)
    {
        return $query->where('source', $source);
    }
}
