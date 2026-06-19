'use client';

import { useState, useEffect } from 'react';
import { settingsAPI, emailAPI } from '@/lib/api';
import { EmailTemplates } from './EmailTemplates';

interface EmailSettingsProps {
  settings: any;
  onUpdate: () => void;
}

export function EmailSettings({ settings, onUpdate }: EmailSettingsProps) {
  const [sub, setSub] = useState<'server' | 'templates'>('server');

  return (
    <div className="max-w-4xl">
      <div className="flex gap-2 mb-6 border-b border-gray-200">
        {[['server', '📮 Mail Server'], ['templates', '📝 Templates']].map(([id, label]) => (
          <button key={id} onClick={() => setSub(id as any)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              sub === id ? 'border-[#C9A052] text-[#1B2D4F]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {label}
          </button>
        ))}
      </div>

      {sub === 'server' ? <MailServer settings={settings} onUpdate={onUpdate} /> : <EmailTemplates />}
    </div>
  );
}

function MailServer({ settings, onUpdate }: EmailSettingsProps) {
  const [form, setForm] = useState({
    mail_driver: 'smtp',
    smtp_host: '', smtp_port: '587', smtp_encryption: 'tls', smtp_username: '', smtp_password: '',
    mail_from_name: 'Haleelo Tower', mail_from_email: 'noreply@halelotower.so', mail_reply_to: 'info@halelotower.so',
    resend_api_key: '',
  });
  const [pwSet, setPwSet] = useState(false);
  const [resendSet, setResendSet] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (settings) {
      setForm(f => ({
        ...f,
        mail_driver:      settings.mail_driver      || 'smtp',
        smtp_host:        settings.smtp_host        || '',
        smtp_port:        settings.smtp_port        || '587',
        smtp_encryption:  settings.smtp_encryption  || 'tls',
        smtp_username:    settings.smtp_username     || '',
        smtp_password:    '',
        mail_from_name:   settings.mail_from_name    || 'Haleelo Tower',
        mail_from_email:  settings.mail_from_email   || 'noreply@halelotower.so',
        mail_reply_to:    settings.mail_reply_to     || 'info@halelotower.so',
        resend_api_key:   '',
      }));
      setPwSet(!!settings.smtp_password_set);
      setResendSet(!!settings.resend_api_key_set);
    }
  }, [settings]);

  const showMsg = (m: string) => { setMessage(m); setTimeout(() => setMessage(''), 4500); };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const payload: { key: string; value: string; description?: string }[] = [
      { key: 'mail_driver', value: form.mail_driver },
      { key: 'smtp_host', value: form.smtp_host },
      { key: 'smtp_port', value: form.smtp_port },
      { key: 'smtp_encryption', value: form.smtp_encryption },
      { key: 'smtp_username', value: form.smtp_username },
      { key: 'mail_from_name', value: form.mail_from_name },
      { key: 'mail_from_email', value: form.mail_from_email },
      { key: 'mail_reply_to', value: form.mail_reply_to },
    ];
    // Secrets: only send when the user actually typed a new value (blank = keep).
    if (form.smtp_password) payload.push({ key: 'smtp_password', value: form.smtp_password });
    if (form.resend_api_key) payload.push({ key: 'resend_api_key', value: form.resend_api_key });

    try {
      await settingsAPI.update(payload);
      showMsg('✓ Mail server settings saved');
      onUpdate();
    } catch {
      showMsg('✗ Failed to save settings');
    } finally { setLoading(false); }
  };

  const handleTest = async () => {
    if (!testEmail) return showMsg('✗ Enter an email address to test');
    setTesting(true);
    try { const r = await emailAPI.test(testEmail); showMsg('✓ ' + (r.data.message || 'Test sent')); }
    catch (err: any) { showMsg('✗ ' + (err.response?.data?.message || 'Failed to send test email')); }
    finally { setTesting(false); }
  };

  const field = 'w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A052] text-sm';
  const isSmtp = form.mail_driver === 'smtp';
  const ready = isSmtp ? !!form.smtp_host : (resendSet || !!form.resend_api_key);

  return (
    <form onSubmit={save} className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[#1B2D4F] mb-1">Mail Server</h2>
        <p className="text-gray-600 text-sm">Send transactional emails through your internal SMTP server. Resend is kept as an optional fallback.</p>
      </div>

      {message && <div className={`p-3 rounded-lg text-sm font-medium border ${message.startsWith('✓') ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>{message}</div>}

      {/* Driver toggle */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Transport</label>
        <div className="flex gap-3">
          {[['smtp', 'Internal SMTP'], ['resend', 'Resend (API)']].map(([id, label]) => (
            <button key={id} type="button" onClick={() => setForm(p => ({ ...p, mail_driver: id }))}
              className={`flex-1 px-4 py-3 rounded-lg border text-sm font-medium transition-colors ${
                form.mail_driver === id ? 'border-[#C9A052] bg-amber-50 text-[#1B2D4F]' : 'border-gray-300 text-gray-500 hover:bg-gray-50'}`}>
              {label}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-1.5">The other transport is used automatically as a fallback if the primary one isn't configured.</p>
      </div>

      {/* SMTP block */}
      {isSmtp && (
        <div className="space-y-4 border border-gray-200 rounded-lg p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">SMTP Host</label>
              <input value={form.smtp_host} onChange={e => setForm(p => ({ ...p, smtp_host: e.target.value }))} placeholder="mail.halelotower.so" className={field} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Port</label>
              <input value={form.smtp_port} onChange={e => setForm(p => ({ ...p, smtp_port: e.target.value }))} placeholder="587" className={field} />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Encryption</label>
              <select value={form.smtp_encryption} onChange={e => setForm(p => ({ ...p, smtp_encryption: e.target.value }))} className={field}>
                <option value="tls">STARTTLS (587)</option>
                <option value="ssl">SSL/TLS (465)</option>
                <option value="none">None (25)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
              <input value={form.smtp_username} onChange={e => setForm(p => ({ ...p, smtp_username: e.target.value }))} placeholder="noreply@halelotower.so" className={field} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input type="password" value={form.smtp_password} onChange={e => setForm(p => ({ ...p, smtp_password: e.target.value }))}
                placeholder={pwSet ? '•••••••• (saved)' : 'Enter password'} className={field} />
              {pwSet && <p className="text-xs text-gray-400 mt-1">Leave blank to keep current password.</p>}
            </div>
          </div>
        </div>
      )}

      {/* Resend block */}
      {!isSmtp && (
        <div className="space-y-2 border border-gray-200 rounded-lg p-4">
          <label className="block text-sm font-medium text-gray-700">
            Resend API Key
            <a href="https://resend.com/api-keys" target="_blank" rel="noreferrer" className="ml-2 text-xs text-[#C9A052] hover:underline font-normal">Get key →</a>
          </label>
          <input type="password" value={form.resend_api_key} onChange={e => setForm(p => ({ ...p, resend_api_key: e.target.value }))}
            placeholder={resendSet ? '•••••••• (saved)' : 're_xxxxxxxxxxxx'} className={`${field} font-mono`} />
          {resendSet && <p className="text-xs text-gray-400">Leave blank to keep current key.</p>}
        </div>
      )}

      {/* Shared sender identity */}
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">From Name</label>
            <input value={form.mail_from_name} onChange={e => setForm(p => ({ ...p, mail_from_name: e.target.value }))} className={field} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">From Email</label>
            <input type="email" value={form.mail_from_email} onChange={e => setForm(p => ({ ...p, mail_from_email: e.target.value }))} className={field} />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Reply-To</label>
          <input type="email" value={form.mail_reply_to} onChange={e => setForm(p => ({ ...p, mail_reply_to: e.target.value }))} className={field} />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button type="submit" disabled={loading} className="bg-[#C9A052] hover:bg-[#b89140] text-white font-semibold py-2 px-6 rounded-lg transition-colors disabled:opacity-50">
          {loading ? 'Saving...' : 'Save Mail Settings'}
        </button>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ready ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
          {ready ? '✓ Configured' : '⚠ Not configured'}
        </span>
      </div>

      {/* Test */}
      <div className="border-t pt-6">
        <h3 className="font-semibold text-gray-900 mb-1">Test Connection</h3>
        <p className="text-xs text-gray-500 mb-4">Save your settings first, then send a test email to confirm delivery.</p>
        <div className="flex gap-3">
          <input type="email" value={testEmail} onChange={e => setTestEmail(e.target.value)} placeholder="you@example.com" className={`flex-1 ${field}`} />
          <button type="button" onClick={handleTest} disabled={testing}
            className="bg-[#1B2D4F] hover:bg-[#0f1d33] text-white font-semibold py-2 px-6 rounded-lg transition-colors disabled:opacity-50 text-sm whitespace-nowrap">
            {testing ? 'Sending...' : 'Send Test'}
          </button>
        </div>
      </div>
    </form>
  );
}
