import { useEffect, useState } from 'react';
import { Stack, TextField } from '@mui/material';
import EditRounded from '@mui/icons-material/EditRounded';
import FormModal from '../../../components/modal/FormModal';
import hospitalService from '../../../services/hospital';

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
    <FormModal
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
    </FormModal>
  );
};

export default EditHospitalModal;
