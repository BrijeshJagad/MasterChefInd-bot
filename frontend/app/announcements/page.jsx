'use client';

import React, { useState, useEffect } from 'react';
import {
  Box, Typography, CircularProgress, Stack, Divider, Button, 
  useTheme, useMediaQuery, Paper, TextField, Alert, Avatar
} from '@mui/material';
import Sidebar from '../components/Sidebar';
import CampaignIcon from '@mui/icons-material/Campaign';
import SendIcon from '@mui/icons-material/Send';

export default function Announcements() {
  const [announcements, setAnnouncements] = useState([]);
  const [weeks, setWeeks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  
  // Admin State
  const [isAdmin, setIsAdmin] = useState(false);
  const [jwtToken, setJwtToken] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState({ type: '', msg: '' });

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  useEffect(() => {
    // Check Admin
    const token = localStorage.getItem('adminToken');
    if (token) {
      setIsAdmin(true);
      setJwtToken(token);
    }

    // Fetch Weeks for Sidebar
    fetch('/api/weeks')
      .then(res => res.json())
      .then(data => setWeeks(data.weeks || []));

    // Fetch Announcements
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = () => {
    setLoading(true);
    fetch('/api/announcements')
      .then(res => res.json())
      .then(data => {
        if (data.success) setAnnouncements(data.announcements);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  const handleBroadcast = async () => {
    if (!newMessage.trim()) return;
    setSending(true);
    try {
      const res = await fetch('/api/announcements', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwtToken}`
        },
        body: JSON.stringify({ message: newMessage })
      });
      const data = await res.json();
      if (res.ok) {
        setStatus({ type: 'success', msg: 'Broadcasted successfully!' });
        setNewMessage('');
        fetchAnnouncements();
      } else {
        setStatus({ type: 'error', msg: data.error || 'Failed to broadcast' });
      }
    } catch {
      setStatus({ type: 'error', msg: 'Network error' });
    }
    setSending(false);
    setTimeout(() => setStatus({ type: '', msg: '' }), 4000);
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    setIsAdmin(false);
    setJwtToken('');
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'var(--bg-color)' }}>
      <Sidebar
        weeks={weeks}
        selectedWeek=""
        onSelectWeek={() => {}}
        mobileOpen={mobileOpen}
        onMobileToggle={() => setMobileOpen(!mobileOpen)}
        isAdmin={isAdmin}
        onAdminToggle={() => {}} // Not needed here as we assume they login on home
        onAdminLogout={handleLogout}
      />

      <Box component="main" sx={{ flexGrow: 1, p: { xs: 2.5, md: 4 }, width: '100%', maxWidth: '100vw' }}>
        <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ p: 1.5, borderRadius: '16px', bgcolor: 'primary.main', color: 'white', display: 'flex' }}>
              <CampaignIcon fontSize="large" />
            </Box>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 900, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
                Announcements
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                Live updates and platform patches
              </Typography>
            </Box>
          </Box>
          
          {isMobile && (
            <Button 
              variant="outlined" 
              onClick={() => setMobileOpen(true)}
              sx={{ borderRadius: '12px', minWidth: 48, px: 1 }}
            >
              Menu
            </Button>
          )}
        </Box>

        {isAdmin && (
          <Paper sx={{ p: 3, borderRadius: '24px', mb: 4, border: '1px solid var(--glass-border)', backgroundImage: 'none' }}>
            <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>New Broadcast</Typography>
            <TextField
              fullWidth
              multiline
              rows={3}
              placeholder="What's the update? (This will be sent to all Telegram users)"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              sx={{ mb: 2, '& .MuiOutlinedInput-root': { borderRadius: '16px' } }}
            />
            {status.msg && <Alert severity={status.type} sx={{ mb: 2, borderRadius: '12px' }}>{status.msg}</Alert>}
            <Button
              variant="contained"
              startIcon={<SendIcon />}
              onClick={handleBroadcast}
              disabled={sending || !newMessage.trim()}
              sx={{ borderRadius: '12px', px: 4, py: 1.2, fontWeight: 800 }}
            >
              {sending ? 'Broadcasting...' : 'Broadcast to Telegram'}
            </Button>
          </Paper>
        )}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Stack spacing={3}>
            {announcements.map((ann) => (
              <Paper 
                key={ann._id} 
                sx={{ 
                  p: 3, 
                  borderRadius: '24px', 
                  border: '1px solid var(--glass-border)',
                  bgcolor: theme => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'white',
                  backgroundImage: 'none'
                }}
              >
                <Stack direction="row" spacing={2} sx={{ mb: 2, alignItems: 'center' }}>
                  <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32, fontSize: '0.8rem', fontWeight: 700 }}>A</Avatar>
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>System Admin</Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      {new Date(ann.createdAt).toLocaleString()}
                    </Typography>
                  </Box>
                </Stack>
                <Typography variant="body1" sx={{ color: 'var(--text-primary)', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                  {ann.message}
                </Typography>
              </Paper>
            ))}
            {announcements.length === 0 && (
              <Box sx={{ textAlign: 'center', py: 8, opacity: 0.5 }}>
                <Typography>No announcements yet.</Typography>
              </Box>
            )}
          </Stack>
        )}
      </Box>
    </Box>
  );
}
