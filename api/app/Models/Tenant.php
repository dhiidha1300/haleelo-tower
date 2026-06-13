<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Tenant extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'company_name', 'contact_person_name', 'email', 'phone',
        'national_id', 'type', 'status', 'portal_access', 'portal_password_hash',
    ];

    protected $casts = [
        'portal_access' => 'boolean',
    ];

    protected $hidden = ['portal_password_hash'];

    public function documents(): HasMany
    {
        return $this->hasMany(TenantDocument::class)->orderByDesc('uploaded_at');
    }

    public function leases(): HasMany
    {
        return $this->hasMany(Lease::class)->orderByDesc('start_date');
    }

    public function activeLeases(): HasMany
    {
        return $this->hasMany(Lease::class)->where('status', 'active');
    }

    public function securityDeposits(): HasMany
    {
        return $this->hasMany(SecurityDeposit::class);
    }
}
