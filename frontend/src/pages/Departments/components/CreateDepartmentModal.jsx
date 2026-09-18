import { useEffect, useState } from 'react';
import { Alert, Box, Stack, TextField } from '@mui/material';
import FormModal from '../../../components/modal/FormModal';
import department from '../../../services/department';

const initialForm = {
  name: '',
  code: '',
  description: '',
};

const CreateDepartmentModal = ({ open, onClose, onSuccess, resetKey = 0 }) => {
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

    if (!form.name.trim() || !form.code.trim()) {
      setError('Department name and code are required.');
      return;
    }

    try {
      setSubmitting(true);
      await department.create({
        name: form.name.trim(),
        code: form.code.trim(),
        description: form.description.trim(),
      });
      onSuccess();
    } catch (err) {
      setServerError(err?.response?.data?.message || 'Unable to create department.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title="Create Department"
      description="Add a department for your hospital."
      submitLabel="Create"
      submittingLabel="Creating..."
      onSubmit={handleSubmit}
      submitting={submitting}
      error={serverError}
    >
      <Box sx={{ pt: 1 }}>
        <Stack spacing={2.5}>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField label="Department Name" name="name" value={form.name} onChange={handleChange} required />
          <TextField label="Department Code" name="code" value={form.code} onChange={handleChange} required />
          <TextField
            label="Description"
            name="description"
            value={form.description}
            onChange={handleChange}
            multiline
            minRows={3}
          />
        </Stack>
      </Box>
    </FormModal>
  );
};

export default CreateDepartmentModal;
