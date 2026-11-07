'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Box, Typography, CircularProgress, Stack, Divider, Button, 
  useTheme, useMediaQuery, Paper, TextField, Alert, Chip,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  IconButton, Tooltip, Switch, FormControlLabel, Select, MenuItem, FormControl, InputLabel
} from '@mui/material';
import Sidebar from '../components/Sidebar';
import InsightsIcon from '@mui/icons-material/Insights';
import RefreshIcon from '@mui/icons-material/Refresh';
import MemoryIcon from '@mui/icons-material/Memory';
import SpeedIcon from '@mui/icons-material/Speed';
import StorageIcon from '@mui/icons-material/Storage';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import FilterListIcon from '@mui/icons-material/FilterList';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import WarningIcon from '@mui/icons-material/Warning';
import InfoIcon from '@mui/icons-material/Info';
import { API_BASE_URL } from '../config';

export default function InsightsPage() {
  const [stats, setStats] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [weeks, setWeeks] = useState([]);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  
  // Filters
  const [filterAction, setFilterAction] = useState('ALL');
  const [filterSeverity, setFilterSeverity] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Admin State
  const [isAdmin, setIsAdmin] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState(new Date());

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const refreshTimerRef = useRef(null);

  const fetchInsightsData = async () => {
    try {
      const [statsRes, logsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/system/stats`).catch(() => null),
        fetch(`${API_BASE_URL}/api/system/logs?limit=100`).catch(() => null)
      ]);

      if (statsRes && statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      if (logsRes && logsRes.ok) {
        const logsData = await logsRes.json();
        if (logsData.success) {
          setLogs(logsData.logs || []);
        }
      }
      setLastRefreshed(new Date());
    } catch (err) {
      console.warn("Failed fetching insights:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Check Admin
    const token = localStorage.getItem('adminToken');
    if (token) setIsAdmin(true);

    // Fetch Weeks for Sidebar
    fetch(`${API_BASE_URL}/api/weeks`)
      .then(res => res.json())
      .then(data => setWeeks(data.weeks || []))
      .catch(() => {});

    fetchInsightsData();

    return () => {
      if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
    };
  }, []);

  // Handle auto-refresh interval
  useEffect(() => {
    if (autoRefresh) {
      refreshTimerRef.current = setInterval(() => {
        fetchInsightsData();
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

  // Unique actions list for filter dropdown
  const uniqueActions = ['ALL', ...Array.from(new Set(logs.map(l => l.action).filter(Boolean)))];

  const getSeverityBadge = (severity) => {
    switch (severity) {
      case 'ERROR':
        return <Chip size="small" icon={<ErrorIcon />} label="ERROR" color="error" variant="filled" />;
      case 'WARN':
        return <Chip size="small" icon={<WarningIcon />} label="WARN" color="warning" variant="filled" />;
      case 'DEBUG':
        return <Chip size="small" label="DEBUG" color="default" variant="outlined" />;
      default:
        return <Chip size="small" icon={<InfoIcon />} label="INFO" color="primary" variant="outlined" />;
    }
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <Sidebar
        weeks={weeks}
        mobileOpen={mobileOpen}
        onMobileToggle={() => setMobileOpen(!mobileOpen)}
        isAdmin={isAdmin}
      />

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 2, sm: 3, md: 4 },
          width: { md: `calc(100% - 260px)` },
          mt: { xs: 7, md: 0 },
          maxWidth: '1400px',
          mx: 'auto'
        }}
      >
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, flexDirection: { xs: 'column', sm: 'row' }, gap: 2, mb: 4 }}>
          <Box>
            <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 0.5 }}>
              <InsightsIcon color="primary" sx={{ fontSize: '2.2rem' }} />
              <Typography variant="h4" fontWeight={800} sx={{ letterSpacing: '-0.5px' }}>
                System Insights & Telemetry
              </Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary">
              Live OpenTelemetry event stream, resource utilization, and monitoring status.
            </Typography>
          </Box>

          <Stack direction="row" alignItems="center" spacing={1.5}>
            <FormControlLabel
              control={<Switch checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} color="primary" />}
              label={<Typography variant="body2" fontWeight={600}>Live Sync</Typography>}
            />
            <Button
              variant="outlined"
              size="small"
              startIcon={<RefreshIcon />}
              onClick={fetchInsightsData}
              sx={{ borderRadius: '10px' }}
            >
              Refresh
            </Button>
          </Stack>
        </Box>

        {/* External Dashboards Quick Links */}
        <Paper
          elevation={0}
          sx={{
            p: 2.5,
            mb: 4,
            borderRadius: '16px',
            bgcolor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider',
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 2
          }}
        >
          <Box>
            <Typography variant="subtitle1" fontWeight={700}>
              External Telemetry & Dashboards
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Query historical logs in Axiom or visualize Prometheus metrics in Grafana.
            </Typography>
          </Box>
          <Stack direction="row" spacing={1.5} flexWrap="wrap">
            <Button
              variant="contained"
              size="small"
              endIcon={<OpenInNewIcon />}
              href="https://app.axiom.co"
              target="_blank"
              rel="noopener noreferrer"
              sx={{ borderRadius: '10px', bgcolor: '#000', color: '#fff', '&:hover': { bgcolor: '#222' } }}
            >
              Open Axiom
            </Button>
            <Button
              variant="contained"
              size="small"
              endIcon={<OpenInNewIcon />}
              href="http://localhost:3001"
              target="_blank"
              rel="noopener noreferrer"
              sx={{ borderRadius: '10px', bgcolor: '#f46800', color: '#fff', '&:hover': { bgcolor: '#d95a00' } }}
            >
              Local Grafana UI
            </Button>
            <Button
              variant="outlined"
              size="small"
              endIcon={<OpenInNewIcon />}
              href={`${API_BASE_URL}/metrics`}
              target="_blank"
              rel="noopener noreferrer"
              sx={{ borderRadius: '10px' }}
            >
              Raw /metrics
            </Button>
          </Stack>
        </Paper>

        {/* Resource KPI Cards */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: 'repeat(4, 1fr)' }, gap: 2.5, mb: 4 }}>
          {/* Card 1: Memory */}
          <Paper elevation={0} sx={{ p: 2.5, borderRadius: '16px', bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
              <Typography variant="body2" color="text.secondary" fontWeight={600}>
                HEAP MEMORY
              </Typography>
              <MemoryIcon color="primary" />
            </Stack>
            <Typography variant="h5" fontWeight={800}>
              {stats?.memory?.heapUsedMb ? `${stats.memory.heapUsedMb} MB` : '—'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              RSS: {stats?.memory?.rssMb || '—'} MB | Total: {stats?.memory?.heapTotalMb || '—'} MB
            </Typography>
          </Paper>

          {/* Card 2: Uptime & Env */}
          <Paper elevation={0} sx={{ p: 2.5, borderRadius: '16px', bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
              <Typography variant="body2" color="text.secondary" fontWeight={600}>
                SERVER UPTIME
              </Typography>
              <SpeedIcon color="success" />
            </Stack>
            <Typography variant="h5" fontWeight={800}>
              {stats?.uptime || '—'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Node {stats?.nodeVersion || process.version} ({stats?.environment || 'prod'})
            </Typography>
          </Paper>

          {/* Card 3: Registered Users */}
          <Paper elevation={0} sx={{ p: 2.5, borderRadius: '16px', bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
              <Typography variant="body2" color="text.secondary" fontWeight={600}>
                COMMUNITY SUBSCRIBERS
              </Typography>
              <StorageIcon color="info" />
            </Stack>
            <Typography variant="h5" fontWeight={800}>
              {stats?.stats?.totalUsers ?? '—'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {stats?.stats?.activeReminders ?? '—'} with daily reminders enabled
            </Typography>
          </Paper>

          {/* Card 4: Stored Menus */}
          <Paper elevation={0} sx={{ p: 2.5, borderRadius: '16px', bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
              <Typography variant="body2" color="text.secondary" fontWeight={600}>
                STORED MENUS
              </Typography>
              <CheckCircleIcon color="secondary" />
            </Stack>
            <Typography variant="h5" fontWeight={800}>
              {stats?.stats?.totalMenus ?? '—'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Weekly historical menus recorded in DB
            </Typography>
          </Paper>
        </Box>

        {/* Live OpenTelemetry Log Stream Section */}
        <Paper elevation={0} sx={{ p: 3, borderRadius: '16px', bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, flexDirection: { xs: 'column', sm: 'row' }, gap: 2, mb: 3 }}>
            <Box>
              <Typography variant="h6" fontWeight={700}>
                Live Event & Action Explorer
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Showing {filteredLogs.length} recent OpenTelemetry structured records (Last sync: {lastRefreshed.toLocaleTimeString()})
              </Typography>
            </Box>

            <Stack direction="row" spacing={1.5} flexWrap="wrap" alignItems="center">
              {/* Severity Filter */}
              <FormControl size="small" sx={{ minWidth: 120 }}>
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
              <FormControl size="small" sx={{ minWidth: 160 }}>
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
                placeholder="Search message or Chat ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                sx={{ width: { xs: '100%', sm: 200 } }}
              />
            </Stack>
          </Box>

          {/* Logs Table */}
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress />
            </Box>
          ) : filteredLogs.length === 0 ? (
            <Alert severity="info" sx={{ borderRadius: '12px' }}>
              No telemetry events match your selected filters. Trigger an action in the bot or web app to see live events.
            </Alert>
          ) : (
            <TableContainer sx={{ maxHeight: 500, borderRadius: '12px', border: '1px solid', borderColor: 'divider' }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, width: 140 }}>TIME</TableCell>
                    <TableCell sx={{ fontWeight: 700, width: 100 }}>LEVEL</TableCell>
                    <TableCell sx={{ fontWeight: 700, width: 180 }}>ACTION</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>MESSAGE & ATTRIBUTES</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredLogs.map((item, idx) => (
                    <TableRow key={idx} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                      <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                        {item.timestamp ? new Date(item.timestamp).toLocaleTimeString() : '—'}
                      </TableCell>
                      <TableCell>
                        {getSeverityBadge(item.severity)}
                      </TableCell>
                      <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem', fontWeight: 600 }}>
                        {item.action || 'general'}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontSize: '0.82rem', mb: 0.5 }}>
                          {item.message}
                        </Typography>
                        {/* Display custom attributes */}
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {item.chatId && (
                            <Chip size="small" variant="outlined" label={`Chat: ${item.chatId}`} sx={{ fontSize: '0.7rem' }} />
                          )}
                          {item.votedTime && (
                            <Chip size="small" color="primary" variant="outlined" label={`Vote: ${item.votedTime}`} sx={{ fontSize: '0.7rem' }} />
                          )}
                          {item.statusCode && (
                            <Chip size="small" color={item.statusCode >= 400 ? 'error' : 'success'} variant="outlined" label={`Status: ${item.statusCode}`} sx={{ fontSize: '0.7rem' }} />
                          )}
                          {item.durationMs !== undefined && (
                            <Chip size="small" variant="outlined" label={`${item.durationMs}ms`} sx={{ fontSize: '0.7rem' }} />
                          )}
                          {item.model && (
                            <Chip size="small" color="secondary" variant="outlined" label={`Model: ${item.model}`} sx={{ fontSize: '0.7rem' }} />
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
