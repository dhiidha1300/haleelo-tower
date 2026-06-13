'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { productsAPI } from '@/lib/api';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates,
  useSortable, rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Floor { id: number; name: string; level: number; }
interface ProductService {
  id: number;
  service_name: string;
  service_type: string;
  price: string;
  active: boolean;
}

const AMENITY_OPTIONS = ['projector','AC','WiFi','whiteboard','AV_system','stage','lighting','sound_system','lab_equipment','parking'];
const SERVICE_TYPES = [
  // Building operations
  { value: 'cleaning',         label: 'Cleaning Service' },
  { value: 'garbage',          label: 'Waste / Garbage Collection' },
  { value: 'maintenance',      label: 'General Maintenance' },
  { value: 'security',         label: 'Security Service' },
  { value: 'generator',        label: 'Power Backup / Generator' },
  { value: 'ac_service',       label: 'AC Maintenance' },
  // Connectivity & facilities
  { value: 'internet',         label: 'Internet Connection' },
  { value: 'parking',          label: 'Parking Space' },
  { value: 'storage',          label: 'Storage Space' },
  { value: 'printing',         label: 'Printing & Photocopying' },
  // Hospitality
  { value: 'coffee_tea',       label: 'Tea / Coffee Service' },
  { value: 'reception',        label: 'Receptionist Service' },
  { value: 'furniture',        label: 'Furniture / Equipment Rental' },
  // Event-specific
  { value: 'sound_system',     label: 'Sound System' },
  { value: 'projector_rental', label: 'Projector Rental' },
  { value: 'photography',      label: 'Photography' },
  { value: 'catering_package', label: 'Catering Package' },
  { value: 'dj',               label: 'DJ' },
  { value: 'cameraman',        label: 'Cameraman' },
  // Generic
  { value: 'other',            label: 'Other' },
];

// ── Sortable photo item ──────────────────────────────────────────────────────
function SortablePhoto({ url, onDelete }: { url: string; onDelete: (url: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: url });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}
      className="relative w-24 h-24 rounded-lg overflow-hidden bg-gray-100 group cursor-grab active:cursor-grabbing"
      {...attributes}
      {...listeners}
    >
      <img src={url} alt="" className="w-full h-full object-cover" />
      <button
        type="button"
        onClick={e => { e.stopPropagation(); onDelete(url); }}
        className="absolute inset-0 bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xl cursor-pointer"
      >×</button>
    </div>
  );
}

