'use client';

import React, { useState } from 'react';
import { 
  Container, Typography, Box, Paper, TextField, Button, 
  CircularProgress, Alert, Stack, IconButton, Link
} from '@mui/material';
import { 
  UploadFile as UploadIcon, 
  ArrowBack as BackIcon,
  CloudUpload as CloudUploadIcon
} from '@mui/icons-material';

export default function AdminUpload() {
  const [file, setFile] = useState(null);
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected && selected.type === 'application/pdf') {
      setFile(selected);
      setStatus('idle');
    } else {
      setMessage('Please select a valid PDF file.');
      setStatus('error');
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file || !password) return;

    setStatus('uploading');
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
        setStatus('success');
        setMessage(data.message);
        setFile(null);
        setPassword('');
      } else {
        setStatus('error');
        setMessage(data.error || 'Upload failed');
      }
    } catch (err) {
      setStatus('error');
      setMessage('Network error occurred.');
    }
  };

  return (
    <Container maxWidth="sm" sx={{ py: 10 }}>
      <Box textAlign="center" mb={6}>
        <Typography variant="h3" fontWeight={800} gutterBottom>
          Admin Portal
        </Typography>
        <Typography variant="h6" color="text.secondary">
          Secure Weekly Menu Update
        </Typography>
      </Box>

      <Paper elevation={0} sx={{ p: 4, textAlign: 'center' }}>
        <form onSubmit={handleUpload}>
          <Stack spacing={4}>
            <TextField
              fullWidth
              type="password"
              label="Admin Password"
              variant="outlined"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />

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
              <Typography variant="body2" color="text.secondary">
                Max size: 10MB
              </Typography>
              <input
                id="fileInput"
                type="file"
                hidden
                accept="application/pdf"
                onChange={handleFileChange}
              />
            </Box>

            <Button
              fullWidth
              type="submit"
              variant="contained"
              size="large"
              startIcon={status === 'uploading' ? <CircularProgress size={20} color="inherit" /> : <UploadIcon />}
              disabled={status === 'uploading' || !file || !password}
              sx={{ height: 56, fontSize: '1.1rem' }}
            >
              {status === 'uploading' ? 'Processing...' : 'Update Menu'}
            </Button>

            {message && (
              <Alert 
                severity={status === 'success' ? 'success' : 'error'} 
                sx={{ borderRadius: 3 }}
              >
                {message}
              </Alert>
            )}
          </Stack>
        </form>
      </Paper>

      <Box mt={4} textAlign="center">
        <Button 
          component={Link} 
          href="/" 
          startIcon={<BackIcon />}
          sx={{ fontWeight: 'bold' }}
        >
          Back to Menu View
        </Button>
      </Box>
    </Container>
  );
}
