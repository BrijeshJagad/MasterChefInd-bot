'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Box, Typography, CircularProgress, Stack, Button, 
  Paper, TextField, Alert, Chip, IconButton,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Switch, FormControlLabel, Select, MenuItem, FormControl, InputLabel, useTheme, useMediaQuery
} from '@mui/material';
import Sidebar from '../components/Sidebar';
import RefreshOutlinedIcon from '@mui/icons-material/RefreshOutlined';
import MemoryOutlinedIcon from '@mui/icons-material/MemoryOutlined';
import SpeedOutlinedIcon from '@mui/icons-material/SpeedOutlined';
import StorageOutlinedIcon from '@mui/icons-material/StorageOutlined';
import OpenInNewOutlinedIcon from '@mui/icons-material/OpenInNewOutlined';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutlined';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import MenuIcon from '@mui/icons-material/Menu';
import { API_BASE_URL } from '../config';
import { ILogPayload, LogSeverity } from '../../../types/common';

interface SystemStats {
  timestamp?: string;
  uptime?: string;
  uptimeSeconds?: number;
  memory?: {
    rssMb?: string;
    heapUsedMb?: string;
    heapTotalMb?: string;
    externalMb?: string;
  };
  cpu?: { user: number; system: number };
  environment?: string;
  nodeVersion?: string;
  platform?: string;
  stats?: {
    totalUsers?: number;
    activeReminders?: number;
    totalMenus?: number;
  };
}

