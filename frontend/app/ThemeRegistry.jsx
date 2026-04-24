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
  const [mode, setMode] = useState('light'); // Default to clean Dribbble UI

  useEffect(() => {
    const savedMode = localStorage.getItem('themeMode');
    if (savedMode) {
      setMode(savedMode);
      document.documentElement.setAttribute('data-theme', savedMode);
    } else {
      document.documentElement.setAttribute('data-theme', 'light');
    }
  }, []);

  const colorMode = useMemo(() => ({
    toggleColorMode: () => {
      setMode((prevMode) => {
        const newMode = prevMode === 'light' ? 'dark' : 'light';
        localStorage.setItem('themeMode', newMode);
        document.documentElement.setAttribute('data-theme', newMode);
        return newMode;
      });
    },
  }), []);

  const theme = useMemo(() => createTheme({
    palette: {
      mode,
      primary: {
        main: '#4318FF',
        light: '#868CFF',
        dark: '#2B0EAA',
      },
      secondary: {
        main: '#05CD99', // A fresh green
      },
      background: {
        default: mode === 'dark' ? '#0B1437' : '#F4F7FE',
        paper: mode === 'dark' ? '#111C44' : '#FFFFFF',
      },
      text: {
        primary: mode === 'dark' ? '#FFFFFF' : '#1B254B',
        secondary: mode === 'dark' ? '#A3AED0' : '#A3AED0',
      },
      divider: mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0',
    },
    typography: {
      fontFamily: '"Inter", "system-ui", sans-serif',
      h1: { fontFamily: 'Outfit, sans-serif', fontWeight: 900, letterSpacing: '-0em' },
      h2: { fontFamily: 'Outfit, sans-serif', fontWeight: 800, letterSpacing: '-0em' },
      h3: { fontFamily: 'Outfit, sans-serif', fontWeight: 800 },
      h4: { fontFamily: 'Outfit, sans-serif', fontWeight: 700 },
      h5: { fontFamily: 'Outfit, sans-serif', fontWeight: 700 },
      h6: { fontFamily: 'Outfit, sans-serif', fontWeight: 700 },
      button: { textTransform: 'none', fontWeight: 700 },
    },
    shape: {
      borderRadius: 16,
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            padding: '10px 24px',
            boxShadow: 'none',
            '&:hover': {
              boxShadow: '0px 10px 20px rgba(67, 24, 255, 0.15)',
            },
          },
          containedPrimary: {
            background: '#4318FF',
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            boxShadow: mode === 'dark' ? '0px 18px 40px rgba(0, 0, 0, 0.4)' : '0px 18px 40px rgba(112, 144, 176, 0.12)',
            borderRadius: 24,
            border: mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.05)' : '1px solid #E2E8F0',
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
