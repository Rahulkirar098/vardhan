import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Stack, Typography } from '@mui/material';
import { ArrowForwardRounded, LocalHospitalRounded } from '@mui/icons-material';
import superAdmin from '../../services/superAdmin.service';
import auth from '../../services/auth.service';
import AppLayout from '../../components/AppLayout';
import PageHeader from '../../components/PageHeader';
import StatCard from '../../components/StatCard';
import StatusBadge from '../../components/StatusBadge';
import GlassCard from '../../components/GlassCard';
import ErrorState from '../../components/ErrorState';
import Loading from '../../components/Loading';

const SuperAdminDashboard = () => {
  const navigate = useNavigate();
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchHospitals = async () => {
      try {
        const response = await superAdmin.getHospitals();
        setHospitals(response?.data?.data || []);
        setError('');
      } catch (err) {
        setError(err?.response?.data?.message || 'Unable to load dashboard.');
      } finally {
        setLoading(false);
      }
    };

    fetchHospitals();
  }, []);

  const activeCount = useMemo(
    () => hospitals.filter((hospital) => (hospital?.status || 'active') === 'active').length,
    [hospitals],
  );

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        await auth.logout();
      }
    } catch (error) {
      console.error('Super admin logout error:', error);
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
          subtitle="Overview of hospitals across the platform."
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
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(3, minmax(0, 1fr))' },
                gap: 2.5,
              }}
            >
              <StatCard label="Total Hospitals" value={hospitals.length} footer={<StatusBadge status="active" label="Registered" />} />
              <StatCard label="Active Hospitals" value={activeCount} footer={<StatusBadge status={activeCount ? 'active' : 'inactive'} label={activeCount ? 'Operational' : 'None'} />} />
              <StatCard
                label="Pending Setup"
                value={Math.max(hospitals.length - activeCount, 0)}
                footer={<StatusBadge status={hospitals.length - activeCount ? 'pending' : 'inactive'} label={hospitals.length - activeCount ? 'Needs attention' : 'None'} />}
              />
            </Box>

            <GlassCard sx={{ p: 3 }}>
              <Stack spacing={2}>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 700, fontSize: 18 }}>
                    Quick Actions
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Review and manage hospitals on the platform.
                  </Typography>
                </Box>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                  <Button
                    variant="contained"
                    startIcon={<LocalHospitalRounded />}
                    endIcon={<ArrowForwardRounded fontSize="small" />}
                    onClick={() => navigate('/super-admin/hospitals')}
                  >
                    View All Hospitals
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

export default SuperAdminDashboard;