'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { ProfilePanel } from './ProfilePanel';
import { NotificationBell } from './NotificationBell';
import { CommandPalette } from './CommandPalette';

interface HeaderProps {
  onSidebarToggle: () => void;
  sidebarOpen: boolean;
}

export function Header({ onSidebarToggle, sidebarOpen }: HeaderProps) {
  const { user } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);
  const avatar = (user as any)?.profile_photo_url as string | undefined;

  return (
    <>
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex justify-between items-center flex-shrink-0">
        {/* Sidebar toggle */}
        <button
          onClick={onSidebarToggle}
          className="text-[#1B2D4F] hover:bg-gray-100 p-2 rounded-lg transition-colors"
          title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          <span className="text-xl">{sidebarOpen ? '←' : '→'}</span>
        </button>

        <div className="flex items-center gap-2">
          {/* Global search trigger */}
          <button
            onClick={() => {
              const evt = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true });
              window.dispatchEvent(evt);
            }}
            className="hidden md:flex items-center gap-2 text-gray-400 hover:bg-gray-100 border border-gray-200 px-3 py-1.5 rounded-lg transition-colors"
            title="Search (Ctrl/⌘ + K)"
          >
            <span className="text-sm">🔍</span>
            <span className="text-xs">Search…</span>
            <kbd className="text-[10px] border rounded px-1 py-0.5 ml-2">⌘K</kbd>
          </button>

          {/* Notifications */}
          <NotificationBell />

          {/* User button */}
          <button
            onClick={() => setProfileOpen(true)}
            className="flex items-center gap-3 hover:bg-gray-100 px-3 py-2 rounded-lg transition-colors"
          >
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-[#1B2D4F] leading-tight">{user?.name}</p>
              <p className="text-xs text-gray-500 capitalize leading-tight">{user?.role?.replace('_', ' ')}</p>
            </div>
            {avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatar} alt={user?.name ?? ''} className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
            ) : (
              <div className="w-9 h-9 rounded-full bg-[#C9A052] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                {user?.name?.charAt(0).toUpperCase()}
              </div>
            )}
          </button>
        </div>
      </header>

      <ProfilePanel open={profileOpen} onClose={() => setProfileOpen(false)} />
      <CommandPalette />
    </>
  );
}
