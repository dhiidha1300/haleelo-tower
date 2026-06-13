'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { bookingsAPI, productsAPI, cateringAPI } from '@/lib/api';

interface Space {
  id: number;
  name: string;
  type: string;
  base_price: string;
  price_unit: string;
  floor: { name: string } | null;
}
interface CateringPackage { id: number; name: string; base_price: string; }

export default function CreateBookingPage() {
  const router = useRouter();
  const [spaces, setSpaces]     = useState<Space[]>([]);
  const [catering, setCatering] = useState<CateringPackage[]>([]);
  const [loading, setLoading]   = useState(false);
  const [checking, setChecking] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [message, setMessage]   = useState('');

  const [form, setForm] = useState({
    product_id: '', client_name: '', client_company: '',
    client_email: '', client_phone: '', client_national_id: '',
    session_type: 'morning', booking_date: '',
    start_time: '', end_time: '',
    catering_package_id: '', dj_requested: false,
    cameraman_requested: false, notes: '',
    base_price: '', catering_price: '0', dj_price: '0',
    cameraman_price: '0',
    recurring: false,
    recurrence_frequency: 'weekly',
    recurrence_days: [] as string[],
    recurrence_end_date: '',
  });

  const WEEK_DAYS = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];

  const toggleDay = (day: string) =>
    setForm(p => ({
      ...p,
      recurrence_days: p.recurrence_days.includes(day)
        ? p.recurrence_days.filter(d => d !== day)
        : [...p.recurrence_days, day],
    }));

  useEffect(() => {
    productsAPI.list({ type: 'conference_hall', status: 'active' }).then(r => setSpaces(r.data.data ?? []));
    cateringAPI.list().then(r => setCatering(r.data.filter((p: any) => p.active)));
  }, []);

  const selectedSpace = spaces.find(s => String(s.id) === form.product_id);
  const totalPrice = (
    parseFloat(form.base_price || '0') +
    parseFloat(form.catering_price || '0') +
    parseFloat(form.dj_requested ? form.dj_price || '0' : '0') +
    parseFloat(form.cameraman_requested ? form.cameraman_price || '0' : '0')
  ).toFixed(2);

  const handleProductChange = (productId: string) => {
    const space = spaces.find(s => String(s.id) === productId);
    setForm(p => ({ ...p, product_id: productId, base_price: space?.base_price ?? '0' }));
    setAvailable(null);
  };

  const handleCateringChange = (id: string) => {
    const pkg = catering.find(c => String(c.id) === id);
    setForm(p => ({ ...p, catering_package_id: id, catering_price: pkg?.base_price ?? '0' }));
  };

  const checkAvailability = async () => {
    if (!form.product_id || !form.booking_date) return;
    setChecking(true);
    try {
      const res = await bookingsAPI.checkAvailability({
        product_id:   parseInt(form.product_id),
        session_type: form.session_type,
        booking_date: form.booking_date,
        start_time:   form.start_time || '08:00',
        end_time:     form.end_time   || '13:00',
      });
      setAvailable(res.data.available);
    } finally {
      setChecking(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      const payload: any = {
        product_id:          parseInt(form.product_id),
        client_name:         form.client_name,
        client_company:      form.client_company,
        client_email:        form.client_email,
        client_phone:        form.client_phone,
        client_national_id:  form.client_national_id,
        session_type:        form.session_type,
        booking_date:        form.booking_date,
        catering_package_id: form.catering_package_id ? parseInt(form.catering_package_id) : null,
        dj_requested:        form.dj_requested,
        cameraman_requested: form.cameraman_requested,
        base_price:          parseFloat(form.base_price || '0'),
        catering_price:      parseFloat(form.catering_price || '0'),
        dj_price:            parseFloat(form.dj_price || '0'),
        cameraman_price:     parseFloat(form.cameraman_price || '0'),
        notes:               form.notes,
        type:                'conference_hall',
        recurring:           form.recurring,
      };
      if (form.session_type === 'custom') {
        payload.start_time = form.start_time;
        payload.end_time   = form.end_time;
      }
      if (form.recurring && form.recurrence_end_date) {
        payload.recurrence_rule = {
          frequency: form.recurrence_frequency,
          days:      form.recurrence_days,
          end_date:  form.recurrence_end_date,
        };
      }
      const res = await bookingsAPI.create(payload);
      router.push(`/dashboard/bookings/${res.data.id}`);
    } catch (err: any) {
      setMessage(err.response?.data?.message || 'Failed to create booking');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <button onClick={() => router.back()} className="text-sm text-gray-500 hover:text-[#1B2D4F] mb-2">← Back</button>
        <h1 className="text-3xl font-bold text-[#1B2D4F]">New Booking</h1>
        <p className="text-gray-500 text-sm">Book a conference hall on behalf of a client</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Space & Session */}
        <div className="bg-white rounded-lg shadow p-5 space-y-4">
          <h2 className="font-semibold text-[#1B2D4F]">Space & Session</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Conference Hall *</label>
            <select required value={form.product_id} onChange={e => handleProductChange(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A052]">
              <option value="">Select a hall…</option>
              {spaces.map(s => (
                <option key={s.id} value={s.id}>{s.name} — {s.floor?.name} (${s.base_price}/{s.price_unit.replace('per_','')})</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Booking Date *</label>
              <input type="date" required value={form.booking_date}
                onChange={e => { setForm(p => ({ ...p, booking_date: e.target.value })); setAvailable(null); }}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A052]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Session *</label>
              <select value={form.session_type} onChange={e => { setForm(p => ({ ...p, session_type: e.target.value })); setAvailable(null); }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A052]">
                <option value="morning">Morning (08:00–13:00)</option>
                <option value="afternoon">Afternoon (15:00–18:30)</option>
                <option value="evening">Evening (19:00–23:00)</option>
                <option value="custom">Custom</option>
              </select>
            </div>
          </div>

          {form.session_type === 'custom' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Time *</label>
                <input type="time" required value={form.start_time}
                  onChange={e => setForm(p => ({ ...p, start_time: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A052]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Time *</label>
                <input type="time" required value={form.end_time}
                  onChange={e => setForm(p => ({ ...p, end_time: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A052]" />
              </div>
            </div>
          )}

          {form.product_id && form.booking_date && (
            <div className="flex items-center gap-3">
              <button type="button" onClick={checkAvailability} disabled={checking}
                className="px-4 py-2 text-sm font-medium border border-[#1B2D4F] text-[#1B2D4F] rounded-lg hover:bg-[#1B2D4F] hover:text-white transition-colors disabled:opacity-50">
                {checking ? 'Checking…' : 'Check Availability'}
              </button>
              {available === true && <span className="text-green-600 text-sm font-medium">✓ Available</span>}
              {available === false && <span className="text-red-600 text-sm font-medium">✗ Already booked — will be waitlisted</span>}
            </div>
          )}
        </div>

        {/* Client Details */}
        <div className="bg-white rounded-lg shadow p-5 space-y-4">
          <h2 className="font-semibold text-[#1B2D4F]">Client Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
              <input type="text" required value={form.client_name}
                onChange={e => setForm(p => ({ ...p, client_name: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A052]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
              <input type="text" value={form.client_company}
                onChange={e => setForm(p => ({ ...p, client_company: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A052]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
              <input type="email" required value={form.client_email}
                onChange={e => setForm(p => ({ ...p, client_email: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A052]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
              <input type="tel" required value={form.client_phone}
                onChange={e => setForm(p => ({ ...p, client_phone: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A052]" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">National ID</label>
              <input type="text" value={form.client_national_id}
                onChange={e => setForm(p => ({ ...p, client_national_id: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A052]" />
            </div>
          </div>
        </div>

        {/* Add-ons */}
        <div className="bg-white rounded-lg shadow p-5 space-y-4">
          <h2 className="font-semibold text-[#1B2D4F]">Add-ons & Pricing</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Catering Package</label>
            <select value={form.catering_package_id} onChange={e => handleCateringChange(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A052]">
              <option value="">No catering</option>
              {catering.map(c => (
                <option key={c.id} value={c.id}>{c.name} (${c.base_price})</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.dj_requested}
                onChange={e => setForm(p => ({ ...p, dj_requested: e.target.checked }))}
                className="w-4 h-4 text-[#C9A052]" />
              <span className="text-sm text-gray-700">DJ Add-on</span>
            </label>
            {form.dj_requested && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Price:</span>
                <input type="number" min="0" value={form.dj_price}
                  onChange={e => setForm(p => ({ ...p, dj_price: e.target.value }))}
                  className="w-24 px-2 py-1 border border-gray-300 rounded text-sm" />
              </div>
            )}
          </div>

          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.cameraman_requested}
                onChange={e => setForm(p => ({ ...p, cameraman_requested: e.target.checked }))}
                className="w-4 h-4 text-[#C9A052]" />
              <span className="text-sm text-gray-700">Cameraman Add-on</span>
            </label>
            {form.cameraman_requested && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Price:</span>
                <input type="number" min="0" value={form.cameraman_price}
                  onChange={e => setForm(p => ({ ...p, cameraman_price: e.target.value }))}
                  className="w-24 px-2 py-1 border border-gray-300 rounded text-sm" />
              </div>
            )}
          </div>

          {/* Base price */}
          <div className="flex items-center gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Base Price (USD)</label>
              <input type="number" min="0" step="0.01" value={form.base_price}
                onChange={e => setForm(p => ({ ...p, base_price: e.target.value }))}
                className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A052]" />
            </div>
            <div className="mt-5 border-t border-gray-200 pt-4">
              <span className="text-lg font-bold text-[#1B2D4F]">Total: ${totalPrice}</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Internal Notes</label>
            <textarea rows={2} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A052] resize-none" />
          </div>
        </div>

        {/* Recurring booking toggle */}
        <div className="border-t pt-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={form.recurring}
              onChange={e => setForm(p => ({ ...p, recurring: e.target.checked }))}
              className="w-4 h-4 text-[#C9A052]" />
            <span className="text-sm font-medium text-gray-700">Recurring Booking</span>
          </label>

          {form.recurring && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Frequency</label>
                  <select value={form.recurrence_frequency}
                    onChange={e => setForm(p => ({ ...p, recurrence_frequency: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A052]">
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly (same day)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Repeat Until *</label>
                  <input type="date" value={form.recurrence_end_date}
                    min={form.booking_date || new Date().toISOString().split('T')[0]}
                    onChange={e => setForm(p => ({ ...p, recurrence_end_date: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A052]" />
                </div>
              </div>

              {form.recurrence_frequency === 'weekly' && (
                <div>
                  <label className="block text-xs text-gray-500 mb-2">Repeat on days (leave blank for same day each week)</label>
                  <div className="flex flex-wrap gap-2">
                    {WEEK_DAYS.map(day => (
                      <button key={day} type="button" onClick={() => toggleDay(day)}
                        className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors capitalize ${
                          form.recurrence_days.includes(day)
                            ? 'bg-[#1B2D4F] text-white border-[#1B2D4F]'
                            : 'bg-white text-gray-600 border-gray-300 hover:border-[#C9A052]'
                        }`}>
                        {day.slice(0, 3)}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <p className="text-xs text-amber-600">
                Each occurrence will go through the full 4-step approval chain independently.
              </p>
            </div>
          )}
        </div>

        {message && (
          <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{message}</div>
        )}

        <div className="flex gap-3">
          <button type="submit" disabled={loading}
            className="bg-[#C9A052] hover:bg-[#b89140] text-white font-semibold px-6 py-2.5 rounded-lg transition-colors disabled:opacity-50">
            {loading ? 'Creating…' : 'Create Booking'}
          </button>
          <button type="button" onClick={() => router.back()}
            className="px-6 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
