import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Alert, Box, Button, Stack } from '@mui/material';
import { ArrowBackRounded } from '@mui/icons-material';
import hrService from '../../services/hr.service';
import auth from '../../services/auth.service';
import { useEffect, useState } from 'react';
import PageHeader from '../../components/PageHeader';
import SectionCard from '../../components/SectionCard';
import InfoRow from '../../components/InfoRow';
import StatusBadge from '../../components/StatusBadge';
import Loading from '../../components/Loading';
import AppLayout from '../../components/AppLayout';

const formatStatus = (status) => {
  if (!status) return 'Active';
  return String(status).charAt(0).toUpperCase() + String(status).slice(1).toLowerCase();
};

const formatDate = (dateString) => {
  if (!dateString) return '—';
  return new Date(dateString).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

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
        setError(err?.response?.data?.message || 'Unable to load your profile.');
      } finally {
        setLoading(false);
      }
    };

    fetchHR();
  }, [id, location.state?.hr]);

  const handleBackToDashboard = () => {
    const role = localStorage.getItem('role');
    navigate(role === 'hr' ? '/hr/dashboard' : '/hospital');
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
      localStorage.removeItem('permissions');
      localStorage.removeItem('modules');
      navigate('/login');
    }
  };

  if (loading) {
    return (
      <AppLayout onLogout={handleLogout}>
        <Box sx={{ border: '1px solid #E5E5E5', borderRadius: '12px', backgroundColor: '#FFFFFF' }}>
          <Loading label="Loading your profile…" height="auto" />
        </Box>
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
        <Alert severity="warning">No employee profile is associated with this account.</Alert>
      </AppLayout>
    );
  }

  const positionName = typeof hr.position === 'object'
    ? hr.position?.name
    : (hr.position || hr.positionId?.name || '—');

  return (
    <AppLayout onLogout={handleLogout}>
      <Stack spacing={4} sx={{ maxWidth: 1024 }}>
        <Box>
          <Button
            variant="text"
            size="small"
            startIcon={<ArrowBackRounded fontSize="small" />}
            onClick={handleBackToDashboard}
            sx={{ px: 0, mb: 1.5, color: 'text.secondary' }}
          >
            Back to {localStorage.getItem('role') === 'hr' ? 'Dashboard' : 'Hospital'}
          </Button>
          <PageHeader
            title={hr.name}
            subtitle={`${hr.role ? hr.role.toUpperCase() : 'HR'} · ${hr.email}`}
            actions={<StatusBadge status={hr.status || 'active'} />}
          />
        </Box>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' },
            gap: 2.5,
          }}
        >
          <SectionCard title="Personal Information">
            <InfoRow label="Name" value={hr.name} />
            <InfoRow label="Email" value={hr.email} />
            <InfoRow label="Employee ID" value={hr.employeeId || '—'} />
            <InfoRow label="Position" value={positionName} />
            <InfoRow label="Phone" value={hr.phone || '—'} />
          </SectionCard>

          <SectionCard title="Organization">
            <InfoRow label="Hospital" value={hr.hospitalId?.name || hr.hospitalName || 'Not Assigned'} />
          </SectionCard>

          <SectionCard title="Account" sx={{ gridColumn: { md: '1 / -1' } }}>
            <InfoRow label="Role" value={formatStatus(hr.role)} />
            <InfoRow label="Status" value={formatStatus(hr.status)} />
            <InfoRow label="Date of Joining" value={formatDate(hr.dateOfJoining)} />
            <InfoRow label="Created" value={formatDate(hr.createdAt)} />
          </SectionCard>
        </Box>
      </Stack>
    </AppLayout>
  );
};

export default HRProfile;