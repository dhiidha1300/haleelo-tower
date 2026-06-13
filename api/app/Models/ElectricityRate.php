<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ElectricityRate extends Model
{
    protected $fillable = ['rate_per_kwh', 'effective_from', 'effective_to', 'created_by'];

    protected $casts = [
        'rate_per_kwh'   => 'decimal:4',
        'effective_from' => 'date',
        'effective_to'   => 'date',
    ];

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /** The currently active rate — effective_to is null (open-ended). */
    public static function current(): ?self
    {
        return static::whereNull('effective_to')
            ->orderByDesc('effective_from')
            ->first();
    }

    /** Rate active on a specific date. */
    public static function forDate(string $date): ?self
    {
        return static::where('effective_from', '<=', $date)
            ->where(function ($q) use ($date) {
                $q->whereNull('effective_to')
                  ->orWhere('effective_to', '>=', $date);
            })
            ->orderByDesc('effective_from')
            ->first();
    }
}
