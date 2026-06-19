'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { dashboardAPI, bookingsAPI, leasesAPI } from '@/lib/api';

/* ── palette ─────────────────────────────────────────────────────────────── */
const NAVY = '#1B2D4F';
const ACCENTS: Record<string, { bar: string; chipBg: string; chipFg: string; chart: string; soft: string }> = {
  gold:   { bar: '#C9A052', chipBg: '#FBF1DC', chipFg: '#9C7A2E', chart: '#C9A052', soft: 'rgba(201,160,82,.16)' },
  green:  { bar: '#10B981', chipBg: '#ECFDF5', chipFg: '#047857', chart: '#10B981', soft: 'rgba(16,185,129,.14)' },
  navy:   { bar: NAVY,      chipBg: '#EEF1F6', chipFg: NAVY,      chart: NAVY,      soft: 'rgba(27,45,79,.12)' },
  blue:   { bar: '#3B82F6', chipBg: '#EFF6FF', chipFg: '#2563EB', chart: '#3B82F6', soft: 'rgba(59,130,246,.14)' },
  indigo: { bar: '#6366F1', chipBg: '#EEF0FE', chipFg: '#4F46E5', chart: '#6366F1', soft: 'rgba(99,102,241,.14)' },
  red:    { bar: '#EF4444', chipBg: '#FEF2F2', chipFg: '#DC2626', chart: '#EF4444', soft: 'rgba(239,68,68,.14)' },
};
const DELTA: Record<string, { bg: string; fg: string }> = {
  up:     { bg: '#ECFDF5', fg: '#047857' },
  warn:   { bg: '#FFFBEB', fg: '#B45309' },
  danger: { bg: '#FEF2F2', fg: '#DC2626' },
  flat:   { bg: '#F1F5F9', fg: '#475569' },
};
const CAT: Record<string, { dot: string; bg: string; fg: string; label: string }> = {
  morning:   { dot: '#F59E0B', bg: '#FFFBEB', fg: '#B45309', label: 'Morning' },
  afternoon: { dot: '#F97316', bg: '#FFF7ED', fg: '#C2410C', label: 'Afternoon' },
  evening:   { dot: '#6366F1', bg: '#EEF0FE', fg: '#4338CA', label: 'Evening' },
  tenant:    { dot: '#3B82F6', bg: '#EFF6FF', fg: '#2563EB', label: 'Tenant' },
  lease:     { dot: '#C9A052', bg: '#FBF1DC', fg: '#9C7A2E', label: 'Lease' },
};

const KPI_META = [
  { id: 'revenue',   label: 'Total Revenue',   accent: 'gold',   kind: 'area',  icon: '💰' },
  { id: 'bookings',  label: 'Active Bookings', accent: 'green',  kind: 'bars',  icon: '📅' },
  { id: 'occupancy', label: 'Slot Utilization', accent: 'navy',   kind: 'gauge', icon: '🏢' },
  { id: 'tenants',   label: 'Total Tenants',   accent: 'blue',   kind: 'line',  icon: '👥' },
  { id: 'sessions',  label: 'Sessions',        accent: 'indigo', kind: 'bars',  icon: '🕐' },
  { id: 'overdue',   label: 'Overdue Invoices',accent: 'red',    kind: 'line',  icon: '⚠️' },
  { id: 'received',  label: 'Total Received',  accent: 'green',  kind: 'area',  icon: '✅' },
  { id: 'unpaid',    label: 'Total Unpaid',    accent: 'gold',   kind: 'line',  icon: '⏳' },
];
const RANGES = ['day', 'week', 'month', 'year'];

