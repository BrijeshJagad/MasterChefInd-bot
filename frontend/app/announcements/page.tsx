'use client';

import React, { useState, useEffect } from 'react';
import {
  Box, Typography, CircularProgress, Stack, Button, 
  useTheme, useMediaQuery, Paper, TextField, Alert, Avatar, IconButton, Chip
} from '@mui/material';
import Sidebar from '../components/Sidebar';
import CampaignOutlinedIcon from '@mui/icons-material/CampaignOutlined';
import SendOutlinedIcon from '@mui/icons-material/SendOutlined';
import MenuIcon from '@mui/icons-material/Menu';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import { API_BASE_URL } from '../config';

interface AnnouncementItem {
  _id: string;
  message: string;
  createdAt: string;
}

interface StatusState {
  type: 'success' | 'error' | '';
  msg: string;
}

export default function Announcements(): React.JSX.Element {
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [weeks, setWeeks] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [mobileOpen, setMobileOpen] = useState<boolean>(false);
  
  // Admin State
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [jwtToken, setJwtToken] = useState<string>('');
  const [newMessage, setNewMessage] = useState<string>('');
  const [sending, setSending] = useState<boolean>(false);
  const [status, setStatus] = useState<StatusState>({ type: '', msg: '' });

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isDark = theme.palette.mode === 'dark';

  const fetchAnnouncements = (): void => {
    setLoading(true);
    fetch(`${API_BASE_URL}/api/announcements`)
      .then(res => res.json())
      .then((data: { success?: boolean; announcements?: AnnouncementItem[] }) => {
        if (data.success && Array.isArray(data.announcements)) {
          setAnnouncements(data.announcements);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (token) {
      setIsAdmin(true);
      setJwtToken(token);
    }

    fetch(`${API_BASE_URL}/api/weeks`)
      .then(res => res.json())
      .then((data: { weeks?: string[] }) => setWeeks(data.weeks || []))
      .catch(() => {});

    fetchAnnouncements();
  }, []);

  const handleBroadcast = async (): Promise<void> => {
    if (!newMessage.trim()) return;
    setSending(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/announcements`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwtToken}`,
        },
        body: JSON.stringify({ message: newMessage }),
      });
      const data = await res.json() as { error?: string };
      if (res.ok) {
        setStatus({ type: 'success', msg: 'Broadcast dispatched to Telegram subscribers!' });
        setNewMessage('');
        fetchAnnouncements();
      } else {
        setStatus({ type: 'error', msg: data.error || 'Failed to dispatch broadcast' });
      }
    } catch {
      setStatus({ type: 'error', msg: 'Network error occurred while connecting to server' });
    }
    setSending(false);
    setTimeout(() => setStatus({ type: '', msg: '' }), 4000);
  };

  const handleLogout = (): void => {
    localStorage.removeItem('adminToken');
    setIsAdmin(false);
    setJwtToken('');
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <Sidebar
        weeks={weeks}
        selectedWeek=""
        onSelectWeek={() => {}}
        mobileOpen={mobileOpen}
        onMobileToggle={() => setMobileOpen(!mobileOpen)}
        isAdmin={isAdmin}
        onAdminToggle={() => {}}
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
        }}
      >
        {/* Header Bar */}
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
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            {isMobile && (
              <IconButton onClick={() => setMobileOpen(true)} size="small" sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '8px' }}>
                <MenuIcon fontSize="small" />
              </IconButton>
            )}
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="h5" sx={{ fontWeight: 700, fontSize: { xs: '1.2rem', md: '1.4rem' } }}>
                  Announcements
                </Typography>
                <Chip
                  size="small"
                  label={`${announcements.length} Published`}
                  sx={{
                    fontWeight: 600,
                    fontSize: '0.7rem',
                    height: 24,
                    bgcolor: isDark ? 'rgba(108, 93, 211, 0.16)' : 'rgba(67, 24, 255, 0.08)',
                    color: 'primary.main',
                  }}
                />
              </Box>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                Live updates and dining hall notifications
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Admin Broadcast Card */}
        {isAdmin && (
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: '14px',
              mb: 3.5,
              border: '1px solid',
              borderColor: 'divider',
              bgcolor: 'background.paper',
            }}
          >
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>
              Dispatch Broadcast
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 2 }}>
              Post an instant message across the web interface and dispatch Telegram notifications to all subscribers.
            </Typography>

            <TextField
              fullWidth
              multiline
              rows={3}
              placeholder="Write your announcement or menu update here..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              sx={{ mb: 2 }}
            />

            {status.msg && (
              <Alert severity={status.type === 'success' ? 'success' : 'error'} sx={{ mb: 2, borderRadius: '8px' }}>
                {status.msg}
              </Alert>
            )}

            <Button
              variant="contained"
              startIcon={<SendOutlinedIcon sx={{ fontSize: '1rem' }} />}
              onClick={handleBroadcast}
              disabled={sending || !newMessage.trim()}
              sx={{ px: 3, py: 1 }}
            >
              {sending ? 'Broadcasting...' : 'Broadcast to Telegram & Web'}
            </Button>
          </Paper>
        )}

        {/* Content Stream */}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 12 }}>
            <CircularProgress size={36} thickness={4} />
          </Box>
        ) : (
          <Stack spacing={2} sx={{ maxWidth: 880 }}>
            {announcements.map((ann) => (
              <Paper 
                key={ann._id} 
                elevation={0}
                sx={{ 
                  p: 3, 
                  borderRadius: '14px', 
                  border: '1px solid',
                  borderColor: 'divider',
                  bgcolor: 'background.paper',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    borderColor: 'primary.light',
                  },
                }}
              >
                <Stack direction="row" spacing={1.5} sx={{ mb: 1.5, alignItems: 'center' }}>
                  <Avatar
                    sx={{
                      bgcolor: 'primary.main',
                      width: 32,
                      height: 32,
                      fontSize: '0.75rem',
                      fontWeight: 700,
                    }}
                  >
                    MC
                  </Avatar>
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.85rem' }}>
                        Dining Administration
                      </Typography>
                      <Chip
                        size="small"
                        icon={<CheckCircleOutlinedIcon sx={{ fontSize: '0.8rem !important', color: '#05CD99 !important' }} />}
                        label="Official"
                        sx={{
                          height: 20,
                          fontSize: '0.625rem',
                          fontWeight: 600,
                          bgcolor: 'rgba(5, 205, 153, 0.1)',
                          color: '#05CD99',
                        }}
                      />
                    </Box>
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.725rem' }}>
                      {new Date(ann.createdAt).toLocaleString(undefined, {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </Typography>
                  </Box>
                </Stack>
                <Typography
                  variant="body2"
                  sx={{
                    color: 'text.primary',
                    whiteSpace: 'pre-wrap',
                    lineHeight: 1.6,
                    fontSize: '0.875rem',
                  }}
                >
                  {ann.message}
                </Typography>
              </Paper>
            ))}

            {announcements.length === 0 && (
              <Box sx={{ textAlign: 'center', py: 10 }}>
                <Box
                  sx={{
                    width: 56,
                    height: 56,
                    borderRadius: '14px',
                    bgcolor: isDark ? 'rgba(108, 93, 211, 0.12)' : 'rgba(67, 24, 255, 0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mx: 'auto',
                    mb: 2,
                  }}
                >
                  <CampaignOutlinedIcon sx={{ fontSize: 28, color: 'primary.main' }} />
                </Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  No announcements yet
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  Official notices will appear here as soon as they are broadcast.
                </Typography>
              </Box>
            )}
          </Stack>
        )}
      </Box>
    </Box>
  );
}
