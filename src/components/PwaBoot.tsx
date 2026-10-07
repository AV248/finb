'use client';

import { useEffect } from 'react';

/**
 * Registers the service worker and honours deep links such as
 * `/?screen=arcade` (used by the manifest shortcuts) without touching history.
 */
export function PwaBoot() {
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    if (!('serviceWorker' in navigator)) return undefined;
    if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') return undefined;

    const register = () => {
      navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {
        /* offline support is a bonus, never a blocker */
      });
    };
    if (document.readyState === 'complete') register();
    else window.addEventListener('load', register, { once: true });
    return () => window.removeEventListener('load', register);
  }, []);

  return null;
}

/** Reads the `?screen=` deep link once, so manifest shortcuts open the right floor. */
export function screenFromLocation(): string | null {
  if (typeof window === 'undefined') return null;
  const value = new URLSearchParams(window.location.search).get('screen');
  const allowed = ['home', 'arcade', 'arena', 'friends', 'ranks', 'rewards', 'card', 'more'];
  return value && allowed.includes(value) ? value : null;
}
