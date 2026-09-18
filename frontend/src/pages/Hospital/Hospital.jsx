import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Stack, Typography } from '@mui/material';
import { ArrowForwardRounded, EditRounded, LocalHospitalRounded } from '@mui/icons-material';
import hospitalService from '../../services/hospital';
import CreateHospitalModal from './components/CreateHospitalModal';
import EditHospitalModal from './components/EditHospitalModal';
import department from '../../services/department';
import hr from '../../services/hr';
import auth from '../../services/auth';
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

const formatStatus = (status) => {
  if (!status) return 'Active';
  return String(status).charAt(0).toUpperCase() + String(status).slice(1);
};

const Hospital = () => {
  const navigate = useNavigate();
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [hospital, setHospital] = useState(null);
  const [stats, setStats] = useState({ departmentCount: 0, hrCount: 0 });
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchHospital = async () => {
    try {
      setLoading(true);
      const overviewResponse = await hospitalService.getOverview().catch((err) => err?.response || null);
      const overviewData = overviewResponse?.data?.data;

      if (overviewData?.hospital) {
        setHospital(overviewData.hospital);
        setStats(overviewData.stats || { departmentCount: 0, hrCount: 0 });
        setDepartments(Array.isArray(overviewData.departments) ? overviewData.departments : []);
        setError('');
        return;
      }

      const [hospitalResponse, departmentsResponse, hrResponse] = await Promise.all([
        hospitalService.getMyHospital().catch(() => ({ data: { data: null } })),
        department.getAll().catch(() => ({ data: { data: [] } })),
        hr.getAll().catch(() => ({ data: { data: [] } })),
      ]);

      const hospitalData = hospitalResponse?.data?.data || null;
      const departmentList = Array.isArray(departmentsResponse?.data?.data) ? departmentsResponse.data.data : [];
      const hrData = hrResponse?.data?.data;
      const hrCount = Array.isArray(hrData) ? hrData.length : hrData ? 1 : 0;

      setHospital(hospitalData);
      setDepartments(departmentList);
      setStats({
        departmentCount: departmentList.length,
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
            subtitle="Manage your hospital information and departments."
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
                description="Create your hospital profile to start managing departments and HR teams."
                actionLabel="Create Hospital"
                onAction={() => setCreateOpen(true)}
              />
            </GlassCard>
          ) : (
            <>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(3, minmax(0, 1fr))' },
                  gap: 2.5,
                }}
              >
                <StatCard
                  label="Departments"
                  value={stats.departmentCount ?? departments.length}
                  footer={<StatusBadge status="active" label="Live" />}
                />
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

              <Stack spacing={2.5}>
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={1.5}
                  sx={{ justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' } }}
                >
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 700, fontSize: 18 }}>
                      Departments
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {departments.length} department{departments.length === 1 ? '' : 's'} in your hospital
                    </Typography>
                  </Box>
                  <Button variant="contained" onClick={() => navigate('/departments')}>
                    Create Department
                  </Button>
                </Stack>

                {departments.length === 0 ? (
                  <GlassCard sx={{ p: 3 }}>
                    <EmptyState
                      title="No departments yet"
                      description="Create your first department to start building your HR team."
                      actionLabel="Create Department"
                      onAction={() => navigate('/departments')}
                    />
                  </GlassCard>
                ) : (
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(3, minmax(0, 1fr))' },
                      gap: 2.5,
                    }}
                  >
                    {departments.map((departmentItem) => (
                      <GlassCard key={departmentItem._id} sx={{ p: 2.5, height: '100%', display: 'flex' }}>
                        <Stack spacing={1.25} sx={{ width: '100%' }}>
                          <Typography variant="h6" sx={{ fontWeight: 700 }}>
                            {departmentItem.name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {departmentItem.code}
                          </Typography>
                          <Box>
                            <StatusBadge status={departmentItem.status} />
                          </Box>
                          <Button
                            variant="text"
                            size="small"
                            endIcon={<ArrowForwardRounded fontSize="small" />}
                            onClick={() => navigate(`/departments/${departmentItem._id}`)}
                            sx={{ alignSelf: 'flex-start', px: 0, mt: 'auto' }}
                          >
                            View Department
                          </Button>
                        </Stack>
                      </GlassCard>
                    ))}
                  </Box>
                )}
              </Stack>
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