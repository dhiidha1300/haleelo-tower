'use client';

import { useEffect } from 'react';

/**
 * Sets the browser-tab favicon (and title) from the building branding so the
 * uploaded logo becomes the site icon. Hits the public /api/branding endpoint,
 * so it works even on the login page. Re-fetches on mount, so changing the logo
 * is reflected after a reload.
 */
export function FaviconBranding() {
  useEffect(() => {
    // Same-origin by default ('' → "/api/branding"), proxied to Laravel via
    // next.config rewrites. Falls back to an explicit API URL if configured.
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';

    fetch(`${apiUrl}/api/branding`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return;

        if (data.logo_url) {
          // Replace any existing icon links with the logo.
          document.querySelectorAll("link[rel~='icon']").forEach((el) => el.remove());
          const link = document.createElement('link');
          link.rel = 'icon';
          link.href = data.logo_url;
          document.head.appendChild(link);
        }

        if (data.building_name) {
          document.title = `${data.building_name} — Admin Dashboard`;
        }
      })
      .catch(() => {
        /* branding is best-effort — ignore failures */
      });
  }, []);

  return null;
}
