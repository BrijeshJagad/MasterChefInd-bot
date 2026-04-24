'use client';

import React, { Suspense } from 'react';
import { Box, CircularProgress } from '@mui/material';

export default function SuspenseBoundary({ children }) {
  return (
    <Suspense fallback={
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', bgcolor: 'var(--bg-color)' }}>
        <CircularProgress size={40} thickness={4} />
      </Box>
    }>
      {children}
    </Suspense>
  );
}
