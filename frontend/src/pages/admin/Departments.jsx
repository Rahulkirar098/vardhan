import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Box, Button, Stack, TextField, Typography } from '@mui/material';
import { AddRounded, ApartmentRounded } from '@mui/icons-material';
import department from '../../services/department.service';
import auth from '../../services/auth.service';
import AppLayout from '../../components/AppLayout';
import PageHeader from '../../components/PageHeader';
import StatusBadge from '../../components/StatusBadge';
import DataTable from '../../components/DataTable';
import Modal from '../../components/Modal';

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
    <Modal
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
    </Modal>
  );
};

const Departments = () => {
  const navigate = useNavigate();
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [createOpen, setCreateOpen] = useState(false);

  const fetchDepartments = async () => {
    try {
      setLoading(true);
      const response = await department.getAll();
      setDepartments(response?.data?.data || []);
      setError('');
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to load departments.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

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
      navigate('/login');
    }
  };

  const columns = [
    {
      key: 'name',
      label: 'Department',
      renderCell: (row) => (
        <Box>
          <Typography sx={{ fontWeight: 700 }}>{row.name}</Typography>
          {row.description && (
            <Typography variant="body2" color="text.secondary" noWrap sx={{ maxWidth: 380 }}>
              {row.description}
            </Typography>
          )}
        </Box>
      ),
    },
    {
      key: 'code',
      label: 'Code',
      renderCell: (row) => (
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {row.code}
        </Typography>
      ),
    },
    {
      key: 'hrCount',
      label: 'HR Count',
      align: 'center',
      renderCell: (row) => (
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {row.hrCount ?? '—'}
        </Typography>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      renderCell: (row) => <StatusBadge status={row.status} />,
    },
  ];

  return (
    <AppLayout onLogout={handleLogout}>
      <Stack spacing={4}>
        <PageHeader
          title="Departments"
          subtitle="Create and manage departments for your hospital."
          actions={
            <Button variant="contained" startIcon={<AddRounded />} onClick={() => setCreateOpen(true)}>
              Create Department
            </Button>
          }
        />

        {message && <Alert severity="success">{message}</Alert>}
        {error && <Alert severity="error">{error}</Alert>}

        <Stack spacing={2}>
          <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6" sx={{ fontWeight: 700, fontSize: 18 }}>
              All Departments
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
              {loading ? '…' : `${departments.length} total`}
            </Typography>
          </Stack>

          <DataTable
            columns={columns}
            rows={departments}
            getRowKey={(row) => row._id}
            loading={loading}
            emptyIcon={ApartmentRounded}
            emptyTitle="No departments yet"
            emptyDescription="Create your first department to start building your HR team."
            renderActions={(row) => (
              <Button size="small" variant="outlined" onClick={() => navigate(`/departments/${row._id}`)}>
                View Department
              </Button>
            )}
          />
        </Stack>
      </Stack>

      <CreateDepartmentModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSuccess={async () => {
          setCreateOpen(false);
          setMessage('Department created successfully.');
          await fetchDepartments();
        }}
      />
    </AppLayout>
  );
};

export default Departments;