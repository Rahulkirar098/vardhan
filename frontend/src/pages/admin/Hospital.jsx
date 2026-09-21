import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Stack, TextField } from '@mui/material';
import { AddBusinessRounded, EditRounded, LocalHospitalRounded } from '@mui/icons-material';
import hospitalService from '../../services/hospital.service';
import hr from '../../services/hr.service';
import auth from '../../services/auth.service';
import GlassCard from '../../components/GlassCard';
import SectionCard from '../../components/SectionCard';
import PageHeader from '../../components/PageHeader';
import StatCard from '../../components/StatCard';
import StatusBadge from '../../components/StatusBadge';
import InfoRow from '../../components/InfoRow';
import EmptyState from '../../components/EmptyState';
import ErrorState from '../../components/ErrorState';
import AppLayout from '../../components/AppLayout';
import Loading from '../../components/Loading';
import Modal from '../../components/Modal';

const formatStatus = (status) => {
  if (!status) return 'Active';
  return String(status).charAt(0).toUpperCase() + String(status).slice(1);
};

const initialHospitalForm = {
  name: '',
  code: '',
  registrationNumber: '',
  phone: '',
  email: '',
  website: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  state: '',
  country: 'India',
  pincode: '',
};

const CreateHospitalModal = ({ open, onClose, onSuccess, resetKey = 0 }) => {
  const [form, setForm] = useState(initialHospitalForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setForm(initialHospitalForm);
      setSubmitting(false);
      setError('');
    }
  }, [open, resetKey]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    setError('');

    if (!form.name || !form.code) {
      setError('Hospital name and code are required.');
      return;
    }

    try {
      setSubmitting(true);
      const response = await hospitalService.createHospital({
        name: form.name.trim(),
        code: form.code.trim(),
        registrationNumber: form.registrationNumber.trim() || null,
        contact: {
          phone: form.phone.trim(),
          email: form.email.trim(),
          website: form.website.trim() || null,
        },
        address: {
          addressLine1: form.addressLine1.trim(),
          addressLine2: form.addressLine2.trim() || null,
          city: form.city.trim(),
          state: form.state.trim(),
          country: form.country.trim() || 'India',
          pincode: form.pincode.trim(),
        },
      });
      await onSuccess(response);
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to create hospital.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Create Hospital"
      description="Add your hospital profile to start managing."
      submitLabel="Create Hospital"
      submittingLabel="Creating..."
      onSubmit={handleSubmit}
      submitting={submitting}
      error={error}
      resetKey={resetKey}
      SubmitIcon={AddBusinessRounded}
    >
      <Stack spacing={2.5} sx={{ pt: 0.5 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <TextField label="Hospital Name" name="name" value={form.name} onChange={handleChange} required />
          <TextField label="Hospital Code" name="code" value={form.code} onChange={handleChange} required />
        </Stack>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <TextField label="Registration Number" name="registrationNumber" value={form.registrationNumber} onChange={handleChange} />
          <TextField label="Phone" name="phone" value={form.phone} onChange={handleChange} />
        </Stack>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <TextField label="Email" type="email" name="email" value={form.email} onChange={handleChange} />
          <TextField label="Website" name="website" value={form.website} onChange={handleChange} />
        </Stack>
        <TextField label="Address Line 1" name="addressLine1" value={form.addressLine1} onChange={handleChange} multiline minRows={2} />
        <TextField label="Address Line 2" name="addressLine2" value={form.addressLine2} onChange={handleChange} />
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <TextField label="City" name="city" value={form.city} onChange={handleChange} required />
          <TextField label="State" name="state" value={form.state} onChange={handleChange} required />
        </Stack>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <TextField label="Country" name="country" value={form.country} onChange={handleChange} />
          <TextField label="Pincode" name="pincode" value={form.pincode} onChange={handleChange} />
        </Stack>
      </Stack>
    </Modal>
  );
};

const EditHospitalModal = ({ open, onClose, onSuccess, hospital, resetKey = 0 }) => {
  const [form, setForm] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open && hospital) {
      setForm({
        name: hospital.name || '',
        code: hospital.code || '',
        registrationNumber: hospital.registrationNumber || '',
        phone: hospital.contact?.phone || '',
        email: hospital.contact?.email || '',
        website: hospital.contact?.website || '',
        addressLine1: hospital.address?.addressLine1 || '',
        addressLine2: hospital.address?.addressLine2 || '',
        city: hospital.address?.city || '',
        state: hospital.address?.state || '',
        country: hospital.address?.country || 'India',
        pincode: hospital.address?.pincode || '',
      });
      setSubmitting(false);
      setError('');
    }
  }, [open, hospital, resetKey]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    setError('');

    if (!form.name || !form.code) {
      setError('Hospital name and code are required.');
      return;
    }

    try {
      setSubmitting(true);
      const response = await hospitalService.updateHospital(hospital._id, {
        name: form.name.trim(),
        code: form.code.trim(),
        registrationNumber: form.registrationNumber.trim() || null,
        contact: {
          phone: form.phone.trim(),
          email: form.email.trim(),
          website: form.website.trim() || null,
        },
        address: {
          addressLine1: form.addressLine1.trim(),
          addressLine2: form.addressLine2.trim() || null,
          city: form.city.trim(),
          state: form.state.trim(),
          country: form.country.trim() || 'India',
          pincode: form.pincode.trim(),
        },
      });
      await onSuccess(response, { id: hospital._id });
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to update hospital.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Edit Hospital"
      description="Update your hospital profile details."
      submitLabel="Update Hospital"
      submittingLabel="Updating..."
      onSubmit={handleSubmit}
      submitting={submitting}
      error={error}
      resetKey={resetKey}
      SubmitIcon={EditRounded}
    >
      <Stack spacing={2.5} sx={{ pt: 0.5 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <TextField label="Hospital Name" name="name" value={form.name || ''} onChange={handleChange} required />
          <TextField label="Hospital Code" name="code" value={form.code || ''} onChange={handleChange} required />
        </Stack>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <TextField label="Registration Number" name="registrationNumber" value={form.registrationNumber || ''} onChange={handleChange} />
          <TextField label="Phone" name="phone" value={form.phone || ''} onChange={handleChange} />
        </Stack>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <TextField label="Email" type="email" name="email" value={form.email || ''} onChange={handleChange} />
          <TextField label="Website" name="website" value={form.website || ''} onChange={handleChange} />
        </Stack>
        <TextField label="Address Line 1" name="addressLine1" value={form.addressLine1 || ''} onChange={handleChange} multiline minRows={2} />
        <TextField label="Address Line 2" name="addressLine2" value={form.addressLine2 || ''} onChange={handleChange} />
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <TextField label="City" name="city" value={form.city || ''} onChange={handleChange} />
          <TextField label="State" name="state" value={form.state || ''} onChange={handleChange} />
        </Stack>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <TextField label="Country" name="country" value={form.country || 'India'} onChange={handleChange} />
          <TextField label="Pincode" name="pincode" value={form.pincode || ''} onChange={handleChange} />
        </Stack>
      </Stack>
    </Modal>
  );
};

const Hospital = () => {
  const navigate = useNavigate();
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [hospital, setHospital] = useState(null);
  const [stats, setStats] = useState({ hrCount: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchHospital = async () => {
    try {
      setLoading(true);
      const overviewResponse = await hospitalService.getOverview().catch((err) => err?.response || null);
      const overviewData = overviewResponse?.data?.data;

      if (overviewData?.hospital) {
        setHospital(overviewData.hospital);
        setStats(overviewData.stats || { hrCount: 0 });
        setError('');
        return;
      }

      const [hospitalResponse, hrResponse] = await Promise.all([
        hospitalService.getMyHospital().catch(() => ({ data: { data: null } })),
        hr.getAll().catch(() => ({ data: { data: [] } })),
      ]);

      const hospitalData = hospitalResponse?.data?.data || null;
      const hrData = hrResponse?.data?.data;
      const hrCount = Array.isArray(hrData) ? hrData.length : hrData ? 1 : 0;

      setHospital(hospitalData);
      setStats({
        hrCount,
      });
      setError('');
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to load hospital information.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
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
      {loading ? (
        <Box sx={{ border: '1px solid #E5E5E5', borderRadius: '12px', backgroundColor: '#FFFFFF' }}>
          <Loading label="Loading hospital…" height="auto" />
        </Box>
      ) : (
        <Stack spacing={4}>
          <PageHeader
            title="Hospital"
            subtitle="Manage your hospital profile and information."
            actions={
              hospital && (
                <Button variant="outlined" startIcon={<EditRounded />} onClick={() => setEditOpen(true)}>
                  Edit Hospital
                </Button>
              )
            }
          />

          {error && <ErrorState message={error} />}

          {!hospital ? (
            <GlassCard sx={{ p: { xs: 3, md: 4 } }}>
              <EmptyState
                icon={LocalHospitalRounded}
                title="Set up your hospital"
                description="Create your hospital profile to start managing your facility."
                actionLabel="Create Hospital"
                onAction={() => setCreateOpen(true)}
              />
            </GlassCard>
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
                  label="HR Count"
                  value={stats.hrCount ?? 0}
                  footer={<StatusBadge status="active" label="Active" />}
                />
                <StatCard
                  label="Status"
                  value={formatStatus(hospital.status)}
                  footer={<StatusBadge status={hospital.status} />}
                />
              </Box>

              <SectionCard
                title="Hospital Information"
                action={<StatusBadge status={hospital.status} />}
              >
                <Box>
                  <InfoRow label="Hospital Name" value={hospital.name} />
                  <InfoRow label="Hospital Code" value={hospital.code} />
                  <InfoRow label="Registration No." value={hospital.registrationNumber} />
                  <InfoRow label="Phone" value={hospital.contact?.phone} />
                  <InfoRow label="Email" value={hospital.contact?.email} />
                  <InfoRow label="Website" value={hospital.contact?.website} />
                  <InfoRow label="Location" value={location} />
                </Box>
              </SectionCard>
            </>
          )}
        </Stack>
      )}
      <CreateHospitalModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSuccess={() => {
          setCreateOpen(false);
          void fetchHospital();
        }}
      />
      <EditHospitalModal
        open={editOpen}
        hospital={hospital}
        onClose={() => setEditOpen(false)}
        onSuccess={() => {
          setEditOpen(false);
          void fetchHospital();
        }}
      />
    </AppLayout>
  );
};

export default Hospital;