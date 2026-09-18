import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Box, Chip, Stack, Typography } from '@mui/material';
import hr from '../../services/hr';
import auth from '../../services/auth';
import GlassCard from '../../components/GlassCard';
import AppLayout from '../../components/AppLayout';
import Loading from '../../components/Loading';

const formatStatus = (status) => {
  if (!status) return 'Active';
  return String(status).charAt(0).toUpperCase() + String(status).slice(1);
};

const MyDepartment = () => {
  const navigate = useNavigate();
  const [department, setDepartment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDepartment = async () => {
      try {
        const response = await hr.getMyProfile();
        const profile = response?.data?.data;
        setDepartment(profile?.departmentId || null);
      } catch (err) {
        setError(err?.response?.data?.message || 'Unable to load your department.');
      } finally {
        setLoading(false);
      }
    };

    fetchDepartment();
  }, []);

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        await auth.logout();
      }
    } catch (logoutError) {
      console.error('Logout error:', logoutError);
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('role');
      localStorage.removeItem('userName');
      localStorage.removeItem('userEmail');
      navigate('/login');
    }
  };

  return (
    <AppLayout onLogout={handleLogout}>
      <Stack spacing={3}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            My Department
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mt: 0.75 }}>
            Your assigned department details.
          </Typography>
        </Box>

        {error && <Alert severity="error">{error}</Alert>}

        {loading ? (
          <GlassCard sx={{ p: 3 }}>
            <Loading label="Loading department..." height="auto" />
          </GlassCard>
        ) : !department ? (
          <GlassCard sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
              No department found
            </Typography>
            <Typography color="text.secondary">
              You are not assigned to a department yet. Contact your administrator.
            </Typography>
          </GlassCard>
        ) : (
          <GlassCard sx={{ p: { xs: 2.5, md: 3 }, maxWidth: 760 }}>
            <Stack spacing={2.5}>
              <Stack
                direction="row"
                spacing={1.5}
                alignItems="center"
                justifyContent="space-between"
                sx={{ flexWrap: 'wrap' }}
              >
                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                  {department.name}
                </Typography>
                <Chip
                  label={formatStatus(department.status)}
                  size="small"
                  sx={{ backgroundColor: '#000000', color: '#FFFFFF', borderRadius: 2 }}
                />
              </Stack>

              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: '160px 1fr' },
                  rowGap: 1.5,
                  columnGap: 2,
                }}
              >
                <Typography color="text.secondary">Department Code</Typography>
                <Typography sx={{ fontWeight: 600 }}>{department.code || 'N/A'}</Typography>
                <Typography color="text.secondary">Description</Typography>
                <Typography sx={{ fontWeight: 600 }}>{department.description || 'No description provided.'}</Typography>
                <Typography color="text.secondary">Status</Typography>
                <Typography sx={{ fontWeight: 600 }}>{formatStatus(department.status)}</Typography>
              </Box>
            </Stack>
          </GlassCard>
        )}
      </Stack>
    </AppLayout>
  );
};

export default MyDepartment;