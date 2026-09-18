import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import department from '../../services/department';
import auth from '../../services/auth';
import AppLayout from '../../components/AppLayout';

const initialForm = {
  name: '',
  code: '',
  description: '',
};

const Departments = () => {
  const navigate = useNavigate();
  const [departments, setDepartments] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const fetchDepartments = async () => {
    try {
      setLoading(true);
      const response = await department.getAll();
      setDepartments(response?.data?.data || []);
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to load departments.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');

    if (!form.name || !form.code) {
      setError('Department name and code are required.');
      return;
    }

    try {
      setSubmitting(true);
      const response = await department.create({
        name: form.name.trim(),
        code: form.code.trim(),
        description: form.description.trim(),
      });

      setMessage(response?.data?.message || 'Department created successfully.');
      setForm(initialForm);
      await fetchDepartments();
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to create department.');
    } finally {
      setSubmitting(false);
    }
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
      navigate('/login');
    }
  };

  const DepartmentContent = () => (
    <Stack spacing={3}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            Departments
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mt: 0.75 }}>
            Create and manage departments for your hospital.
          </Typography>
        </Box>

        {message && <Alert severity="success">{message}</Alert>}
        {error && <Alert severity="error">{error}</Alert>}

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 5fr) minmax(0, 7fr)' },
            gap: 3,
          }}
        >
          <Card sx={{ p: { xs: 2, md: 3 }, borderRadius: 3, height: '100%' }}>
              <Box component="form" onSubmit={handleSubmit} noValidate>
                <Stack spacing={2.5}>
                  <TextField
                    label="Department Name"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    required
                  />
                  <TextField
                    label="Department Code"
                    name="code"
                    value={form.code}
                    onChange={handleChange}
                    required
                  />
                  <TextField
                    label="Description"
                    name="description"
                    value={form.description}
                    onChange={handleChange}
                    multiline
                    minRows={3}
                  />
                  <Button type="submit" variant="contained" disabled={submitting}>
                    {submitting ? <CircularProgress size={20} color="inherit" /> : 'Create Department'}
                  </Button>
                </Stack>
              </Box>
            </Card>

          <Card sx={{ p: { xs: 2, md: 3 }, borderRadius: 3, height: '100%' }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                Department List
              </Typography>

              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress />
                </Box>
              ) : departments.length === 0 ? (
                <Alert severity="info">No departments created yet.</Alert>
              ) : (
                <Stack spacing={2}>
                  {departments.map((department) => (
                    <Box
                      key={department._id}
                      sx={{
                        border: '1px solid rgba(0,0,0,0.08)',
                        borderRadius: 2,
                        p: 2,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: 2,
                        flexWrap: 'wrap',
                      }}
                    >
                      <Box>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                          {department.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Code: {department.code}
                        </Typography>
                        {department.description && (
                          <Typography variant="body2" color="text.secondary">
                            {department.description}
                          </Typography>
                        )}
                      </Box>

                      <Stack direction="row" spacing={1} alignItems="center">
                        <Chip
                          label={department.status || 'active'}
                          color={department.status === 'inactive' ? 'default' : 'success'}
                          size="small"
                        />
                        <Button size="small" variant="outlined" onClick={() => navigate(`/departments/${department._id}`)}>
                          View Department
                        </Button>
                      </Stack>
                    </Box>
                  ))}
                </Stack>
              )}
            </Card>
        </Box>
      </Stack>
  );

  return (
    <AppLayout onLogout={handleLogout}>
      <DepartmentContent />
    </AppLayout>
  );
};

export default Departments;
