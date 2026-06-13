'use client';

import { useState, useEffect } from 'react';
import { cateringAPI, settingsAPI } from '@/lib/api';

interface PackageItem {
  id?: number;
  service_name: string;
  description: string;
}

interface Package {
  id: number;
  name: string;
  slug: string;
  description: string;
  base_price: string;
  active: boolean;
  items: PackageItem[];
}

interface CateringSettingsProps {
  settings: any;
  onUpdate: () => void;
}

const emptyForm = {
  name: '',
  description: '',
  base_price: '0.00',
  active: true,
  items: [] as PackageItem[],
};

export function CateringSettings({ settings, onUpdate }: CateringSettingsProps) {
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | 'new' | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [addonPrices, setAddonPrices] = useState({ dj: '0.00', cameraman: '0.00' });
  const [savingAddon, setSavingAddon] = useState(false);
  const [savingPackage, setSavingPackage] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadPackages();
  }, []);

  useEffect(() => {
    setAddonPrices({
      dj: settings?.addon_dj_price || '0.00',
      cameraman: settings?.addon_cameraman_price || '0.00',
    });
  }, [settings]);

  const loadPackages = async () => {
    try {
      setLoading(true);
      const res = await cateringAPI.list();
      setPackages(res.data);
    } catch {
      showMessage('✗ Failed to load packages');
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(''), 3000);
  };

  const startEdit = (pkg: Package) => {
    setEditingId(pkg.id);
    setForm({
      name: pkg.name,
      description: pkg.description || '',
      base_price: pkg.base_price,
      active: pkg.active,
      items: pkg.items.map(i => ({ id: i.id, service_name: i.service_name, description: i.description || '' })),
    });
  };

  const startNew = () => {
    setEditingId('new');
    setForm(emptyForm);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(emptyForm);
  };

  const savePackage = async () => {
    if (!form.name.trim()) return showMessage('✗ Package name is required');
    setSavingPackage(true);
    try {
      if (editingId === 'new') {
        await cateringAPI.create(form);
        showMessage('✓ Package created');
      } else {
        await cateringAPI.update(editingId as number, form);
        showMessage('✓ Package updated');
      }
      await loadPackages();
      setEditingId(null);
      setForm(emptyForm);
    } catch {
      showMessage('✗ Failed to save package');
    } finally {
      setSavingPackage(false);
    }
  };

  const togglePackage = async (pkg: Package) => {
    try {
      await cateringAPI.toggle(pkg.id);
      await loadPackages();
      showMessage(`✓ ${pkg.name} ${pkg.active ? 'deactivated' : 'activated'}`);
    } catch {
      showMessage('✗ Failed to toggle package');
    }
  };

  const deletePackage = async (pkg: Package) => {
    if (!confirm(`Delete "${pkg.name}" package? This cannot be undone.`)) return;
    try {
      await cateringAPI.destroy(pkg.id);
      await loadPackages();
      showMessage('✓ Package deleted');
    } catch {
      showMessage('✗ Failed to delete package');
    }
  };

  const addItem = () => {
    setForm(prev => ({ ...prev, items: [...prev.items, { service_name: '', description: '' }] }));
  };

  const updateItem = (index: number, field: 'service_name' | 'description', value: string) => {
    setForm(prev => {
      const items = [...prev.items];
      items[index] = { ...items[index], [field]: value };
      return { ...prev, items };
    });
  };

  const removeItem = (index: number) => {
    setForm(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }));
  };

  const saveAddonPrices = async () => {
    setSavingAddon(true);
    try {
      await settingsAPI.updateSingle('addon_dj_price', addonPrices.dj, 'DJ add-on price');
      await settingsAPI.updateSingle('addon_cameraman_price', addonPrices.cameraman, 'Cameraman add-on price');
      showMessage('✓ Add-on prices updated');
      onUpdate();
    } catch {
      showMessage('✗ Failed to update add-on prices');
    } finally {
      setSavingAddon(false);
    }
  };

  if (loading) return <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-[#1B2D4F] border-t-[#C9A052] rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h2 className="text-2xl font-bold text-[#1B2D4F] mb-1">Catering Package Configuration</h2>
        <p className="text-gray-600 text-sm">Manage Silver, Gold, and Platinum catering packages available for conference hall bookings.</p>
      </div>

      {message && (
        <div className={`p-3 rounded-lg text-sm font-medium ${message.startsWith('✓') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {message}
        </div>
      )}

      {/* Package List */}
      <div className="space-y-4">
        {packages.map(pkg => (
          <div key={pkg.id} className={`border rounded-lg overflow-hidden ${!pkg.active ? 'opacity-60' : ''}`}>
            {editingId === pkg.id ? (
              <PackageForm
                form={form}
                setForm={setForm}
                onSave={savePackage}
                onCancel={cancelEdit}
                saving={savingPackage}
                onAddItem={addItem}
                onUpdateItem={updateItem}
                onRemoveItem={removeItem}
              />
            ) : (
              <div className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-lg font-semibold text-[#1B2D4F]">{pkg.name}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${pkg.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {pkg.active ? 'Active' : 'Inactive'}
                      </span>
                      <span className="text-sm font-semibold text-[#C9A052]">
                        ${parseFloat(pkg.base_price).toFixed(2)}
                      </span>
                    </div>
                    {pkg.description && <p className="text-sm text-gray-600 mb-3">{pkg.description}</p>}
                    <ul className="space-y-1">
                      {pkg.items.map(item => (
                        <li key={item.id} className="flex items-start gap-2 text-sm text-gray-700">
                          <span className="text-[#C9A052] mt-0.5">•</span>
                          <span><span className="font-medium">{item.service_name}</span>{item.description ? ` — ${item.description}` : ''}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={() => startEdit(pkg)} className="text-sm px-3 py-1.5 border border-[#1B2D4F] text-[#1B2D4F] rounded-lg hover:bg-gray-50 transition-colors">Edit</button>
                    <button onClick={() => togglePackage(pkg)} className={`text-sm px-3 py-1.5 rounded-lg transition-colors ${pkg.active ? 'border border-gray-300 text-gray-600 hover:bg-gray-50' : 'border border-green-500 text-green-600 hover:bg-green-50'}`}>
                      {pkg.active ? 'Deactivate' : 'Activate'}
                    </button>
                    <button onClick={() => deletePackage(pkg)} className="text-sm px-3 py-1.5 border border-red-300 text-red-500 rounded-lg hover:bg-red-50 transition-colors">Delete</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}

        {/* New Package Form */}
        {editingId === 'new' && (
          <div className="border-2 border-dashed border-[#C9A052] rounded-lg overflow-hidden">
            <PackageForm
              form={form}
              setForm={setForm}
              onSave={savePackage}
              onCancel={cancelEdit}
              saving={savingPackage}
              onAddItem={addItem}
              onUpdateItem={updateItem}
              onRemoveItem={removeItem}
            />
          </div>
        )}

        {editingId === null && (
          <button onClick={startNew} className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-[#C9A052] hover:text-[#C9A052] transition-colors text-sm font-medium">
            + Add New Package
          </button>
        )}
      </div>

      {/* DJ & Cameraman Add-on Prices */}
      <div className="border-t pt-8">
        <h3 className="text-lg font-semibold text-[#1B2D4F] mb-1">Add-on Pricing</h3>
        <p className="text-gray-600 text-sm mb-5">System-wide prices for DJ and Cameraman services. Applies to all conference hall bookings.</p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">DJ Add-on Price (USD)</label>
            <div className="flex items-center gap-2">
              <span className="text-gray-500 font-medium">$</span>
              <input
                type="number"
                value={addonPrices.dj}
                onChange={e => setAddonPrices(p => ({ ...p, dj: e.target.value }))}
                step="0.01"
                min="0"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A052]"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Cameraman Add-on Price (USD)</label>
            <div className="flex items-center gap-2">
              <span className="text-gray-500 font-medium">$</span>
              <input
                type="number"
                value={addonPrices.cameraman}
                onChange={e => setAddonPrices(p => ({ ...p, cameraman: e.target.value }))}
                step="0.01"
                min="0"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A052]"
              />
            </div>
          </div>
        </div>
        <button
          onClick={saveAddonPrices}
          disabled={savingAddon}
          className="mt-4 bg-[#C9A052] hover:bg-[#b89140] text-white font-semibold py-2 px-6 rounded-lg transition-colors disabled:opacity-50"
        >
          {savingAddon ? 'Saving...' : 'Save Add-on Prices'}
        </button>
      </div>
    </div>
  );
}

/* ── Inline package editor ── */
function PackageForm({
  form, setForm, onSave, onCancel, saving, onAddItem, onUpdateItem, onRemoveItem,
}: {
  form: typeof emptyForm;
  setForm: React.Dispatch<React.SetStateAction<typeof emptyForm>>;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  onAddItem: () => void;
  onUpdateItem: (i: number, f: 'service_name' | 'description', v: string) => void;
  onRemoveItem: (i: number) => void;
}) {
  return (
    <div className="p-5 bg-gray-50 space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Package Name *</label>
          <input
            type="text"
            value={form.name}
            onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
            placeholder="e.g. Silver"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A052]"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Base Price (USD)</label>
          <div className="flex items-center gap-1">
            <span className="text-gray-500 text-sm">$</span>
            <input
              type="number"
              value={form.base_price}
              onChange={e => setForm(p => ({ ...p, base_price: e.target.value }))}
              step="0.01"
              min="0"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A052]"
            />
          </div>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
        <textarea
          value={form.description}
          onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
          rows={2}
          placeholder="Brief description of this package..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A052]"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-medium text-gray-600">Included Services / Items</label>
          <button type="button" onClick={onAddItem} className="text-xs text-[#C9A052] hover:underline font-medium">+ Add Item</button>
        </div>
        <div className="space-y-2">
          {form.items.map((item, i) => (
            <div key={i} className="flex gap-2 items-start">
              <input
                type="text"
                value={item.service_name}
                onChange={e => onUpdateItem(i, 'service_name', e.target.value)}
                placeholder="Service name *"
                className="w-40 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A052]"
              />
              <input
                type="text"
                value={item.description}
                onChange={e => onUpdateItem(i, 'description', e.target.value)}
                placeholder="Description (optional)"
                className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A052]"
              />
              <button type="button" onClick={() => onRemoveItem(i)} className="text-red-400 hover:text-red-600 text-lg leading-none px-1 pt-1">×</button>
            </div>
          ))}
          {form.items.length === 0 && <p className="text-xs text-gray-400 italic">No items yet. Click "Add Item" to add included services.</p>}
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="bg-[#C9A052] hover:bg-[#b89140] text-white font-semibold py-2 px-6 rounded-lg text-sm transition-colors disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Package'}
        </button>
        <button type="button" onClick={onCancel} className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-2 px-6 rounded-lg text-sm transition-colors">
          Cancel
        </button>
      </div>
    </div>
  );
}
