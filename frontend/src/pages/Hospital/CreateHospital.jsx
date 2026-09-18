import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import hospital from '../../services/hospital';
import AppLayout from '../../components/AppLayout';

const CreateHospital = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isEdit = Boolean(location.state?.editMode);
  const [hospitalId, setHospitalId] = useState(null);
  const [form, setForm] = useState({
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
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const loadHospital = async () => {
      try {
        const response = await hospital.getMyHospital();
        const existing = response?.data?.data;

        if (existing) {
          if (isEdit) {
            setHospitalId(existing._id);
            setForm((prev) => ({
              ...prev,
              name: existing.name || '',
              code: existing.code || '',
              registrationNumber: existing.registrationNumber || '',
              phone: existing.contact?.phone || '',
              email: existing.contact?.email || '',
              website: existing.contact?.website || '',
              addressLine1: existing.address?.addressLine1 || '',
              addressLine2: existing.address?.addressLine2 || '',
              city: existing.address?.city || '',
              state: existing.address?.state || '',
              country: existing.address?.country || 'India',
              pincode: existing.address?.pincode || '',
            }));
          } else {
            navigate('/hospital');
          }
        } else if (isEdit) {
          navigate('/hospital/create');
        }
      } catch (error) {
        console.error('Hospital check error:', error);
      }
    };

    loadHospital();
  }, [isEdit, navigate]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!form.name || !form.code) {
      setError('Hospital name and code are required.');
      return;
    }

    const payload = {
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
    };

    try {
      setLoading(true);

      if (isEdit) {
        await hospital.updateHospital(hospitalId, payload);
        setSuccess('Hospital updated successfully.');
      } else {
        await hospital.createHospital(payload);
        setSuccess('Hospital created successfully.');
      }

      setTimeout(() => navigate('/hospital'), 600);
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to save hospital.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout onLogout={async () => {
      localStorage.removeItem('token');
      localStorage.removeItem('role');
      localStorage.removeItem('userName');
      localStorage.removeItem('userEmail');
      navigate('/login');
    }}>
    <Card sx={{ p: { xs: 2, md: 3 } }}>
        <Stack spacing={3}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
              {isEdit ? 'Edit Hospital' : 'Create Hospital'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {isEdit
                ? 'Update your hospital profile details.'
                : 'Add your hospital profile to start managing HR operations.'}
            </Typography>
          </Box>

          {error && <Alert severity="error">{error}</Alert>}
          {success && <Alert severity="success">{success}</Alert>}

          <Box component="form" onSubmit={handleSubmit} noValidate>
            <Stack spacing={2.5}>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                <TextField label="Hospital Name" name="name" value={form.name} onChange={handleChange} required />
                <TextField label="Hospital Code" name="code" value={form.code} onChange={handleChange} required />
              </Stack>

              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                <TextField label="Registration Number" name="registrationNumber" value={form.registrationNumber} onChange={handleChange} />
                <TextField label="Phone" name="phone" value={form.phone} onChange={handleChange} />
              </Stack>

              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                <TextField label="Email" name="email" type="email" value={form.email} onChange={handleChange} />
                <TextField label="Website" name="website" value={form.website} onChange={handleChange} />
              </Stack>

              <TextField label="Address Line 1" name="addressLine1" value={form.addressLine1} onChange={handleChange} />
              <TextField label="Address Line 2" name="addressLine2" value={form.addressLine2} onChange={handleChange} />

              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                <TextField label="City" name="city" value={form.city} onChange={handleChange} />
                <TextField label="State" name="state" value={form.state} onChange={handleChange} />
                <TextField label="Country" name="country" value={form.country} onChange={handleChange} />
              </Stack>

              <TextField label="Pincode" name="pincode" value={form.pincode} onChange={handleChange} />

              <Button type="submit" variant="contained" disabled={loading} sx={{ alignSelf: 'flex-start', px: 3 }}>
                {loading
                  ? isEdit
                    ? 'Updating...'
                    : 'Creating...'
                  : isEdit
                    ? 'Update Hospital'
                    : 'Create Hospital'}
              </Button>
            </Stack>
          </Box>
        </Stack>
      </Card>
    </AppLayout>
  );
};

export default CreateHospital;
