import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Box, Chip, Stack, Typography } from '@mui/material';
import auth from '../../services/auth';
import GlassCard from '../../components/GlassCard';
import AppLayout from '../../components/AppLayout';

const Profile = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await auth.me();
        setProfile(response?.data?.data || null);
      } catch (err) {
        setProfile({
          name: localStorage.getItem('userName') || 'User',
          email: localStorage.getItem('userEmail') || '',
          role: localStorage.getItem('role') || 'admin',
          status: 'active',
        });
        setError(err?.response?.data?.message || '');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
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

  return (
    <AppLayout onLogout={handleLogout}>
      <Stack spacing={3}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            My Profile
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mt: 0.75 }}>
            View your account details.
          </Typography>
        </Box>

        {error && !profile && <Alert severity="error">{error}</Alert>}

        <GlassCard sx={{ p: { xs: 2.5, md: 3 }, maxWidth: 720 }}>
          {loading ? (
            <Typography color="text.secondary">Loading profile...</Typography>
          ) : (
            <Stack spacing={2.5}>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                  {profile?.name || 'User'}
                </Typography>
                <Chip
                  label={profile?.role || 'admin'}
                  size="small"
                  sx={{ backgroundColor: '#000000', color: '#FFFFFF', borderRadius: 2 }}
                />
              </Stack>

              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: '160px 1fr' },
                  rowGap: 1.5,
                  columnGap: 2,
                }}
              >
                <Typography color="text.secondary">Email</Typography>
                <Typography sx={{ fontWeight: 600 }}>{profile?.email || 'Not provided'}</Typography>
                <Typography color="text.secondary">Phone</Typography>
                <Typography sx={{ fontWeight: 600 }}>{profile?.phone || 'Not provided'}</Typography>
                <Typography color="text.secondary">Role</Typography>
                <Typography sx={{ fontWeight: 600 }}>{profile?.role || 'admin'}</Typography>
                <Typography color="text.secondary">Status</Typography>
                <Typography sx={{ fontWeight: 600 }}>{profile?.status || 'active'}</Typography>
              </Box>
            </Stack>
          )}
        </GlassCard>
      </Stack>
    </AppLayout>
  );
};

export default Profile;
