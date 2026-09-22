import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Divider,
  Grid,
  IconButton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import {
  EditRounded,
  KeyRounded,
  LockResetRounded,
  SaveRounded,
} from '@mui/icons-material';
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

  // Edit details state
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [profileSuccessMsg, setProfileSuccessMsg] = useState('');
  const [profileErrorMsg, setProfileErrorMsg] = useState('');

  // Change password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordSuccessMsg, setPasswordSuccessMsg] = useState('');
  const [passwordErrorMsg, setPasswordErrorMsg] = useState('');

  const fetchProfile = async () => {
    try {
      const response = await auth.me();
      const userData = response?.data?.data || null;
      setProfile(userData);
      if (userData) {
        setEditName(userData.name || '');
        setEditPhone(userData.phone || '');
      }
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

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    try {
      setUpdatingProfile(true);
      setProfileErrorMsg('');
      setProfileSuccessMsg('');

      const res = await auth.updateProfile({
        name: editName.trim(),
        phone: editPhone.trim(),
      });

      setProfileSuccessMsg('Profile updated successfully.');
      setProfile(res?.data?.data);
      if (res?.data?.data?.name) {
        localStorage.setItem('userName', res.data.data.name);
      }
      setIsEditing(false);
    } catch (err) {
      setProfileErrorMsg(err?.response?.data?.message || 'Unable to update profile.');
    } finally {
      setUpdatingProfile(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordErrorMsg('');
    setPasswordSuccessMsg('');

    if (newPassword.length < 6) {
      setPasswordErrorMsg('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordErrorMsg('New password and confirm password do not match.');
      return;
    }

    try {
      setChangingPassword(true);
      const res = await auth.changePassword({
        currentPassword,
        newPassword,
      });

      setPasswordSuccessMsg(res?.data?.message || 'Password changed successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPasswordErrorMsg(err?.response?.data?.message || 'Failed to change password.');
    } finally {
      setChangingPassword(false);
    }
  };

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
        <PageHeader title="My Profile" subtitle="View and manage your personal account settings." />

        {error && !profile && <Alert severity="error">{error}</Alert>}

        {/* Account Details Card */}
        <SectionCard>
          {loading ? (
            <Alert severity="info">Loading profile…</Alert>
          ) : (
            <Stack spacing={2.5}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
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

                <Button
                  size="small"
                  variant={isEditing ? 'outlined' : 'contained'}
                  startIcon={<EditRounded />}
                  onClick={() => {
                    setIsEditing(!isEditing);
                    setProfileErrorMsg('');
                    setProfileSuccessMsg('');
                  }}
                  sx={{ textTransform: 'none', fontWeight: 600 }}
                >
                  {isEditing ? 'Cancel' : 'Edit Details'}
                </Button>
              </Stack>

              {profileSuccessMsg && <Alert severity="success">{profileSuccessMsg}</Alert>}
              {profileErrorMsg && <Alert severity="error">{profileErrorMsg}</Alert>}

              {isEditing ? (
                <Box component="form" onSubmit={handleUpdateProfile} sx={{ pt: 1 }}>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        label="Full Name"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        fullWidth
                        size="small"
                        required
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        label="Phone Number"
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                        fullWidth
                        size="small"
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <Button
                        type="submit"
                        variant="contained"
                        startIcon={<SaveRounded />}
                        disabled={updatingProfile}
                        sx={{ fontWeight: 600 }}
                      >
                        {updatingProfile ? 'Saving…' : 'Save Changes'}
                      </Button>
                    </Grid>
                  </Grid>
                </Box>
              ) : (
                <Box>
                  <InfoRow label="Email" value={profile?.email} />
                  <InfoRow label="Phone" value={profile?.phone || 'Not provided'} />
                  <InfoRow label="Role" value={getRoleDisplayName(profile?.role)} />
                  {profile?.positionName && <InfoRow label="Position" value={profile.positionName} />}
                  {profile?.hospitalName && <InfoRow label="Hospital" value={profile.hospitalName} />}
                  <InfoRow
                    label="Status"
                    value={
                      profile?.status
                        ? profile.status.charAt(0).toUpperCase() + profile.status.slice(1)
                        : 'Active'
                    }
                  />
                </Box>
              )}
            </Stack>
          )}
        </SectionCard>

        {/* Change Password Card */}
        <SectionCard>
          <Stack spacing={2.5}>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <KeyRounded color="primary" />
              <Typography variant="h6" fontWeight={750}>
                Change Password
              </Typography>
            </Stack>

            <Typography variant="body2" color="text.secondary">
              Update your account password. Must be at least 6 characters.
            </Typography>

            {passwordSuccessMsg && <Alert severity="success">{passwordSuccessMsg}</Alert>}
            {passwordErrorMsg && <Alert severity="error">{passwordErrorMsg}</Alert>}

            <Box component="form" onSubmit={handleChangePassword}>
              <Stack spacing={2}>
                <TextField
                  label="Current Password"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  fullWidth
                  size="small"
                  required
                />

                <TextField
                  label="New Password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  fullWidth
                  size="small"
                  required
                  helperText="Minimum 6 characters"
                />

                <TextField
                  label="Confirm New Password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  fullWidth
                  size="small"
                  required
                />

                <Box sx={{ pt: 1 }}>
                  <Button
                    type="submit"
                    variant="contained"
                    startIcon={<LockResetRounded />}
                    disabled={changingPassword || !currentPassword || !newPassword}
                    sx={{ fontWeight: 600 }}
                  >
                    {changingPassword ? 'Updating Password…' : 'Update Password'}
                  </Button>
                </Box>
              </Stack>
            </Box>
          </Stack>
        </SectionCard>
      </Stack>
    </AppLayout>
  );
};

export default Profile;