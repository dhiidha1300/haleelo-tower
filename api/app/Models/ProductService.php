<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProductService extends Model
{
    protected $fillable = [
        'product_id', 'service_name', 'service_type', 'price', 'active',
    ];

    protected $casts = [
        'price'  => 'decimal:2',
        'active' => 'boolean',
    ];

    public function space(): BelongsTo
    {
        return $this->belongsTo(Space::class, 'product_id');
    }
}
