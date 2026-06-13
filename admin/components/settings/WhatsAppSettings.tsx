'use client';

import { useState, useEffect } from 'react';
import { settingsAPI } from '@/lib/api';
import api from '@/lib/api';

interface WhatsAppSettingsProps {
  settings: any;
  onUpdate: () => void;
}

type Provider = 'twilio' | '360dialog' | 'cloud_api';

// Per-provider field labels and hints
const PROVIDER_CONFIG: Record<Provider, {
  label: string;
  sidLabel: string;
  sidPlaceholder: string;
  tokenLabel: string;
  tokenPlaceholder: string;
  showSender: boolean;
  senderPlaceholder: string;
  senderHint: string;
  docs: string;
}> = {
  twilio: {
    label: 'Twilio',
    sidLabel: 'Account SID',
    sidPlaceholder: 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    tokenLabel: 'Auth Token',
    tokenPlaceholder: '••••••••••••••••••••••••••••••••',
    showSender: true,
    senderPlaceholder: 'whatsapp:+252612345678',
    senderHint: 'Include the whatsapp: prefix and country code.',
    docs: 'https://www.twilio.com/docs/whatsapp',
  },
  '360dialog': {
    label: '360dialog',
    sidLabel: 'API Key',
    sidPlaceholder: 'Enter your 360dialog API Key',
    tokenLabel: 'API Secret (if required)',
    tokenPlaceholder: 'Enter API secret or leave blank',
    showSender: true,
    senderPlaceholder: '+252612345678',
    senderHint: 'Your approved WhatsApp sender number with country code.',
    docs: 'https://docs.360dialog.com',
  },
  cloud_api: {
    label: 'WhatsApp Cloud API (Meta)',
    sidLabel: 'Phone Number ID',
    sidPlaceholder: '1234567890123456',
    tokenLabel: 'Access Token',
    tokenPlaceholder: 'EAAxxxxxxxxxxxxxxx...',
    showSender: false,
    senderPlaceholder: '',
    senderHint: '',
    docs: 'https://developers.facebook.com/docs/whatsapp/cloud-api',
  },
};

function maskedHint(value: string): string | null {
  if (!value || value.length < 4) return null;
  return value.slice(-4);
}