export default function EditProductPage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();
  const photoRef = useRef<HTMLInputElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const [floors, setFloors]         = useState<Floor[]>([]);
  const [services, setServices]     = useState<ProductService[]>([]);
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [uploading, setUploading]   = useState(false);
  const [message, setMessage]       = useState('');
  const [photos, setPhotos]         = useState<string[]>([]);

  // Add-on form state
  const [showAddOn, setShowAddOn]   = useState(false);
  const [editingService, setEditingService] = useState<ProductService | null>(null);
  const [addonForm, setAddonForm]   = useState({ service_name: '', service_type: 'cleaning', price: '' });
  const [savingAddon, setSavingAddon] = useState(false);

  const [form, setForm] = useState({
    name: '', type: 'conference_hall', floor_id: '',
    capacity: '', description: '', base_price: '',
    price_unit: 'per_session', status: 'active', amenities: [] as string[],
  });

  const fetchServices = () =>
    productsAPI.getServices(parseInt(id)).then(r => setServices(r.data));

  useEffect(() => {
    Promise.all([
      productsAPI.floors(),
      productsAPI.show(parseInt(id)),
      productsAPI.getServices(parseInt(id)),
    ]).then(([floorRes, productRes, servicesRes]) => {
      setFloors(floorRes.data);
      setServices(servicesRes.data);
      const p = productRes.data;
      setForm({
        name:       p.name ?? '',
        type:       p.type ?? 'conference_hall',
        floor_id:   String(p.floor_id ?? ''),
        capacity:   p.capacity != null ? String(p.capacity) : '',
        description: p.description ?? '',
        base_price: p.base_price ?? '',
        price_unit: p.price_unit ?? 'per_session',
        status:     p.status ?? 'active',
        amenities:  p.amenities ?? [],
      });
      setPhotos(p.photos ?? []);
    }).finally(() => setLoading(false));
  }, [id]);

  const toggleAmenity = (a: string) =>
    setForm(prev => ({
      ...prev,
      amenities: prev.amenities.includes(a)
        ? prev.amenities.filter(x => x !== a)
        : [...prev.amenities, a],
    }));

  // ── Photos ──────────────────────────────────────────────────────────────────
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = photos.indexOf(active.id as string);
    const newIndex = photos.indexOf(over.id as string);
    const reordered = arrayMove(photos, oldIndex, newIndex);
    setPhotos(reordered);
    await productsAPI.reorderPhotos(parseInt(id), reordered).catch(() => {});
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const res = await productsAPI.uploadPhoto(parseInt(id), file);
      setPhotos(res.data.photos ?? []);
      setMessage('✓ Photo uploaded');
      setTimeout(() => setMessage(''), 3000);
    } catch { setMessage('✗ Photo upload failed'); }
    finally { setUploading(false); if (photoRef.current) photoRef.current.value = ''; }
  };

  const handleDeletePhoto = async (url: string) => {
    if (!confirm('Delete this photo?')) return;
    const res = await productsAPI.deletePhoto(parseInt(id), url);
    setPhotos(res.data.photos ?? []);
  };

  // ── Main form ────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      await productsAPI.update(parseInt(id), {
        ...form,
        floor_id:   parseInt(form.floor_id),
        capacity:   form.capacity ? parseInt(form.capacity) : null,
        base_price: parseFloat(form.base_price) || 0,
      });
      setMessage('✓ Product saved');
      setTimeout(() => setMessage(''), 3000);
    } catch (err: any) {
      setMessage('✗ ' + (err.response?.data?.message || 'Failed to save'));
    } finally { setSaving(false); }
  };

  // ── Add-on services ──────────────────────────────────────────────────────────
  const openAddAddon = () => {
    setEditingService(null);
    setAddonForm({ service_name: '', service_type: 'cleaning', price: '' });
    setShowAddOn(true);
  };

  const openEditAddon = (s: ProductService) => {
    setEditingService(s);
    setAddonForm({ service_name: s.service_name, service_type: s.service_type, price: s.price });
    setShowAddOn(true);
  };

  const handleSaveAddon = async () => {
    if (!addonForm.service_name || !addonForm.price) return;
    setSavingAddon(true);
    try {
      if (editingService) {
        await productsAPI.updateService(parseInt(id), editingService.id, addonForm);
      } else {
        await productsAPI.addService(parseInt(id), addonForm);
      }
      await fetchServices();
      setShowAddOn(false);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to save add-on');
    } finally { setSavingAddon(false); }
  };

  const handleToggleAddon = async (s: ProductService) => {
    await productsAPI.updateService(parseInt(id), s.id, { active: !s.active });
    fetchServices();
  };

  const handleDeleteAddon = async (s: ProductService) => {
    if (!confirm(`Remove "${s.service_name}"?`)) return;
    await productsAPI.deleteService(parseInt(id), s.id);
    fetchServices();
  };

  if (loading) return <div className="text-center py-12">Loading…</div>;

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <button onClick={() => router.back()} className="text-sm text-gray-500 hover:text-[#1B2D4F] mb-2">← Back</button>
        <h1 className="text-3xl font-bold text-[#1B2D4F]">Edit Product</h1>
      </div>

      <div className="space-y-6">
        {/* ── Photos with drag-to-reorder ──────────────────────────────────── */}
        <div className="bg-white rounded-lg shadow p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-1">Photos</h2>
          <p className="text-xs text-gray-400 mb-3">Drag to reorder · Hover to delete</p>

          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={photos} strategy={rectSortingStrategy}>
              <div className="flex flex-wrap gap-3">
                {photos.map(url => (
                  <SortablePhoto key={url} url={url} onDelete={handleDeletePhoto} />
                ))}
                <label className={`w-24 h-24 rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:border-[#C9A052] transition-colors ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
                  <span className="text-2xl text-gray-300">+</span>
                  <span className="text-xs text-gray-400 mt-1">{uploading ? '…' : 'Upload'}</span>
                  <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                </label>
              </div>
            </SortableContext>
          </DndContext>
          <p className="text-xs text-gray-400 mt-2">Max 5 MB per image · First photo is the cover</p>
        </div>

        {/* ── Main form fields ─────────────────────────────────────────────── */}
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-5 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
              <input type="text" required value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A052]" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A052]">
                <option value="conference_hall">Conference Hall</option>
                <option value="office_space">Office Space</option>
                <option value="educational_space">Educational Space</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Floor</label>
              <select value={form.floor_id} onChange={e => setForm(p => ({ ...p, floor_id: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A052]">
                <option value="">Select floor…</option>
                {floors.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Capacity (seats)</label>
              <input type="number" min="1" value={form.capacity}
                onChange={e => setForm(p => ({ ...p, capacity: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A052]" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Base Price (USD)</label>
              <div className="flex items-center gap-2">
                <input type="number" min="0" step="0.01" value={form.base_price}
                  onChange={e => setForm(p => ({ ...p, base_price: e.target.value }))}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A052]" />
                <select value={form.price_unit} onChange={e => setForm(p => ({ ...p, price_unit: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A052]">
                  <option value="per_session">/ session</option>
                  <option value="per_month">/ month</option>
                  <option value="per_semester">/ semester</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A052]">
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea rows={3} value={form.description}
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A052] resize-none" />
            </div>
          </div>

          {/* Amenities */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Amenities</label>
            <div className="flex flex-wrap gap-2">
              {AMENITY_OPTIONS.map(a => (
                <button key={a} type="button" onClick={() => toggleAmenity(a)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    form.amenities.includes(a)
                      ? 'bg-[#1B2D4F] text-white border-[#1B2D4F]'
                      : 'bg-white text-gray-600 border-gray-300 hover:border-[#C9A052]'
                  }`}>
                  {a.replace(/_/g, ' ')}
                </button>
              ))}
            </div>
          </div>

          {message && (
            <div className={`p-3 rounded-lg text-sm ${message.startsWith('✓') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              {message}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving}
              className="bg-[#C9A052] hover:bg-[#b89140] text-white font-semibold px-6 py-2.5 rounded-lg transition-colors disabled:opacity-50">
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
            <button type="button" onClick={() => router.push('/dashboard/products')}
              className="px-6 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors">
              Cancel
            </button>
          </div>
        </form>

        {/* ── Add-on Services ──────────────────────────────────────────────── */}
        <div className="bg-white rounded-lg shadow p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold text-[#1B2D4F]">Add-on Services</h2>
              <p className="text-xs text-gray-400 mt-0.5">Space-specific services bookable alongside this product</p>
            </div>
            <button onClick={openAddAddon}
              className="text-sm font-medium text-[#C9A052] hover:text-[#b89140] border border-[#C9A052] px-3 py-1.5 rounded-lg transition-colors">
              + Add Service
            </button>
          </div>

          {/* Add / Edit inline form */}
          {showAddOn && (
            <div className="mb-4 p-4 bg-gray-50 border border-gray-200 rounded-lg space-y-3">
              <p className="text-sm font-medium text-gray-700">{editingService ? 'Edit Add-on' : 'New Add-on'}</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Service Name *</label>
                  <input type="text" value={addonForm.service_name}
                    onChange={e => setAddonForm(p => ({ ...p, service_name: e.target.value }))}
                    placeholder="e.g. Monthly Cleaning"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A052]" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Type *</label>
                  <select value={addonForm.service_type}
                    onChange={e => setAddonForm(p => ({ ...p, service_type: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A052]">
                    {SERVICE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Price (USD) *</label>
                  <input type="number" min="0" step="0.01" value={addonForm.price}
                    onChange={e => setAddonForm(p => ({ ...p, price: e.target.value }))}
                    placeholder="0.00"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A052]" />
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={handleSaveAddon} disabled={savingAddon}
                  className="bg-[#C9A052] text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50">
                  {savingAddon ? 'Saving…' : editingService ? 'Save Changes' : 'Add Service'}
                </button>
                <button onClick={() => setShowAddOn(false)}
                  className="border border-gray-300 px-4 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
                  Cancel
                </button>
              </div>
            </div>
          )}

          {services.length === 0 ? (
            <p className="text-sm text-gray-400 italic text-center py-4">
              No add-on services defined for this product yet.
            </p>
          ) : (
            <div className="divide-y">
              {services.map(s => (
                <div key={s.id} className={`flex items-center justify-between py-3 ${!s.active ? 'opacity-50' : ''}`}>
                  <div>
                    <p className="text-sm font-medium text-[#1B2D4F]">{s.service_name}</p>
                    <p className="text-xs text-gray-400 capitalize">{s.service_type.replace('_', ' ')}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-semibold text-gray-700">${parseFloat(s.price).toFixed(2)}</span>
                    <div className="flex items-center gap-2">
                      <button onClick={() => openEditAddon(s)}
                        className="text-xs text-[#C9A052] hover:underline">Edit</button>
                      <button onClick={() => handleToggleAddon(s)}
                        className={`text-xs ${s.active ? 'text-gray-400 hover:text-gray-600' : 'text-green-600 hover:text-green-800'}`}>
                        {s.active ? 'Disable' : 'Enable'}
                      </button>
                      <button onClick={() => handleDeleteAddon(s)}
                        className="text-xs text-red-500 hover:text-red-700">Remove</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
