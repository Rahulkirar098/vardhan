import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Card,
  Chip,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import superAdmin from '../../services/superAdmin';
import auth from '../../services/auth';
import GlassCard from '../../components/GlassCard';
import HospitalCard from '../../components/HospitalCard';
import HospitalCardSkeleton from '../../components/loading/HospitalCardSkeleton';
import AppLayout from '../../components/AppLayout';
import { getGreeting, getRoleSubtitle } from '../../utils/greeting';

const getCurrentUserName = () => localStorage.getItem('userName') || 'User';

const Hospitals = () => {
  const navigate = useNavigate();
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const userName = getCurrentUserName();

  useEffect(() => {
    const fetchHospitals = async () => {
      try {
        const response = await superAdmin.getHospitals();
        setHospitals(response?.data?.data || []);
      } catch (err) {
        setError(err?.response?.data?.message || 'Unable to load hospitals.');
      } finally {
        setLoading(false);
      }
    };

    fetchHospitals();
  }, []);

  const summaryCards = useMemo(() => {
    const activeHospitals = hospitals.filter((hospital) => (hospital?.status || 'active') === 'active').length;
    const uniqueAdmins = new Set(hospitals.map((hospital) => hospital?.createdBy?.email).filter(Boolean)).size;

    return [
      { label: 'Total Hospitals', value: hospitals.length },
      { label: 'Active Hospitals', value: activeHospitals },
      { label: 'Total Admins', value: uniqueAdmins },
      { label: 'Platform Coverage', value: `${hospitals.length ? 'Live' : 'None'}` },
    ];
  }, [hospitals]);

  const filteredHospitals = hospitals.filter((hospital) => {
    const admin = hospital?.createdBy || {};
    const query = search.trim().toLowerCase();

    if (!query) return true;

    return [
      hospital?.name,
      hospital?.code,
      admin?.name,
      admin?.email,
    ]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(query));
  });

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

  const formattedDate = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <AppLayout role="super_admin" onLogout={handleLogout}>
      <Stack spacing={3}>
          <GlassCard sx={{ p: { xs: 2.5, md: 4 } }}>
            <Stack spacing={1}>
              <Typography variant="h4" sx={{ fontWeight: 700, fontSize: { xs: 28, md: 34 } }}>
                {getGreeting(userName)}
              </Typography>
              <Typography variant="body1" color="text.secondary">
                {getRoleSubtitle('super_admin')}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                {formattedDate}
              </Typography>
            </Stack>
          </GlassCard>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', md: 'repeat(4, minmax(0, 1fr))' },
              gap: 2.5,
            }}
          >
            {summaryCards.map((card) => (
              <GlassCard key={card.label} sx={{ p: 2.5, height: '100%', transition: 'all 180ms ease', '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 12px 30px rgba(0,0,0,0.08)' } }}>
                <Stack spacing={1}>
                  <Typography variant="caption" color="text.secondary">{card.label}</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 700 }}>{card.value}</Typography>
                  <Chip label="Live" size="small" sx={{ width: 'fit-content', backgroundColor: '#000000', color: '#FFFFFF', borderRadius: 2 }} />
                </Stack>
              </GlassCard>
            ))}
          </Box>

          <Card sx={{ p: 2, borderRadius: 3, border: '1px solid rgba(0,0,0,0.08)', background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(12px)' }}>
            <TextField
              fullWidth
              size="small"
              label="Search hospitals, codes or admin"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </Card>

          {error && <Alert severity="error">{error}</Alert>}

          {loading ? (
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', md: 'repeat(3, minmax(0, 1fr))' },
                gap: 2.5,
              }}
            >
              {[1, 2, 3, 4, 5, 6].map((item) => (
                <HospitalCardSkeleton key={item} />
              ))}
            </Box>
          ) : filteredHospitals.length === 0 ? (
            <GlassCard sx={{ p: 4 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>No hospitals found.</Typography>
              <Typography color="text.secondary">Hospitals created by Admins will appear here.</Typography>
            </GlassCard>
          ) : (
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', md: 'repeat(3, minmax(0, 1fr))' },
                gap: 3,
              }}
            >
              {filteredHospitals.map((hospital) => (
                <HospitalCard
                  key={hospital?.id || hospital?._id}
                  hospital={hospital}
                  onView={(selectedHospital) => {
                    navigate(`/super-admin/hospitals/${selectedHospital?.id || selectedHospital?._id}`);
                  }}
                />
              ))}
            </Box>
          )}
        </Stack>
    </AppLayout>
  );
};

export default Hospitals;