export function WhatsAppSettings({ settings, onUpdate }: WhatsAppSettingsProps) {
  const [form, setForm] = useState({
    whatsapp_provider: 'twilio' as Provider,
    whatsapp_account_sid: '',
    whatsapp_auth_token: '',
    whatsapp_sender_number: '',
  });
  const [testNumber, setTestNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState('');
  const [showSid, setShowSid] = useState(false);
  const [showToken, setShowToken] = useState(false);

  useEffect(() => {
    if (settings) {
      setForm({
        whatsapp_provider: (settings.whatsapp_provider || 'twilio') as Provider,
        whatsapp_account_sid: settings.whatsapp_account_sid || '',
        whatsapp_auth_token: settings.whatsapp_auth_token || '',
        whatsapp_sender_number: settings.whatsapp_sender_number || '',
      });
    }
  }, [settings]);

  const provider = form.whatsapp_provider;
  const cfg = PROVIDER_CONFIG[provider];

  const showMsg = (msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(''), 4000);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await Promise.all([
        settingsAPI.updateSingle('whatsapp_provider', form.whatsapp_provider, 'WhatsApp API provider'),
        settingsAPI.updateSingle('whatsapp_account_sid', form.whatsapp_account_sid, cfg.sidLabel),
        settingsAPI.updateSingle('whatsapp_auth_token', form.whatsapp_auth_token, cfg.tokenLabel),
        settingsAPI.updateSingle('whatsapp_sender_number', form.whatsapp_sender_number, 'WhatsApp sender number'),
      ]);
      showMsg('✓ WhatsApp configuration saved');
      onUpdate();
    } catch {
      showMsg('✗ Failed to save configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleTest = async () => {
    if (!testNumber) return showMsg('✗ Enter a phone number to test');
    setTesting(true);
    try {
      await api.post('/api/whatsapp/test', { phone: testNumber });
      showMsg('✓ Test message sent to ' + testNumber);
    } catch (err: any) {
      showMsg('✗ ' + (err.response?.data?.message || 'Failed to send test message'));
    } finally {
      setTesting(false);
    }
  };

  const isConfigured = form.whatsapp_account_sid && form.whatsapp_auth_token &&
    (provider === 'cloud_api' || form.whatsapp_sender_number);

  return (
    <form onSubmit={handleSave} className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-2xl font-bold text-[#1B2D4F] mb-1">WhatsApp API Configuration</h2>
        <p className="text-gray-600 text-sm">
          Configure your WhatsApp Business API provider for 2FA OTPs, booking confirmations, and invoice reminders.
        </p>
      </div>

      {message && (
        <div className={`p-3 rounded-lg text-sm font-medium border ${
          message.startsWith('✓') ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'
        }`}>
          {message}
        </div>
      )}

      {/* Provider selector */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">WhatsApp Provider</label>
        <div className="grid grid-cols-3 gap-3">
          {(Object.keys(PROVIDER_CONFIG) as Provider[]).map(p => (
            <button
              key={p}
              type="button"
              onClick={() => setForm(prev => ({ ...prev, whatsapp_provider: p }))}
              className={`py-3 px-4 rounded-lg border-2 text-sm font-medium transition-all text-left ${
                provider === p
                  ? 'border-[#C9A052] bg-[#C9A052]/10 text-[#1B2D4F]'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              {p === 'cloud_api' ? (
                <span>
                  <span className="block font-semibold">Meta</span>
                  <span className="text-xs text-gray-500">Cloud API</span>
                </span>
              ) : (
                PROVIDER_CONFIG[p].label
              )}
            </button>
          ))}
        </div>
        {cfg.docs && (
          <a href={cfg.docs} target="_blank" rel="noreferrer" className="text-xs text-[#C9A052] hover:underline mt-2 inline-block">
            {cfg.label} documentation →
          </a>
        )}
      </div>

      {/* SID / Phone Number ID / API Key */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">{cfg.sidLabel}</label>
        <div className="relative">
          <input
            type={showSid ? 'text' : 'password'}
            value={form.whatsapp_account_sid}
            onChange={e => setForm(p => ({ ...p, whatsapp_account_sid: e.target.value }))}
            placeholder={cfg.sidPlaceholder}
            className="w-full px-4 py-2 pr-20 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A052] font-mono text-sm"
          />
          <button type="button" onClick={() => setShowSid(v => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500 hover:text-gray-700">
            {showSid ? 'Hide' : 'Show'}
          </button>
        </div>
        {!showSid && maskedHint(form.whatsapp_account_sid) && (
          <p className="text-xs text-gray-400 mt-1">
            Saved — ends in <span className="font-mono">{maskedHint(form.whatsapp_account_sid)}</span>
          </p>
        )}
      </div>

      {/* Auth Token / Access Token / API Secret */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">{cfg.tokenLabel}</label>
        <div className="relative">
          <input
            type={showToken ? 'text' : 'password'}
            value={form.whatsapp_auth_token}
            onChange={e => setForm(p => ({ ...p, whatsapp_auth_token: e.target.value }))}
            placeholder={cfg.tokenPlaceholder}
            className="w-full px-4 py-2 pr-20 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A052] font-mono text-sm"
          />
          <button type="button" onClick={() => setShowToken(v => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500 hover:text-gray-700">
            {showToken ? 'Hide' : 'Show'}
          </button>
        </div>
        {!showToken && maskedHint(form.whatsapp_auth_token) && (
          <p className="text-xs text-gray-400 mt-1">
            Saved — ends in <span className="font-mono">{maskedHint(form.whatsapp_auth_token)}</span>
          </p>
        )}
      </div>

      {/* Sender Number — hidden for Cloud API */}
      {cfg.showSender && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Sender Number</label>
          <input
            type="text"
            value={form.whatsapp_sender_number}
            onChange={e => setForm(p => ({ ...p, whatsapp_sender_number: e.target.value }))}
            placeholder={cfg.senderPlaceholder}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A052] font-mono text-sm"
          />
          <p className="text-xs text-gray-500 mt-1">{cfg.senderHint}</p>
        </div>
      )}

      {provider === 'cloud_api' && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
          <p className="font-medium mb-1">WhatsApp Cloud API (Meta)</p>
          <p>The <strong>Phone Number ID</strong> is found in your Meta Business → WhatsApp → API Setup page. The <strong>Access Token</strong> should be a permanent system user token, not a temporary token.</p>
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={loading}
          className="bg-[#C9A052] hover:bg-[#b89140] text-white font-semibold py-2 px-6 rounded-lg transition-colors disabled:opacity-50"
        >
          {loading ? 'Saving...' : 'Save Configuration'}
        </button>
        <span className={`text-xs px-2 py-1 rounded-full font-medium ${isConfigured ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
          {isConfigured ? '✓ Configured' : '⚠ Not configured'}
        </span>
      </div>

      {/* Test section */}
      <div className="border-t pt-6">
        <h3 className="font-semibold text-gray-900 mb-1">Test Connection</h3>
        <p className="text-xs text-gray-500 mb-4">Save your configuration first, then send a test message to verify it works.</p>
        <div className="flex gap-3">
          <input
            type="tel"
            value={testNumber}
            onChange={e => setTestNumber(e.target.value)}
            placeholder="+252612345678"
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
          <p className="text-xs text-yellow-600 mt-2">Complete and save your configuration before testing.</p>
        )}
      </div>
    </form>
  );
}
