'use client';

import { useEffect } from "react";
import ThemeRegistry from "./ThemeRegistry";

export default function RootLayout({ children }) {
  useEffect(() => {
    // Only register service worker in standard web browsers (avoid file:// or capacitor:// conflicts)
    if ("serviceWorker" in navigator && !window?.Capacitor && window.location.protocol.startsWith('http')) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => console.log("Service Worker registered successfully:", reg.scope))
        .catch((err) => console.error("Service Worker registration failed:", err));
    }
  }, []);

  return (
    <html lang="en">
      <head>
        <title>MasterChef Menu 👨‍🍳</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
        <meta name="description" content="Production-grade Canteen Management System" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#4318FF" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="MasterChef" />
      </head>
      <body>
        <ThemeRegistry>
          {children}
        </ThemeRegistry>
      </body>
    </html>
  );
}

