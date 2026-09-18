import { useNavigate } from 'react-router-dom';
import {
  Box,
  Chip,
  Stack,
  Typography,
} from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import hrService from '../../services/hr';
import auth from '../../services/auth';
import GlassCard from '../../components/GlassCard';
import DashboardSkeleton from '../../components/loading/DashboardSkeleton';
import AppLayout from '../../components/AppLayout';
import { getGreeting, getRoleSubtitle } from '../../utils/greeting';

const getCurrentUserName = () => localStorage.getItem('userName') || 'User';

const Dashboard = () => {
  const navigate = useNavigate();
  const [hospital, setHospital] = useState(null);
  const [hr, setHr] = useState(null);
  const [loading, setLoading] = useState(true);
  const userName = getCurrentUserName();

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const response = await hrService.getMyProfile().catch(() => ({ data: { data: null } }));
        setHr(response?.data?.data || null);
        setHospital(response?.data?.data?.hospitalId || null);
      } catch (error) {
        console.error('Dashboard fetch error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

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

  return (
    <AppLayout onLogout={handleLogout}>
      <DashboardOverview hospital={hospital} hr={hr} loading={loading} userName={userName} />
    </AppLayout>
  );
};

const DashboardOverview = ({ hospital, hr, loading, userName }) => {
  const today = useMemo(() => new Date(), []);
  const formattedDate = today.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const summaryCards = useMemo(() => {
    return [
      { label: 'My Profile', value: hr ? 'Active' : 'Pending', status: hr ? 'active' : 'warning' },
      { label: 'Hospital', value: hospital?.name ? 'Assigned' : 'Not Set', status: hospital ? 'active' : 'warning' },
      { label: 'Department', value: hr?.departmentId?.name || 'Not Set', status: hr?.departmentId ? 'active' : 'warning' },
    ];
  }, [hospital, hr]);

  if (loading) {
    return <DashboardSkeleton role="hr" />;
  }

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          {getGreeting(userName)}
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mt: 0.75 }}>
          {getRoleSubtitle('hr')}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          {formattedDate}
        </Typography>
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, minmax(0, 1fr))' },
          gap: 2.5,
        }}
      >
        {summaryCards.map((card) => (
          <GlassCard key={card.label} sx={{ p: 2.5, height: '100%' }}>
            <Stack spacing={1}>
              <Typography variant="caption" color="text.secondary">{card.label}</Typography>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>{card.value}</Typography>
              <Chip
                label={card.status === 'active' ? 'Active' : 'Pending'}
                size="small"
                sx={{
                  width: 'fit-content',
                  backgroundColor: card.status === 'active' ? '#000000' : '#EAEAEA',
                  color: card.status === 'active' ? '#FFFFFF' : '#000000',
                  borderRadius: 2,
                }}
              />
            </Stack>
          </GlassCard>
        ))}
      </Box>

      {hr ? (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' },
            gap: 2.5,
          }}
        >
          <GlassCard sx={{ p: 2.5, height: '100%' }}>
            <Stack spacing={2}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>My Profile</Typography>
              <Typography><strong>Name:</strong> {hr.name}</Typography>
              <Typography><strong>Email:</strong> {hr.email}</Typography>
              <Typography><strong>Phone:</strong> {hr.phone || 'Not provided'}</Typography>
              <Typography><strong>Role:</strong> {hr.role || 'HR'}</Typography>
              <Typography><strong>Status:</strong> {hr.status || 'Active'}</Typography>
            </Stack>
          </GlassCard>

          <GlassCard sx={{ p: 2.5, height: '100%' }}>
            <Stack spacing={2}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>My Hospital</Typography>
              <Typography><strong>Hospital:</strong> {hospital?.name || hr.hospitalId?.name || 'Not assigned'}</Typography>
              <Typography><strong>Code:</strong> {hospital?.code || hr.hospitalId?.code || 'N/A'}</Typography>
              <Typography><strong>Location:</strong> {hospital?.address?.city || hr.hospitalId?.city || 'N/A'}</Typography>
              <Typography><strong>Status:</strong> {hospital?.status || hr.hospitalId?.status || 'Active'}</Typography>
            </Stack>
          </GlassCard>
        </Box>
      ) : (
        <GlassCard sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>No HR profile found</Typography>
          <Typography color="text.secondary">Your profile information is not available yet.</Typography>
        </GlassCard>
      )}
    </Stack>
  );
};

export default Dashboard;
