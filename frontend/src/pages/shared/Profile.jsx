import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Box, Stack } from '@mui/material';
import auth from '../../services/auth.service';
import AppLayout from '../../components/AppLayout';
import PageHeader from '../../components/PageHeader';
import SectionCard from '../../components/SectionCard';
import InitialsAvatar from '../../components/InitialsAvatar';
import InfoRow from '../../components/InfoRow';
import StatusBadge from '../../components/StatusBadge';
import { getRoleDisplayName } from '../../components/sidebar.config';

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
        setError('');
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
      <Stack spacing={4} sx={{ maxWidth: 760 }}>
        <PageHeader title="My Profile" subtitle="View your account details." />

        {error && !profile && <Alert severity="error">{error}</Alert>}

        <SectionCard>
          {loading ? (
            <Alert severity="info">Loading profile…</Alert>
          ) : (
            <Stack spacing={2.5}>
              <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
                <InitialsAvatar name={profile?.name} size={48} />
                <Box sx={{ minWidth: 0 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                    <Box component="span" sx={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em' }}>
                      {profile?.name || 'User'}
                    </Box>
                    <StatusBadge status={profile?.status} />
                  </Box>
                  <Box component="span" sx={{ color: 'text.secondary', fontSize: '0.85rem' }}>
                    {getRoleDisplayName(profile?.role)} · {profile?.email}
                  </Box>
                </Box>
              </Stack>

              <Box>
                <InfoRow label="Email" value={profile?.email} />
                <InfoRow label="Phone" value={profile?.phone} />
                <InfoRow label="Role" value={getRoleDisplayName(profile?.role)} />
                <InfoRow label="Status" value={profile?.status ? profile.status.charAt(0).toUpperCase() + profile.status.slice(1) : 'Active'} />
              </Box>
            </Stack>
          )}
        </SectionCard>
      </Stack>
    </AppLayout>
  );
};

export default Profile;