/* ── mini charts ─────────────────────────────────────────────────────────── */
function AreaSparkline({ data, color, w = 132, h = 48 }: { data: number[]; color: string; w?: number; h?: number }) {
  if (!data?.length) return <svg width={w} height={h} />;
  const max = Math.max(...data, 1), min = Math.min(...data, 0);
  const span = max - min || 1;
  const pts = data.map((v, i) => [(i / (data.length - 1 || 1)) * w, h - ((v - min) / span) * (h - 6) - 3]);
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
  const id = 'g' + color.replace(/[^a-z0-9]/gi, '');
  return (
    <svg width={w} height={h}>
      <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity={0.28} /><stop offset="100%" stopColor={color} stopOpacity={0} /></linearGradient></defs>
      <path d={`${line} L${w} ${h} L0 ${h} Z`} fill={`url(#${id})`} />
      <path d={line} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function TrendLine({ data, color, dashed, w = 132, h = 48 }: { data: number[]; color: string; dashed?: boolean; w?: number; h?: number }) {
  if (!data?.length) return <svg width={w} height={h} />;
  const max = Math.max(...data, 1), min = Math.min(...data, 0), span = max - min || 1;
  const pts = data.map((v, i) => `${((i / (data.length - 1 || 1)) * w).toFixed(1)},${(h - ((v - min) / span) * (h - 6) - 3).toFixed(1)}`).join(' ');
  return <svg width={w} height={h}><polyline points={pts} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={dashed ? '4 3' : undefined} /></svg>;
}
function MiniBars({ data, color, soft, w = 132, h = 48 }: { data: number[]; color: string; soft: string; w?: number; h?: number }) {
  if (!data?.length) return <svg width={w} height={h} />;
  const max = Math.max(...data, 1);
  const bw = w / data.length;
  return (
    <svg width={w} height={h}>
      {data.map((v, i) => {
        const bh = Math.max((v / max) * (h - 4), 2);
        return <rect key={i} x={i * bw + bw * 0.18} y={h - bh} width={bw * 0.64} height={bh} rx={2} fill={i === data.length - 1 ? color : soft} />;
      })}
    </svg>
  );
}
function RadialGauge({ value, color, size = 64, stroke = 7, label }: { value: number; color: string; size?: number; stroke?: number; label: string }) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r, off = c - (value / 100) * c;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#EEF1F6" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={off} transform={`rotate(-90 ${size / 2} ${size / 2})`} style={{ transition: 'stroke-dashoffset .6s ease' }} />
      <text x="50%" y="52%" dominantBaseline="middle" textAnchor="middle" fontSize={size * 0.24} fontWeight={700} fill={NAVY}>{label}</text>
    </svg>
  );
}

/* ── shell ───────────────────────────────────────────────────────────────── */
function Panel({ title, sub, right, children, pad = true }: any) {
  return (
    <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 3px rgba(15,29,51,.06)', overflow: 'hidden' }}>
      {title && (
        <div style={{ padding: '15px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div><h2 style={{ fontSize: 15, fontWeight: 600, color: '#1e293b', margin: 0 }}>{title}</h2>
            {sub && <p style={{ fontSize: 11, color: '#94a3b8', margin: '2px 0 0' }}>{sub}</p>}</div>
          {right}
        </div>
      )}
      <div style={{ padding: pad ? 18 : 0 }}>{children}</div>
    </div>
  );
}

/* ── KPI card ────────────────────────────────────────────────────────────── */
function StatCard({ meta, data }: { meta: any; data: any }) {
  const [hover, setHover] = useState(false);
  if (!data) return <div style={{ height: 116, background: '#fff', borderRadius: 12 }} className="animate-pulse" />;
  const a = ACCENTS[meta.accent];
  const dt = DELTA[data.tone] || DELTA.flat;
  const valueColor = meta.accent === 'red' ? '#EF4444' : NAVY;
  const chart = meta.kind === 'gauge'
    ? <RadialGauge value={data.pct ?? 0} color={a.chart} size={62} stroke={7} label={data.value} />
    : meta.kind === 'area' ? <AreaSparkline data={data.series} color={a.chart} />
    : meta.kind === 'line' ? <TrendLine data={data.series} color={a.chart} dashed={meta.id === 'overdue'} />
    : <MiniBars data={data.series} color={a.chart} soft={a.soft} />;
  return (
    <div onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ position: 'relative', overflow: 'hidden', background: '#fff', borderRadius: 12,
        boxShadow: hover ? '0 4px 12px rgba(15,29,51,.09)' : '0 1px 3px rgba(15,29,51,.06)',
        padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 16,
        transform: hover ? 'translateY(-2px)' : 'none', transition: 'all .2s' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <span style={{ width: 34, height: 34, borderRadius: 8, background: a.chipBg, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>{meta.icon}</span>
          <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: '#94a3b8' }}>{meta.label}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 28, fontWeight: 700, color: valueColor, lineHeight: 1 }}>{data.value}</span>
          <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 999, background: dt.bg, color: dt.fg, whiteSpace: 'nowrap' }}>{data.delta}</span>
        </div>
        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{data.foot}</div>
      </div>
      <div style={{ flexShrink: 0 }}>{chart}</div>
    </div>
  );
}

