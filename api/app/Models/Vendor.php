<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Vendor extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'name', 'contact_person', 'phone', 'email', 'category', 'notes', 'active',
    ];

    protected $casts = ['active' => 'boolean'];

    public function purchaseOrders(): HasMany
    {
        return $this->hasMany(PurchaseOrder::class);
    }

    public function bills(): HasMany
    {
        return $this->hasMany(VendorBill::class);
    }

    public function scopeActive($query)
    {
        return $query->where('active', true);
    }
}
