<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CateringPackage extends Model
{
    protected $fillable = ['name', 'slug', 'description', 'base_price', 'active'];

    protected $casts = [
        'active' => 'boolean',
        'base_price' => 'decimal:2',
    ];

    public function items(): HasMany
    {
        return $this->hasMany(CateringPackageItem::class, 'package_id');
    }
}
