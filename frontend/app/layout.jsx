'use client';

import { useEffect } from "react";
import ThemeRegistry from "./ThemeRegistry";

export default function RootLayout({ children }) {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
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

