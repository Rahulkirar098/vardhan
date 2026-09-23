import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Stack, Typography } from '@mui/material';
import { ArrowForwardRounded, GroupRounded, LayersRounded, LocalHospitalRounded } from '@mui/icons-material';
import hospitalService from '../../services/hospital.service';
import auth from '../../services/auth.service';
import AppLayout from '../../components/AppLayout';
import PageHeader from '../../components/PageHeader';
import StatCard from '../../components/StatCard';
import StatusBadge from '../../components/StatusBadge';
import GlassCard from '../../components/GlassCard';
import ErrorState from '../../components/ErrorState';
import Loading from '../../components/Loading';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [hospital, setHospital] = useState(null);
  const [stats, setStats] = useState({ hrCount: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchOverview = async () => {
      try {
        const response = await hospitalService.getOverview();
        const data = response?.data?.data || {};
        setHospital(data.hospital || null);
        setStats(data.stats || { hrCount: 0 });
        setError('');
      } catch (err) {
        setError(err?.response?.data?.message || 'Unable to load dashboard.');
      } finally {
        setLoading(false);
      }
    };

    fetchOverview();
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
      <Stack spacing={4}>
        <PageHeader
          title="Dashboard"
          subtitle="Overview of your hospital and team."
        />

        {error && <ErrorState message={error} />}

        {loading ? (
          <Box sx={{ border: '1px solid #E5E5E5', borderRadius: '12px', backgroundColor: '#FFFFFF' }}>
            <Loading label="Loading dashboard…" height="auto" />
          </Box>
        ) : (
          <>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' },
                gap: 2.5,
              }}
            >
              <StatCard
                label="Hospital"
                value={hospital?.name || 'Not set up'}
                footer={<StatusBadge status={hospital?.status || 'inactive'} />}
              />
              <StatCard
                label="Workforce"
                value={stats.employeeCount ?? stats.hrCount ?? 0}
                footer={<StatusBadge status="active" label="Active" />}
              />
            </Box>

            <GlassCard sx={{ p: 3 }}>
              <Stack spacing={2}>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 700, fontSize: 18 }}>
                    Quick Actions
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Jump straight into managing your hospital.
                  </Typography>
                </Box>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                  <Button
                    variant="contained"
                    startIcon={<LocalHospitalRounded />}
                    endIcon={<ArrowForwardRounded fontSize="small" />}
                    onClick={() => navigate('/hospital')}
                  >
                    Open Hospital
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<LayersRounded />}
                    onClick={() => navigate('/structure')}
                  >
                    Hospital Structure
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<GroupRounded />}
                    onClick={() => navigate('/profile')}
                  >
                    My Profile
                  </Button>
                </Stack>
              </Stack>
            </GlassCard>
          </>
        )}
      </Stack>
    </AppLayout>
  );
};

export default AdminDashboard;