/* ── Today's calendar ────────────────────────────────────────────────────── */
function to12(t: string) { let [h, m] = t.split(':').map(Number); const ap = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12; return `${h}:${String(m ?? 0).padStart(2, '0')} ${ap}`; }
function TodayCalendar({ days }: { days: any[] }) {
  const [di, setDi] = useState(1);
  const day = days[di] ?? days[0];
  if (!day) return null;
  const sessions = day.events.filter((e: any) => e.end).length;
  // On today (key === 0) an event is "done" once its end time (or start, if no end) has passed.
  const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
  const toMin = (t?: string) => { if (!t) return null; const [h, m] = t.split(':').map(Number); return h * 60 + (m || 0); };
  const isDone = (ev: any) => { if (day.key !== 0) return false; const e = toMin(ev.end) ?? toMin(ev.start); return e != null && e < nowMin; };
  return (
    <Panel title="Today's Calendar" sub={`${day.events.length} events · ${sessions} sessions`}
      right={<span style={{ fontSize: 11, fontWeight: 600, color: day.key === 0 ? '#9C7A2E' : '#94a3b8', background: day.key === 0 ? '#FBF1DC' : '#f1f5f9', padding: '3px 9px', borderRadius: 999 }}>{day.short}</span>}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <button onClick={() => setDi(i => Math.max(0, i - 1))} disabled={di === 0}
          style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', color: di === 0 ? '#cbd5e1' : '#475569', cursor: di === 0 ? 'default' : 'pointer' }}>‹</button>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>📅 {day.label}</span>
        <button onClick={() => setDi(i => Math.min(days.length - 1, i + 1))} disabled={di === days.length - 1}
          style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', color: di === days.length - 1 ? '#cbd5e1' : '#475569', cursor: di === days.length - 1 ? 'default' : 'pointer' }}>›</button>
      </div>
      {day.events.length === 0 ? <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: 13, padding: '24px 0' }}>No events scheduled</p> : (
        <div>
          {day.events.map((ev: any, i: number) => {
            const c = CAT[ev.cat] || CAT.tenant;
            const done = isDone(ev);
            return (
              <div key={i} style={{ display: 'flex', gap: 12, padding: '11px 4px', borderBottom: i === day.events.length - 1 ? 'none' : '1px solid #f1f5f9', opacity: done ? 0.55 : 1 }}>
                <div style={{ width: 56, flexShrink: 0, textAlign: 'right', fontSize: 12, fontWeight: 700, color: done ? '#94a3b8' : '#475569', textDecoration: done ? 'line-through' : 'none' }}>{to12(ev.start)}</div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <span style={{ width: 9, height: 9, borderRadius: 999, marginTop: 4, background: done ? '#cbd5e1' : c.dot, flexShrink: 0 }} />
                  {i !== day.events.length - 1 && <span style={{ width: 2, flex: 1, background: '#f1f5f9', marginTop: 4 }} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: done ? '#94a3b8' : '#1e293b', textDecoration: done ? 'line-through' : 'none' }}>{ev.title}</div>
                  <div style={{ fontSize: 11.5, color: '#64748b', margin: '2px 0', textDecoration: done ? 'line-through' : 'none' }}>{ev.sub}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {done
                      ? <span style={{ fontSize: 9.5, fontWeight: 600, textTransform: 'uppercase', color: '#64748b', background: '#f1f5f9', padding: '2px 7px', borderRadius: 999 }}>✓ Done</span>
                      : <span style={{ fontSize: 9.5, fontWeight: 600, textTransform: 'uppercase', color: c.fg, background: c.bg, padding: '2px 7px', borderRadius: 999 }}>{c.label}</span>}
                    <span style={{ fontSize: 10.5, color: '#94a3b8' }}>{ev.end ? `${to12(ev.start)} – ${to12(ev.end)}` : ev.meta}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Panel>
  );
}

/* ── Pending approvals ───────────────────────────────────────────────────── */
function Approvals({ rows, onChange }: { rows: any[]; onChange: () => void }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  const approve = async (r: any) => {
    setBusy(r.kind + r.id);
    try {
      if (r.kind === 'booking') {
        const next = r.status === 'admin_pending' ? 'accountant_pending' : 'booking_approved';
        await bookingsAPI.updateStatus(r.id, next);
      } else { await leasesAPI.approve(r.id); }
      onChange();
    } catch (e: any) { alert(e.response?.data?.message || 'Action failed'); } finally { setBusy(null); }
  };
  const decline = async (r: any) => {
    const reason = prompt('Reason for declining:'); if (!reason) return;
    setBusy(r.kind + r.id);
    try {
      if (r.kind === 'booking') await bookingsAPI.updateStatus(r.id, 'rejected', undefined, reason);
      else await leasesAPI.reject(r.id, reason);
      onChange();
    } catch (e: any) { alert(e.response?.data?.message || 'Action failed'); } finally { setBusy(null); }
  };

  return (
    <Panel title="Pending Approvals" sub="Booking & lease requests awaiting review"
      right={<span style={{ fontSize: 11, fontWeight: 600, color: '#B45309', background: '#FFFBEB', padding: '3px 9px', borderRadius: 999 }}>{rows.length} pending</span>} pad={false}>
      {rows.length === 0 ? <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: 13, padding: '28px 0' }}>🎉 Nothing awaiting approval</p> : rows.map((r) => {
        const c = CAT[r.type] || CAT.tenant;
        return (
          <div key={r.kind + r.id} style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 12, padding: '13px 20px 13px 22px', borderBottom: '1px solid #f1f5f9' }}>
            <span style={{ position: 'absolute', left: 0, top: 12, bottom: 12, width: 3, borderRadius: 3, background: c.dot }} />
            <span style={{ width: 38, height: 38, borderRadius: 999, background: c.bg, color: c.fg, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>{r.ini}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 13.5, fontWeight: 600, color: '#1e293b' }}>{r.name}</span>
                <span style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', color: c.fg, background: c.bg, padding: '2px 8px', borderRadius: 999 }}>{c.label}</span>
              </div>
              <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 3 }}>🏢 {r.space} · {r.date} · <strong>{r.amount}</strong></div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 7 }}>
              <span style={{ fontSize: 10.5, color: '#94a3b8' }}>{r.ago}</span>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => approve(r)} disabled={busy === r.kind + r.id}
                  style={{ padding: '6px 12px', background: '#10B981', color: '#fff', fontSize: 12, fontWeight: 600, border: 'none', borderRadius: 8, cursor: 'pointer' }}>✓ Approve</button>
                <button onClick={() => decline(r)} disabled={busy === r.kind + r.id}
                  style={{ padding: '6px 12px', background: '#fff', color: '#475569', fontSize: 12, fontWeight: 600, border: '1px solid #e2e8f0', borderRadius: 8, cursor: 'pointer' }}>Decline</button>
              </div>
            </div>
          </div>
        );
      })}
      <div style={{ padding: '11px 20px', borderTop: '1px solid #f1f5f9', textAlign: 'center' }}>
        <button onClick={() => router.push('/dashboard/inbox')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12.5, fontWeight: 600, color: NAVY }}>View all requests →</button>
      </div>
    </Panel>
  );
}

