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

const MyHospital = () => {
  const navigate = useNavigate();
  const [hospital, setHospital] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchHospital = async () => {
      try {
        const response = await hr.getHospital();
        setHospital(response?.data?.data || null);
      } catch (err) {
        setError(err?.response?.data?.message || 'Unable to load your hospital.');
      } finally {
        setLoading(false);
      }
    };

    fetchHospital();
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

  const location = [hospital?.address?.city, hospital?.address?.state].filter(Boolean).join(', ') || 'Not provided';

  return (
    <AppLayout onLogout={handleLogout}>
      <Stack spacing={3}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            My Hospital
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mt: 0.75 }}>
            Your assigned hospital details.
          </Typography>
        </Box>

        {error && <Alert severity="error">{error}</Alert>}

        {loading ? (
          <GlassCard sx={{ p: 3 }}>
            <Loading label="Loading hospital..." height="auto" />
          </GlassCard>
        ) : !hospital ? (
          <GlassCard sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
              No hospital found
            </Typography>
            <Typography color="text.secondary">
              You are not assigned to a hospital yet. Contact your administrator.
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
                  {hospital.name}
                </Typography>
                <Chip
                  label={formatStatus(hospital.status)}
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
                <Typography color="text.secondary">Hospital Code</Typography>
                <Typography sx={{ fontWeight: 600 }}>{hospital.code || 'N/A'}</Typography>
                <Typography color="text.secondary">Location</Typography>
                <Typography sx={{ fontWeight: 600 }}>{location}</Typography>
                <Typography color="text.secondary">Registration Number</Typography>
                <Typography sx={{ fontWeight: 600 }}>{hospital.registrationNumber || 'N/A'}</Typography>
                <Typography color="text.secondary">Status</Typography>
                <Typography sx={{ fontWeight: 600 }}>{formatStatus(hospital.status)}</Typography>
              </Box>
            </Stack>
          </GlassCard>
        )}
      </Stack>
    </AppLayout>
  );
};

export default MyHospital;