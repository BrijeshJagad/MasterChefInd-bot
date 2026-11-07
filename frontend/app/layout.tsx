import type { Metadata, Viewport } from 'next';
import React from 'react';
import ThemeRegistry from './ThemeRegistry';
import ServiceWorkerRegister from './components/ServiceWorkerRegister';

export const metadata: Metadata = {
  title: 'MasterChef Menu 👨‍🍳',
  description: 'Production-grade Canteen Management System',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'MasterChef',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1.0,
  maximumScale: 1.0,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#4318FF',
};

export interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps): React.JSX.Element {
  return (
    <html lang="en">
      <body>
        <ServiceWorkerRegister />
        <ThemeRegistry>
          {children}
        </ThemeRegistry>
      </body>
    </html>
  );
}
