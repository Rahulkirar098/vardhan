import { useNavigate } from 'react-router-dom';
import { Box, Button, Stack } from '@mui/material';
import { ArrowForwardRounded } from '@mui/icons-material';
import { useEffect, useMemo, useState } from 'react';
import hrService from '../../services/hr';
import auth from '../../services/auth';
import SectionCard from '../../components/SectionCard';
import StatCard from '../../components/StatCard';
import StatusBadge from '../../components/StatusBadge';
import InfoRow from '../../components/InfoRow';
import PageHeader from '../../components/PageHeader';
import EmptyState from '../../components/EmptyState';
import Loading from '../../components/Loading';
import AppLayout from '../../components/AppLayout';

const formatStatus = (status) => {
  if (!status) return 'Active';
  return String(status).charAt(0).toUpperCase() + String(status).slice(1);
};

const Dashboard = () => {
  const navigate = useNavigate();
  const [hospital, setHospital] = useState(null);
  const [hr, setHr] = useState(null);
  const [loading, setLoading] = useState(true);

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

  const activeHr = Boolean(hr);
  const summaryCards = useMemo(
    () => [
      {
        label: 'My Profile',
        value: hr ? 'Active' : 'Pending',
        footer: <StatusBadge status={hr ? 'active' : 'pending'} label={hr ? 'Active' : 'Pending'} />,
      },
      {
        label: 'Hospital',
        value: hospital?.name || hr?.hospitalId?.name || 'Not Assigned',
        footer: <StatusBadge status={hospital || hr?.hospitalId ? 'active' : 'pending'} label={hospital || hr?.hospitalId ? 'Assigned' : 'Not Set'} />,
      },
      {
        label: 'Department',
        value: hr?.departmentId?.name || 'Not Set',
        footer: <StatusBadge status={hr?.departmentId ? 'active' : 'pending'} label={hr?.departmentId ? 'Assigned' : 'Not Set'} />,
      },
    ],
    [hr, hospital],
  );

  if (loading) {
    return (
      <AppLayout onLogout={handleLogout}>
        <Box sx={{ border: '1px solid #E5E5E5', borderRadius: '12px', backgroundColor: '#FFFFFF' }}>
          <Loading label="Loading dashboard…" height="auto" />
        </Box>
      </AppLayout>
    );
  }

  return (
    <AppLayout onLogout={handleLogout}>
      <Stack spacing={4}>
        <PageHeader
          title="Dashboard"
          subtitle="Your workspace at a glance."
        />

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(3, minmax(0, 1fr))' },
            gap: 2.5,
          }}
        >
          {summaryCards.map((card) => (
            <StatCard key={card.label} label={card.label} value={card.value} footer={card.footer} />
          ))}
        </Box>

        {!activeHr ? (
          <Box sx={{ border: '1px solid #E5E5E5', borderRadius: '12px', backgroundColor: '#FFFFFF' }}>
            <EmptyState
              title="No HR profile found"
              description="Your profile information is not available yet. Contact your administrator."
            />
          </Box>
        ) : (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' },
              gap: 2.5,
            }}
          >
            <SectionCard
              title="My Profile"
              subtitle="Your account details"
              action={
                <Button size="small" variant="outlined" endIcon={<ArrowForwardRounded fontSize="small" />} onClick={() => navigate('/hr/profile')}>
                  View Profile
                </Button>
              }
            >
              <Box>
                <InfoRow label="Name" value={hr?.name} />
                <InfoRow label="Email" value={hr?.email} />
                <InfoRow label="Phone" value={hr?.phone} />
                <InfoRow label="Status" value={formatStatus(hr?.status)} />
              </Box>
            </SectionCard>

            <SectionCard
              title="My Hospital"
              subtitle="Information about your hospital"
              action={
                <Button size="small" variant="outlined" endIcon={<ArrowForwardRounded fontSize="small" />} onClick={() => navigate('/hr/hospital')}>
                  View Hospital
                </Button>
              }
            >
              <Box>
                <InfoRow label="Hospital" value={hospital?.name || hr?.hospitalId?.name} />
                <InfoRow label="Code" value={hospital?.code || hr?.hospitalId?.code} />
                <InfoRow label="Location" value={[hospital?.address?.city, hospital?.address?.state].filter(Boolean).join(', ') || hr?.hospitalId?.city} />
                <InfoRow label="Status" value={formatStatus(hospital?.status || hr?.hospitalId?.status)} />
              </Box>
            </SectionCard>
          </Box>
        )}
      </Stack>
    </AppLayout>
  );
};

export default Dashboard;