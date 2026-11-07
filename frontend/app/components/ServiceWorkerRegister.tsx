'use client';

import { useEffect } from 'react';

export default function ServiceWorkerRegister(): null {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const isCapacitor = Boolean((window as unknown as { Capacitor?: unknown }).Capacitor);
    if ('serviceWorker' in navigator && !isCapacitor && window.location.protocol.startsWith('http')) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => console.log('Service Worker registered successfully:', reg.scope))
        .catch((err: unknown) => console.error('Service Worker registration failed:', err));
    }
  }, []);

  return null;
}
