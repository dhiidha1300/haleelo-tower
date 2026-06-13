<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Space extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'name', 'slug', 'type', 'floor_id', 'capacity',
        'description', 'amenities', 'base_price', 'price_unit',
        'photos', 'status',
    ];

    protected $casts = [
        'amenities'  => 'array',
        'photos'     => 'array',
        'base_price' => 'decimal:2',
        'capacity'   => 'integer',
    ];

    public function floor(): BelongsTo
    {
        return $this->belongsTo(Floor::class);
    }

    public function productServices(): HasMany
    {
        return $this->hasMany(ProductService::class, 'product_id');
    }

    public function bookings(): HasMany
    {
        return $this->hasMany(Booking::class, 'product_id');
    }

    public function leases(): HasMany
    {
        return $this->hasMany(Lease::class, 'space_id');
    }

    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    public function scopeByType($query, string $type)
    {
        return $query->where('type', $type);
    }
}
