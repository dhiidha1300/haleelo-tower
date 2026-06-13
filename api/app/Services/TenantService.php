<?php

namespace App\Services;

use App\Models\Tenant;
use App\Models\TenantDocument;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class TenantService
{
    public function createTenant(array $data): Tenant
    {
        return Tenant::create([
            'company_name'        => $data['company_name'],
            'contact_person_name' => $data['contact_person_name'],
            'email'               => $data['email'],
            'phone'               => $data['phone'],
            'national_id'         => $data['national_id'] ?? null,
            'type'                => $data['type'] ?? 'office',
            'status'              => $data['status'] ?? 'pending',
        ]);
    }

    public function updateTenant(Tenant $tenant, array $data): Tenant
    {
        $tenant->update(array_filter([
            'company_name'        => $data['company_name'] ?? null,
            'contact_person_name' => $data['contact_person_name'] ?? null,
            'email'               => $data['email'] ?? null,
            'phone'               => $data['phone'] ?? null,
            'national_id'         => $data['national_id'] ?? null,
            'type'                => $data['type'] ?? null,
            'status'              => $data['status'] ?? null,
        ], fn($v) => $v !== null));

        return $tenant->fresh();
    }

    public function uploadDocument(Tenant $tenant, UploadedFile $file, string $docType, User $uploader, ?string $expiryDate = null): TenantDocument
    {
        $path = $file->store("tenants/{$tenant->id}/documents", 'public');
        $url  = Storage::disk('public')->url($path);

        return TenantDocument::create([
            'tenant_id'     => $tenant->id,
            'document_type' => $docType,
            'file_url'      => $url,
            'original_name' => $file->getClientOriginalName(),
            'expiry_date'   => $expiryDate,
            'uploaded_by'   => $uploader->id,
            'uploaded_at'   => now(),
        ]);
    }

    public function generatePortalCredentials(Tenant $tenant): array
    {
        $plainPassword = Str::random(12);

        $tenant->update([
            'portal_access'        => true,
            'portal_password_hash' => Hash::make($plainPassword),
            'status'               => 'active',
        ]);

        return [
            'email'    => $tenant->email,
            'password' => $plainPassword,
        ];
    }

    public function getTenantWithRelations(Tenant $tenant): array
    {
        $tenant->load(['documents.uploader', 'activeLeases.space.floor']);

        return array_merge($tenant->toArray(), [
            'documents'    => $tenant->documents->map(fn ($d) => [
                'id'            => $d->id,
                'document_type' => $d->document_type,
                'file_url'      => $d->file_url,
                'original_name' => $d->original_name,
                'expiry_date'   => $d->expiry_date?->toDateString(),
                'uploaded_at'   => $d->uploaded_at?->toISOString(),
                'uploaded_by'   => $d->uploader?->name,
            ])->values(),
            'active_leases' => $tenant->activeLeases->map(fn ($l) => [
                'id'           => $l->id,
                'lease_code'   => $l->lease_code,
                'space_id'     => $l->space_id,
                'space'        => $l->space?->name,
                'floor'        => $l->space?->floor?->name,
                'start_date'   => $l->start_date?->toDateString(),
                'end_date'     => $l->end_date?->toDateString(),
                'monthly_rent' => $l->monthly_rent,
                'status'       => $l->status,
            ])->values(),
        ]);
    }
}
