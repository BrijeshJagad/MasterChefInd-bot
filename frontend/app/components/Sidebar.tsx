'use client';

import React from 'react';
import {
  Box, Typography, List, ListItem, ListItemButton, ListItemIcon,
  ListItemText, Divider, Button, Stack, Drawer, useTheme, Chip, Tooltip
} from '@mui/material';
import HistoryOutlinedIcon from '@mui/icons-material/HistoryOutlined';
import CampaignOutlinedIcon from '@mui/icons-material/CampaignOutlined';
import InsightsOutlinedIcon from '@mui/icons-material/InsightsOutlined';
import RestaurantMenuOutlinedIcon from '@mui/icons-material/RestaurantMenuOutlined';
import TelegramIcon from '@mui/icons-material/Telegram';
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined';
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import GitHubIcon from '@mui/icons-material/GitHub';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import LockOpenOutlinedIcon from '@mui/icons-material/LockOpenOutlined';
import { useColorMode } from '../ThemeRegistry';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const DRAWER_WIDTH = 270;

export interface SidebarProps {
  weeks: string[];
  selectedWeek: string;
  onSelectWeek?: (week: string) => void;
  mobileOpen: boolean;
  onMobileToggle: () => void;
  isAdmin: boolean;
  onAdminToggle: () => void;
  onAdminLogout: () => void;
}

