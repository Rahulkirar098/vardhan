import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Box, Button, Stack, Typography } from '@mui/material';
import { AddRounded, ApartmentRounded } from '@mui/icons-material';
import department from '../../services/department';
import auth from '../../services/auth';
import AppLayout from '../../components/AppLayout';
import PageHeader from '../../components/PageHeader';
import StatusBadge from '../../components/StatusBadge';
import DataTable from '../../components/DataTable';
import CreateDepartmentModal from './components/CreateDepartmentModal';

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