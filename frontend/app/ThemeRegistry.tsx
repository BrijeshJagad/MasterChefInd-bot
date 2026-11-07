'use client';

import React, { createContext, useContext, useMemo, useState, useEffect } from 'react';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v16-appRouter';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

export interface ColorModeContextType {
  toggleColorMode: () => void;
  mode?: 'light' | 'dark';
}

export const ColorModeContext = createContext<ColorModeContextType>({
  toggleColorMode: () => {},
  mode: 'light',
});

export function useColorMode(): ColorModeContextType {
  return useContext(ColorModeContext);
}

export interface ThemeRegistryProps {
  children: React.ReactNode;
}

export default function ThemeRegistry({ children }: ThemeRegistryProps): React.JSX.Element {
  const [mode, setMode] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const savedMode = localStorage.getItem('themeMode');
    if (savedMode === 'dark' || savedMode === 'light') {
      setMode(savedMode);
      document.documentElement.setAttribute('data-theme', savedMode);
    } else {
      document.documentElement.setAttribute('data-theme', 'light');
    }
  }, []);

  const colorMode = useMemo<ColorModeContextType>(() => ({
    toggleColorMode: () => {
      setMode((prevMode) => {
        const newMode = prevMode === 'light' ? 'dark' : 'light';
        localStorage.setItem('themeMode', newMode);
        document.documentElement.setAttribute('data-theme', newMode);
        return newMode;
      });
    },
    mode,
  }), [mode]);

  const theme = useMemo(() => {
    const isDark = mode === 'dark';

    return createTheme({
      palette: {
        mode,
        primary: {
          main: isDark ? '#6C5DD3' : '#4318FF',
          light: isDark ? '#8C7CF0' : '#7551FF',
          dark: isDark ? '#4B3CA8' : '#2B0EAA',
          contrastText: '#FFFFFF',
        },
        secondary: {
          main: '#05CD99',
          light: '#2FE5B4',
          dark: '#039670',
          contrastText: '#FFFFFF',
        },
        background: {
          default: isDark ? '#0B1437' : '#F8FAFC',
          paper: isDark ? '#111C44' : '#FFFFFF',
        },
        text: {
          primary: isDark ? '#F8FAFC' : '#0F172A',
          secondary: isDark ? '#94A3B8' : '#64748B',
        },
        divider: isDark ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0',
        action: {
          hover: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(15, 23, 42, 0.03)',
          selected: isDark ? 'rgba(108, 93, 211, 0.16)' : 'rgba(67, 24, 255, 0.08)',
        },
      },
      typography: {
        fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        h1: { fontFamily: '"Plus Jakarta Sans", sans-serif', fontWeight: 700, fontSize: '2.25rem', letterSpacing: '-0.025em', lineHeight: 1.2 },
        h2: { fontFamily: '"Plus Jakarta Sans", sans-serif', fontWeight: 700, fontSize: '1.75rem', letterSpacing: '-0.025em', lineHeight: 1.25 },
        h3: { fontFamily: '"Plus Jakarta Sans", sans-serif', fontWeight: 600, fontSize: '1.5rem', letterSpacing: '-0.02em', lineHeight: 1.3 },
        h4: { fontFamily: '"Plus Jakarta Sans", sans-serif', fontWeight: 600, fontSize: '1.25rem', letterSpacing: '-0.02em', lineHeight: 1.35 },
        h5: { fontFamily: '"Plus Jakarta Sans", sans-serif', fontWeight: 600, fontSize: '1.1rem', letterSpacing: '-0.015em', lineHeight: 1.4 },
        h6: { fontFamily: '"Plus Jakarta Sans", sans-serif', fontWeight: 600, fontSize: '0.975rem', letterSpacing: '-0.01em', lineHeight: 1.4 },
        subtitle1: { fontSize: '0.95rem', fontWeight: 500, lineHeight: 1.5 },
        subtitle2: { fontSize: '0.85rem', fontWeight: 500, lineHeight: 1.5 },
        body1: { fontSize: '0.925rem', lineHeight: 1.55 },
        body2: { fontSize: '0.85rem', lineHeight: 1.5 },
        caption: { fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.04em' },
        button: { textTransform: 'none', fontWeight: 600, fontSize: '0.875rem' },
      },
      shape: {
        borderRadius: 14,
      },
      components: {
        MuiButton: {
          styleOverrides: {
            root: {
              borderRadius: 10,
              padding: '8px 18px',
              fontWeight: 600,
              boxShadow: 'none',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                boxShadow: isDark
                  ? '0 6px 16px -2px rgba(0, 0, 0, 0.4)'
                  : '0 6px 16px -2px rgba(67, 24, 255, 0.2)',
                transform: 'translateY(-1px)',
              },
              '&:active': {
                transform: 'translateY(0)',
              },
              '&.MuiButton-containedPrimary': {
                backgroundColor: isDark ? '#6C5DD3' : '#4318FF',
                '&:hover': {
                  backgroundColor: isDark ? '#7E70E2' : '#3311CC',
                },
              },
            },
            outlined: {
              borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : '#CBD5E1',
              '&:hover': {
                borderColor: isDark ? '#6C5DD3' : '#4318FF',
                backgroundColor: isDark ? 'rgba(108, 93, 211, 0.08)' : 'rgba(67, 24, 255, 0.04)',
              },
            },
          },
        },
        MuiPaper: {
          styleOverrides: {
            root: {
              backgroundImage: 'none',
              borderRadius: 16,
              border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #E2E8F0',
              boxShadow: isDark
                ? '0 8px 24px -4px rgba(0, 0, 0, 0.45)'
                : '0 4px 20px -2px rgba(15, 23, 42, 0.05)',
            },
          },
        },
        MuiChip: {
          styleOverrides: {
            root: {
              fontWeight: 600,
              borderRadius: 8,
            },
          },
        },
        MuiDialog: {
          styleOverrides: {
            paper: {
              borderRadius: 20,
              border: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid #E2E8F0',
              boxShadow: isDark
                ? '0 24px 60px -8px rgba(0, 0, 0, 0.7)'
                : '0 20px 50px -8px rgba(15, 23, 42, 0.16)',
            },
          },
        },
        MuiOutlinedInput: {
          styleOverrides: {
            root: {
              borderRadius: 10,
              '& fieldset': {
                borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : '#CBD5E1',
              },
              '&:hover fieldset': {
                borderColor: isDark ? 'rgba(255, 255, 255, 0.24)' : '#94A3B8',
              },
            },
          },
        },
        MuiTableCell: {
          styleOverrides: {
            root: {
              borderColor: isDark ? 'rgba(255, 255, 255, 0.06)' : '#F1F5F9',
              padding: '12px 16px',
            },
            head: {
              fontWeight: 600,
              fontSize: '0.75rem',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              color: isDark ? '#94A3B8' : '#64748B',
              backgroundColor: isDark ? '#0E1738' : '#F8FAFC',
            },
          },
        },
      },
    });
  }, [mode]);

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
