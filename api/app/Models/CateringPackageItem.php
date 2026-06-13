<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CateringPackageItem extends Model
{
    protected $fillable = ['package_id', 'service_name', 'description'];

    public function package(): BelongsTo
    {
        return $this->belongsTo(CateringPackage::class, 'package_id');
    }
}
