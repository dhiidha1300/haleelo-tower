<?php

namespace App\Models;

use Illuminate\Auth\Authenticatable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as BaseUser;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Spatie\Permission\Traits\HasRoles;

class User extends BaseUser
{
    use Authenticatable, HasApiTokens, HasFactory, Notifiable, HasRoles, SoftDeletes;

    protected $table = 'users';

    protected $fillable = [
        'name',
        'job_title',
        'email',
        'password',
        'phone',
        'two_factor_enabled',
        'status',
        'profile_photo_url',
        'two_factor_secret',
        'two_factor_confirmed_at',
        'failed_login_attempts',
        'locked_until',
    ];

    protected $hidden = [
        'password',
        'two_factor_secret',
        'remember_token',
    ];

    protected $casts = [
        'password'                => 'hashed',
        'email_verified_at'       => 'datetime',
        'two_factor_confirmed_at' => 'datetime',
        'locked_until'            => 'datetime',
        'two_factor_enabled'      => 'boolean',
    ];

    protected $attributes = [
        'status' => 'active',
        'failed_login_attempts' => 0,
    ];

    // Relationships
    public function auditLogs()
    {
        return $this->hasMany(AuditLog::class);
    }

    // Scopes
    public function scopeActive(Builder $query): Builder
    {
        return $query->where('status', 'active')->whereNull('deleted_at');
    }

    public function scopeByEmail(Builder $query, string $email): Builder
    {
        return $query->where('email', $email);
    }

    public function scopeByRole(Builder $query, string $role): Builder
    {
        return $query->role($role);
    }

    // Methods
    public function isLocked(): bool
    {
        return $this->locked_until && $this->locked_until->isFuture();
    }

    public function lock(): void
    {
        $this->update([
            'locked_until' => now()->addMinutes(15),
        ]);
    }

    public function unlock(): void
    {
        $this->update([
            'locked_until' => null,
            'failed_login_attempts' => 0,
        ]);
    }

    public function incrementFailedLoginAttempts(): void
    {
        $this->update([
            'failed_login_attempts' => $this->failed_login_attempts + 1,
        ]);

        if ($this->failed_login_attempts >= 5) {
            $this->lock();
        }
    }

    public function resetFailedLoginAttempts(): void
    {
        $this->update([
            'failed_login_attempts' => 0,
        ]);
    }

    public function getPermissionsArray(): array
    {
        return $this->getAllPermissions()->pluck('name')->toArray();
    }

    public function getRole(): string
    {
        return $this->getRoleNames()->first() ?? 'none';
    }

    public function can2FA(): bool
    {
        return (bool) $this->two_factor_enabled && !empty($this->phone);
    }

    public function toArray()
    {
        $array = parent::toArray();
        $array['role'] = $this->getRole();
        $array['permissions'] = $this->getPermissionsArray();
        return $array;
    }
}
