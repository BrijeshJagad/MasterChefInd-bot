'use client';

import React, { useState, useEffect } from 'react';
import { 
  Container, Typography, Box, Paper, TextField, Button, 
  CircularProgress, Alert, Stack, IconButton, Link,
  Tabs, Tab, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Dialog, DialogTitle, DialogContent, DialogActions,
  Grid
} from '@mui/material';
import { 
  UploadFile as UploadIcon, 
  ArrowBack as BackIcon,
  CloudUpload as CloudUploadIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Lock as LockIcon
} from '@mui/icons-material';

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default function AdminPortal() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');

  const [tabValue, setTabValue] = useState(0);

  // Upload State
  const [file, setFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState('idle');
  const [uploadMessage, setUploadMessage] = useState('');

  // Manage State
  const [weeks, setWeeks] = useState([]);
  const [loadingWeeks, setLoadingWeeks] = useState(false);

  // Edit State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [activeWeekKey, setActiveWeekKey] = useState(null);
  const [editData, setEditData] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  // Login handler
  const handleLogin = (e) => {
    e.preventDefault();
    if (!password) return;
    // We assume it's correct for now, API calls will fail if it's wrong
    setIsAuthenticated(true);
    setAuthError('');
    fetchWeeks();
  };

  const logout = () => {
    setIsAuthenticated(false);
    setPassword('');
    setAuthError('Session expired or unauthorized.');
  };

  // Fetch weeks
  const fetchWeeks = async () => {
    setLoadingWeeks(true);
    try {
      const res = await fetch('/api/weeks');
      const data = await res.json();
      if (res.ok) {
        setWeeks(data.weeks || []);
      }
    } catch (err) {
      console.error(err);
    }
    setLoadingWeeks(false);
  };

  // Handlers for Upload
  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected && selected.type === 'application/pdf') {
      setFile(selected);
      setUploadStatus('idle');
    } else {
      setUploadMessage('Please select a valid PDF file.');
      setUploadStatus('error');
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file || !password) return;

    setUploadStatus('uploading');
    const formData = new FormData();
    formData.append('pdf', file);
    formData.append('password', password);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (res.ok) {
        setUploadStatus('success');
        setUploadMessage(data.message);
        setFile(null);
        fetchWeeks(); // Refresh list
      } else {
        if (res.status === 401) logout();
        setUploadStatus('error');
        setUploadMessage(data.error || 'Upload failed');
      }
    } catch (err) {
      setUploadStatus('error');
      setUploadMessage('Network error occurred.');
    }
  };

  // Handlers for Delete
  const handleDelete = async (weekKey) => {
    if (!window.confirm(`Are you sure you want to permanently delete data for Week ${weekKey}?`)) return;

    try {
      const res = await fetch(`/api/menu/${weekKey}`, {
        method: 'DELETE',
        headers: { 'x-admin-password': password }
      });
      if (res.ok) {
        setWeeks(weeks.filter(w => w !== weekKey));
      } else if (res.status === 401) {
        logout();
      } else {
        alert("Failed to delete.");
      }
    } catch (err) {
      alert("Network error.");
    }
  };

  // Handlers for Edit
  const handleEditClick = async (weekKey) => {
    setActiveWeekKey(weekKey);
    // Fetch specifically this week's full JSON
    try {
      const res = await fetch(`/api/menu?week=${weekKey}`);
      if (res.ok) {
        const data = await res.json();
        // Initialize exactly what we need, fallback to empty strings
        const initializedData = {};
        DAYS.forEach(day => {
          // Normalizing day key to uppercase matching DB structure expectation
          const key = day.toUpperCase(); 
          initializedData[key] = {
            date: data.menu?.[key]?.date || '',
            breakfast: data.menu?.[key]?.breakfast || '',
            lunch: data.menu?.[key]?.lunch || '',
            dinner: data.menu?.[key]?.dinner || ''
          };
        });
        setEditData(initializedData);
        setEditModalOpen(true);
      }
    } catch (err) {
      alert("Failed to fetch menu details.");
    }
  };

  const handleEditChange = (day, field, value) => {
    setEditData(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value
      }
    }));
  };

  const handleSaveEdit = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/menu/${activeWeekKey}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': password
        },
        body: JSON.stringify({ menuData: editData })
      });
      
      if (res.ok) {
        setEditModalOpen(false);
      } else if (res.status === 401) {
        logout();
      } else {
        alert("Failed to update.");
      }
    } catch (err) {
      alert("Network error.");
    }
    setIsSaving(false);
  };


  // -- RENDER HELPERS --

  if (!isAuthenticated) {
    return (
      <Container maxWidth="xs" sx={{ py: 15 }}>
        <Paper elevation={0} sx={{ p: 4, textAlign: 'center', backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <LockIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
          <Typography variant="h5" fontWeight={700} gutterBottom>Admin Access</Typography>
          <Typography variant="body2" color="text.secondary" mb={4}>Enter the system password to manage menus.</Typography>
          
          <form onSubmit={handleLogin}>
            <Stack spacing={3}>
              <TextField 
                type="password" 
                label="Admin Password" 
                value={password}
                onChange={e => setPassword(e.target.value)}
                fullWidth 
                required
                autoFocus
              />
              <Button type="submit" variant="contained" size="large">Authenticate</Button>
            </Stack>
          </form>
          {authError && <Alert severity="error" sx={{ mt: 3, borderRadius: 2 }}>{authError}</Alert>}
        </Paper>
        <Box mt={4} textAlign="center">
          <Button component={Link} href="/" startIcon={<BackIcon />} sx={{ fontWeight: 'bold' }}>Back to Menu View</Button>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 10 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Box>
          <Typography variant="h3" fontWeight={800}>CMS Dashboard</Typography>
          <Typography variant="h6" color="text.secondary">Manage weekly menus & PDFs</Typography>
        </Box>
        <Button variant="outlined" color="error" onClick={() => setIsAuthenticated(false)}>Logout</Button>
      </Box>

      <Paper elevation={0} sx={{ backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.1)', mb: 4 }}>
        <Tabs value={tabValue} onChange={(e, val) => setTabValue(val)} variant="fullWidth">
          <Tab label="Manage Records" />
          <Tab label="Upload PDF" />
        </Tabs>

        {tabValue === 0 && (
          <Box p={3}>
            {loadingWeeks ? (
              <Box textAlign="center" py={5}><CircularProgress /></Box>
            ) : weeks.length === 0 ? (
              <Box textAlign="center" py={5}>
                <Typography color="text.secondary">No historical data found. Upload a PDF to start.</Typography>
              </Box>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell><Typography fontWeight={600}>Week Key</Typography></TableCell>
                      <TableCell align="right"><Typography fontWeight={600}>Actions</Typography></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {weeks.map(weekKey => (
                      <TableRow key={weekKey} hover>
                        <TableCell><Typography variant="body1" fontFamily="monospace">{weekKey}</Typography></TableCell>
                        <TableCell align="right">
                          <IconButton onClick={() => handleEditClick(weekKey)} color="primary" size="small" sx={{ mr: 1 }}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton onClick={() => handleDelete(weekKey)} color="error" size="small">
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        )}

        {tabValue === 1 && (
          <Box p={4} textAlign="center">
            <form onSubmit={handleUpload}>
              <Stack spacing={4}>
                <Box
                  onClick={() => document.getElementById('fileInput').click()}
                  sx={{
                    border: '2px dashed rgba(255, 255, 255, 0.2)',
                    borderRadius: 4,
                    p: 4,
                    cursor: 'pointer',
                    transition: 'all 0.3s',
                    backgroundColor: 'rgba(255, 255, 255, 0.02)',
                    '&:hover': {
                      borderColor: 'primary.main',
                      backgroundColor: 'rgba(59, 130, 246, 0.05)',
                    }
                  }}
                >
                  <CloudUploadIcon sx={{ fontSize: 48, mb: 2, color: 'primary.main' }} />
                  <Typography variant="body1" fontWeight={600}>
                    {file ? file.name : 'Click or Drag PDF to Upload'}
                  </Typography>
                  <input id="fileInput" type="file" hidden accept="application/pdf" onChange={handleFileChange} />
                </Box>

                <Button
                  fullWidth type="submit" variant="contained" size="large"
                  startIcon={uploadStatus === 'uploading' ? <CircularProgress size={20} color="inherit" /> : <UploadIcon />}
                  disabled={uploadStatus === 'uploading' || !file}
                  sx={{ height: 56, fontSize: '1.1rem' }}
                >
                  {uploadStatus === 'uploading' ? 'Processing...' : 'Upload & Process Menu'}
                </Button>

                {uploadMessage && (
                  <Alert severity={uploadStatus === 'success' ? 'success' : 'error'} sx={{ borderRadius: 3 }}>
                    {uploadMessage}
                  </Alert>
                )}
              </Stack>
            </form>
          </Box>
        )}
      </Paper>

      <Box textAlign="center">
        <Button component={Link} href="/" startIcon={<BackIcon />} sx={{ fontWeight: 'bold' }}>Back to Live Menu</Button>
      </Box>

      {/* Editor Modal */}
      <Dialog open={editModalOpen} onClose={() => setEditModalOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Edit Week: {activeWeekKey}</DialogTitle>
        <DialogContent dividers>
          {DAYS.map(day => {
            const dayKey = day.toUpperCase();
            const data = editData[dayKey] || {};
            return (
              <Paper key={day} variant="outlined" sx={{ mb: 3, p: 2, backgroundColor: 'rgba(0,0,0,0.2)' }}>
                <Typography variant="h6" mb={2} color="primary">{day}</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={3}>
                    <TextField fullWidth size="small" label="Date (MM/DD)" value={data.date || ''} onChange={e => handleEditChange(dayKey, 'date', e.target.value)} />
                  </Grid>
                  <Grid item xs={12} sm={9}>
                    <TextField fullWidth size="small" label="Breakfast" value={data.breakfast || ''} onChange={e => handleEditChange(dayKey, 'breakfast', e.target.value)} />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField fullWidth size="small" multiline rows={2} label="Lunch" value={data.lunch || ''} onChange={e => handleEditChange(dayKey, 'lunch', e.target.value)} />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField fullWidth size="small" multiline rows={2} label="Dinner" value={data.dinner || ''} onChange={e => handleEditChange(dayKey, 'dinner', e.target.value)} />
                  </Grid>
                </Grid>
              </Paper>
            )
          })}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setEditModalOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveEdit} variant="contained" disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
