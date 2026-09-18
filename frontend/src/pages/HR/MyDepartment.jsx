import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Box, Stack, Typography } from '@mui/material';
import hr from '../../services/hr';
import auth from '../../services/auth';
import AppLayout from '../../components/AppLayout';
import PageHeader from '../../components/PageHeader';
import SectionCard from '../../components/SectionCard';
import InfoRow from '../../components/InfoRow';
import StatusBadge from '../../components/StatusBadge';
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
      <Stack spacing={4}>
        <PageHeader title="My Department" subtitle="Your assigned department details." />

        {error && <Alert severity="error">{error}</Alert>}

        {loading ? (
          <Box sx={{ border: '1px solid #E5E5E5', borderRadius: '12px', backgroundColor: '#FFFFFF' }}>
            <Loading label="Loading department…" height="auto" />
          </Box>
        ) : !department ? (
          <Box sx={{ border: '1px solid #E5E5E5', borderRadius: '12px', backgroundColor: '#FFFFFF', p: 3 }}>
            <Stack spacing={1} sx={{ maxWidth: 760 }}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                No department found
              </Typography>
              <Typography color="text.secondary">
                You are not assigned to a department yet. Contact your administrator.
              </Typography>
            </Stack>
          </Box>
        ) : (
          <SectionCard
            title={department.name}
            action={<StatusBadge status={department.status} />}
            sx={{ maxWidth: 760 }}
          >
            <InfoRow label="Department Code" value={department.code} />
            <InfoRow label="Description" value={department.description} />
            <InfoRow label="Status" value={formatStatus(department.status)} />
          </SectionCard>
        )}
      </Stack>
    </AppLayout>
  );
};

export default MyDepartment;