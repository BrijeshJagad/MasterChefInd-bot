'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Box, Typography, CircularProgress,
  Stack, Divider, Chip, Tooltip, IconButton, Button, useTheme, useMediaQuery
} from '@mui/material';
import Sidebar from './components/Sidebar';
import DownloadIcon from '@mui/icons-material/DescriptionOutlined';
import JsonIcon from '@mui/icons-material/DataObjectOutlined';
import MenuIcon from '@mui/icons-material/Menu';

export default function Home() {
  const [weeks, setWeeks] = useState([]);
  const [selectedWeek, setSelectedWeek] = useState('');
  const [menuData, setMenuData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const todayName = useMemo(() => {
    return new Date().toLocaleDateString('en-US', { weekday: 'long' });
  }, []);

  useEffect(() => {
    fetch('/api/weeks')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.weeks.length > 0) {
          setWeeks(data.weeks);
          setSelectedWeek(data.weeks[0]);
        } else {
          setLoading(false);
        }
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedWeek) return;
    setLoading(true);
    fetch(`/api/menu?week=${selectedWeek}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setMenuData(data.menu);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [selectedWeek]);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  if (loading && weeks.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', bgcolor: 'var(--bg-color)' }}>
        <CircularProgress size={40} thickness={4} />
      </Box>
    );
  }

  const days = menuData ? Object.keys(menuData) : [];

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'var(--bg-color)' }}>
      {/* Sidebar - Mobile Responsive V8 */}
      <Sidebar
        weeks={weeks}
        selectedWeek={selectedWeek}
        onSelectWeek={(w) => setSelectedWeek(w)}
        mobileOpen={mobileOpen}
        onMobileToggle={handleDrawerToggle}
      />

      {/* Main Content Area */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 2.5, md: 4 },
          width: '100%',
          maxWidth: '100vw',
          overflowX: 'hidden'
        }}
      >

        {/* Responsive Header */}
        <Box sx={{ mb: 2, display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', alignItems: { md: 'flex-start' }, gap: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>

            <Box>
              <Typography variant="h6" >
                Canteen Menu Week {selectedWeek}
              </Typography>
            </Box>
            {isMobile && (
              <IconButton onClick={handleDrawerToggle} sx={{ bgcolor: 'rgba(255,255,255,0.05)', borderRadius: '10px' }}>
                <MenuIcon />
              </IconButton>
            )}
          </Box>

          <Stack direction="row" spacing={2} sx={{ alignSelf: { xs: 'flex-start', md: 'center' } }}>
            <Box>
              <Stack direction="row" spacing={1}>
                <Button
                  href={`/api/download/pdf?week=${selectedWeek}`}
                  variant="outlined"
                  size="small"
                  startIcon={<DownloadIcon sx={{ fontSize: '1rem' }} />}
                  sx={{ borderRadius: '8px', fontSize: '0.7rem', minWidth: 0, px: 2 }}
                >
                  PDF
                </Button>
                <Button
                  href={`/api/download/json?week=${selectedWeek}`}
                  variant="outlined"
                  size="small"
                  startIcon={<JsonIcon sx={{ fontSize: '1rem' }} />}
                  sx={{ borderRadius: '8px', fontSize: '0.7rem', minWidth: 0, px: 2 }}
                >
                  JSON
                </Button>
              </Stack>
            </Box>
          </Stack>
        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 20 }}>
            <CircularProgress size={40} thickness={4} />
          </Box>
        ) : !menuData ? (
          <Box sx={{ textAlign: 'center', py: 10, borderRadius: '24px' }} className="glass-ultimate">
            <Typography variant="body1" color="text.secondary">No Active Menu Data</Typography>
          </Box>
        ) : (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                sm: 'repeat(2, 1fr)',
                lg: 'repeat(3, 1fr)',
                xl: 'repeat(4, 1fr)'
              },
              gap: 3
            }}
          >
            {days.map((day, idx) => {
              const isToday = day.toUpperCase() === todayName.toUpperCase();
              return (
                <Box
                  key={day}
                  sx={{
                    borderRadius: '24px',
                    p: 3,
                    position: 'relative',
                    border: isToday ? '1px solid #3b82f6' : '1px solid var(--glass-border)',
                    bgcolor: isToday ? 'rgba(59, 130, 246, 0.04)' : 'transparent',
                    boxShadow: isToday ? '0 20px 40px rgba(59, 130, 246, 0.1)' : 'none',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    '&:hover': {
                      borderColor: 'primary.main',
                      transform: 'translateY(-4px)',
                      bgcolor: isToday ? 'rgba(59, 130, 246, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                      boxShadow: '0 12px 24px rgba(0,0,0,0.1)'
                    }
                  }}
                >
                  {isToday && (
                    <Box sx={{ position: 'absolute', top: 16, right: 16 }}>
                      <Chip label="TODAY" color="primary" sx={{ fontWeight: 900, borderRadius: '6px', height: 20, fontSize: '0.65rem' }} />
                    </Box>
                  )}

                  <Box sx={{ mb: 3 }}>
                    <Typography variant="h6">{day}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {menuData[day].date || 'ARCHIVE'}
                    </Typography>
                  </Box>

                  <Stack spacing={1.5}>
                    <Box sx={{ borderLeft: '4px solid #facc15', pl: 2, py: 1.5, pr: 1.5, bgcolor: 'rgba(250, 204, 21, 0.06)', borderRadius: '0 12px 12px 0' }}>
                      <Typography variant="caption" sx={{ color: '#eab308', fontWeight: 800, textTransform: 'uppercase' }}>
                        🥗 Breakfast
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.5 }}>
                        {menuData[day].breakfast || "—"}
                      </Typography>
                    </Box>

                    <Box sx={{ borderLeft: '4px solid #10b981', pl: 2, py: 1.5, pr: 1.5, bgcolor: 'rgba(16, 185, 129, 0.06)', borderRadius: '0 12px 12px 0' }}>
                      <Typography variant="caption" sx={{ color: '#10b981', fontWeight: 800, textTransform: 'uppercase' }}>
                        🍛 Lunch
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.5 }}>
                        {menuData[day].lunch || "—"}
                      </Typography>
                    </Box>

                    <Box sx={{ borderLeft: '4px solid #6366f1', pl: 2, py: 1.5, pr: 1.5, bgcolor: 'rgba(99, 102, 241, 0.06)', borderRadius: '0 12px 12px 0' }}>
                      <Typography variant="caption" sx={{ color: '#6366f1', fontWeight: 800, textTransform: 'uppercase' }}>
                        🥣 Dinner
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.5 }}>
                        {menuData[day].dinner || "—"}
                      </Typography>
                    </Box>
                  </Stack>
                </Box>
              );
            })}
          </Box>
        )}
      </Box>
    </Box>
  );
}
