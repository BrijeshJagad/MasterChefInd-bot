'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Box, Typography, CircularProgress,
  Stack, Chip, IconButton, Button, useTheme, useMediaQuery,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, Alert,
  Paper
} from '@mui/material';
import Sidebar from './components/Sidebar';
import { useSearchParams } from 'next/navigation';
import SuspenseBoundary from './components/SuspenseBoundary';
import { API_BASE_URL } from './config';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import DataObjectOutlinedIcon from '@mui/icons-material/DataObjectOutlined';
import MenuIcon from '@mui/icons-material/Menu';
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import AddOutlinedIcon from '@mui/icons-material/AddOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import WbSunnyOutlinedIcon from '@mui/icons-material/WbSunnyOutlined';
import RestaurantMenuOutlinedIcon from '@mui/icons-material/RestaurantMenuOutlined';
import NightlightOutlinedIcon from '@mui/icons-material/NightlightOutlined';
import CalendarTodayOutlinedIcon from '@mui/icons-material/CalendarTodayOutlined';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import { WeeklyMenuData, IDayMeals } from '../../types/common';

const DAYS: readonly string[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function HomeContent(): React.JSX.Element {
  const searchParams = useSearchParams();
  const urlWeek = searchParams.get('week');

  const [weeks, setWeeks] = useState<string[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<string>('');
  const [menuData, setMenuData] = useState<WeeklyMenuData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [mobileOpen, setMobileOpen] = useState<boolean>(false);

  // Admin State
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [jwtToken, setJwtToken] = useState<string>('');
  const [loginModalOpen, setLoginModalOpen] = useState<boolean>(false);
  const [password, setPassword] = useState<string>('');
  const [authError, setAuthError] = useState<string>('');

  // Admin Features State
  const [uploadModalOpen, setUploadModalOpen] = useState<boolean>(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [uploadMessage, setUploadMessage] = useState<string>('');

  const [editModalOpen, setEditModalOpen] = useState<boolean>(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState<boolean>(false);
  const [activeWeekKey, setActiveWeekKey] = useState<string | null>(null);
  const [newWeekKey, setNewWeekKey] = useState<string>('');
  const [editData, setEditData] = useState<Record<string, IDayMeals>>({});
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Auto-fill Dates
  useEffect(() => {
    if (!editModalOpen || activeWeekKey) return;
    if (newWeekKey.length === 6) {
      const year = parseInt(newWeekKey.substring(0, 4), 10);
      const week = parseInt(newWeekKey.substring(4), 10);
      const simple = new Date(Date.UTC(year, 0, 1 + (week - 1) * 7));
      const dow = simple.getUTCDay();
      const ISOweekStart = simple;
      if (dow <= 4) ISOweekStart.setUTCDate(simple.getUTCDate() - simple.getUTCDay() + 1);
      else ISOweekStart.setUTCDate(simple.getUTCDate() + 8 - simple.getUTCDay());

      const dates: string[] = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(ISOweekStart);
        d.setUTCDate(d.getUTCDate() + i);
        dates.push(d.toISOString().slice(5, 10).replace('-', '/'));
      }

      setEditData(prev => {
        const updated: Record<string, IDayMeals> = { ...prev };
        DAYS.forEach((day, idx) => {
          const key = day.toUpperCase();
          const existing = updated[key] ?? { breakfast: '', lunch: '', dinner: '' };
          updated[key] = {
            ...existing,
            date: dates[idx],
          };
        });
        return updated;
      });
    }
  }, [newWeekKey, editModalOpen, activeWeekKey]);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isDark = theme.palette.mode === 'dark';

  const todayName = useMemo(() => {
    const dStr = new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
    return new Date(dStr).toLocaleDateString('en-US', { weekday: 'long' });
  }, []);

  const currentWeekKey = useMemo(() => {
    const dStr = new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
    const d = new Date(dStr);
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return `${d.getUTCFullYear()}${weekNo.toString().padStart(2, '0')}`;
  }, []);

  // Check auth on load
  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (token) {
      setIsAdmin(true);
      setJwtToken(token);
    }
  }, []);

  useEffect(() => {
    const cachedWeeks = localStorage.getItem('cached_weeks');
    if (cachedWeeks) {
      try {
        const parsed = JSON.parse(cachedWeeks) as string[];
        if (parsed && parsed.length > 0) {
          setWeeks(parsed);
          setSelectedWeek(urlWeek || parsed[0] || '');
          setLoading(false);
        }
      } catch {
        // Cache read ignored
      }
    }

    fetch(`${API_BASE_URL}/api/weeks?_t=${Date.now()}`)
      .then(res => res.json())
      .then((data: { success?: boolean; weeks?: string[] }) => {
        if (data.success && data.weeks && data.weeks.length > 0) {
          setWeeks(data.weeks);
          localStorage.setItem('cached_weeks', JSON.stringify(data.weeks));
          const target = urlWeek || data.weeks[0] || '';
          setSelectedWeek(target);
        }
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, [urlWeek]);

  // Sync selectedWeek if URL parameter changes
  useEffect(() => {
    if (urlWeek && urlWeek !== selectedWeek) {
      setSelectedWeek(urlWeek);
    }
  }, [urlWeek, selectedWeek]);

  useEffect(() => {
    if (!selectedWeek) return;
    setLoading(true);

    const cachedMenu = localStorage.getItem(`cached_menu_${selectedWeek}`);
    if (cachedMenu) {
      try {
        setMenuData(JSON.parse(cachedMenu) as WeeklyMenuData);
        setLoading(false);
      } catch {
        // Cache read ignored
      }
    }

    fetch(`${API_BASE_URL}/api/menu?week=${selectedWeek}&_t=${Date.now()}`)
      .then(res => res.json())
      .then((data: { success?: boolean; menu?: WeeklyMenuData }) => {
        if (data.success && data.menu) {
          setMenuData(data.menu);
          localStorage.setItem(`cached_menu_${selectedWeek}`, JSON.stringify(data.menu));
        } else if (!cachedMenu) {
          setMenuData(null);
        }
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, [selectedWeek]);

  useEffect(() => {
    if (!loading && menuData) {
      setTimeout(() => {
        const todayElement = document.getElementById(`card-${todayName.toLowerCase()}`);
        if (todayElement) {
          todayElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 500);
    }
  }, [loading, menuData, todayName]);

  const refreshWeeks = (): void => {
    fetch(`${API_BASE_URL}/api/weeks?_t=${Date.now()}`, { cache: 'no-store' })
      .then(res => res.json())
      .then((data: { success?: boolean; weeks?: string[] }) => {
        if (data.success && data.weeks) {
          setWeeks(data.weeks);
          if (!data.weeks.includes(selectedWeek) && data.weeks.length > 0) {
            setSelectedWeek(data.weeks[0] || '');
          }
        }
      })
      .catch(() => {});
  };

  const handleDrawerToggle = (): void => {
    setMobileOpen(!mobileOpen);
  };

  // Auth Handlers
  const handleLogin = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setAuthError('');
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json() as { token?: string; error?: string };
      if (res.ok && data.token) {
        localStorage.setItem('adminToken', data.token);
        setJwtToken(data.token);
        setIsAdmin(true);
        setLoginModalOpen(false);
        setPassword('');
      } else {
        setAuthError(data.error || 'Authentication failed');
      }
    } catch {
      setAuthError('Network error');
    }
  };

  const handleLogout = (): void => {
    localStorage.removeItem('adminToken');
    setJwtToken('');
    setIsAdmin(false);
  };

  // File Upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!file) return;
    setUploadStatus('uploading');
    const formData = new FormData();
    formData.append('pdf', file);
    try {
      const res = await fetch(`${API_BASE_URL}/api/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${jwtToken}` },
        body: formData,
      });
      const data = await res.json() as { message?: string; error?: string };
      if (res.ok) {
        setUploadStatus('success');
        setUploadMessage(data.message || 'Upload complete');
        setFile(null);
        refreshWeeks();
        setTimeout(() => setUploadModalOpen(false), 2000);
      } else {
        setUploadStatus('error');
        setUploadMessage(data.error || 'Upload failed');
        if (res.status === 401) handleLogout();
      }
    } catch {
      setUploadStatus('error');
      setUploadMessage('Network error occurred.');
    }
  };

  // Edit & Delete Handlers
  const handleCreateNew = (): void => {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    setNewWeekKey(`${d.getUTCFullYear()}${weekNo.toString().padStart(2, '0')}`);

    const initializedData: Record<string, IDayMeals> = {};
    DAYS.forEach(day => {
      initializedData[day.toUpperCase()] = { date: '', breakfast: '', lunch: '', dinner: '' };
    });
    setEditData(initializedData);
    setActiveWeekKey(null);
    setEditModalOpen(true);
  };

  const handleEditClick = (): void => {
    if (!selectedWeek || !menuData) return;
    setActiveWeekKey(selectedWeek);
    const initializedData: Record<string, IDayMeals> = {};
    DAYS.forEach(day => {
      const key = day.toUpperCase();
      const existingKey = Object.keys(menuData).find(k => k.toUpperCase() === key);
      const dayRecord = existingKey ? menuData[existingKey] : undefined;
      
      initializedData[key] = {
        date: dayRecord?.date || '',
        breakfast: dayRecord?.breakfast || '',
        lunch: dayRecord?.lunch || '',
        dinner: dayRecord?.dinner || '',
      };
    });
    setEditData(initializedData);
    setEditModalOpen(true);
  };

  const handleEditChange = (day: string, field: keyof IDayMeals, value: string): void => {
    setEditData(prev => {
      const existing = prev[day] ?? { breakfast: '', lunch: '', dinner: '' };
      return {
        ...prev,
        [day]: {
          ...existing,
          [field]: value,
        },
      };
    });
  };

  const handleSaveEdit = async (): Promise<void> => {
    setIsSaving(true);
    try {
      const isCreateMode = !activeWeekKey;
      const targetWeek = isCreateMode ? newWeekKey : activeWeekKey;
      const endpoint = isCreateMode ? `${API_BASE_URL}/api/menu` : `${API_BASE_URL}/api/menu/${targetWeek}`;
      const method = isCreateMode ? 'POST' : 'PUT';

      const payload: { menuData: Record<string, IDayMeals>; weekKey?: string } = { menuData: editData };
      if (isCreateMode) payload.weekKey = targetWeek;

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${jwtToken}` },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setEditModalOpen(false);
        refreshWeeks();
        if (targetWeek === selectedWeek) {
          const updated = (await fetch(`${API_BASE_URL}/api/menu?week=${targetWeek}&_t=${Date.now()}`, { cache: 'no-store' }).then(r => r.json())) as { success?: boolean; menu?: WeeklyMenuData };
          if (updated.success && updated.menu) setMenuData(updated.menu);
        } else if (isCreateMode) {
          setSelectedWeek(targetWeek);
        }
      } else if (res.status === 401) {
        handleLogout();
      } else {
        alert('Operation failed.');
      }
    } catch {
      alert('Network error.');
    }
    setIsSaving(false);
  };

  const handleDeleteAction = async (): Promise<void> => {
    if (!selectedWeek) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/menu/${selectedWeek}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${jwtToken}` },
      });
      if (res.ok) {
        setDeleteModalOpen(false);
        refreshWeeks();
        if (weeks.length === 1) setMenuData(null);
      } else if (res.status === 401) {
        handleLogout();
      } else {
        alert('Failed to delete.');
      }
    } catch {
      alert('Network error.');
    }
  };

  const handleDelete = (): void => setDeleteModalOpen(true);

  if (loading && weeks.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', bgcolor: 'background.default' }}>
        <CircularProgress size={36} thickness={4} />
      </Box>
    );
  }

  const days = menuData ? Object.keys(menuData) : [];

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <Sidebar
        weeks={weeks}
        selectedWeek={selectedWeek}
        onSelectWeek={(w) => setSelectedWeek(w)}
        mobileOpen={mobileOpen}
        onMobileToggle={handleDrawerToggle}
        isAdmin={isAdmin}
        onAdminToggle={() => setLoginModalOpen(true)}
        onAdminLogout={handleLogout}
      />

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          px: { xs: 2.5, md: 4 },
          pb: { xs: 3, md: 5 },
          width: '100%',
          maxWidth: '100vw',
          overflowX: 'hidden',
          overflowY: 'auto',
          height: '100vh',
          position: 'relative',
        }}
      >
        {loading && (
          <Box sx={{ position: 'fixed', top: 16, right: 24, zIndex: 1200 }}>
            <CircularProgress size={22} thickness={4} />
          </Box>
        )}

        {/* Responsive Header Bar */}
        <Box
          sx={{
            position: 'sticky',
            top: 0,
            zIndex: 40,
            bgcolor: isDark ? 'rgba(11, 20, 55, 0.85)' : 'rgba(248, 250, 252, 0.85)',
            backdropFilter: 'blur(12px)',
            pt: { xs: 2, md: 3 },
            pb: 2,
            mb: 3,
            borderBottom: '1px solid',
            borderColor: 'divider',
            mx: { xs: -2.5, md: -4 },
            px: { xs: 2.5, md: 4 },
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            justifyContent: 'space-between',
            alignItems: { xs: 'flex-start', md: 'center' },
            gap: 2,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, width: { xs: '100%', md: 'auto' }, justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              {isMobile && (
                <IconButton onClick={handleDrawerToggle} size="small" sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '8px' }}>
                  <MenuIcon fontSize="small" />
                </IconButton>
              )}
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="h5" sx={{ fontWeight: 700, fontSize: { xs: '1.2rem', md: '1.4rem' } }}>
                    Weekly Menu
                  </Typography>
                  <Chip
                    size="small"
                    label={`Week ${selectedWeek}`}
                    sx={{
                      fontWeight: 700,
                      fontSize: '0.725rem',
                      height: 24,
                      bgcolor: isDark ? 'rgba(108, 93, 211, 0.16)' : 'rgba(67, 24, 255, 0.08)',
                      color: 'primary.main',
                    }}
                  />
                  {selectedWeek === currentWeekKey && (
                    <Chip
                      size="small"
                      icon={<CheckCircleOutlinedIcon sx={{ fontSize: '0.85rem !important', color: '#05CD99 !important' }} />}
                      label="Current Week"
                      sx={{
                        fontWeight: 600,
                        fontSize: '0.7rem',
                        height: 24,
                        bgcolor: 'rgba(5, 205, 153, 0.1)',
                        color: '#05CD99',
                      }}
                    />
                  )}
                </Box>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                  Automated canteen schedule & nutritional broadcast
                </Typography>
              </Box>
            </Box>
          </Box>

          {/* Action Buttons */}
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
            {isAdmin && (
              <>
                <Button
                  variant="contained"
                  size="small"
                  onClick={handleCreateNew}
                  startIcon={<AddOutlinedIcon sx={{ fontSize: '1rem' }} />}
                >
                  Create
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => { setUploadStatus('idle'); setUploadMessage(''); setFile(null); setUploadModalOpen(true); }}
                  startIcon={<CloudUploadOutlinedIcon sx={{ fontSize: '1rem' }} />}
                >
                  Upload
                </Button>
                {menuData && (
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={handleEditClick}
                    startIcon={<EditOutlinedIcon sx={{ fontSize: '1rem' }} />}
                  >
                    Edit
                  </Button>
                )}
                {menuData && (
                  <Button
                    variant="outlined"
                    size="small"
                    color="error"
                    onClick={handleDelete}
                    startIcon={<DeleteOutlineIcon sx={{ fontSize: '1rem' }} />}
                  >
                    Delete
                  </Button>
                )}
              </>
            )}

            <Button
              href={`${API_BASE_URL}/api/download/pdf?week=${selectedWeek}`}
              variant="outlined"
              size="small"
              startIcon={<DescriptionOutlinedIcon sx={{ fontSize: '1rem' }} />}
            >
              PDF
            </Button>
            <Button
              href={`${API_BASE_URL}/api/download/json?week=${selectedWeek}`}
              variant="outlined"
              size="small"
              startIcon={<DataObjectOutlinedIcon sx={{ fontSize: '1rem' }} />}
            >
              JSON
            </Button>
          </Stack>
        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 16 }}>
            <CircularProgress size={36} thickness={4} />
          </Box>
        ) : !menuData ? (
          <Box className="animate-float-in" sx={{ textAlign: 'center', py: { xs: 8, md: 14 }, px: 3, maxWidth: 640, mx: 'auto' }}>
            <Box
              sx={{
                width: 64,
                height: 64,
                bgcolor: isDark ? 'rgba(108, 93, 211, 0.12)' : 'rgba(67, 24, 255, 0.08)',
                borderRadius: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mx: 'auto',
                mb: 3,
              }}
            >
              <CalendarTodayOutlinedIcon sx={{ fontSize: 30, color: 'primary.main' }} />
            </Box>
            <Typography variant="h4" sx={{ mb: 1, fontWeight: 700 }}>
              No Menu Available for Week {selectedWeek}
            </Typography>
            <Typography variant="body2" sx={{ mb: 4, color: 'text.secondary', maxWidth: 440, mx: 'auto' }}>
              No menu schedule has been published for this week yet. You can import a PDF/photo or create a schedule manually.
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ justifyContent: 'center' }}>
              <Button
                variant="contained"
                onClick={() => { setUploadStatus('idle'); setUploadMessage(''); setFile(null); setUploadModalOpen(true); }}
                startIcon={<CloudUploadOutlinedIcon />}
              >
                Upload Menu PDF
              </Button>
              <Button
                variant="outlined"
                onClick={handleCreateNew}
                startIcon={<AddOutlinedIcon />}
              >
                Create Manually
              </Button>
            </Stack>
          </Box>
        ) : (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                sm: 'repeat(2, 1fr)',
                lg: 'repeat(3, 1fr)',
                xl: 'repeat(4, 1fr)',
              },
              gap: 2.5,
            }}
          >
            {days.map((day, idx) => {
              const isToday = selectedWeek === currentWeekKey && day.toUpperCase() === todayName.toUpperCase();
              const dayMeals: IDayMeals | undefined = menuData[day];
              return (
                <Paper
                  key={day}
                  id={`card-${day.toLowerCase()}`}
                  className="animate-float-in"
                  elevation={0}
                  sx={{
                    p: 2.5,
                    position: 'relative',
                    borderColor: isToday
                      ? (isDark ? '#6C5DD3' : '#4318FF')
                      : 'divider',
                    borderWidth: isToday ? 2 : 1,
                    borderStyle: 'solid',
                    bgcolor: 'background.paper',
                    animationDelay: `${idx * 0.04}s`,
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: isDark
                        ? '0 12px 32px -4px rgba(0, 0, 0, 0.6)'
                        : '0 8px 24px -4px rgba(15, 23, 42, 0.08)',
                    },
                  }}
                >
                  {/* Card Header */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2.5 }}>
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1.05rem', lineHeight: 1.2 }}>
                        {day}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                        {dayMeals?.date ? `Date: ${dayMeals.date.replace('/', '-')}` : 'Date unassigned'}
                      </Typography>
                    </Box>
                    {isToday && (
                      <Chip
                        size="small"
                        label="TODAY"
                        sx={{
                          bgcolor: 'primary.main',
                          color: 'white',
                          fontWeight: 700,
                          fontSize: '0.625rem',
                          height: 22,
                          letterSpacing: '0.04em',
                        }}
                      />
                    )}
                  </Box>

                  {/* Meal Slots */}
                  <Stack spacing={1.5}>
                    {/* Breakfast Slot */}
                    <Box
                      sx={{
                        p: 1.5,
                        borderRadius: '10px',
                        bgcolor: isDark ? 'rgba(245, 158, 11, 0.06)' : 'rgba(245, 158, 11, 0.04)',
                        border: '1px solid',
                        borderColor: isDark ? 'rgba(245, 158, 11, 0.15)' : 'rgba(245, 158, 11, 0.12)',
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5 }}>
                        <WbSunnyOutlinedIcon sx={{ fontSize: '0.85rem', color: '#D97706' }} />
                        <Typography
                          variant="caption"
                          sx={{
                            color: isDark ? '#FBBF24' : '#D97706',
                            fontWeight: 700,
                            letterSpacing: '0.04em',
                            fontSize: '0.675rem',
                            textTransform: 'uppercase',
                          }}
                        >
                          Breakfast
                        </Typography>
                      </Box>
                      <Typography
                        variant="body2"
                        sx={{
                          fontSize: '0.825rem',
                          lineHeight: 1.45,
                          color: 'text.primary',
                          whiteSpace: 'pre-line',
                        }}
                      >
                        {dayMeals?.breakfast || '—'}
                      </Typography>
                    </Box>

                    {/* Lunch Slot */}
                    <Box
                      sx={{
                        p: 1.5,
                        borderRadius: '10px',
                        bgcolor: isDark ? 'rgba(5, 205, 153, 0.06)' : 'rgba(5, 205, 153, 0.04)',
                        border: '1px solid',
                        borderColor: isDark ? 'rgba(5, 205, 153, 0.15)' : 'rgba(5, 205, 153, 0.12)',
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5 }}>
                        <RestaurantMenuOutlinedIcon sx={{ fontSize: '0.85rem', color: '#059669' }} />
                        <Typography
                          variant="caption"
                          sx={{
                            color: isDark ? '#34D399' : '#059669',
                            fontWeight: 700,
                            letterSpacing: '0.04em',
                            fontSize: '0.675rem',
                            textTransform: 'uppercase',
                          }}
                        >
                          Lunch
                        </Typography>
                      </Box>
                      <Typography
                        variant="body2"
                        sx={{
                          fontSize: '0.825rem',
                          lineHeight: 1.45,
                          color: 'text.primary',
                          whiteSpace: 'pre-line',
                        }}
                      >
                        {dayMeals?.lunch || '—'}
                      </Typography>
                    </Box>

                    {/* Dinner Slot */}
                    <Box
                      sx={{
                        p: 1.5,
                        borderRadius: '10px',
                        bgcolor: isDark ? 'rgba(99, 102, 241, 0.06)' : 'rgba(99, 102, 241, 0.04)',
                        border: '1px solid',
                        borderColor: isDark ? 'rgba(99, 102, 241, 0.15)' : 'rgba(99, 102, 241, 0.12)',
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5 }}>
                        <NightlightOutlinedIcon sx={{ fontSize: '0.85rem', color: '#6366F1' }} />
                        <Typography
                          variant="caption"
                          sx={{
                            color: isDark ? '#A5B4FC' : '#6366F1',
                            fontWeight: 700,
                            letterSpacing: '0.04em',
                            fontSize: '0.675rem',
                            textTransform: 'uppercase',
                          }}
                        >
                          Dinner
                        </Typography>
                      </Box>
                      <Typography
                        variant="body2"
                        sx={{
                          fontSize: '0.825rem',
                          lineHeight: 1.45,
                          color: 'text.primary',
                          whiteSpace: 'pre-line',
                        }}
                      >
                        {dayMeals?.dinner || '—'}
                      </Typography>
                    </Box>
                  </Stack>
                </Paper>
              );
            })}
          </Box>
        )}
      </Box>

      {/* --- Admin Modals --- */}
      {/* Login Modal */}
      <Dialog
        open={loginModalOpen}
        onClose={() => setLoginModalOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogContent sx={{ textAlign: 'center', p: 3.5 }}>
          <Box
            sx={{
              width: 52,
              height: 52,
              borderRadius: '12px',
              bgcolor: isDark ? 'rgba(108, 93, 211, 0.16)' : 'rgba(67, 24, 255, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mx: 'auto',
              mb: 2,
            }}
          >
            <LockOutlinedIcon sx={{ fontSize: 26, color: 'primary.main' }} />
          </Box>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
            Admin Authentication
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 2.5 }}>
            Enter your secret password to unlock editing capabilities
          </Typography>

          <form onSubmit={handleLogin}>
            <Stack spacing={2}>
              <TextField
                type="password"
                label="System Password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoFocus
                required
                fullWidth
                size="small"
              />
              <Button
                type="submit"
                variant="contained"
                fullWidth
                sx={{ py: 1.2 }}
              >
                Authenticate
              </Button>
            </Stack>
          </form>
          {authError && <Alert severity="error" sx={{ mt: 2, borderRadius: '8px', fontSize: '0.8rem' }}>{authError}</Alert>}
        </DialogContent>
      </Dialog>

      {/* Upload PDF / Image Modal */}
      <Dialog
        open={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle sx={{ fontWeight: 700, fontSize: '1.25rem', p: 3, pb: 1 }}>
          Import Menu File
        </DialogTitle>
        <DialogContent sx={{ p: 3, pt: 1 }}>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
            Upload a weekly dining PDF or photo. Gemini AI will automatically extract schedules, dates, and meal items.
          </Typography>
          <form onSubmit={handleUpload}>
            <Stack spacing={2.5}>
              <Box
                onClick={() => document.getElementById('fileInput')?.click()}
                sx={{
                  border: '2px dashed',
                  borderColor: 'divider',
                  borderRadius: '12px',
                  p: 3.5,
                  cursor: 'pointer',
                  textAlign: 'center',
                  bgcolor: isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(15, 23, 42, 0.02)',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    borderColor: 'primary.main',
                    bgcolor: isDark ? 'rgba(108, 93, 211, 0.06)' : 'rgba(67, 24, 255, 0.04)',
                  },
                }}
              >
                <CloudUploadOutlinedIcon sx={{ fontSize: 36, color: 'primary.main', mb: 1 }} />
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {file ? file.name : 'Click to browse PDF or image'}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  Supports PDF, PNG, JPEG, WebP
                </Typography>
                <input
                  id="fileInput"
                  type="file"
                  hidden
                  accept="application/pdf,image/png,image/jpeg,image/webp,image/jpg"
                  onChange={handleFileChange}
                />
              </Box>

              <Button
                type="submit"
                variant="contained"
                disabled={uploadStatus === 'uploading' || !file}
                sx={{ py: 1.2 }}
              >
                {uploadStatus === 'uploading' ? 'Analyzing with Gemini AI...' : 'Upload & Parse Menu'}
              </Button>

              {uploadMessage && (
                <Alert severity={uploadStatus === 'success' ? 'success' : 'error'} sx={{ borderRadius: '8px' }}>
                  {uploadMessage}
                </Alert>
              )}
            </Stack>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Data Modal */}
      <Dialog
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700, borderBottom: '1px solid', borderColor: 'divider', p: 2.5 }}>
          {activeWeekKey ? `Edit Schedule: Week ${activeWeekKey}` : 'Create New Weekly Menu'}
        </DialogTitle>
        <DialogContent sx={{ p: { xs: 2, md: 3 }, bgcolor: isDark ? 'background.default' : '#F8FAFC' }}>
          {!activeWeekKey && (
            <Box sx={{ mb: 3, p: 2, borderRadius: '10px', bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
              <Typography variant="subtitle2" sx={{ mb: 0.5, fontWeight: 700, color: 'primary.main' }}>
                Target Week Key
              </Typography>
              <TextField
                fullWidth
                size="small"
                value={newWeekKey}
                onChange={e => setNewWeekKey(e.target.value)}
                placeholder="202616 (YYYYWW format)"
              />
            </Box>
          )}

          <Stack spacing={2}>
            {DAYS.map(day => {
              const dayKey = day.toUpperCase();
              const data = editData[dayKey] || { breakfast: '', lunch: '', dinner: '' };
              return (
                <Paper key={day} elevation={0} sx={{ p: 2.5, borderRadius: '12px' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{day}</Typography>
                    <TextField
                      label="Date (MM/DD)"
                      variant="standard"
                      size="small"
                      value={data.date || ''}
                      onChange={e => handleEditChange(dayKey, 'date', e.target.value)}
                      sx={{ width: 100, '& .MuiInputBase-input': { fontWeight: 600, textAlign: 'right' } }}
                    />
                  </Box>

                  <Stack spacing={1.5}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Breakfast"
                      value={data.breakfast || ''}
                      onChange={e => handleEditChange(dayKey, 'breakfast', e.target.value)}
                    />
                    <TextField
                      fullWidth
                      size="small"
                      multiline
                      rows={2}
                      label="Lunch"
                      value={data.lunch || ''}
                      onChange={e => handleEditChange(dayKey, 'lunch', e.target.value)}
                    />
                    <TextField
                      fullWidth
                      size="small"
                      multiline
                      rows={2}
                      label="Dinner"
                      value={data.dinner || ''}
                      onChange={e => handleEditChange(dayKey, 'dinner', e.target.value)}
                    />
                  </Stack>
                </Paper>
              );
            })}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2, px: 3, borderTop: '1px solid', borderColor: 'divider' }}>
          <Button onClick={() => setEditModalOpen(false)}>Cancel</Button>
          <Button onClick={() => void handleSaveEdit()} variant="contained" disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save & Publish'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700, color: 'error.main', pb: 1 }}>
          Confirm Delete
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Are you sure you want to permanently delete <strong>Week {selectedWeek}</strong>? This action cannot be reversed.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={() => setDeleteModalOpen(false)}>Cancel</Button>
          <Button onClick={() => void handleDeleteAction()} variant="contained" color="error">
            Delete Permanently
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default function Home(): React.JSX.Element {
  return (
    <SuspenseBoundary>
      <HomeContent />
    </SuspenseBoundary>
  );
}
