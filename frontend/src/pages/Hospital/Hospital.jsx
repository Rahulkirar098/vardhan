import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Box, Button, Chip, Stack, Typography } from '@mui/material';
import { ArrowForwardRounded } from '@mui/icons-material';
import hospitalService from '../../services/hospital';
import department from '../../services/department';
import hr from '../../services/hr';
import auth from '../../services/auth';
import GlassCard from '../../components/GlassCard';
import AppLayout from '../../components/AppLayout';
import DashboardSkeleton from '../../components/loading/DashboardSkeleton';

const formatStatus = (status) => {
  if (!status) return 'Active';
  return String(status).charAt(0).toUpperCase() + String(status).slice(1);
};

const Hospital = () => {
  const navigate = useNavigate();
  const [hospital, setHospital] = useState(null);
  const [stats, setStats] = useState({ departmentCount: 0, hrCount: 0 });
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchHospital = async () => {
      try {
        const overviewResponse = await hospitalService.getOverview().catch((err) => err?.response || null);
        const overviewData = overviewResponse?.data?.data;

        if (overviewData?.hospital) {
          setHospital(overviewData.hospital);
          setStats(overviewData.stats || { departmentCount: 0, hrCount: 0 });
          setDepartments(Array.isArray(overviewData.departments) ? overviewData.departments : []);
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
      } catch (err) {
        setError(err?.response?.data?.message || 'Unable to load hospital information.');
      } finally {
        setLoading(false);
      }
    };

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
  const summaryCards = [
    { label: 'Departments', value: stats.departmentCount ?? departments.length, status: 'Active' },
    { label: 'HR Count', value: stats.hrCount ?? 0, status: 'Active' },
    { label: 'Status', value: formatStatus(hospital?.status), status: formatStatus(hospital?.status) },
  ];

  return (
    <AppLayout onLogout={handleLogout}>
      {loading ? (
        <DashboardSkeleton role="admin" />
      ) : (
        <Stack spacing={3.5}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700, letterSpacing: '-0.03em' }}>
              Hospital
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mt: 0.75 }}>
              Manage your hospital information and departments.
            </Typography>
          </Box>

          {error && <Alert severity="error">{error}</Alert>}

          {!hospital ? (
            <GlassCard sx={{ p: 3 }}>
              <Stack spacing={2}>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                  Set up your hospital
                </Typography>
                <Typography color="text.secondary">
                  Create your hospital profile to start managing departments and HR teams.
                </Typography>
                <Button variant="contained" onClick={() => navigate('/hospital/create')} sx={{ alignSelf: 'flex-start' }}>
                  Create Hospital
                </Button>
              </Stack>
            </GlassCard>
          ) : (
            <>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, minmax(0, 1fr))' },
                  gap: 2.5,
                }}
              >
                {summaryCards.map((card) => (
                  <GlassCard key={card.label} sx={{ p: 2.5, height: '100%', display: 'flex' }}>
                    <Stack spacing={1} sx={{ width: '100%' }}>
                      <Typography variant="caption" color="text.secondary">
                        {card.label}
                      </Typography>
                      <Typography variant="h5" sx={{ fontWeight: 700 }}>
                        {card.value}
                      </Typography>
                      <Chip
                        label={card.status}
                        size="small"
                        sx={{
                          width: 'fit-content',
                          backgroundColor: '#000000',
                          color: '#FFFFFF',
                          borderRadius: 2,
                        }}
                      />
                    </Stack>
                  </GlassCard>
                ))}
              </Box>

              <GlassCard sx={{ p: { xs: 2.5, md: 3 } }}>
                <Stack spacing={2.5}>
                  <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    justifyContent="space-between"
                    alignItems={{ xs: 'flex-start', sm: 'center' }}
                    flexWrap="wrap"
                    gap={1}
                  >
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                      Hospital Information
                    </Typography>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => navigate('/hospital/edit', { state: { editMode: true } })}
                    >
                      Edit Hospital
                    </Button>
                  </Stack>
                  <Typography variant="h5" sx={{ fontWeight: 700 }}>
                    {hospital.name}
                  </Typography>
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: { xs: '1fr', sm: '180px 1fr' },
                      rowGap: 1.5,
                      columnGap: 2,
                    }}
                  >
                    <Typography color="text.secondary">Hospital Code</Typography>
                    <Typography sx={{ fontWeight: 600 }}>{hospital.code || 'N/A'}</Typography>
                    <Typography color="text.secondary">Location</Typography>
                    <Typography sx={{ fontWeight: 600 }}>{location}</Typography>
                    <Typography color="text.secondary">Phone</Typography>
                    <Typography sx={{ fontWeight: 600 }}>{hospital.contact?.phone || 'N/A'}</Typography>
                    <Typography color="text.secondary">Email</Typography>
                    <Typography sx={{ fontWeight: 600 }}>{hospital.contact?.email || 'N/A'}</Typography>
                    <Typography color="text.secondary">Registration No.</Typography>
                    <Typography sx={{ fontWeight: 600 }}>{hospital.registrationNumber || 'N/A'}</Typography>
                    <Typography color="text.secondary">Status</Typography>
                    <Typography sx={{ fontWeight: 600 }}>{formatStatus(hospital.status)}</Typography>
                  </Box>
                </Stack>
              </GlassCard>

              <Stack spacing={2.5}>
                <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={1.5}>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    Departments
                  </Typography>
                  <Button variant="contained" onClick={() => navigate('/departments')}>
                    Create Department
                  </Button>
                </Stack>

                {departments.length === 0 ? (
                  <GlassCard sx={{ p: 3 }}>
                    <Typography color="text.secondary">No departments created yet.</Typography>
                  </GlassCard>
                ) : (
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(3, minmax(0, 1fr))' },
                      gap: 2.5,
                    }}
                  >
                    {departments.map((department) => (
                      <GlassCard key={department._id} sx={{ p: 2.5, height: '100%', display: 'flex' }}>
                        <Stack spacing={1.25} sx={{ width: '100%' }}>
                          <Typography variant="h6" sx={{ fontWeight: 700 }}>
                            {department.name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {department.code}
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {department.hrCount ?? 0} HRs
                          </Typography>
                          <Chip
                            label={formatStatus(department.status)}
                            size="small"
                            sx={{ width: 'fit-content', backgroundColor: '#000000', color: '#FFFFFF', borderRadius: 2 }}
                          />
                          <Button
                            variant="text"
                            endIcon={<ArrowForwardRounded />}
                            onClick={() => navigate(`/departments/${department._id}`)}
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
    </AppLayout>
  );
};

export default Hospital;
