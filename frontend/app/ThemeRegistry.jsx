'use client';

import React, { createContext, useContext, useMemo, useState, useEffect } from 'react';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v16-appRouter';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

export const ColorModeContext = createContext({ toggleColorMode: () => { } });

export function useColorMode() {
  return useContext(ColorModeContext);
}

export default function ThemeRegistry({ children }) {
  const [mode, setMode] = useState('dark');

  useEffect(() => {
    const savedMode = localStorage.getItem('themeMode');
    if (savedMode) {
      setMode(savedMode);
    }
  }, []);

  const colorMode = useMemo(() => ({
    toggleColorMode: () => {
      setMode((prevMode) => {
        const newMode = prevMode === 'light' ? 'dark' : 'light';
        localStorage.setItem('themeMode', newMode);
        return newMode;
      });
    },
  }), []);

  const theme = useMemo(() => createTheme({
    palette: {
      mode,
      primary: {
        main: '#3b82f6',
        light: '#60a5fa',
        dark: '#2563eb',
      },
      secondary: {
        main: '#8b5cf6',
      },
      background: {
        default: mode === 'dark' ? '#0b0e14' : '#f8fafc',
        paper: mode === 'dark' ? 'rgba(23, 28, 38, 0.4)' : 'rgba(255, 255, 255, 0.7)',
      },
      text: {
        primary: mode === 'dark' ? '#f1f5f9' : '#0f172a',
        secondary: mode === 'dark' ? '#94a3b8' : '#64748b',
      },
    },
    typography: {
      fontFamily: '"Inter", "system-ui", sans-serif',
      h1: { fontFamily: 'Outfit, sans-serif', fontWeight: 900, letterSpacing: '-0.02em' },
      h2: { fontFamily: 'Outfit, sans-serif', fontWeight: 800, letterSpacing: '-0.02em' },
      h3: { fontFamily: 'Outfit, sans-serif', fontWeight: 700 },
      h4: { fontFamily: 'Outfit, sans-serif', fontWeight: 700 },
      h5: { fontFamily: 'Outfit, sans-serif', fontWeight: 700 },
      h6: { fontFamily: 'Outfit, sans-serif', fontWeight: 700 },
      button: { textTransform: 'none', fontWeight: 800 },
    },
    shape: {
      borderRadius: 16,
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 14,
            padding: '10px 24px',
            fontSize: '1rem',
          },
          containedPrimary: {
            background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
            boxShadow: '0 4px 14px 0 rgba(0, 118, 255, 0.39)',
            '&:hover': {
              boxShadow: '0 6px 20px rgba(0, 118, 255, 0.23)',
              filter: 'brightness(1.1)',
            },
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            borderRadius: 24,
            backdropFilter: 'blur(20px) saturate(180%)',
            border: mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(0, 0, 0, 0.05)',
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            backgroundColor: 'transparent',
            backgroundImage: 'none',
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 10,
            fontWeight: 700,
          },
        },
      },
    },
  }), [mode]);

  return (
    <AppRouterCacheProvider options={{ enableCssLayer: true }}>
      <ColorModeContext.Provider value={colorMode}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          {children}
        </ThemeProvider>
      </ColorModeContext.Provider>
    </AppRouterCacheProvider>
  );
}
