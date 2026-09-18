import { useEffect, useState } from 'react';
import {
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
} from '@mui/material';
import FormModal from '../../../components/modal/FormModal';
import departmentService from '../../../services/department';

const EditDepartmentModal = ({ open, onClose, onSuccess, department, resetKey = 0 }) => {
  const [form, setForm] = useState({ name: '', code: '', description: '', status: 'active' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open && department) {
      setForm({
        name: department.name || '',
        code: department.code || '',
        description: department.description || '',
        status: department.status || 'active',
      });
      setError('');
    }
  }, [open, department, resetKey]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (!form.name.trim() || !form.code.trim()) {
      setError('Department name and code are required.');
      return;
    }

    try {
      setSubmitting(true);
      await departmentService.update(department._id, {
        name: form.name.trim(),
        code: form.code.trim(),
        description: form.description.trim(),
        status: form.status,
      });
      onSuccess();
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to update department.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title="Edit Department"
      description="Update the details of this department."
      submitLabel="Update"
      submittingLabel="Updating..."
      onSubmit={handleSubmit}
      submitting={submitting}
      error={error}
      resetKey={resetKey}
      maxWidth="sm"
    >
      <Stack spacing={2.5} sx={{ pt: 0.5 }}>
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
        <FormControl>
          <InputLabel>Status</InputLabel>
          <Select name="status" value={form.status} label="Status" onChange={handleChange}>
            <MenuItem value="active">Active</MenuItem>
            <MenuItem value="inactive">Inactive</MenuItem>
          </Select>
        </FormControl>
      </Stack>
    </FormModal>
  );
};

export default EditDepartmentModal;
