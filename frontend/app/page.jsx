'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Box, Typography, CircularProgress,
  Stack, Divider, Chip, Tooltip, IconButton, Button, useTheme, useMediaQuery,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, Grid, Alert,
  Paper
} from '@mui/material';
import Sidebar from './components/Sidebar';
import DownloadIcon from '@mui/icons-material/DescriptionOutlined';
import JsonIcon from '@mui/icons-material/DataObjectOutlined';
import MenuIcon from '@mui/icons-material/Menu';
import CloudUploadIcon from '@mui/icons-material/FileUploadOutlined';
import UploadIcon from '@mui/icons-material/Upload';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import LockIcon from '@mui/icons-material/Lock';

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default function Home() {
  const [weeks, setWeeks] = useState([]);
  const [selectedWeek, setSelectedWeek] = useState('');
  const [menuData, setMenuData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Admin State
  const [isAdmin, setIsAdmin] = useState(false);
  const [jwtToken, setJwtToken] = useState('');
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');

  // Admin Features State
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [file, setFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState('idle');
  const [uploadMessage, setUploadMessage] = useState('');

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [activeWeekKey, setActiveWeekKey] = useState(null);
  const [newWeekKey, setNewWeekKey] = useState('');
  const [editData, setEditData] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  // --- Smart Form Logic: Auto-fill Dates ---
  useEffect(() => {
    if (!editModalOpen || activeWeekKey) return; // Only for fresh "Create"
    if (newWeekKey.length === 6) {
      const year = parseInt(newWeekKey.substring(0, 4));
      const week = parseInt(newWeekKey.substring(4));
      const simple = new Date(Date.UTC(year, 0, 1 + (week - 1) * 7));
      const dow = simple.getUTCDay();
      const ISOweekStart = simple;
      if (dow <= 4) ISOweekStart.setUTCDate(simple.getUTCDate() - simple.getUTCDay() + 1);
      else ISOweekStart.setUTCDate(simple.getUTCDate() + 8 - simple.getUTCDay());

      const dates = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(ISOweekStart);
        d.setUTCDate(d.getUTCDate() + i);
        dates.push(d.toISOString().slice(5, 10).replace('-', '/'));
      }

      setEditData(prev => {
        const updated = { ...prev };
        DAYS.forEach((day, idx) => {
          const key = day.toUpperCase();
          if (!updated[key]) updated[key] = { date: '', breakfast: '', lunch: '', dinner: '' };
          updated[key].date = dates[idx];
        });
        return updated;
      });
    }
  }, [newWeekKey, editModalOpen, activeWeekKey]);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const todayName = useMemo(() => {
    return new Date().toLocaleDateString('en-US', { weekday: 'long' });
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
        } else {
          setMenuData(null);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [selectedWeek]);

  const actionBtnSx = { borderRadius: '8px', fontSize: '0.75rem', fontWeight: 700, textTransform: 'none', px: 2, height: 32 };
  const iconSx = { fontSize: '1rem' };

  useEffect(() => {
    if (!loading && menuData) {
      // Small delay to ensure grid is rendered
      setTimeout(() => {
        const todayElement = document.getElementById(`card-${todayName.toLowerCase()}`);
        if (todayElement) {
          todayElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 500);
    }
  }, [loading, menuData, todayName]);

  const refreshWeeks = () => {
    fetch('/api/weeks')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setWeeks(data.weeks);
          if (!data.weeks.includes(selectedWeek) && data.weeks.length > 0) {
            setSelectedWeek(data.weeks[0]);
          }
        }
      });
  };

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  // --- Auth Handlers ---
  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem('adminToken', data.token);
        setJwtToken(data.token);
        setIsAdmin(true);
        setLoginModalOpen(false);
        setPassword('');
      } else {
        setAuthError(data.error);
      }
    } catch {
      setAuthError('Network error');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    setJwtToken('');
    setIsAdmin(false);
  };

  // --- File Upload ---
  const handleFileChange = (e) => setFile(e.target.files[0]);
  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return;
    setUploadStatus('uploading');
    const formData = new FormData();
    formData.append('pdf', file);
    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${jwtToken}` },
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        setUploadStatus('success');
        setUploadMessage(data.message);
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

  // --- Edit & Delete Handlers ---
  const handleCreateNew = () => {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    setNewWeekKey(`${d.getUTCFullYear()}${weekNo.toString().padStart(2, '0')}`);

    const initializedData = {};
    DAYS.forEach(day => initializedData[day.toUpperCase()] = { date: '', breakfast: '', lunch: '', dinner: '' });
    setEditData(initializedData);
    setActiveWeekKey(null);
    setEditModalOpen(true);
  };

  const handleEditClick = async () => {
    if (!selectedWeek || !menuData) return;
    setActiveWeekKey(selectedWeek);
    const initializedData = {};
    DAYS.forEach(day => {
      const key = day.toUpperCase();
      initializedData[key] = {
        date: menuData[key]?.date || '',
        breakfast: menuData[key]?.breakfast || '',
        lunch: menuData[key]?.lunch || '',
        dinner: menuData[key]?.dinner || ''
      };
    });
    setEditData(initializedData);
    setEditModalOpen(true);
  };

  const handleEditChange = (day, field, value) => {
    setEditData(prev => ({ ...prev, [day]: { ...prev[day], [field]: value } }));
  };

  const handleSaveEdit = async () => {
    setIsSaving(true);
    try {
      const isCreateMode = !activeWeekKey;
      const targetWeek = isCreateMode ? newWeekKey : activeWeekKey;
      const endpoint = isCreateMode ? '/api/menu' : `/api/menu/${targetWeek}`;
      const method = isCreateMode ? 'POST' : 'PUT';

      const payload = { menuData: editData };
      if (isCreateMode) payload.weekKey = targetWeek;

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${jwtToken}` },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setEditModalOpen(false);
        refreshWeeks();
        if (targetWeek === selectedWeek) {
          // Force active view refresh
          const updated = await fetch(`/api/menu?week=${targetWeek}`).then(r => r.json());
          if (updated.success) setMenuData(updated.menu);
        } else if (isCreateMode) {
          setSelectedWeek(targetWeek);
        }
      } else if (res.status === 401) {
        handleLogout();
      } else {
        alert("Operation failed.");
      }
    } catch {
      alert("Network error.");
    }
    setIsSaving(false);
  };

  const handleDeleteAction = async () => {
    if (!selectedWeek) return;
    try {
      const res = await fetch(`/api/menu/${selectedWeek}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${jwtToken}` }
      });
      if (res.ok) {
        setDeleteModalOpen(false);
        refreshWeeks();
        if (weeks.length === 1) setMenuData(null);
      } else if (res.status === 401) {
        handleLogout();
      } else {
        alert("Failed to delete.");
      }
    } catch {
      alert("Network error.");
    }
  };

  const handleDelete = () => setDeleteModalOpen(true);

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
        isAdmin={isAdmin}
        onAdminToggle={() => setLoginModalOpen(true)}
        onAdminLogout={handleLogout}
      />

      {/* Main Content Area */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          px: { xs: 2.5, md: 4 },
          pb: { xs: 2.5, md: 4 },
          width: '100%',
          maxWidth: '100vw',
          overflowX: 'hidden',
          overflowY: 'auto',
          height: '100vh',
          position: 'relative'
        }}
      >
        {loading && (
          <Box sx={{ position: 'fixed', top: 0, left: { md: 280, xs: 0 }, right: 0, zIndex: 1000 }}>
            <CircularProgress size={20} sx={{ position: 'absolute', top: 20, right: 20 }} />
          </Box>
        )}


      {/* Responsive Header */}
      <Box
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 50, // Higher zIndex to stay above everything
          bgcolor: theme => theme.palette.mode === 'dark' ? 'rgba(11, 20, 55, 0.9)' : 'rgba(244, 247, 254, 0.9)',
          backdropFilter: 'blur(10px)', // Glass effect
          pt: { xs: 2.5, md: 4 },
          pb: 2,
          mb: 3,
          display: 'flex',
          flexDirection: { xs: 'column', xl: 'row' },
          justifyContent: 'space-between',
          alignItems: { xl: 'center' },
          gap: 3,
          borderBottom: '1px solid',
          borderColor: 'var(--glass-border)',
          mx: { xs: -2.5, md: -4 },
          px: { xs: 2.5, md: 4 }
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          <Typography variant="h6" fontWeight={800}>
            Canteen Menu Week {selectedWeek}
          </Typography>
          {isMobile && (
            <IconButton onClick={handleDrawerToggle} sx={{ bgcolor: 'rgba(255,255,255,0.05)', borderRadius: '10px' }}>
              <MenuIcon />
            </IconButton>
          )}

          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            {isAdmin && (
              <>
                <Button variant="contained" size="small" onClick={handleCreateNew} startIcon={<AddIcon sx={iconSx} />} sx={actionBtnSx}>Create</Button>
                <Button variant="contained" size="small" onClick={() => { setUploadStatus('idle'); setUploadMessage(''); setFile(null); setUploadModalOpen(true); }} startIcon={<CloudUploadIcon sx={iconSx} />} sx={actionBtnSx}>Upload</Button>
                {menuData && <Button variant="outlined" color="primary" size="small" onClick={handleEditClick} startIcon={<EditIcon sx={iconSx} />} sx={actionBtnSx}>Edit</Button>}
                {menuData && <Button variant="outlined" color="error" size="small" onClick={handleDelete} startIcon={<DeleteIcon sx={iconSx} />} sx={actionBtnSx}>Delete</Button>}
              </>
            )}

            <Button
              href={`/api/download/pdf?week=${selectedWeek}`}
              variant="outlined"
              size="small"
              color="inherit"
              startIcon={<DownloadIcon sx={iconSx} />}
              sx={{ ...actionBtnSx, borderColor: 'var(--glass-border)' }}
            >
              PDF
            </Button>
            <Button
              href={`/api/download/json?week=${selectedWeek}`}
              variant="outlined"
              size="small"
              color="inherit"
              startIcon={<JsonIcon sx={iconSx} />}
              sx={{ ...actionBtnSx, borderColor: 'var(--glass-border)' }}
            >
              JSON
            </Button>
          </Box>

        </Box>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 20 }}>
          <CircularProgress size={40} thickness={4} />
        </Box>
      ) : !menuData ? (
        <Box className="animate-float-in" sx={{ textAlign: 'center', py: { xs: 6, md: 12 }, px: 3, maxWidth: 800, mx: 'auto' }}>
          <Box sx={{ width: 100, height: 100, bgcolor: 'rgba(67, 24, 255, 0.05)', borderRadius: '30%', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 4 }}>
            <AddIcon sx={{ fontSize: 48, color: '#4318FF' }} />
          </Box>
          <Typography variant="h3" sx={{ mb: 2, fontWeight: 900 }}>This week is empty</Typography>
          <Typography variant="body1" sx={{ mb: 6, color: 'text.secondary', maxWidth: 500, mx: 'auto', fontSize: '1.1rem' }}>
            We couldn't find a canteen menu for this week. Would you like to import a PDF or create one manually?
          </Typography>
          <Grid container spacing={3} justifyContent="center">
            <Grid xs={12} sm={6}>
              <Paper onClick={() => { setUploadStatus('idle'); setUploadMessage(''); setFile(null); setUploadModalOpen(true); }} sx={{ p: 4, cursor: 'pointer', transition: 'all 0.3s', '&:hover': { transform: 'translateY(-5px)', borderColor: 'primary.main', bgcolor: 'rgba(67, 24, 255, 0.02)' } }}>
                <CloudUploadIcon sx={{ fontSize: 32, color: 'primary.main', mb: 2 }} />
                <Typography variant="h6" fontWeight={800} color="var(--text-primary)">Import PDF</Typography>
                <Typography variant="caption" color="text.secondary">Fastest way to get started</Typography>
              </Paper>
            </Grid>
            <Grid xs={12} sm={6}>
              <Paper onClick={handleCreateNew} sx={{ p: 4, cursor: 'pointer', transition: 'all 0.3s', '&:hover': { transform: 'translateY(-5px)', borderColor: 'primary.main', bgcolor: 'rgba(67, 24, 255, 0.02)' } }}>
                <AddIcon sx={{ fontSize: 32, color: '#05CD99', mb: 2 }} />
                <Typography variant="h6" fontWeight={800} color="var(--text-primary)">Create Manual</Typography>
                <Typography variant="caption" color="text.secondary">Build your own custom menu</Typography>
              </Paper>
            </Grid>
          </Grid>
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
                id={`card-${day.toLowerCase()}`}
                className="animate-float-in"
                sx={{
                  borderRadius: '24px',
                  p: 3.5,
                  position: 'relative',
                  border: isToday ? '2px solid #3b82f6' : '1px solid var(--glass-border)',
                  bgcolor: 'var(--bg-card)',
                  boxShadow: isToday ? '0 12px 30px rgba(59, 130, 246, 0.12)' : 'var(--shadow-soft)',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  animationDelay: `${idx * 0.05}s`,
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: '0 20px 40px rgba(112, 144, 176, 0.15)',
                    borderColor: isToday ? '#3b82f6' : 'var(--text-secondary)'
                  }
                }}
              >
                {isToday && (
                  <Box sx={{ position: 'absolute', top: 16, right: 16 }}>
                    <Chip label="TODAY" sx={{ bgcolor: '#3b82f6', color: 'white', fontWeight: 900, borderRadius: '8px', height: 24, fontSize: '0.65rem' }} />
                  </Box>
                )}

                <Box sx={{ mb: 3 }}>
                  <Typography variant="h5" sx={{ color: 'var(--text-primary)', fontWeight: 800 }}>
                    {day}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600, mt: 0.5 }}>
                    {menuData[day].date?.replace('/', '-') || '--'}
                  </Typography>
                </Box>

                <Stack spacing={2}>
                  <Box sx={{ borderLeft: '4px solid #facc15', pl: 2, py: 1.5, pr: 1.5, bgcolor: theme => theme.palette.mode === 'dark' ? 'rgba(250, 204, 21, 0.1)' : 'rgba(250, 204, 21, 0.05)', borderRadius: '0px 12px 12px 0px' }}>
                    <Typography variant="caption" sx={{ color: '#eab308', fontWeight: 900, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      🥗 BREAKFAST
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700, mt: 0.5, color: 'var(--text-primary)', whiteSpace: 'pre-line' }}>
                      {menuData[day].breakfast || "—"}
                    </Typography>
                  </Box>

                  <Box sx={{ borderLeft: '4px solid #10b981', pl: 2, py: 1.5, pr: 1.5, bgcolor: theme => theme.palette.mode === 'dark' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(16, 185, 129, 0.05)', borderRadius: '0px 12px 12px 0px' }}>
                    <Typography variant="caption" sx={{ color: '#10b981', fontWeight: 900, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      🍛 LUNCH
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700, mt: 0.5, color: 'var(--text-primary)', whiteSpace: 'pre-line' }}>
                      {menuData[day].lunch || "—"}
                    </Typography>
                  </Box>

                  <Box sx={{ borderLeft: '4px solid #6366f1', pl: 2, py: 1.5, pr: 1.5, bgcolor: theme => theme.palette.mode === 'dark' ? 'rgba(99, 102, 241, 0.1)' : 'rgba(99, 102, 241, 0.05)', borderRadius: '0px 12px 12px 0px' }}>
                    <Typography variant="caption" sx={{ color: '#6366f1', fontWeight: 900, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      🥣 DINNER
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700, mt: 0.5, color: 'var(--text-primary)', whiteSpace: 'pre-line' }}>
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

      {/* --- Admin Modals --- */ }

  {/* Login Modal */ }
  <Dialog open={loginModalOpen} onClose={() => setLoginModalOpen(false)} slotProps={{ paper: { sx: { bgcolor: '#FFFFFF', borderRadius: '24px', border: '1px solid #E2E8F0', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' } } }}>
    <DialogContent sx={{ textAlign: 'center', p: 4 }}>
      <Box sx={{ width: 64, height: 64, borderRadius: '50%', bgcolor: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2 }}>
        <LockIcon sx={{ fontSize: 32, color: 'primary.main' }} />
      </Box>
      <Typography variant="h5" fontWeight={800} gutterBottom>Admin Auth</Typography>
      <form onSubmit={handleLogin}>
        <Stack spacing={2} mt={2}>
          <TextField
            type="password"
            label="System Password"
            placeholder="••••••"
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoFocus
            required
            fullWidth
            sx={{
              '& .MuiOutlinedInput-root': { borderRadius: '12px', bgcolor: 'rgba(0,0,0,0.02)' },
              '& .MuiInputBase-input': { fontWeight: 600, color: '#1B254B' }
            }}
          />
          <Button
            type="submit"
            variant="contained"
            sx={{
              borderRadius: '12px',
              py: 2,
              fontWeight: 900,
              fontSize: '1rem',
              boxShadow: '0 10px 20px rgba(67, 24, 255, 0.2)'
            }}
          >
            Authenticate
          </Button>
        </Stack>
      </form>
      {authError && <Alert severity="error" sx={{ mt: 2, borderRadius: '12px' }}>{authError}</Alert>}
    </DialogContent>
  </Dialog>

  {/* Upload PDF Modal */ }
  <Dialog open={uploadModalOpen} onClose={() => setUploadModalOpen(false)} fullWidth maxWidth="sm" slotProps={{ paper: { sx: { bgcolor: '#FFFFFF', borderRadius: '24px', border: '1px solid #E2E8F0', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' } } }}>
    <DialogTitle sx={{ fontWeight: 900, fontSize: '1.5rem', p: 3 }}>Upload PDF Menu</DialogTitle>
    <DialogContent sx={{ p: 3, pt: 0 }}>
      <form onSubmit={handleUpload}>
        <Stack spacing={3} mt={1}>
          <Box onClick={() => document.getElementById('fileInput').click()} sx={{ border: '2px dashed var(--glass-border)', borderRadius: '16px', p: 4, cursor: 'pointer', textAlign: 'center', bgcolor: 'rgba(255, 255, 255, 0.02)', '&:hover': { borderColor: 'primary.main', bgcolor: 'rgba(59, 130, 246, 0.05)' } }}>
            <CloudUploadIcon sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
            <Typography variant="body1" fontWeight={700}>{file ? file.name : 'Click to select PDF'}</Typography>
            <input id="fileInput" type="file" hidden accept="application/pdf" onChange={handleFileChange} />
          </Box>
          <Button type="submit" variant="contained" disabled={uploadStatus === 'uploading' || !file} sx={{ py: 1.5, borderRadius: '12px', fontWeight: 800 }}>
            {uploadStatus === 'uploading' ? 'Processing...' : 'Upload & Parse'}
          </Button>
          {uploadMessage && <Alert severity={uploadStatus === 'success' ? 'success' : 'error'} sx={{ borderRadius: '12px' }}>{uploadMessage}</Alert>}
        </Stack>
      </form>
    </DialogContent>
  </Dialog>

  {/* Edit Data Modal */ }
  <Dialog
    open={editModalOpen}
    onClose={() => setEditModalOpen(false)}
    maxWidth="md"
    fullWidth
    slotProps={{
      paper: {
        sx: {
          bgcolor: theme => theme.palette.mode === 'dark' ? '#111C44' : '#FFFFFF',
          borderRadius: '24px',
          border: '1px solid var(--glass-border)',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
          backgroundImage: 'none'
        }
      }
    }}
  >
    <DialogTitle sx={{ fontWeight: 900, borderBottom: '1px solid var(--glass-border)', p: 3, fontSize: '1.5rem', color: 'var(--text-primary)' }}>
      {activeWeekKey ? `Edit Record: Week ${activeWeekKey}` : 'Create New Weekly Menu'}
    </DialogTitle>
    <DialogContent sx={{ p: { xs: 2, md: 4 }, bgcolor: theme => theme.palette.mode === 'dark' ? '#0B1437' : '#F8F9FA' }}>

      {!activeWeekKey && (
        <Box sx={{ mb: 4, p: 3, borderRadius: '16px', bgcolor: 'rgba(67, 24, 255, 0.04)', border: '1px solid rgba(67, 24, 255, 0.1)' }}>
          <Typography variant="h6" sx={{ color: '#4318FF', mb: 1, fontWeight: 900, display: 'flex', alignItems: 'center', gap: 1 }}>
            Target Week Key <Typography variant="caption" sx={{ opacity: 0.7, fontWeight: 700 }}>(e.g. 202615 for YYYYWW)</Typography>
          </Typography>
          <TextField
            fullWidth
            value={newWeekKey}
            onChange={e => setNewWeekKey(e.target.value)}
            placeholder="202616"
            variant="outlined"
            sx={{
              '& .MuiOutlinedInput-root': { borderRadius: '12px', bgcolor: '#FFFFFF' },
              '& .MuiInputBase-input': { fontWeight: 800, fontSize: '1.1rem', color: '#1B254B' }
            }}
          />
        </Box>
      )}
      <Stack spacing={3}>
        {DAYS.map(day => {
          const dayKey = day.toUpperCase();
          const data = editData[dayKey] || {};
          return (
            <Box key={day} sx={{ borderRadius: '20px', p: 4, mb: 4, bgcolor: '#FFFFFF', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h5" sx={{ color: '#1B254B', fontWeight: 900 }}>{day}</Typography>
                <TextField
                  label="Date"
                  placeholder="MM/DD"
                  variant="standard"
                  value={data.date || ''}
                  onChange={e => handleEditChange(dayKey, 'date', e.target.value)}
                  sx={{ width: 80, '& .MuiInputBase-input': { fontWeight: 800, color: 'primary.main', textAlign: 'right' } }}
                />
              </Box>

              <Stack spacing={3}>
                <TextField
                  fullWidth
                  label="🍳 Breakfast"
                  value={data.breakfast || ''}
                  onChange={e => handleEditChange(dayKey, 'breakfast', e.target.value)}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px', bgcolor: '#F8FAFC' } }}
                />
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  label="🍛 Lunch"
                  value={data.lunch || ''}
                  onChange={e => handleEditChange(dayKey, 'lunch', e.target.value)}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px', bgcolor: '#F8FAFC' } }}
                />
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  label="🥣 Dinner"
                  value={data.dinner || ''}
                  onChange={e => handleEditChange(dayKey, 'dinner', e.target.value)}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px', bgcolor: '#F8FAFC' } }}
                />
              </Stack>
            </Box>
          )
        })}
      </Stack>
    </DialogContent>
    <DialogActions sx={{ p: 3, px: 4, bgcolor: theme => theme.palette.mode === 'dark' ? '#111C44' : '#FFFFFF', borderTop: '1px solid var(--glass-border)' }}>
      <Button onClick={() => setEditModalOpen(false)} sx={{ color: 'text.secondary', fontWeight: 700 }}>Discard</Button>
      <Button onClick={handleSaveEdit} variant="contained" disabled={isSaving} sx={{ px: 4, py: 1.5, borderRadius: '12px', fontWeight: 900, fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em', boxShadow: '0 10px 20px rgba(67, 24, 255, 0.2)' }}>
        {isSaving ? 'Saving...' : 'Save & Publish Live'}
      </Button>
    </DialogActions>
  </Dialog>
  {/* Delete Confirmation Modal */ }
  <Dialog open={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} slotProps={{ paper: { sx: { borderRadius: '24px', p: 1, maxWidth: 400 } } }}>
    <DialogTitle sx={{ fontWeight: 900, fontSize: '1.4rem', color: 'error.main', pb: 1 }}>Confirm Delete?</DialogTitle>
    <DialogContent>
      <Typography variant="body1" sx={{ color: 'text.secondary', fontWeight: 600 }}>
        Are you sure you want to permanently delete <strong>Week {selectedWeek}</strong>? This action cannot be undone.
      </Typography>
    </DialogContent>
    <DialogActions sx={{ p: 3, gap: 1 }}>
      <Button onClick={() => setDeleteModalOpen(false)} sx={{ color: 'text.secondary', fontWeight: 700 }}>Cancel</Button>
      <Button onClick={handleDeleteAction} variant="contained" color="error" sx={{ px: 4, borderRadius: '12px', fontWeight: 800 }}>
        Delete Permanently
      </Button>
    </DialogActions>
  </Dialog>
    </Box >
  );
}
