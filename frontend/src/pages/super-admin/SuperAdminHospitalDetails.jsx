import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Alert, Box, Stack } from '@mui/material';
import { AppButton } from '../../components/common';
import { ArrowBackRounded } from '@mui/icons-material';
import superAdmin from '../../services/superAdmin.service';
import auth from '../../services/auth.service';
import AppLayout from '../../components/AppLayout';
import MainContentLoader from '../../components/common/MainContentLoader';
import PageHeader from '../../components/common/PageHeader';
import SectionCard from '../../components/SectionCard';
import InfoRow from '../../components/InfoRow';
import StatusBadge from '../../components/StatusBadge';

const formatStatus = (status) => {
  if (!status) return 'Active';
  return String(status).charAt(0).toUpperCase() + String(status).slice(1);
};

const HospitalDetails = () => {
  const navigate = useNavigate();
  const { hospitalId } = useParams();
  const [hospital, setHospital] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchHospital = async () => {
      try {
        const response = await superAdmin.getHospitalById(hospitalId);
        setHospital(response?.data?.data || null);
      } catch (err) {
        setError(err?.response?.data?.message || 'Unable to load hospital details.');
      } finally {
        setLoading(false);
      }
    };

    fetchHospital();
  }, [hospitalId]);

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

  const admin = hospital?.createdBy || {};
  const contact = hospital?.contact || {};
  const address = hospital?.address || {};

  return (
    <AppLayout onLogout={handleLogout}>
      {loading ? (
        <MainContentLoader />
      ) : error ? (
        <Alert severity="error">{error}</Alert>
      ) : !hospital ? (
        <Alert severity="warning">Hospital not found.</Alert>
      ) : (
        <>
          <PageHeader
            breadcrumb={
              <AppButton
                variant="text"
                size="small"
                startIcon={<ArrowBackRounded fontSize="small" />}
                onClick={() => navigate('/super-admin/dashboard')}
                sx={{ px: 0, mb: -0.5 }}
              >
                Back to Hospitals
              </AppButton>
            }
            title={hospital.name}
            description={`Hospital Code · ${hospital.code || 'N/A'}`}
            actions={<StatusBadge status={hospital.status} />}
          />

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', lg: 'repeat(2, minmax(0, 1fr))' },
              gap: 2.5,
            }}
          >
            <SectionCard title="Hospital Details">
              <InfoRow label="Hospital Name" value={hospital.name} />
              <InfoRow label="Code" value={hospital.code} />
              <InfoRow label="Registration Number" value={hospital.registrationNumber} />
              <InfoRow label="Status" value={formatStatus(hospital.status)} />
            </SectionCard>

            <SectionCard title="Contact">
              <InfoRow label="Phone" value={contact.phone} />
              <InfoRow label="Email" value={contact.email} />
              <InfoRow label="Website" value={contact.website} />
            </SectionCard>

            <SectionCard title="Address">
              <InfoRow label="Address Line 1" value={address.addressLine1} />
              <InfoRow label="Address Line 2" value={address.addressLine2} />
              <InfoRow label="City / State" value={[address.city, address.state].filter(Boolean).join(', ')} />
              <InfoRow label="Country / Pincode" value={[address.country || 'India', address.pincode].filter(Boolean).join(', ')} />
            </SectionCard>

            <SectionCard title="Hospital Admin">
              <InfoRow label="Name" value={admin.name} />
              <InfoRow label="Email" value={admin.email} />
              <InfoRow label="Phone" value={admin.phone} />
              <InfoRow label="Status" value={formatStatus(admin.status)} />
            </SectionCard>
          </Box>
        </>
      )}
    </AppLayout>
  );
};

export default HospitalDetails;