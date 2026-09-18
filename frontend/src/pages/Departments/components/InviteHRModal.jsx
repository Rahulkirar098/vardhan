import { useEffect, useState } from 'react';
import { Alert, Box, Stack, TextField } from '@mui/material';
import FormModal from '../../../components/modal/FormModal';
import departmentService from '../../../services/department';

const initialForm = {
  name: '',
  email: '',
  phone: '',
};

const InviteHRModal = ({ open, onClose, onSuccess, department, resetKey = 0 }) => {
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [serverError, setServerError] = useState('');

  useEffect(() => {
    if (open) {
      setForm(initialForm);
      setSubmitting(false);
      setError('');
      setServerError('');
    }
  }, [open, resetKey]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setServerError('');

    if (!form.name.trim() || !form.email.trim()) {
      setError('HR name and email are required.');
      return;
    }

    try {
      setSubmitting(true);
      await departmentService.inviteHr(department._id, {
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim(),
      });
      onSuccess();
    } catch (err) {
      setServerError(err?.response?.data?.message || 'Unable to send invitation.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title="Invite HR"
      description="Invite a member to join the HR team."
      submitLabel="Send Invitation"
      submittingLabel="Sending Invitation..."
      onSubmit={handleSubmit}
      submitting={submitting}
      error={serverError}
      resetKey={resetKey}
      maxWidth="sm"
    >
      <Box sx={{ pt: 1 }}>
        <Stack spacing={2.5}>
          <TextField label="Department" value={department?.name || ''} disabled fullWidth />
          {error && <Alert severity="error">{error}</Alert>}
          <TextField label="HR Name" name="name" value={form.name} onChange={handleChange} required />
          <TextField label="Email" type="email" name="email" value={form.email} onChange={handleChange} required />
          <TextField label="Phone" name="phone" value={form.phone} onChange={handleChange} />
        </Stack>
      </Box>
    </FormModal>
  );
};

export default InviteHRModal;
