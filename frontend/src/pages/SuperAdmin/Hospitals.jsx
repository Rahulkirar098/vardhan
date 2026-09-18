import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Box, Button, InputAdornment, Stack, TextField, Typography } from '@mui/material';
import { LocalHospitalRounded, SearchRounded, VisibilityRounded } from '@mui/icons-material';
import superAdmin from '../../services/superAdmin';
import auth from '../../services/auth';
import AppLayout from '../../components/AppLayout';
import PageHeader from '../../components/PageHeader';
import StatCard from '../../components/StatCard';
import StatusBadge from '../../components/StatusBadge';
import DataTable from '../../components/DataTable';

const formatDate = (dateString) => {
  if (!dateString) return '—';
  return new Date(dateString).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const Hospitals = () => {
  const navigate = useNavigate();
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchHospitals = async () => {
      try {
        const response = await superAdmin.getHospitals();
        setHospitals(response?.data?.data || []);
        setError('');
      } catch (err) {
        setError(err?.response?.data?.message || 'Unable to load hospitals.');
      } finally {
        setLoading(false);
      }
    };

    fetchHospitals();
  }, []);

  const activeCount = useMemo(
    () => hospitals.filter((hospital) => (hospital?.status || 'active') === 'active').length,
    [hospitals],
  );

  const filteredHospitals = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return hospitals;

    return hospitals.filter((hospital) => {
      const admin = hospital?.createdBy || {};

      return [
        hospital?.name,
        hospital?.code,
        admin?.name,
        admin?.email,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
  }, [hospitals, search]);

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

  const columns = [
    {
      key: 'name',
      label: 'Hospital',
      renderCell: (row) => (
        <Typography sx={{ fontWeight: 700 }}>{row?.name || '—'}</Typography>
      ),
    },
    {
      key: 'code',
      label: 'Code',
      renderCell: (row) => (
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {row?.code || '—'}
        </Typography>
      ),
    },
    {
      key: 'admin',
      label: 'Admin',
      renderCell: (row) => {
        const admin = row?.createdBy || {};

        if (!admin?.name && !admin?.email) return null;

        return (
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {admin?.name || 'Unknown Admin'}
            </Typography>
            {admin?.email && (
              <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
                {admin.email}
              </Typography>
            )}
          </Box>
        );
      },
    },
    {
      key: 'status',
      label: 'Status',
      renderCell: (row) => <StatusBadge status={row?.status} />,
    },
    {
      key: 'createdAt',
      label: 'Created',
      renderCell: (row) => (
        <Typography variant="body2" color="text.secondary">
          {formatDate(row?.createdAt)}
        </Typography>
      ),
    },
  ];

  return (
    <AppLayout onLogout={handleLogout}>
      <Stack spacing={4}>
        <PageHeader
          title="Hospitals"
          subtitle="Monitor hospitals across the platform."
        />

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(3, minmax(0, 1fr))' },
            gap: 2.5,
          }}
        >
          <StatCard label="Total Hospitals" value={hospitals.length} footer={<StatusBadge status="active" label="Registered" />} />
          <StatCard label="Active Hospitals" value={activeCount} footer={<StatusBadge status={activeCount ? 'active' : 'inactive'} label={activeCount ? 'Operational' : 'None'} />} />
          <StatCard
            label="Pending Setup"
            value={Math.max(hospitals.length - activeCount, 0)}
            footer={<StatusBadge status={hospitals.length - activeCount ? 'pending' : 'inactive'} label={hospitals.length - activeCount ? 'Needs attention' : 'None'} />}
          />
        </Box>

        <Box sx={{ maxWidth: 420 }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Search hospitals, codes or admin"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchRounded fontSize="small" sx={{ color: 'text.secondary' }} />
                  </InputAdornment>
                ),
              },
            }}
          />
        </Box>

        {error && <Alert severity="error">{error}</Alert>}

        <Stack spacing={2}>
          <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6" sx={{ fontWeight: 700, fontSize: 18 }}>
              All Hospitals
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
              {loading ? '…' : `${filteredHospitals.length} of ${hospitals.length}`}
            </Typography>
          </Stack>

          <DataTable
            columns={columns}
            rows={filteredHospitals}
            getRowKey={(row) => row?.id || row?._id}
            loading={loading}
            emptyIcon={LocalHospitalRounded}
            emptyTitle={search ? 'No matching hospitals' : 'No hospitals found'}
            emptyDescription={
              search
                ? 'Try a different hospital name, code or admin.'
                : 'Hospitals created by Admins will appear here.'
            }
            renderActions={(row) => (
              <Button
                size="small"
                variant="outlined"
                startIcon={<VisibilityRounded fontSize="small" />}
                onClick={() => navigate(`/super-admin/hospitals/${row?.id || row?._id}`)}
              >
                View
              </Button>
            )}
          />
        </Stack>
      </Stack>
    </AppLayout>
  );
};

export default Hospitals;