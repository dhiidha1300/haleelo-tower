'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { tenantsAPI } from '@/lib/api';
import { usePermission } from '@/lib/permissions';

const DOC_TYPES = [
  { value: 'lease_agreement', label: 'Lease Agreement' },
  { value: 'kyc', label: 'KYC Document' },
  { value: 'business_registration', label: 'Business Registration' },
  { value: 'notarised', label: 'Notarised Document' },
  { value: 'other', label: 'Other' },
];

export default function TenantDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();
  const { hasPermission, isSuperAdmin, isAdmin } = usePermission();
  const docRef  = useRef<HTMLInputElement>(null);

  const [tenant, setTenant]   = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving]   = useState(false);
  const [uploading, setUploading] = useState(false);
  const [docType, setDocType] = useState('kyc');
  const [docExpiry, setDocExpiry] = useState('');
  const [message, setMessage] = useState('');
  const [editForm, setEditForm] = useState<any>({});
  const [credentials, setCredentials] = useState<{ email: string; password: string } | null>(null);

  const fetchTenant = async () => {
    try {
      const res = await tenantsAPI.show(parseInt(id));
      setTenant(res.data);
      setEditForm({
        company_name:        res.data.company_name,
        contact_person_name: res.data.contact_person_name,
        email:               res.data.email,
        phone:               res.data.phone,
        national_id:         res.data.national_id ?? '',
        type:                res.data.type,
        status:              res.data.status,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTenant(); }, [id]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await tenantsAPI.update(parseInt(id), editForm);
      setEditing(false);
      fetchTenant();
      setMessage('✓ Tenant updated');
      setTimeout(() => setMessage(''), 3000);
    } catch (err: any) {
      setMessage('✗ ' + (err.response?.data?.message || 'Update failed'));
    } finally {
      setSaving(false);
    }
  };

  const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await tenantsAPI.uploadDocument(parseInt(id), file, docType, docExpiry || undefined);
      fetchTenant();
      setMessage('✓ Document uploaded');
      setTimeout(() => setMessage(''), 3000);
    } catch {
      setMessage('✗ Upload failed');
    } finally {
      setUploading(false);
      setDocExpiry('');
      if (docRef.current) docRef.current.value = '';
    }
  };

  const handleGeneratePortal = async () => {
    if (!confirm('Generate portal credentials for this tenant? This will overwrite any existing password.')) return;
    try {
      const res = await tenantsAPI.generatePortalCredentials(parseInt(id));
      setCredentials({ email: res.data.email, password: res.data.password });
      fetchTenant();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to generate credentials');
    }
  };

  if (loading) return <div className="text-center py-12">Loading…</div>;
  if (!tenant)  return <div className="text-center py-12 text-gray-500">Tenant not found.</div>;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <button onClick={() => router.back()} className="text-sm text-gray-500 hover:text-[#1B2D4F] mb-2">← Back</button>
          <h1 className="text-3xl font-bold text-[#1B2D4F]">{tenant.company_name}</h1>
          <p className="text-gray-500 text-sm capitalize">{tenant.type.replace('_',' ')} · {tenant.status}</p>
        </div>
        <div className="flex gap-2">
          {(isSuperAdmin || isAdmin) && (
            <button onClick={handleGeneratePortal}
              className="border border-[#1B2D4F] text-[#1B2D4F] px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#1B2D4F] hover:text-white transition-colors">
              {tenant.portal_access ? '🔄 Reset Portal' : '🌐 Grant Portal'}
            </button>
          )}
          {hasPermission('create-booking') && (
            <button onClick={() => router.push(`/dashboard/leases/create?tenant_id=${tenant.id}`)}
              className="bg-[#C9A052] hover:bg-[#b89140] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
              + New Lease
            </button>
          )}
        </div>
      </div>

      {credentials && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="font-semibold text-green-800 mb-1">Portal Credentials Generated</p>
          <p className="text-sm text-green-700">Email: <strong>{credentials.email}</strong></p>
          <p className="text-sm text-green-700">Password: <strong className="font-mono">{credentials.password}</strong></p>
          <p className="text-xs text-green-600 mt-1">Share these with the tenant immediately. The password cannot be retrieved again.</p>
          <button onClick={() => setCredentials(null)} className="mt-2 text-xs text-green-600 hover:underline">Dismiss</button>
        </div>
      )}

      {message && (
        <div className={`p-3 rounded-lg text-sm ${message.startsWith('✓') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {message}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">
          {/* Details */}
          <div className="bg-white rounded-lg shadow p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-[#1B2D4F]">Tenant Details</h2>
              {hasPermission('manage-tenants') && (
                <button onClick={() => setEditing(!editing)}
                  className="text-sm text-[#C9A052] hover:text-[#b89140] font-medium">
                  {editing ? 'Cancel' : 'Edit'}
                </button>
              )}
            </div>

            {editing ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(['company_name','contact_person_name','email','phone','national_id'] as const).map(key => (
                  <div key={key}>
                    <label className="block text-xs text-gray-500 mb-1 capitalize">{key.replace(/_/g,' ')}</label>
                    <input type="text" value={editForm[key] ?? ''}
                      onChange={e => setEditForm((p: any) => ({ ...p, [key]: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A052]" />
                  </div>
                ))}
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Type</label>
                  <select value={editForm.type} onChange={e => setEditForm((p: any) => ({ ...p, type: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A052]">
                    <option value="office">Office</option>
                    <option value="educational">Educational</option>
                    <option value="conference_client">Conference Client</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Status</label>
                  <select value={editForm.status} onChange={e => setEditForm((p: any) => ({ ...p, status: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A052]">
                    <option value="pending">Pending</option>
                    <option value="active">Active</option>
                    <option value="terminated">Terminated</option>
                  </select>
                </div>
                <div className="md:col-span-2 flex gap-3">
                  <button onClick={handleSave} disabled={saving}
                    className="bg-[#C9A052] text-white px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-50">
                    {saving ? 'Saving…' : 'Save'}
                  </button>
                  <button onClick={() => setEditing(false)}
                    className="border px-5 py-2 rounded-lg text-sm text-gray-600">Cancel</button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 text-sm">
                {[
                  ['Company', tenant.company_name],
                  ['Contact Person', tenant.contact_person_name],
                  ['Email', tenant.email],
                  ['Phone', tenant.phone],
                  ['National ID', tenant.national_id ?? '—'],
                  ['Type', tenant.type.replace('_',' ')],
                  ['Status', tenant.status],
                  ['Portal Access', tenant.portal_access ? 'Yes' : 'No'],
                ].map(([label, value]) => (
                  <div key={label}><p className="text-gray-400">{label}</p><p className="font-medium capitalize">{value}</p></div>
                ))}
              </div>
            )}
          </div>

          {/* Active Leases */}
          {tenant.active_leases?.length > 0 && (
            <div className="bg-white rounded-lg shadow p-5">
              <h2 className="font-semibold text-[#1B2D4F] mb-3">Active Leases</h2>
              <div className="space-y-3">
                {tenant.active_leases.map((l: any) => (
                  <div key={l.id} className="flex items-center justify-between border rounded-lg p-3">
                    <div>
                      <p className="font-medium text-sm text-[#1B2D4F]">{l.space}</p>
                      <p className="text-xs text-gray-400">{l.floor} · {l.start_date} → {l.end_date}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">${l.monthly_rent}/mo</p>
                      <button onClick={() => router.push(`/dashboard/leases/${l.id}`)}
                        className="text-xs text-[#C9A052] hover:underline">View lease</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Documents */}
        <div className="space-y-5">
          <div className="bg-white rounded-lg shadow p-5">
            <h2 className="font-semibold text-[#1B2D4F] mb-3">Documents</h2>

            {hasPermission('manage-tenant-documents') && (
              <div className="mb-4 space-y-2">
                <select value={docType} onChange={e => setDocType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A052]">
                  {DOC_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Expiry date <span className="text-gray-400">(optional — alerts 30 days before)</span></label>
                  <input type="date" value={docExpiry} onChange={e => setDocExpiry(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A052]" />
                </div>
                <label className={`flex items-center justify-center gap-2 w-full py-2.5 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-[#C9A052] text-sm text-gray-500 transition-colors ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
                  {uploading ? 'Uploading…' : '+ Upload Document'}
                  <input ref={docRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={handleDocUpload} />
                </label>
              </div>
            )}

            {tenant.documents?.length === 0 ? (
              <p className="text-sm text-gray-400 italic">No documents uploaded</p>
            ) : (
              <div className="space-y-2">
                {tenant.documents?.map((d: any) => {
                  const expiringSoon = d.expiry_date && new Date(d.expiry_date) <= new Date(Date.now() + 30 * 86400000);
                  const expired = d.expiry_date && new Date(d.expiry_date) < new Date();
                  return (
                  <a key={d.id} href={d.file_url} target="_blank" rel="noreferrer"
                    className="flex items-center justify-between p-2.5 border rounded-lg hover:bg-gray-50 transition-colors">
                    <div>
                      <p className="text-sm font-medium text-[#1B2D4F]">
                        {DOC_TYPES.find(t => t.value === d.document_type)?.label ?? d.document_type}
                      </p>
                      <p className="text-xs text-gray-400">{d.original_name}</p>
                      {d.expiry_date && (
                        <p className={`text-xs mt-0.5 ${expired ? 'text-red-600 font-medium' : expiringSoon ? 'text-amber-600 font-medium' : 'text-gray-400'}`}>
                          {expired ? '⚠ Expired ' : expiringSoon ? '⏳ Expires ' : 'Expires '}{d.expiry_date}
                        </p>
                      )}
                    </div>
                    <span className="text-xs text-[#C9A052]">↓</span>
                  </a>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
