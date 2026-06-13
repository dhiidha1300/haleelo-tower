'use client';

import { useState, useEffect } from 'react';
import { settingsAPI, emailAPI } from '@/lib/api';

interface EmailSettingsProps {
  settings: any;
  onUpdate: () => void;
}

function maskedHint(value: string): string | null {
  if (!value || value.length < 4) return null;
  return value.slice(-4);
}

export function EmailSettings({ settings, onUpdate }: EmailSettingsProps) {
  const [form, setForm] = useState({
    resend_api_key: '',
    resend_from_name: 'Haleelo Tower',
    resend_from_email: 'noreply@halelotower.so',
    resend_reply_to: 'info@halelotower.so',
  });
  const [testEmail, setTestEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState('');
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    if (settings) {
      setForm({
        resend_api_key:    settings.resend_api_key    || '',
        resend_from_name:  settings.resend_from_name  || 'Haleelo Tower',
        resend_from_email: settings.resend_from_email || 'noreply@halelotower.so',
        resend_reply_to:   settings.resend_reply_to   || 'info@halelotower.so',
      });
    }
  }, [settings]);

  const showMsg = (msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(''), 4000);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await Promise.all([
        settingsAPI.updateSingle('resend_api_key',    form.resend_api_key,    'Resend API key'),
        settingsAPI.updateSingle('resend_from_name',  form.resend_from_name,  'Email sender display name'),
        settingsAPI.updateSingle('resend_from_email', form.resend_from_email, 'Email sender address (must be verified in Resend)'),
        settingsAPI.updateSingle('resend_reply_to',   form.resend_reply_to,   'Reply-to email address'),
      ]);
      showMsg('✓ Email settings saved');
      onUpdate();
    } catch {
      showMsg('✗ Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  const handleTest = async () => {
    if (!testEmail) return showMsg('✗ Enter an email address to test');
    setTesting(true);
    try {
      await emailAPI.test(testEmail);
      showMsg('✓ Test email sent to ' + testEmail);
    } catch (err: any) {
      showMsg('✗ ' + (err.response?.data?.message || 'Failed to send test email'));
    } finally {
      setTesting(false);
    }
  };

  const isConfigured = !!form.resend_api_key && !!form.resend_from_email;

  return (
    <form onSubmit={handleSave} className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-2xl font-bold text-[#1B2D4F] mb-1">Email Configuration (Resend)</h2>
        <p className="text-gray-600 text-sm">
          Configure your Resend API key and sender details for transactional emails — password resets, invoice delivery, and automated notifications.
        </p>
      </div>

      {message && (
        <div className={`p-3 rounded-lg text-sm font-medium border ${
          message.startsWith('✓') ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'
        }`}>
          {message}
        </div>
      )}

      {/* API Key */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Resend API Key
          <a href="https://resend.com/api-keys" target="_blank" rel="noreferrer"
            className="ml-2 text-xs text-[#C9A052] hover:underline font-normal">
            Get your API key →
          </a>
        </label>
        <div className="relative">
          <input
            type={showKey ? 'text' : 'password'}
            value={form.resend_api_key}
            onChange={e => setForm(p => ({ ...p, resend_api_key: e.target.value }))}
            placeholder="re_xxxxxxxxxxxxxxxxxxxx"
            className="w-full px-4 py-2 pr-20 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A052] font-mono text-sm"
          />
          <button type="button" onClick={() => setShowKey(v => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500 hover:text-gray-700">
            {showKey ? 'Hide' : 'Show'}
          </button>
        </div>
        {!showKey && maskedHint(form.resend_api_key) && (
          <p className="text-xs text-gray-400 mt-1">
            Saved — ends in <span className="font-mono">{maskedHint(form.resend_api_key)}</span>
          </p>
        )}
        <div className="flex items-center gap-2 mt-2">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            isConfigured ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
          }`}>
            {isConfigured ? '✓ Configured' : '⚠ Not configured'}
          </span>
        </div>
      </div>

      {/* Sender fields */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">From Name</label>
          <input
            type="text"
            value={form.resend_from_name}
            onChange={e => setForm(p => ({ ...p, resend_from_name: e.target.value }))}
            placeholder="Haleelo Tower"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A052]"
          />
          <p className="text-xs text-gray-500 mt-1">Display name shown to email recipients</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">From Email Address</label>
          <input
            type="email"
            value={form.resend_from_email}
            onChange={e => setForm(p => ({ ...p, resend_from_email: e.target.value }))}
            placeholder="noreply@halelotower.so"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A052]"
          />
          <p className="text-xs text-gray-500 mt-1">
            Must be a verified sender domain in your Resend account.{' '}
            <a href="https://resend.com/domains" target="_blank" rel="noreferrer" className="text-[#C9A052] hover:underline">
              Verify domain →
            </a>
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Reply-To Address</label>
          <input
            type="email"
            value={form.resend_reply_to}
            onChange={e => setForm(p => ({ ...p, resend_reply_to: e.target.value }))}
            placeholder="info@halelotower.so"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A052]"
          />
          <p className="text-xs text-gray-500 mt-1">Where replies from tenants and clients will go</p>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="bg-[#C9A052] hover:bg-[#b89140] text-white font-semibold py-2 px-6 rounded-lg transition-colors disabled:opacity-50"
      >
        {loading ? 'Saving...' : 'Save Email Settings'}
      </button>

      {/* Test */}
      <div className="border-t pt-6">
        <h3 className="font-semibold text-gray-900 mb-1">Test Email Connection</h3>
        <p className="text-xs text-gray-500 mb-4">Save your API key first, then send a test email to confirm it's working.</p>
        <div className="flex gap-3">
          <input
            type="email"
            value={testEmail}
            onChange={e => setTestEmail(e.target.value)}
            placeholder="you@example.com"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A052] text-sm"
          />
          <button
            type="button"
            onClick={handleTest}
            disabled={testing || !isConfigured}
            className="bg-[#1B2D4F] hover:bg-[#0f1d33] text-white font-semibold py-2 px-6 rounded-lg transition-colors disabled:opacity-50 text-sm whitespace-nowrap"
          >
            {testing ? 'Sending...' : 'Send Test'}
          </button>
        </div>
        {!isConfigured && (
          <p className="text-xs text-yellow-600 mt-2">Configure and save your API key before testing.</p>
        )}
      </div>
    </form>
  );
}