export default function InsightsPage(): React.JSX.Element {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [logs, setLogs] = useState<ILogPayload[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [weeks, setWeeks] = useState<string[]>([]);
  const [mobileOpen, setMobileOpen] = useState<boolean>(false);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  
  // Filters
  const [filterAction, setFilterAction] = useState<string>('ALL');
  const [filterSeverity, setFilterSeverity] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Admin State
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isDark = theme.palette.mode === 'dark';

  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);

  const fetchInsightsData = async (): Promise<void> => {
    try {
      const [statsRes, logsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/system/stats`).catch(() => null),
        fetch(`${API_BASE_URL}/api/system/logs?limit=100`).catch(() => null),
      ]);

      if (statsRes && statsRes.ok) {
        const statsData = (await statsRes.json()) as SystemStats;
        setStats(statsData);
      }

      if (logsRes && logsRes.ok) {
        const logsData = (await logsRes.json()) as { success?: boolean; logs?: ILogPayload[] };
        if (logsData.success) {
          setLogs(logsData.logs || []);
        }
      }
      setLastRefreshed(new Date());
    } catch (err: unknown) {
      console.warn('Failed fetching insights:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (token) setIsAdmin(true);

    fetch(`${API_BASE_URL}/api/weeks`)
      .then(res => res.json())
      .then((data: { weeks?: string[] }) => setWeeks(data.weeks || []))
      .catch(() => {});

    void fetchInsightsData();

    return () => {
      if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (autoRefresh) {
      refreshTimerRef.current = setInterval(() => {
        void fetchInsightsData();
      }, 4000);
    } else {
      if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
    }
    return () => {
      if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
    };
  }, [autoRefresh]);

  const filteredLogs = logs.filter(log => {
    if (filterSeverity !== 'ALL' && log.severity !== filterSeverity) return false;
    if (filterAction !== 'ALL' && log.action !== filterAction) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchAction = (log.action || '').toLowerCase().includes(q);
      const matchMsg = (log.message || '').toLowerCase().includes(q);
      const matchChatId = String(log.chatId || '').toLowerCase().includes(q);
      if (!matchAction && !matchMsg && !matchChatId) return false;
    }
    return true;
  });

  const uniqueActions = ['ALL', ...Array.from(new Set(logs.map(l => l.action).filter(Boolean)))];

  const getSeverityBadge = (severity: LogSeverity | string): React.JSX.Element => {
    switch (severity) {
      case 'ERROR':
      case 'FATAL':
        return (
          <Chip
            size="small"
            icon={<ErrorOutlineIcon sx={{ fontSize: '0.85rem !important', color: '#EF4444 !important' }} />}
            label="ERROR"
            sx={{
              height: 22,
              fontSize: '0.675rem',
              fontWeight: 700,
              bgcolor: 'rgba(239, 68, 68, 0.1)',
              color: '#EF4444',
            }}
          />
        );
      case 'WARN':
        return (
          <Chip
            size="small"
            icon={<WarningAmberOutlinedIcon sx={{ fontSize: '0.85rem !important', color: '#F59E0B !important' }} />}
            label="WARN"
            sx={{
              height: 22,
              fontSize: '0.675rem',
              fontWeight: 700,
              bgcolor: 'rgba(245, 158, 11, 0.1)',
              color: '#D97706',
            }}
          />
        );
      case 'DEBUG':
        return (
          <Chip
            size="small"
            label="DEBUG"
            sx={{
              height: 22,
              fontSize: '0.675rem',
              fontWeight: 600,
              bgcolor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.06)',
            }}
          />
        );
      default:
        return (
          <Chip
            size="small"
            icon={<InfoOutlinedIcon sx={{ fontSize: '0.85rem !important', color: 'primary.main !important' }} />}
            label="INFO"
            sx={{
              height: 22,
              fontSize: '0.675rem',
              fontWeight: 700,
              bgcolor: isDark ? 'rgba(108, 93, 211, 0.16)' : 'rgba(67, 24, 255, 0.08)',
              color: 'primary.main',
            }}
          />
        );
    }
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <Sidebar
        weeks={weeks}
        selectedWeek=""
        mobileOpen={mobileOpen}
        onMobileToggle={() => setMobileOpen(!mobileOpen)}
        isAdmin={isAdmin}
        onAdminToggle={() => {}}
        onAdminLogout={() => {
          localStorage.removeItem('adminToken');
          setIsAdmin(false);
        }}
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
        {/* Sticky Header */}
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
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: 'space-between',
            alignItems: { xs: 'flex-start', sm: 'center' },
            gap: 2,
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
                  System Insights
                </Typography>
                <Chip
                  size="small"
                  label="OpenTelemetry"
                  sx={{
                    fontWeight: 700,
                    fontSize: '0.675rem',
                    height: 22,
                    bgcolor: isDark ? 'rgba(108, 93, 211, 0.16)' : 'rgba(67, 24, 255, 0.08)',
                    color: 'primary.main',
                  }}
                />
              </Box>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                Live telemetry events, server health, and subscriber analytics
              </Typography>
            </Box>
          </Box>

          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
            <FormControlLabel
              control={
                <Switch
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  color="primary"
                  size="small"
                />
              }
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  {autoRefresh && (
                    <Box
                      sx={{
                        width: 7,
                        height: 7,
                        borderRadius: '50%',
                        bgcolor: '#05CD99',
                        boxShadow: '0 0 6px #05CD99',
                      }}
                    />
                  )}
                  <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8rem' }}>
                    Live Sync
                  </Typography>
                </Box>
              }
            />
            <Button
              variant="outlined"
              size="small"
              startIcon={<RefreshOutlinedIcon sx={{ fontSize: '1rem' }} />}
              onClick={() => void fetchInsightsData()}
            >
              Refresh
            </Button>
          </Stack>
        </Box>

        {/* Telemetry Links Bar */}
        <Paper
          elevation={0}
          sx={{
            p: 2.5,
            mb: 3,
            borderRadius: '14px',
            bgcolor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider',
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 2,
          }}
        >
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              External Observability Hubs
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              Inspect distributed spans in Axiom Cloud or visualize Prometheus counters in Grafana
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
            <Button
              variant="outlined"
              size="small"
              endIcon={<OpenInNewOutlinedIcon sx={{ fontSize: '0.9rem' }} />}
              href="https://app.axiom.co"
              target="_blank"
              rel="noopener noreferrer"
            >
              Axiom Dashboard
            </Button>
            <Button
              variant="outlined"
              size="small"
              endIcon={<OpenInNewOutlinedIcon sx={{ fontSize: '0.9rem' }} />}
              href="http://localhost:3001"
              target="_blank"
              rel="noopener noreferrer"
            >
              Grafana UI
            </Button>
            <Button
              variant="outlined"
              size="small"
              endIcon={<OpenInNewOutlinedIcon sx={{ fontSize: '0.9rem' }} />}
              href={`${API_BASE_URL}/metrics`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Raw /metrics
            </Button>
          </Stack>
        </Paper>

        {/* Resource KPI Cards */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: 'repeat(4, 1fr)' }, gap: 2, mb: 3 }}>
          {/* Card 1: Memory */}
          <Paper elevation={0} sx={{ p: 2.5, borderRadius: '14px', bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, letterSpacing: '0.04em' }}>
                HEAP MEMORY
              </Typography>
              <Box sx={{ width: 32, height: 32, borderRadius: '8px', bgcolor: isDark ? 'rgba(108, 93, 211, 0.16)' : 'rgba(67, 24, 255, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <MemoryOutlinedIcon sx={{ fontSize: '1.1rem', color: 'primary.main' }} />
              </Box>
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
              {stats?.memory?.heapUsedMb ? `${stats.memory.heapUsedMb} MB` : '—'}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              RSS: {stats?.memory?.rssMb || '—'} MB · Peak: {stats?.memory?.heapTotalMb || '—'} MB
            </Typography>
          </Paper>

          {/* Card 2: Uptime & Env */}
          <Paper elevation={0} sx={{ p: 2.5, borderRadius: '14px', bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, letterSpacing: '0.04em' }}>
                SERVER UPTIME
              </Typography>
              <Box sx={{ width: 32, height: 32, borderRadius: '8px', bgcolor: 'rgba(5, 205, 153, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <SpeedOutlinedIcon sx={{ fontSize: '1.1rem', color: '#05CD99' }} />
              </Box>
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
              {stats?.uptime || '—'}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              Node {stats?.nodeVersion || '22.x'} ({stats?.environment || 'production'})
            </Typography>
          </Paper>

          {/* Card 3: Registered Users */}
          <Paper elevation={0} sx={{ p: 2.5, borderRadius: '14px', bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, letterSpacing: '0.04em' }}>
                SUBSCRIBERS
              </Typography>
              <Box sx={{ width: 32, height: 32, borderRadius: '8px', bgcolor: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <StorageOutlinedIcon sx={{ fontSize: '1.1rem', color: '#3B82F6' }} />
              </Box>
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
              {stats?.stats?.totalUsers ?? '—'}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {stats?.stats?.activeReminders ?? '—'} users with active dinner reminders
            </Typography>
          </Paper>

          {/* Card 4: Stored Menus */}
          <Paper elevation={0} sx={{ p: 2.5, borderRadius: '14px', bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, letterSpacing: '0.04em' }}>
                STORED SCHEDULES
              </Typography>
              <Box sx={{ width: 32, height: 32, borderRadius: '8px', bgcolor: 'rgba(5, 205, 153, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircleOutlinedIcon sx={{ fontSize: '1.1rem', color: '#05CD99' }} />
              </Box>
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
              {stats?.stats?.totalMenus ?? '—'}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              Historical weekly menus archived in database
            </Typography>
          </Paper>
        </Box>

        {/* Live Event Stream Explorer */}
        <Paper elevation={0} sx={{ p: 3, borderRadius: '14px', bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, flexDirection: { xs: 'column', sm: 'row' }, gap: 2, mb: 3 }}>
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                Live Telemetry Records
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                Showing {filteredLogs.length} structured events · Last synced {lastRefreshed.toLocaleTimeString()}
              </Typography>
            </Box>

            <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap', alignItems: 'center' }}>
              {/* Severity Filter */}
              <FormControl size="small" sx={{ minWidth: 110 }}>
                <InputLabel>Severity</InputLabel>
                <Select
                  value={filterSeverity}
                  label="Severity"
                  onChange={(e) => setFilterSeverity(e.target.value)}
                >
                  <MenuItem value="ALL">All Levels</MenuItem>
                  <MenuItem value="INFO">INFO</MenuItem>
                  <MenuItem value="WARN">WARN</MenuItem>
                  <MenuItem value="ERROR">ERROR</MenuItem>
                </Select>
              </FormControl>

              {/* Action Filter */}
              <FormControl size="small" sx={{ minWidth: 140 }}>
                <InputLabel>Action</InputLabel>
                <Select
                  value={filterAction}
                  label="Action"
                  onChange={(e) => setFilterAction(e.target.value)}
                >
                  {uniqueActions.map(act => (
                    <MenuItem key={act} value={act}>{act}</MenuItem>
                  ))}
                </Select>
              </FormControl>

              {/* Search text */}
              <TextField
                size="small"
                placeholder="Search events..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                sx={{ width: { xs: '100%', sm: 180 } }}
              />
            </Stack>
          </Box>

          {/* Logs Table */}
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
              <CircularProgress size={32} thickness={4} />
            </Box>
          ) : filteredLogs.length === 0 ? (
            <Alert severity="info" sx={{ borderRadius: '10px' }}>
              No telemetry events match your selected filters. Trigger an action in the bot or web app to see live events.
            </Alert>
          ) : (
            <TableContainer sx={{ maxHeight: 520, borderRadius: '10px', border: '1px solid', borderColor: 'divider' }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ width: 120 }}>TIME</TableCell>
                    <TableCell sx={{ width: 90 }}>LEVEL</TableCell>
                    <TableCell sx={{ width: 170 }}>ACTION</TableCell>
                    <TableCell>EVENT DETAILS & METADATA</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredLogs.map((item, idx) => (
                    <TableRow key={idx} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                      <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem', whiteSpace: 'nowrap', color: 'text.secondary' }}>
                        {item.timestamp ? new Date(item.timestamp).toLocaleTimeString() : '—'}
                      </TableCell>
                      <TableCell>
                        {getSeverityBadge(item.severity)}
                      </TableCell>
                      <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.775rem', fontWeight: 600 }}>
                        {item.action || 'general'}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontSize: '0.8rem', mb: 0.5 }}>
                          {item.message}
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {item.chatId !== undefined && (
                            <Chip size="small" variant="outlined" label={`Chat: ${item.chatId}`} sx={{ height: 20, fontSize: '0.675rem' }} />
                          )}
                          {item.votedTime && (
                            <Chip size="small" color="primary" variant="outlined" label={`Vote: ${item.votedTime}`} sx={{ height: 20, fontSize: '0.675rem' }} />
                          )}
                          {item.statusCode !== undefined && (
                            <Chip size="small" color={item.statusCode >= 400 ? 'error' : 'success'} variant="outlined" label={`Status: ${item.statusCode}`} sx={{ height: 20, fontSize: '0.675rem' }} />
                          )}
                          {item.durationMs !== undefined && (
                            <Chip size="small" variant="outlined" label={`${item.durationMs}ms`} sx={{ height: 20, fontSize: '0.675rem' }} />
                          )}
                          {Boolean(item['model']) && (
                            <Chip size="small" color="secondary" variant="outlined" label={`Model: ${String(item['model'])}`} sx={{ height: 20, fontSize: '0.675rem' }} />
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      </Box>
    </Box>
  );
}
