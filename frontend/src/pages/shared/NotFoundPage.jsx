import { Box, Button, Container, Paper, Stack, Typography } from '@mui/material';
import HomeRounded from '@mui/icons-material/HomeRounded';
import ArrowBackRounded from '@mui/icons-material/ArrowBackRounded';
import ErrorOutlineRounded from '@mui/icons-material/ErrorOutlineRounded';
import { useNavigate } from 'react-router-dom';

export default function NotFoundPage() {
  const navigate = useNavigate();

  const handleHomeClick = () => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');

    if (!token) {
      navigate('/');
    } else if (role === 'super_admin') {
      navigate('/super-admin/dashboard');
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: (t) => (t.palette.mode === 'dark' ? '#0F172A' : '#FAFAFA'),
        p: 3,
      }}
    >
      <Container maxWidth="sm">
        <Paper
          elevation={0}
          sx={{
            p: { xs: 4, sm: 6 },
            borderRadius: 4,
            textAlign: 'center',
            border: '1px solid',
            borderColor: 'divider',
            backdropFilter: 'blur(10px)',
            background: (t) =>
              t.palette.mode === 'dark'
                ? 'rgba(30, 41, 59, 0.7)'
                : 'rgba(255, 255, 255, 0.9)',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.06)',
          }}
        >
          <Box
            sx={{
              width: 80,
              height: 80,
              borderRadius: '24px',
              backgroundColor: (t) =>
                t.palette.mode === 'dark' ? 'rgba(239, 68, 68, 0.15)' : '#FEF2F2',
              color: '#EF4444',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              mb: 3,
            }}
          >
            <ErrorOutlineRounded sx={{ fontSize: 48 }} />
          </Box>

          <Typography
            variant="h1"
            sx={{
              fontSize: { xs: '4rem', sm: '5.5rem' },
              fontWeight: 900,
              lineHeight: 1,
              letterSpacing: '-0.04em',
              background: 'linear-gradient(135deg, #0A0A0A 0%, #6B6B6B 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: (t) => (t.palette.mode === 'dark' ? '#F8FAFC' : undefined),
              mb: 1,
            }}
          >
            404
          </Typography>

          <Typography variant="h5" fontWeight={700} color="text.primary" gutterBottom>
            Page Not Found
          </Typography>

          <Typography color="text.secondary" variant="body1" sx={{ maxWidth: 420, mx: 'auto', mb: 4 }}>
            The page you are looking for doesn't exist, has been removed, or you don't have permission to access it.
          </Typography>

          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            justifyContent="center"
          >
            <Button
              variant="outlined"
              color="inherit"
              size="large"
              startIcon={<ArrowBackRounded />}
              onClick={() => navigate(-1)}
              sx={{ borderRadius: '10px', px: 3 }}
            >
              Go Back
            </Button>
            <Button
              variant="contained"
              color="primary"
              size="large"
              startIcon={<HomeRounded />}
              onClick={handleHomeClick}
              sx={{ borderRadius: '10px', px: 3 }}
            >
              {localStorage.getItem('token') ? 'Go to Dashboard' : 'Go to Home'}
            </Button>
          </Stack>
        </Paper>
      </Container>
    </Box>
  );
}
