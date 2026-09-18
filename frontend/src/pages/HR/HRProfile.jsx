import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  Divider,
  Stack,
  Typography,
} from '@mui/material';
import hrService from '../../services/hr';
import auth from '../../services/auth';
import { useEffect, useState } from 'react';
import HRProfileSkeleton from '../../components/loading/HRProfileSkeleton';
import AppLayout from '../../components/AppLayout';

const HRProfile = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const [hr, setHr] = useState(location.state?.hr || null);
  const [loading, setLoading] = useState(!location.state?.hr);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchHR = async () => {
      if (location.state?.hr) return;

      try {
        const response = id ? await hrService.getById(id) : await hrService.getMyProfile();
        setHr(response?.data?.data || null);
      } catch (err) {
        setError(err?.response?.data?.message || 'Unable to load HR profile.');
      } finally {
        setLoading(false);
      }
    };

    fetchHR();
  }, [id, location.state?.hr]);

  const handleBackToDashboard = () => {
    const role = localStorage.getItem('role');
    navigate(role === 'hr' ? '/hr/dashboard' : '/departments');
  };

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        await auth.logout();
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('role');
      localStorage.removeItem('userName');
      localStorage.removeItem('userEmail');
      navigate('/login');
    }
  };

  if (loading) {
    return (
      <AppLayout onLogout={handleLogout}>
        <HRProfileSkeleton />
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout onLogout={handleLogout}>
        <Alert severity="error">{error}</Alert>
      </AppLayout>
    );
  }

  if (!hr) {
    return (
      <AppLayout onLogout={handleLogout}>
        <Alert severity="warning">HR profile not found.</Alert>
      </AppLayout>
    );
  }

  return (
    <AppLayout onLogout={handleLogout}>
      <Card sx={{ maxWidth: 760, p: { xs: 2, md: 3 } }}>
        <Stack spacing={3}>
          <Box>
            <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 2 }}>
              HR PROFILE
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 700 }}>
              {hr.name}
            </Typography>
          </Box>

          <Chip label={hr.role || 'HR'} color="default" sx={{ width: 'fit-content', backgroundColor: '#000000', color: '#FFFFFF' }} />

          <Divider />

          <Stack spacing={2}>
            <Box>
              <Typography variant="caption" color="text.secondary">Email</Typography>
              <Typography variant="body1">{hr.email}</Typography>
            </Box>

            <Box>
              <Typography variant="caption" color="text.secondary">Phone</Typography>
              <Typography variant="body1">{hr.phone || 'Not provided'}</Typography>
            </Box>

            <Box>
              <Typography variant="caption" color="text.secondary">Hospital</Typography>
              <Typography variant="body1">{hr.hospitalId?.name || hr.hospitalName || 'Hospital'}</Typography>
            </Box>

            <Box>
              <Typography variant="caption" color="text.secondary">Status</Typography>
              <Typography variant="body1">{hr.status || 'Active'}</Typography>
            </Box>

            <Box>
              <Typography variant="caption" color="text.secondary">Created</Typography>
              <Typography variant="body1">
                {hr.createdAt ? new Date(hr.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Today'}
              </Typography>
            </Box>
          </Stack>

          <Button variant="contained" onClick={handleBackToDashboard} sx={{ alignSelf: 'flex-start' }}>
            Back to Dashboard
          </Button>
        </Stack>
      </Card>
    </AppLayout>
  );
};

export default HRProfile;
