import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Chip,
  Grid,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { ArrowForwardRounded, LocalHospitalRounded } from '@mui/icons-material';
import superAdmin from '../../services/superAdmin.service';
import auth from '../../services/auth.service';
import AppLayout from '../../components/AppLayout';
import MainContentLoader from '../../components/common/MainContentLoader';
import PageHeader from '../../components/PageHeader';
import StatCard from '../../components/StatCard';
import StatusBadge from '../../components/StatusBadge';
import GlassCard from '../../components/GlassCard';
import ErrorState from '../../components/ErrorState';

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
};

const SuperAdminDashboard = () => {
  const navigate = useNavigate();
  const userName = localStorage.getItem('userName') || 'Super Admin';
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchHospitals = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await superAdmin.getHospitals();
      setHospitals(response?.data?.data || []);
    } catch (err) {
      console.error('Super Admin fetch error:', err);
      setError(err?.response?.data?.message || 'Unable to load platform dashboard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHospitals();
  }, []);

  const activeCount = useMemo(
    () => hospitals.filter((hospital) => (hospital?.status || 'active') === 'active').length,
    [hospitals],
  );

  const pendingSetupCount = useMemo(
    () => Math.max(hospitals.length - activeCount, 0),
    [hospitals.length, activeCount],
  );

  const recentHospitals = useMemo(
    () => hospitals.slice(0, 5),
    [hospitals],
  );

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        await auth.logout();
      }
    } catch (logoutError) {
      console.error('Super admin logout error:', logoutError);
    } finally {
      localStorage.clear();
      navigate('/login');
    }
  };

  return (
    <AppLayout onLogout={handleLogout}>
      <Stack spacing={3.5}>
        <PageHeader
          title={`${getGreeting()}, ${userName}`}
          subtitle="Platform overview of registered hospitals and system operations."
        />

        {error && <ErrorState message={error} onRetry={fetchHospitals} />}

        {loading ? (
          <MainContentLoader />
        ) : (
          <>
            {/* KPI Summary Grid */}
            <Grid container spacing={2.5}>
              <Grid item xs={12} sm={6} lg={4}>
                <StatCard
                  label="Total Hospitals"
                  value={hospitals.length}
                  footer={<StatusBadge status="active" label="Registered Platform Hospitals" />}
                />
              </Grid>

              <Grid item xs={12} sm={6} lg={4}>
                <StatCard
                  label="Active Hospitals"
                  value={activeCount}
                  footer={<StatusBadge status={activeCount ? 'active' : 'inactive'} label={activeCount ? 'Operational' : 'None'} />}
                />
              </Grid>

              <Grid item xs={12} sm={6} lg={4}>
                <StatCard
                  label="Pending Setup"
                  value={pendingSetupCount}
                  footer={<StatusBadge status={pendingSetupCount ? 'pending' : 'inactive'} label={pendingSetupCount ? 'Needs Setup' : 'All Set'} />}
                />
              </Grid>
            </Grid>

            {/* Registered Hospitals Recent Overview */}
            <GlassCard sx={{ p: 3 }}>
              <Stack spacing={2.5}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 700, fontSize: 18 }}>
                      Registered Hospitals
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Overview of hospitals configured on the platform.
                    </Typography>
                  </Box>

                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<LocalHospitalRounded />}
                    endIcon={<ArrowForwardRounded fontSize="small" />}
                    onClick={() => navigate('/super-admin/hospitals')}
                  >
                    View All Hospitals
                  </Button>
                </Stack>

                {recentHospitals.length === 0 ? (
                  <Box py={3} textAlign="center">
                    <Typography variant="body2" color="text.secondary">
                      No hospitals registered yet.
                    </Typography>
                  </Box>
                ) : (
                  <TableContainer sx={{ width: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                    <Table size="small" sx={{ minWidth: 600 }}>
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>Hospital Name</TableCell>
                          <TableCell sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>Code</TableCell>
                          <TableCell sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>Status</TableCell>
                          <TableCell sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>Created Date</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>Action</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {recentHospitals.map((h) => (
                          <TableRow key={h.id || h._id} hover>
                            <TableCell sx={{ fontWeight: 600 }}>{h.name}</TableCell>
                            <TableCell>
                              <Chip label={h.code || 'N/A'} size="small" variant="outlined" />
                            </TableCell>
                            <TableCell>
                              <StatusBadge status={h.status || 'active'} />
                            </TableCell>
                            <TableCell color="text.secondary">
                              {h.createdAt ? new Date(h.createdAt).toLocaleDateString() : 'N/A'}
                            </TableCell>
                            <TableCell align="right">
                              <Button
                                size="small"
                                onClick={() => navigate('/super-admin/hospitals')}
                              >
                                Manage
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Stack>
            </GlassCard>
          </>
        )}
      </Stack>
    </AppLayout>
  );
};

export default SuperAdminDashboard;