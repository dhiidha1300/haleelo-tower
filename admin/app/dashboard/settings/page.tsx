'use client';

import { useState, useEffect } from 'react';
import { settingsAPI } from '@/lib/api';
import { usePermission } from '@/lib/permissions';
import { GeneralSettings } from '@/components/settings/GeneralSettings';
import { ElectricitySettings } from '@/components/settings/ElectricitySettings';
import { CateringSettings } from '@/components/settings/CateringSettings';
import { SessionTimeSettings } from '@/components/settings/SessionTimeSettings';
import { PaymentTermsSettings } from '@/components/settings/PaymentTermsSettings';
import { WhatsAppSettings } from '@/components/settings/WhatsAppSettings';
import { EmailSettings } from '@/components/settings/EmailSettings';
import { WorkingHoursSettings } from '@/components/settings/WorkingHoursSettings';
import { FiscalYearSettings } from '@/components/settings/FiscalYearSettings';

type SettingCategory =
  | 'general'
  | 'electricity'
  | 'catering'
  | 'session_times'
  | 'payment_terms'
  | 'whatsapp'
  | 'email'
  | 'working_hours'
  | 'fiscal_year';

// requiredPermission: if set, tab only shown when user has that permission
const ALL_CATEGORIES = [
  { id: 'general',       label: 'General Settings',  icon: '⚙️',  requiredPermission: 'manage-settings' },
  { id: 'electricity',   label: 'Electricity Rates', icon: '⚡',  requiredPermission: 'view-settings' },
  { id: 'catering',      label: 'Catering Packages', icon: '🍽️', requiredPermission: 'view-settings' },
  { id: 'session_times', label: 'Session Times',     icon: '🕐',  requiredPermission: 'view-settings' },
  { id: 'payment_terms', label: 'Payment Terms',     icon: '💳',  requiredPermission: 'view-settings' },
  { id: 'whatsapp',      label: 'WhatsApp API',      icon: '💬',  requiredPermission: 'manage-whatsapp-settings' },
  { id: 'email',         label: 'Email Settings',    icon: '📧',  requiredPermission: 'manage-email-settings' },
  { id: 'working_hours', label: 'Working Hours',     icon: '⏰',  requiredPermission: 'view-settings' },
  { id: 'fiscal_year',   label: 'Fiscal Year',       icon: '📅',  requiredPermission: 'manage-settings' },
];

export default function SettingsPage() {
  const { hasPermission } = usePermission();
  const categories = ALL_CATEGORIES.filter(c => hasPermission(c.requiredPermission));
  const [activeTab, setActiveTab] = useState<SettingCategory>('general');

  // If active tab is not accessible, switch to first allowed tab
  useEffect(() => {
    if (categories.length && !categories.find(c => c.id === activeTab)) {
      setActiveTab(categories[0].id as SettingCategory);
    }
  }, [categories.map(c => c.id).join(',')]); // eslint-disable-line
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<any>({});

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const response = await settingsAPI.getAll();
      setSettings(response.data || {});
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'general':
        return <GeneralSettings settings={settings} onUpdate={loadSettings} />;
      case 'electricity':
        return <ElectricitySettings settings={settings} onUpdate={loadSettings} />;
      case 'catering':
        return <CateringSettings settings={settings} onUpdate={loadSettings} />;
      case 'session_times':
        return <SessionTimeSettings settings={settings} onUpdate={loadSettings} />;
      case 'payment_terms':
        return <PaymentTermsSettings settings={settings} onUpdate={loadSettings} />;
      case 'whatsapp':
        return <WhatsAppSettings settings={settings} onUpdate={loadSettings} />;
      case 'email':
        return <EmailSettings settings={settings} onUpdate={loadSettings} />;
      case 'working_hours':
        return <WorkingHoursSettings settings={settings} onUpdate={loadSettings} />;
      case 'fiscal_year':
        return <FiscalYearSettings settings={settings} onUpdate={loadSettings} />;
      default:
        return <GeneralSettings settings={settings} onUpdate={loadSettings} />;
    }
  };

  return (
    <div className="flex h-full gap-6">
      {/* Left Sidebar */}
      <div className="w-64 flex-shrink-0">
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <nav className="divide-y">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setActiveTab(category.id as SettingCategory)}
                className={`w-full text-left px-6 py-4 transition-colors ${
                  activeTab === category.id
                    ? 'bg-[#C9A052] text-white font-medium'
                    : 'hover:bg-gray-50 text-gray-700'
                }`}
              >
                <span className="mr-3">{category.icon}</span>
                {category.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Right Content Area */}
      <div className="flex-1">
        <div className="bg-white rounded-lg shadow p-8">
          {loading ? (
            <div className="flex items-center justify-center h-96">
              <div className="animate-spin">
                <div className="w-8 h-8 border-4 border-[#1B2D4F] border-t-[#C9A052] rounded-full"></div>
              </div>
            </div>
          ) : (
            renderContent()
          )}
        </div>
      </div>
    </div>
  );
}
