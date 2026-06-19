<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class MaintenanceRequest extends Model
{
    protected $fillable = [
        'request_code', 'title', 'category', 'priority', 'description',
        'space_id', 'location_text', 'tenant_id', 'status', 'job_type',
        'assigned_employee_id', 'vendor_id', 'vendor_bill_id',
        'estimated_cost', 'resolution_notes', 'created_by', 'resolved_at',
    ];

    protected $casts = [
        'estimated_cost' => 'decimal:2',
        'resolved_at'    => 'datetime',
    ];

    public function space(): BelongsTo { return $this->belongsTo(Space::class); }
    public function tenant(): BelongsTo { return $this->belongsTo(Tenant::class); }
    public function assignedEmployee(): BelongsTo { return $this->belongsTo(Employee::class, 'assigned_employee_id'); }
    public function vendor(): BelongsTo { return $this->belongsTo(Vendor::class); }
    public function vendorBill(): BelongsTo { return $this->belongsTo(VendorBill::class); }
    public function createdBy(): BelongsTo { return $this->belongsTo(User::class, 'created_by'); }
    public function photos(): HasMany { return $this->hasMany(MaintenancePhoto::class); }
}
