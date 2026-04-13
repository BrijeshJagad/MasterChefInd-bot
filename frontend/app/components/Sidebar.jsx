'use client';

import React from 'react';
import {
  Box, Typography, List, ListItem, ListItemButton, ListItemIcon,
  ListItemText, Divider, Button, Stack, Tooltip, IconButton,
  Drawer, useTheme, Link, useMediaQuery
} from '@mui/material';
import HistoryIcon from '@mui/icons-material/History';
import CloudUploadIcon from '@mui/icons-material/FileUploadOutlined';
import TelegramIcon from '@mui/icons-material/Telegram';
import MoonIcon from '@mui/icons-material/Brightness4';
import SunIcon from '@mui/icons-material/Brightness7';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import GitHubIcon from '@mui/icons-material/GitHub';
import { useColorMode } from '../ThemeRegistry';

const DRAWER_WIDTH = 260;

export default function Sidebar({ weeks, selectedWeek, onSelectWeek, mobileOpen, onMobileToggle }) {
  const theme = useTheme();
  const colorMode = useColorMode();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const drawerContent = (
    <Box sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" className="sidebar-logo" sx={{ mb: 0.5 }}>
          MasterChef 🧑‍🍳
        </Typography>
      </Box>

      <Box sx={{ flex: 1, overflow: 'auto', mx: -1, px: 1 }}>
        <List disablePadding>
          {weeks.map((w) => (
            <ListItem key={w} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                selected={selectedWeek === w}
                onClick={() => {
                  onSelectWeek(w);
                  if (onMobileToggle) onMobileToggle();
                }}
                sx={{
                  borderRadius: '10px',
                  py: 1,
                  '&.Mui-selected': {
                    bgcolor: 'primary.main',
                    color: 'white',
                    '&:hover': { bgcolor: 'primary.dark' }
                  }
                }}
              >
                <ListItemIcon sx={{ minWidth: 32, color: 'inherit' }}>
                  <HistoryIcon sx={{ fontSize: '1rem' }} />
                </ListItemIcon>
                <ListItemText
                  primary={`Week ${w}`}
                  sx={{
                    '& .MuiListItemText-primary': {
                      fontWeight: selectedWeek === w ? 900 : 500,
                      fontSize: '0.85rem'
                    }
                  }}
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Box>

      <Box sx={{ mt: 'auto' }}>
        <Divider sx={{ my: 2, opacity: 0.1 }} />

        <Stack spacing={2} sx={{ mb: 2 }}>
          <Button
            fullWidth
            variant="contained"
            size="small"
            startIcon={<CloudUploadIcon sx={{ fontSize: '1rem' }} />}
            href="/admin"
            sx={{ py: 1.2, borderRadius: '10px', fontWeight: 800, fontSize: '0.75rem' }}
          >
            Upload New
          </Button>

          <Stack direction="row" spacing={1}>
            <Button
              fullWidth
              size="small"
              target="_blank"
              href="https://t.me/MasterChefInd_bot"
              startIcon={<TelegramIcon sx={{ fontSize: '1rem' }} />}
              sx={{
                bgcolor: 'rgba(255,255,255,0.05)',
                borderRadius: '10px',
                color: 'text.primary',
                fontWeight: 700,
                fontSize: '0.75rem',
                textTransform: 'none'
              }}
            >
              Telegram
            </Button>

            <Button
              fullWidth
              size="small"
              onClick={colorMode.toggleColorMode}
              startIcon={theme.palette.mode === 'dark' ? <SunIcon sx={{ fontSize: '1rem' }} /> : <MoonIcon sx={{ fontSize: '1rem' }} />}
              sx={{
                bgcolor: 'rgba(255,255,255,0.05)',
                borderRadius: '10px',
                color: 'text.primary',
                fontWeight: 700,
                fontSize: '0.75rem',
                textTransform: 'none'
              }}
            >
              {theme.palette.mode === 'dark' ? 'Light' : 'Dark'}
            </Button>
          </Stack>
        </Stack>
        <Divider sx={{ my: 1, opacity: 0.75 }} />
        <Box sx={{ textAlign: 'center', pb: 2 }}>
          <Typography variant="caption" sx={{ fontSize: '0.7rem', display: 'block', mb: 1.5, opacity: 0.6, fontWeight: 700 }}>
            MAINTAINED BY BRIJESH JAGAD
          </Typography>
          <Stack direction="row" spacing={1} sx={{ justifyContent: 'space-evenly' }}>
            <Button
              href="https://in.linkedin.com/in/brijesh-jagad"
              target="_blank"
              size="small"
              startIcon={<LinkedInIcon sx={{ fontSize: '1.1rem' }} />}
              sx={{
                borderRadius: '8px',
                fontSize: '0.7rem',
                fontWeight: 700,
                color: '#0077b5',
                bgcolor: 'rgba(0, 119, 181, 0.05)',
                '&:hover': { bgcolor: 'rgba(0, 119, 181, 0.1)' },
                textTransform: 'none',
                px: 1.5
              }}
            >
              LinkedIn
            </Button>
            <Button
              href="https://github.com/BrijeshJagad/MasterChefInd-bot"
              target="_blank"
              size="small"
              startIcon={<GitHubIcon sx={{ fontSize: '1.1rem' }} />}
              sx={{
                borderRadius: '8px',
                fontSize: '0.7rem',
                fontWeight: 700,
                color: 'text.primary',

                bgcolor: 'rgba(0, 119, 181, 0.05)',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' },
                textTransform: 'none',
                px: 1.5
              }}
            >
              Github
            </Button>
          </Stack>
        </Box>
      </Box>
    </Box >
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
            bgcolor: 'background.default',
            backgroundImage: 'none',
            borderRight: '1px solid var(--glass-border)',
            borderRadius: 0
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
            bgcolor: 'transparent',
            borderRight: '1px solid var(--glass-border)',
            p: 0,
            borderRadius: 0
          },
        }}
        open
      >
        {drawerContent}
      </Drawer>
    </Box>
  );
}