/* ── Occupancy overview ──────────────────────────────────────────────────── */
const OCC_COLOR = (v: number) => v >= 100 ? '#10B981' : v === 0 ? '#cbd5e1' : v >= 60 ? NAVY : '#3B82F6';
function Occupancy({ data }: { data: any }) {
  if (!data) return null;
  const stat = (value: any, label: string, color: string) => (
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 22, fontWeight: 700, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase', color: '#94a3b8', marginTop: 5 }}>{label}</div>
    </div>
  );
  return (
    <Panel title="Occupancy Overview" sub={`Across ${data.floors.length} floors · ${data.spaces} leasable spaces`}
      right={<span style={{ fontSize: 11, fontWeight: 600, color: '#64748b', background: '#f1f5f9', padding: '3px 9px', borderRadius: 999 }}>{new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</span>}>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(190px, 240px) 1fr', gap: 28, alignItems: 'start' }}>
        {/* summary column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <RadialGauge value={data.overall} color={NAVY} size={84} stroke={9} label={data.overall + '%'} />
            <div>
              <div style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: '.04em', textTransform: 'uppercase', color: '#94a3b8' }}>Building</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: NAVY, marginTop: 2 }}>Occupancy</div>
              <div style={{ display: 'inline-flex', marginTop: 6, fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 999, background: data.mom_tone === 'up' ? '#ECFDF5' : '#FFFBEB', color: data.mom_tone === 'up' ? '#047857' : '#B45309' }}>{data.mom}</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, borderTop: '1px solid #f1f5f9', paddingTop: 16 }}>
            {stat(data.occupied, 'Occupied', '#10B981')}
            {stat(data.available, 'Available', NAVY)}
            {stat(data.spaces, 'Spaces', '#64748b')}
          </div>
        </div>
        {/* floors — two columns */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 24px' }}>
          {data.floors.map((f: any) => (
            <div key={f.name} style={{ padding: '8px 0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{f.name}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: f.v === 0 ? '#94a3b8' : NAVY }}>{f.v}%</span>
              </div>
              <div style={{ height: 8, borderRadius: 999, background: '#f1f5f9', overflow: 'hidden' }}>
                <div style={{ width: `${Math.max(f.v, 2)}%`, height: '100%', borderRadius: 999, background: OCC_COLOR(f.v), transition: 'width .6s ease' }} />
              </div>
              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 6 }}>{f.note}</div>
            </div>
          ))}
        </div>
      </div>
    </Panel>
  );
}

/* ── Recent payments ─────────────────────────────────────────────────────── */
const PAY_METHOD_ICON: Record<string, string> = { bank_transfer: '🏦', zaad: '📱', edahab: '📱', cheque: '📄', cash: '💵' };
const INV_STATUS: Record<string, { bg: string; fg: string; dot: string; label: string }> = {
  paid:    { bg: '#EFF6FF', fg: '#2563EB', dot: '#3B82F6', label: 'Paid' },
  partial: { bg: '#FFF7ED', fg: '#C2410C', dot: '#F97316', label: 'Partial' },
  overdue: { bg: '#FEF2F2', fg: '#DC2626', dot: '#EF4444', label: 'Overdue' },
  sent:    { bg: '#FFFBEB', fg: '#B45309', dot: '#F59E0B', label: 'Sent' },
  draft:   { bg: '#F1F5F9', fg: '#475569', dot: '#94a3b8', label: 'Draft' },
};
const money0 = (v: number) => '$' + Number(v).toLocaleString(undefined, { maximumFractionDigits: 0 });

function RecentPayments({ data }: { data: any }) {
  const [exporting, setExporting] = useState<string | null>(null);
  const doExport = async (fmt: 'pdf' | 'excel') => {
    setExporting(fmt);
    try {
      const { reportsAPI } = await import('@/lib/api');
      const res = await reportsAPI.export('payments', fmt);
      const ext = fmt === 'pdf' ? 'pdf' : 'xlsx';
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a'); a.href = url; a.download = `payments.${ext}`; a.click();
    } finally { setExporting(null); }
  };
  return (
    <Panel title="Recent Payments" sub="Last 5 transactions" pad={false}
      right={
        <div style={{ display: 'flex', gap: 8 }}>
          {(['pdf', 'excel'] as const).map(f => (
            <button key={f} onClick={() => doExport(f)} disabled={!!exporting}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 12px', border: '1px solid #e2e8f0', borderRadius: 8, background: '#fff', fontSize: 12, fontWeight: 600, color: '#475569', cursor: 'pointer' }}>
              ⬇ {f === 'pdf' ? 'PDF' : 'Excel'}
            </button>
          ))}
        </div>
      }>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 640 }}>
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              {['Tenant', 'Invoice', 'Method', 'Status', 'Amount', 'Date'].map((h, i) => (
                <th key={h} style={{ padding: '11px 20px', textAlign: i >= 4 ? 'right' : 'left', fontSize: 11, fontWeight: 600, letterSpacing: '.05em', textTransform: 'uppercase', color: '#94a3b8' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.rows.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: '28px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>No payments yet</td></tr>
            ) : data.rows.map((p: any, i: number) => {
              const s = INV_STATUS[p.status] || INV_STATUS.sent;
              const od = p.status === 'overdue';
              return (
                <tr key={i} style={{ borderTop: '1px solid #f1f5f9', background: od ? '#FEF6F6' : 'transparent' }}>
                  <td style={{ padding: '13px 20px' }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: '#1e293b' }}>{p.tenant}</div>
                    {p.sub && <div style={{ fontSize: 11.5, color: '#94a3b8' }}>{p.sub}</div>}
                  </td>
                  <td style={{ padding: '13px 20px', fontFamily: 'monospace', fontSize: 12, color: '#64748b' }}>{p.invoice}</td>
                  <td style={{ padding: '13px 20px', fontSize: 13, color: '#475569' }}>{PAY_METHOD_ICON[p.method_key] ?? '💳'} {p.method}</td>
                  <td style={{ padding: '13px 20px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 600, padding: '3px 9px', borderRadius: 999, background: s.bg, color: s.fg }}>
                      <span style={{ width: 6, height: 6, borderRadius: 999, background: s.dot }} />{s.label}
                    </span>
                  </td>
                  <td style={{ padding: '13px 20px', textAlign: 'right', fontSize: 14, fontWeight: 700, color: od ? '#DC2626' : NAVY }}>{money0(p.amount)}</td>
                  <td style={{ padding: '13px 20px', textAlign: 'right', fontSize: 12, color: od ? '#DC2626' : '#94a3b8' }}>{p.date}</td>
                </tr>
              );
            })}
          </tbody>
          {data.rows.length > 0 && (
            <tfoot>
              <tr style={{ background: '#f8fafc', borderTop: '2px solid #e2e8f0' }}>
                <td colSpan={4} style={{ padding: '13px 20px', fontSize: 11, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: '#64748b' }}>Total Received</td>
                <td style={{ padding: '13px 20px', textAlign: 'right', fontSize: 15, fontWeight: 700, color: NAVY }}>{money0(data.total)}</td>
                <td />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </Panel>
  );
}

/* ── main ────────────────────────────────────────────────────────────────── */
export function AdminOverview() {
  const { user } = useAuth();
  const router = useRouter();
  const [range, setRange] = useState('month');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = (r = range) => {
    dashboardAPI.adminOverview(r).then(res => setData(res.data)).finally(() => setLoading(false));
  };
  useEffect(() => { setLoading(true); fetchData(range); /* eslint-disable-next-line */ }, [range]);

  return (
    <div style={{ background: '#F0F4F8', margin: '-1.5rem', padding: '1.5rem', minHeight: '100%' }} className="space-y-6">
      {/* header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: NAVY }}>Welcome back, {user?.name?.split(' ')[0]}</h1>
          <p style={{ fontSize: 13, color: '#64748b' }}>{new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {data?.waitlist > 0 && (
            <button onClick={() => router.push('/dashboard/waiting-list')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 999, border: '1px solid #FDE68A', background: '#FFFBEB', color: '#B45309', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              ⏳ {data.waitlist} waiting
            </button>
          )}
        <div style={{ display: 'flex', gap: 2, background: '#fff', padding: 4, borderRadius: 10, boxShadow: '0 1px 3px rgba(15,29,51,.06)' }}>
          {RANGES.map(r => (
            <button key={r} onClick={() => setRange(r)}
              style={{ padding: '7px 16px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, textTransform: 'capitalize',
                background: range === r ? NAVY : 'transparent', color: range === r ? '#fff' : '#64748b' }}>{r}</button>
          ))}
        </div>
        </div>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {KPI_META.map(m => <StatCard key={m.id} meta={m} data={data?.kpis?.[m.id]} />)}
      </div>

      {/* approvals + calendar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {data && <Approvals rows={data.approvals} onChange={() => fetchData()} />}
        {data && <TodayCalendar days={data.calendar} />}
      </div>

      {/* occupancy — full width */}
      {data && <Occupancy data={data.occupancy} />}

      {/* recent payments — full width */}
      {data && <RecentPayments data={data.payments} />}

      {loading && !data && <p className="text-center text-gray-400 py-8">Loading dashboard…</p>}
    </div>
  );
}
