import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Stack, Typography } from '@mui/material';
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
      <Stack spacing={4}>
        <PageHeader title="My Hospital" subtitle="Your assigned hospital details." />

        {error && <Alert severity="error">{error}</Alert>}

        {loading ? (
          <Stack sx={{ border: '1px solid #E5E5E5', borderRadius: '12px', backgroundColor: '#FFFFFF' }}>
            <Loading label="Loading hospital…" height="auto" />
          </Stack>
        ) : !hospital ? (
          <Stack sx={{ border: '1px solid #E5E5E5', borderRadius: '12px', backgroundColor: '#FFFFFF', p: 3 }}>
            <Stack spacing={1} sx={{ maxWidth: 760 }}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                No hospital found
              </Typography>
              <Typography color="text.secondary">
                You are not assigned to a hospital yet. Contact your administrator.
              </Typography>
            </Stack>
          </Stack>
        ) : (
          <SectionCard
            title={hospital.name}
            action={<StatusBadge status={hospital.status} />}
            sx={{ maxWidth: 760 }}
          >
            <InfoRow label="Hospital Code" value={hospital.code} />
            <InfoRow label="Location" value={location} />
            <InfoRow label="Registration Number" value={hospital.registrationNumber} />
            <InfoRow label="Full Address" value={[hospital.address?.addressLine1, hospital.address?.addressLine2, hospital.address?.city, hospital.address?.state, hospital.address?.country, hospital.address?.pincode].filter(Boolean).join(', ')} />
            <InfoRow label="Status" value={formatStatus(hospital.status)} />
          </SectionCard>
        )}
      </Stack>
    </AppLayout>
  );
};

export default MyHospital;