export default function Sidebar({
  weeks,
  selectedWeek,
  mobileOpen,
  onMobileToggle,
  isAdmin,
  onAdminToggle,
  onAdminLogout,
}: SidebarProps): React.JSX.Element {
  const theme = useTheme();
  const colorMode = useColorMode();
  const pathname = usePathname();
  const isDark = theme.palette.mode === 'dark';

  const navItemStyles = (isActive: boolean) => ({
    borderRadius: '10px',
    py: 1,
    px: 1.5,
    mb: 0.5,
    transition: 'all 0.15s ease-in-out',
    bgcolor: isActive
      ? (isDark ? 'rgba(108, 93, 211, 0.16)' : 'rgba(67, 24, 255, 0.08)')
      : 'transparent',
    color: isActive ? 'primary.main' : 'text.primary',
    '&:hover': {
      bgcolor: isActive
        ? (isDark ? 'rgba(108, 93, 211, 0.22)' : 'rgba(67, 24, 255, 0.12)')
        : (isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(15, 23, 42, 0.04)'),
    },
  });

  const drawerContent = (
    <Box sx={{ p: 2.5, height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Brand Header */}
      <Box sx={{ mb: 3, px: 1, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: '10px',
            bgcolor: 'primary.main',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: isDark
              ? '0 4px 12px rgba(108, 93, 211, 0.35)'
              : '0 4px 12px rgba(67, 24, 255, 0.25)',
          }}
        >
          <RestaurantMenuOutlinedIcon sx={{ color: 'white', fontSize: '1.25rem' }} />
        </Box>
        <Box>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 700,
              fontSize: '1.05rem',
              letterSpacing: '-0.02em',
              lineHeight: 1.2,
            }}
          >
            MasterChef
          </Typography>
          <Typography
            variant="caption"
            sx={{
              color: 'text.secondary',
              fontSize: '0.7rem',
              fontWeight: 500,
              letterSpacing: '0.02em',
            }}
          >
            Dining Intelligence OS
          </Typography>
        </Box>
      </Box>

      {/* Main Navigation */}
      <Box sx={{ flex: 1, overflowY: 'auto', mx: -1, px: 1 }}>
        <Typography
          variant="caption"
          sx={{
            px: 1.5,
            mb: 1,
            display: 'block',
            color: 'text.secondary',
            fontWeight: 600,
            fontSize: '0.675rem',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}
        >
          Navigation
        </Typography>

        <List disablePadding>
          <ListItem disablePadding>
            <ListItemButton
              component={Link}
              href="/"
              selected={pathname === '/'}
              onClick={() => onMobileToggle && onMobileToggle()}
              sx={navItemStyles(pathname === '/')}
            >
              <ListItemIcon sx={{ minWidth: 32, color: pathname === '/' ? 'primary.main' : 'text.secondary' }}>
                <RestaurantMenuOutlinedIcon sx={{ fontSize: '1.15rem' }} />
              </ListItemIcon>
              <ListItemText
                primary="Weekly Menu"
                sx={{
                  '& .MuiListItemText-primary': {
                    fontSize: '0.85rem',
                    fontWeight: pathname === '/' ? 600 : 500,
                  },
                }}
              />
            </ListItemButton>
          </ListItem>

          <ListItem disablePadding>
            <ListItemButton
              component={Link}
              href="/announcements"
              selected={pathname === '/announcements'}
              onClick={() => onMobileToggle && onMobileToggle()}
              sx={navItemStyles(pathname === '/announcements')}
            >
              <ListItemIcon sx={{ minWidth: 32, color: pathname === '/announcements' ? 'primary.main' : 'text.secondary' }}>
                <CampaignOutlinedIcon sx={{ fontSize: '1.15rem' }} />
              </ListItemIcon>
              <ListItemText
                primary="Announcements"
                sx={{
                  '& .MuiListItemText-primary': {
                    fontSize: '0.85rem',
                    fontWeight: pathname === '/announcements' ? 600 : 500,
                  },
                }}
              />
            </ListItemButton>
          </ListItem>

          <ListItem disablePadding>
            <ListItemButton
              component={Link}
              href="/insights"
              selected={pathname === '/insights'}
              onClick={() => onMobileToggle && onMobileToggle()}
              sx={navItemStyles(pathname === '/insights')}
            >
              <ListItemIcon sx={{ minWidth: 32, color: pathname === '/insights' ? 'primary.main' : 'text.secondary' }}>
                <InsightsOutlinedIcon sx={{ fontSize: '1.15rem' }} />
              </ListItemIcon>
              <ListItemText
                primary="System Insights"
                sx={{
                  '& .MuiListItemText-primary': {
                    fontSize: '0.85rem',
                    fontWeight: pathname === '/insights' ? 600 : 500,
                  },
                }}
              />
            </ListItemButton>
          </ListItem>
        </List>

        <Divider sx={{ my: 2.5, opacity: 0.6 }} />

        {/* Weekly Archive */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 1.5, mb: 1 }}>
          <Typography
            variant="caption"
            sx={{
              color: 'text.secondary',
              fontWeight: 600,
              fontSize: '0.675rem',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}
          >
            Archive Weeks
          </Typography>
          <Chip
            size="small"
            label={`${weeks.length}`}
            sx={{
              height: 18,
              fontSize: '0.65rem',
              fontWeight: 700,
              bgcolor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.06)',
            }}
          />
        </Box>

        <List disablePadding>
          {weeks.map((w) => {
            const isSelected = selectedWeek === w && pathname === '/';
            return (
              <ListItem key={w} disablePadding>
                <ListItemButton
                  component={Link}
                  href={`/?week=${w}`}
                  selected={isSelected}
                  onClick={() => {
                    if (onMobileToggle) onMobileToggle();
                  }}
                  sx={navItemStyles(isSelected)}
                >
                  <ListItemIcon sx={{ minWidth: 32, color: isSelected ? 'primary.main' : 'text.secondary' }}>
                    <HistoryOutlinedIcon sx={{ fontSize: '1rem' }} />
                  </ListItemIcon>
                  <ListItemText
                    primary={`Week ${w}`}
                    sx={{
                      '& .MuiListItemText-primary': {
                        fontSize: '0.825rem',
                        fontWeight: isSelected ? 600 : 400,
                      },
                    }}
                  />
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>
      </Box>

      {/* Footer / Utility Section */}
      <Box sx={{ mt: 'auto', pt: 2 }}>
        <Divider sx={{ mb: 2, opacity: 0.6 }} />

        <Stack spacing={1} sx={{ mb: 2 }}>
          <Button
            fullWidth
            size="small"
            variant="outlined"
            target="_blank"
            rel="noopener noreferrer"
            href="https://t.me/MasterChefInd_bot"
            startIcon={<TelegramIcon sx={{ fontSize: '1rem' }} />}
            sx={{
              borderRadius: '9px',
              fontSize: '0.775rem',
              fontWeight: 600,
              justifyContent: 'flex-start',
              px: 1.5,
              py: 0.75,
            }}
          >
            Telegram Bot
          </Button>

          <Stack direction="row" spacing={1}>
            <Button
              fullWidth
              size="small"
              variant="outlined"
              onClick={colorMode.toggleColorMode}
              startIcon={isDark ? <LightModeOutlinedIcon sx={{ fontSize: '1rem' }} /> : <DarkModeOutlinedIcon sx={{ fontSize: '1rem' }} />}
              sx={{
                borderRadius: '9px',
                fontSize: '0.775rem',
                fontWeight: 600,
                justifyContent: 'flex-start',
                px: 1.5,
                py: 0.75,
              }}
            >
              {isDark ? 'Light' : 'Dark'}
            </Button>

            <Button
              fullWidth
              size="small"
              variant="outlined"
              onClick={isAdmin ? onAdminLogout : onAdminToggle}
              startIcon={isAdmin ? <LockOpenOutlinedIcon sx={{ fontSize: '1rem' }} /> : <LockOutlinedIcon sx={{ fontSize: '1rem' }} />}
              sx={{
                borderRadius: '9px',
                fontSize: '0.775rem',
                fontWeight: 600,
                justifyContent: 'flex-start',
                px: 1.5,
                py: 0.75,
                borderColor: isAdmin ? 'error.main' : undefined,
                color: isAdmin ? 'error.main' : undefined,
                '&:hover': {
                  borderColor: isAdmin ? 'error.dark' : undefined,
                  bgcolor: isAdmin ? 'rgba(239, 68, 68, 0.08)' : undefined,
                },
              }}
            >
              {isAdmin ? 'Logout' : 'Admin'}
            </Button>
          </Stack>
        </Stack>

        {/* Creator Info */}
        <Box sx={{ textAlign: 'center', pt: 1, pb: 0.5 }}>
          <Typography
            variant="caption"
            sx={{
              fontSize: '0.675rem',
              display: 'block',
              mb: 1,
              color: 'text.secondary',
              fontWeight: 500,
              letterSpacing: '0.02em',
            }}
          >
            Created by Brijesh Jagad
          </Typography>
          <Stack direction="row" spacing={1} sx={{ justifyContent: 'center' }}>
            <Tooltip title="LinkedIn Profile">
              <Button
                href="https://in.linkedin.com/in/brijesh-jagad"
                target="_blank"
                rel="noopener noreferrer"
                size="small"
                startIcon={<LinkedInIcon sx={{ fontSize: '0.95rem' }} />}
                sx={{
                  borderRadius: '7px',
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  py: 0.4,
                  px: 1.2,
                  minWidth: 'auto',
                }}
              >
                LinkedIn
              </Button>
            </Tooltip>
            <Tooltip title="GitHub Repository">
              <Button
                href="https://github.com/BrijeshJagad/MasterChefInd-bot"
                target="_blank"
                rel="noopener noreferrer"
                size="small"
                startIcon={<GitHubIcon sx={{ fontSize: '0.95rem' }} />}
                sx={{
                  borderRadius: '7px',
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  py: 0.4,
                  px: 1.2,
                  minWidth: 'auto',
                }}
              >
                GitHub
              </Button>
            </Tooltip>
          </Stack>
        </Box>
      </Box>
    </Box>
  );

  return (
    <Box component="nav" sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}>
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onMobileToggle}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: DRAWER_WIDTH,
            bgcolor: 'background.paper',
            borderRight: '1px solid',
            borderColor: 'divider',
          },
        }}
      >
        {drawerContent}
      </Drawer>

      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', md: 'block' },
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: DRAWER_WIDTH,
            bgcolor: 'background.paper',
            borderRight: '1px solid',
            borderColor: 'divider',
          },
        }}
        open
      >
        {drawerContent}
      </Drawer>
    </Box>
  );
}
