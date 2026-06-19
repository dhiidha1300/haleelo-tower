'use client';

import { useState, useEffect } from 'react';
import { settingsAPI } from '@/lib/api';

interface Props { settings: any; onUpdate: () => void; }

const CATEGORIES = [
  { key: 'comm_channel_invoicing', label: 'Invoicing', hint: 'Invoices sent and resent to clients' },
  { key: 'comm_channel_receipts',  label: 'Payment Receipts', hint: 'Confirmations after a payment is recorded' },
  { key: 'comm_channel_notices',   label: 'Notices & Announcements', hint: 'General messages to tenants' },
];
const OPTIONS = [
  { value: 'email', label: '📧 Email only' },
  { value: 'whatsapp', label: '💬 WhatsApp only' },
  { value: 'both', label: '📧 + 💬 Both' },
];

export function CommunicationsSettings({ settings, onUpdate }: Props) {
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    setForm({
      comm_channel_invoicing: settings?.comm_channel_invoicing || 'email',
      comm_channel_receipts:  settings?.comm_channel_receipts  || 'email',
      comm_channel_notices:   settings?.comm_channel_notices   || 'email',
    });
  }, [settings?.comm_channel_invoicing, settings?.comm_channel_receipts, settings?.comm_channel_notices]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await settingsAPI.update(CATEGORIES.map(c => ({ key: c.key, value: form[c.key] })));
      setMessage('✓ Communication preferences saved');
      setTimeout(() => setMessage(''), 3000);
      onUpdate();
    } catch {
      setMessage('✗ Failed to save');
    } finally { setSaving(false); }
  };

  return (
    <form onSubmit={save} className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-2xl font-bold text-[#1B2D4F] mb-1">Communications</h2>
        <p className="text-sm text-gray-500">Choose how each type of message reaches clients and tenants. WhatsApp requires the WhatsApp API to be configured.</p>
      </div>

      {CATEGORIES.map(c => (
        <div key={c.key}>
          <label className="block text-sm font-medium text-gray-700">{c.label}</label>
          <p className="text-xs text-gray-400 mb-2">{c.hint}</p>
          <select value={form[c.key] ?? 'email'} onChange={e => setForm(p => ({ ...p, [c.key]: e.target.value }))}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A052]">
            {OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      ))}

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
        Sending over WhatsApp uses Meta-approved message templates. Create the templates listed in the implementation plan (§21.4.1) in your Meta Business Manager and configure the WhatsApp API tab first.
      </div>

      {message && <div className={`p-3 rounded-lg text-sm ${message.startsWith('✓') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{message}</div>}

      <button type="submit" disabled={saving}
        className="bg-[#C9A052] hover:bg-[#b89140] text-white font-semibold py-2 px-6 rounded-lg transition-colors disabled:opacity-50">
        {saving ? 'Saving…' : 'Save Changes'}
      </button>
    </form>
  );
}
