'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { bookingsAPI, productsAPI, cateringAPI, couponsAPI, waitingListAPI } from '@/lib/api';

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
    coupon_code: '',
  });
  const [couponInfo, setCouponInfo] = useState<{ discount_percent: number; owner: string } | null>(null);
  const [couponMsg, setCouponMsg]   = useState('');
  // Waiting-list overlay (shown when the slot is unavailable)
  const [showWaitlist, setShowWaitlist] = useState(false);
  const [waitlistChannel, setWaitlistChannel] = useState('email');
  const [waitlistMsg, setWaitlistMsg] = useState('');
  const [waitlistBusy, setWaitlistBusy] = useState(false);

  const addToWaitlist = async () => {
    setWaitlistBusy(true); setWaitlistMsg('');
    try {
      await waitingListAPI.add({
        product_id: parseInt(form.product_id), session_type: form.session_type,
        booking_date: form.booking_date, client_name: form.client_name,
        client_email: form.client_email, client_phone: form.client_phone,
        notify_channel: waitlistChannel,
      });
      setWaitlistMsg('✓ Added to the waiting list — the customer has been notified.');
      setTimeout(() => { setShowWaitlist(false); router.push('/dashboard/waiting-list'); }, 1600);
    } catch (err: any) {
      setWaitlistMsg('✗ ' + (err.response?.data?.message || 'Failed to add to waiting list'));
    } finally { setWaitlistBusy(false); }
  };
  // Product (space) services available as booking add-ons.
  const [services, setServices] = useState<any[]>([]);
  const [svcSel, setSvcSel] = useState<Record<number, { checked: boolean; price: string }>>({});

  // Prefill date/time when arriving from the calendar (click a day / drag a range).
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const date = sp.get('date'); const start = sp.get('start'); const end = sp.get('end');
    if (date || start || end) {
      setForm(p => ({
        ...p,
        ...(date ? { booking_date: date } : {}),
        ...(start ? { start_time: start } : {}),
        ...(end ? { end_time: end } : {}),
      }));
    }
  }, []);

  const applyCoupon = async () => {
    setCouponMsg(''); setCouponInfo(null);
    if (!form.coupon_code.trim()) return;
    try {
      const r = await couponsAPI.validate(form.coupon_code.trim());
      setCouponInfo({ discount_percent: r.data.discount_percent, owner: r.data.owner });
      setCouponMsg(`✓ ${r.data.discount_percent}% discount will apply (code by ${r.data.owner})`);
    } catch (err: any) {
      setCouponMsg('✗ ' + (err.response?.data?.message || 'Invalid coupon code'));
    }
  };

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

  const servicesTotal = services.reduce((sum, s) =>
    sum + (svcSel[s.id]?.checked ? parseFloat(svcSel[s.id]?.price || s.price || '0') : 0), 0);

  const totalPrice = (
    parseFloat(form.base_price || '0') +
    parseFloat(form.catering_price || '0') +
    servicesTotal
  ).toFixed(2);

  const handleProductChange = (productId: string) => {
    const space = spaces.find(s => String(s.id) === productId);
    setForm(p => ({ ...p, product_id: productId, base_price: space?.base_price ?? '0' }));
    setAvailable(null);
    setServices([]); setSvcSel({});
    if (productId) {
      productsAPI.getServices(parseInt(productId))
        .then(r => setServices((r.data ?? []).filter((s: any) => s.active)))
        .catch(() => setServices([]));
    }
  };

  const toggleService = (id: number, defaultPrice: string) =>
    setSvcSel(prev => ({ ...prev, [id]: { checked: !prev[id]?.checked, price: prev[id]?.price ?? defaultPrice } }));
  const setServicePrice = (id: number, price: string) =>
    setSvcSel(prev => ({ ...prev, [id]: { checked: prev[id]?.checked ?? true, price } }));

  const handleCateringChange = (id: string) => {
    const pkg = catering.find(c => String(c.id) === id);
    setForm(p => ({ ...p, catering_package_id: id, catering_price: pkg?.base_price ?? '0' }));
  };

  const checkAvailability = async () => {
    if (!form.product_id || !form.booking_date) return;
    if (form.session_type === 'custom' && (!form.start_time || !form.end_time)) return;
    setChecking(true);
    try {
      const res = await bookingsAPI.checkAvailability({
        product_id:   parseInt(form.product_id),
        session_type: form.session_type,
        booking_date: form.booking_date,
        // Times only matter for custom sessions; the backend resolves the rest.
        ...(form.session_type === 'custom' ? { start_time: form.start_time, end_time: form.end_time } : {}),
      });
      setAvailable(res.data.available);
    } finally {
      setChecking(false);
    }
  };

  // Auto-check availability whenever the space / date / session / custom times change.
  useEffect(() => {
    setAvailable(null);
    if (!form.product_id || !form.booking_date) return;
    if (form.session_type === 'custom' && (!form.start_time || !form.end_time)) return;
    const t = setTimeout(() => { checkAvailability(); }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.product_id, form.booking_date, form.session_type, form.start_time, form.end_time]);

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
        base_price:          parseFloat(form.base_price || '0'),
        catering_price:      parseFloat(form.catering_price || '0'),
        // Selected product services become the booking's add-ons.
        extra_services:      services.filter(s => svcSel[s.id]?.checked)
                               .map(s => ({ name: s.service_name, price: parseFloat(svcSel[s.id]?.price || s.price || '0') })),
        extras_price:        servicesTotal,
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
      if (form.coupon_code && couponInfo) payload.coupon_code = form.coupon_code;
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
            <div className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${
              checking ? 'bg-gray-50 text-gray-500'
              : available === true ? 'bg-green-50 text-green-700'
              : available === false ? 'bg-red-50 text-red-700'
              : 'bg-gray-50 text-gray-400'
            }`}>
              {checking ? '⏳ Checking availability…'
                : available === true ? '✓ Available — this slot is free'
                : available === false ? '✗ Already booked for this date & session'
                : 'Select date & session to check availability'}
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

          {/* Add-on services defined on this space */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Additional Services</label>
            {!form.product_id ? (
              <p className="text-xs text-gray-400">Select a space first to see its available services.</p>
            ) : services.length === 0 ? (
              <p className="text-xs text-gray-400">No add-on services configured for this space. Add them on the space's Products page.</p>
            ) : (
              <div className="space-y-2">
                {services.map(s => {
                  const sel = svcSel[s.id];
                  return (
                    <div key={s.id} className="flex items-center justify-between gap-3 border border-gray-100 rounded-lg px-3 py-2">
                      <label className="flex items-center gap-2 cursor-pointer flex-1">
                        <input type="checkbox" checked={sel?.checked ?? false}
                          onChange={() => toggleService(s.id, s.price)}
                          className="w-4 h-4 text-[#C9A052]" />
                        <span className="text-sm text-gray-700">{s.service_name}</span>
                        <span className="text-xs text-gray-400 capitalize">· {String(s.service_type).replace('_', ' ')}</span>
                      </label>
                      {sel?.checked && (
                        <div className="flex items-center gap-1">
                          <span className="text-sm text-gray-500">$</span>
                          <input type="number" min="0" step="0.01" value={sel.price}
                            onChange={e => setServicePrice(s.id, e.target.value)}
                            className="w-24 px-2 py-1 border border-gray-300 rounded text-sm" />
                        </div>
                      )}
                    </div>
                  );
                })}
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

          {/* Staff coupon (B5) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Discount Coupon <span className="text-gray-400 font-normal">(optional)</span></label>
            <div className="flex gap-2">
              <input type="text" value={form.coupon_code}
                onChange={e => { setForm(p => ({ ...p, coupon_code: e.target.value })); setCouponInfo(null); setCouponMsg(''); }}
                placeholder="Enter staff coupon code"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A052] uppercase" />
              <button type="button" onClick={applyCoupon}
                className="px-5 py-2 border border-[#1B2D4F] text-[#1B2D4F] rounded-lg text-sm font-medium hover:bg-[#1B2D4F] hover:text-white transition-colors">
                Apply
              </button>
            </div>
            {couponMsg && <p className={`text-xs mt-1 ${couponMsg.startsWith('✓') ? 'text-green-600' : 'text-red-500'}`}>{couponMsg}</p>}
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

        <div className="flex gap-3 items-center">
          <button type="submit" disabled={loading || available === false}
            className="bg-[#C9A052] hover:bg-[#b89140] text-white font-semibold px-6 py-2.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
            {loading ? 'Creating…' : 'Create Booking'}
          </button>
          {available === false && (
            <button type="button" onClick={() => { setWaitlistMsg(''); setShowWaitlist(true); }}
              className="bg-amber-500 hover:bg-amber-600 text-white font-semibold px-5 py-2.5 rounded-lg text-sm transition-colors">
              ⏳ Add to Waiting List
            </button>
          )}
          <button type="button" onClick={() => router.back()}
            className="px-6 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors">
            Cancel
          </button>
        </div>
      </form>

      {/* Waiting-list overlay (shown when the chosen slot is unavailable) */}
      {showWaitlist && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setShowWaitlist(false)}>
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-[#1B2D4F] mb-1">Slot unavailable — add to waiting list?</h2>
            <p className="text-sm text-gray-500 mb-4">
              {selectedSpace?.name} is already booked for {form.booking_date} ({form.session_type}). Register <strong>{form.client_name || 'this customer'}</strong> on the waiting list — they'll be notified if a spot opens (max {3} per slot).
            </p>
            {(!form.client_name || (!form.client_email && !form.client_phone)) ? (
              <div className="bg-amber-50 text-amber-700 text-sm rounded-lg p-3">Enter the client's name and at least a phone or email above first, then reopen this.</div>
            ) : (
              <>
                <label className="block text-xs text-gray-500 mb-1">Notify the customer via</label>
                <select value={waitlistChannel} onChange={e => setWaitlistChannel(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-[#C9A052]">
                  <option value="email">📧 Email</option>
                  <option value="whatsapp">💬 WhatsApp</option>
                  <option value="both">📧💬 Both</option>
                </select>
                {waitlistMsg && <div className={`mb-3 p-2 rounded text-sm ${waitlistMsg.startsWith('✓') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{waitlistMsg}</div>}
                <div className="flex gap-2">
                  <button onClick={addToWaitlist} disabled={waitlistBusy}
                    className="flex-1 bg-[#C9A052] hover:bg-[#b89140] text-white font-medium py-2.5 rounded-lg text-sm disabled:opacity-50">
                    {waitlistBusy ? 'Adding…' : 'Add to Waiting List'}
                  </button>
                  <button onClick={() => setShowWaitlist(false)} className="px-5 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-600">Cancel</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
