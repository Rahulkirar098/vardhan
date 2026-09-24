import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Paper,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import {
  CloseRounded,
  EditRounded,
  KeyRounded,
  LockResetRounded,
  PersonRounded,
  SaveRounded,
} from '@mui/icons-material';
import auth from '../../services/auth.service';
import AppLayout from '../../components/AppLayout';
import InitialsAvatar from '../../components/InitialsAvatar';
import { hasPermission, PERMISSIONS } from '../../utils/permissions';

/**
 * Formats ISO date to readable string (e.g., '12 Jan 2022')
 */
const formatJoinedDate = (dateStr) => {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
};

/**
 * Returns dynamic list of accessible modules dynamically based on user's actual permissions and modules
 */
const getAccessibleModules = (role, userPermissions = [], userModules = []) => {
  if (role === 'super_admin') {
    return ['Dashboard', 'Hospitals'];
  }

  if (role === 'admin') {
    return [
      'Dashboard',
      'Hospital',
      'Structure',
      'Positions',
      'Employees',
      'Leave Management',
      'Access Management',
    ];
  }

  const modules = [];

  // Core platform / dashboard
  if (Array.isArray(userModules) && userModules.includes('core')) {
    modules.push('Dashboard');
  }

  // Hospital View
  if (hasPermission(PERMISSIONS.HOSPITAL_VIEW, role, userPermissions)) {
    modules.push('Hospital');
  }

  // Hospital Structure View
  if (hasPermission(PERMISSIONS.STRUCTURE_VIEW, role, userPermissions)) {
    modules.push('Structure');
  }

  // Position Management View
  if (hasPermission(PERMISSIONS.POSITION_VIEW, role, userPermissions)) {
    modules.push('Positions');
  }

  // HRMS Module permissions
  const effectiveModules = Array.isArray(userModules) ? userModules : [];
  if (effectiveModules.includes('hrms')) {
    if (hasPermission(PERMISSIONS.EMPLOYEE_VIEW, role, userPermissions)) {
      modules.push('Employees');
    }

    const hasLeave = [
      PERMISSIONS.LEAVE_APPLY,
      PERMISSIONS.LEAVE_VIEW_OWN,
      PERMISSIONS.LEAVE_VIEW,
      PERMISSIONS.LEAVE_APPROVE,
      PERMISSIONS.LEAVE_MANAGE,
    ].some((p) => hasPermission(p, role, userPermissions));

    if (hasLeave) {
      modules.push('Leave Management');
    }
  }

  // Access Management View
  if (hasPermission(PERMISSIONS.ACCESS_VIEW, role, userPermissions)) {
    modules.push('Access Management');
  }

  // If no specific module was added yet for employee, default to Self-Service Dashboard
  if (modules.length === 0) {
    modules.push('Dashboard');
  }

  return Array.from(new Set(modules));
};

const Profile = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  // Edit Profile & Change Password Modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState(0); // 0 = Personal Details, 1 = Change Password

  // Edit personal details form state
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [profileSuccessMsg, setProfileSuccessMsg] = useState('');
  const [profileErrorMsg, setProfileErrorMsg] = useState('');

  // Change password form state
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

  const handleOpenEditModal = (initialTab = 0) => {
    setEditName(profile?.name || '');
    setEditPhone(profile?.phone || '');
    setProfileErrorMsg('');
    setProfileSuccessMsg('');
    setPasswordErrorMsg('');
    setPasswordSuccessMsg('');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setModalTab(initialTab);
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    if (updatingProfile || changingPassword) return;
    setIsEditModalOpen(false);
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (!editName.trim()) {
      setProfileErrorMsg('Full name cannot be empty.');
      return;
    }

    try {
      setUpdatingProfile(true);
      setProfileErrorMsg('');
      setProfileSuccessMsg('');

      const res = await auth.updateProfile({
        name: editName.trim(),
        phone: editPhone.trim(),
      });

      setProfileSuccessMsg('Profile details updated successfully.');
      setProfile((prev) => ({
        ...prev,
        ...res?.data?.data,
        name: editName.trim(),
        phone: editPhone.trim(),
      }));
      if (editName.trim()) {
        localStorage.setItem('userName', editName.trim());
      }
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
      localStorage.removeItem('userId');
      localStorage.removeItem('role');
      localStorage.removeItem('userName');
      localStorage.removeItem('userEmail');
      localStorage.removeItem('positionName');
      localStorage.removeItem('permissions');
      localStorage.removeItem('modules');
      localStorage.removeItem('hospitalId');
      localStorage.removeItem('employeeId');
      navigate('/login');
    }
  };

  const accessibleModules = useMemo(() => {
    if (!profile) return [];
    return getAccessibleModules(
      profile.role,
      profile.permissions,
      profile.modules
    );
  }, [profile]);

  const displayPosition =
    profile?.positionName ||
    (profile?.role === 'admin'
      ? 'HR Manager'
      : profile?.role === 'super_admin'
      ? 'Super Administrator'
      : 'Staff');

  return (
    <AppLayout onLogout={handleLogout}>
      <Box sx={{ width: '100%', maxWidth: 1200, mx: 'auto', p: { xs: 1, sm: 2, md: 3 } }}>
        {/* Page Header */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            mb: 3.5,
          }}
        >
          <Box>
            <Typography
              variant="h4"
              sx={{
                fontWeight: 800,
                color: '#0B132B',
                fontSize: { xs: '1.45rem', sm: '1.75rem' },
                letterSpacing: '-0.02em',
                mb: 0.5,
              }}
            >
              My Profile
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: '#64748B',
                fontSize: { xs: '0.85rem', sm: '0.925rem' },
              }}
            >
              Your personal details, account, and module access.
            </Typography>
          </Box>

          <Button
            variant="contained"
            startIcon={<EditRounded />}
            onClick={() => handleOpenEditModal(0)}
            sx={{
              textTransform: 'none',
              fontWeight: 700,
              fontSize: '0.9rem',
              borderRadius: '8px',
              px: 2.5,
              py: 0.9,
              backgroundColor: '#0F172A',
              color: '#FFFFFF',
              boxShadow: 'none',
              '&:hover': { backgroundColor: '#1E293B', boxShadow: 'none' },
            }}
          >
            Edit Profile
          </Button>
        </Box>

        {error && !profile && (
          <Alert severity="error" sx={{ mb: 3, borderRadius: '10px' }}>
            {error}
          </Alert>
        )}

        {profileSuccessMsg && (
          <Alert
            severity="success"
            onClose={() => setProfileSuccessMsg('')}
            sx={{ mb: 3, borderRadius: '10px' }}
          >
            {profileSuccessMsg}
          </Alert>
        )}

        {/* 2-Card Layout side-by-side using CSS Grid */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              md: '320px 1fr',
              lg: '340px 1fr',
            },
            gap: 3,
            alignItems: 'start',
          }}
        >
          {/* Left Card: Profile Identity */}
          <Paper
            elevation={0}
            sx={{
              p: { xs: 3, sm: 3.5 },
              borderRadius: '16px',
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            }}
          >
            {/* Centered Avatar, Name, Position, Status */}
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                pt: 1,
              }}
            >
              <InitialsAvatar
                name={profile?.name}
                size={88}
                sx={{
                  backgroundColor: '#0F172A',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  fontSize: '1.75rem',
                  boxShadow: '0 4px 12px rgba(15,23,42,0.08)',
                }}
              />

              <Typography
                variant="h6"
                sx={{
                  fontWeight: 800,
                  fontSize: '1.25rem',
                  color: '#0F172A',
                  mt: 2.25,
                  mb: 0.25,
                }}
              >
                {profile?.name || 'User'}
              </Typography>

              <Typography
                variant="body2"
                sx={{
                  color: '#64748B',
                  fontWeight: 500,
                  fontSize: '0.9rem',
                  mb: 1.5,
                }}
              >
                {displayPosition}
              </Typography>

              {/* Status Pill */}
              <Box
                sx={{
                  px: 1.75,
                  py: 0.35,
                  borderRadius: '999px',
                  backgroundColor: '#E6F4EA',
                  color: '#137333',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  letterSpacing: 0.2,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {profile?.status ? profile.status.charAt(0).toUpperCase() + profile.status.slice(1) : 'Active'}
              </Box>
            </Box>

            <Divider sx={{ my: 3.5, borderColor: '#F1F5F9' }} />

            {/* Bottom Meta Information (Employee ID, System role, Joined) */}
            <Stack spacing={2} sx={{ width: '100%' }}>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <Typography variant="body2" sx={{ color: '#64748B', fontWeight: 500 }}>
                  Employee ID
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 800, color: '#0F172A' }}>
                  {profile?.employeeCode || (profile?.employeeId ? String(profile.employeeId).slice(-6).toUpperCase() : 'VHM-1000')}
                </Typography>
              </Box>

              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <Typography variant="body2" sx={{ color: '#64748B', fontWeight: 500 }}>
                  System role
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 800, color: '#0F172A' }}>
                  {profile?.role || 'admin'}
                </Typography>
              </Box>

              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <Typography variant="body2" sx={{ color: '#64748B', fontWeight: 500 }}>
                  Joined
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 800, color: '#0F172A' }}>
                  {formatJoinedDate(profile?.dateOfJoining || profile?.createdAt)}
                </Typography>
              </Box>
            </Stack>
          </Paper>

          {/* Right Card: Personal details + Module access */}
          <Paper
            elevation={0}
            sx={{
              p: { xs: 3, sm: 4 },
              borderRadius: '16px',
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            }}
          >
            {/* Section 1: Personal details */}
            <Typography
              variant="h6"
              sx={{
                fontWeight: 800,
                fontSize: '1.2rem',
                color: '#0F172A',
                mb: 3,
              }}
            >
              Personal details
            </Typography>

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                columnGap: 3.5,
                rowGap: 2.75,
              }}
            >
              {/* Full name input field */}
              <Box>
                <Typography
                  variant="caption"
                  sx={{
                    color: '#0F172A',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    display: 'block',
                    mb: 0.85,
                  }}
                >
                  Full name
                </Typography>
                <TextField
                  value={profile?.name || ''}
                  disabled
                  fullWidth
                  size="small"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '8px',
                      backgroundColor: '#FFFFFF',
                      '& fieldset': {
                        borderColor: '#E2E8F0',
                      },
                    },
                    '& .MuiInputBase-input': {
                      fontSize: '0.925rem',
                      fontWeight: 500,
                      color: '#0F172A',
                      py: 1.15,
                    },
                  }}
                />
              </Box>

              {/* Email input field */}
              <Box>
                <Typography
                  variant="caption"
                  sx={{
                    color: '#0F172A',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    display: 'block',
                    mb: 0.85,
                  }}
                >
                  Email
                </Typography>
                <TextField
                  value={profile?.email || ''}
                  disabled
                  fullWidth
                  size="small"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '8px',
                      backgroundColor: '#FAFAFA',
                      '& fieldset': {
                        borderColor: '#E2E8F0',
                      },
                    },
                    '& .MuiInputBase-input': {
                      fontSize: '0.925rem',
                      fontWeight: 500,
                      color: '#64748B',
                      py: 1.15,
                    },
                  }}
                />
              </Box>

              {/* Phone input field */}
              <Box>
                <Typography
                  variant="caption"
                  sx={{
                    color: '#0F172A',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    display: 'block',
                    mb: 0.85,
                  }}
                >
                  Phone
                </Typography>
                <TextField
                  value={profile?.phone || '—'}
                  disabled
                  fullWidth
                  size="small"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '8px',
                      backgroundColor: '#FFFFFF',
                      '& fieldset': {
                        borderColor: '#E2E8F0',
                      },
                    },
                    '& .MuiInputBase-input': {
                      fontSize: '0.925rem',
                      fontWeight: 500,
                      color: '#0F172A',
                      py: 1.15,
                    },
                  }}
                />
              </Box>
            </Box>

            {/* Section 2: Dynamic Module access */}
            <Box sx={{ mt: 4.5 }}>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 800,
                  fontSize: '1.15rem',
                  color: '#0F172A',
                  mb: 2,
                }}
              >
                Module access
              </Typography>

              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.25 }}>
                {accessibleModules.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    No module access assigned.
                  </Typography>
                ) : (
                  accessibleModules.map((mod) => (
                    <Box
                      key={mod}
                      sx={{
                        px: 1.85,
                        py: 0.6,
                        borderRadius: '999px',
                        backgroundColor: '#E6F4EA',
                        color: '#137333',
                        fontSize: '0.825rem',
                        fontWeight: 700,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        letterSpacing: 0.1,
                      }}
                    >
                      {mod}
                    </Box>
                  ))
                )}
              </Box>
            </Box>
          </Paper>
        </Box>

        {/* Edit Profile & Security Modal */}
        <Dialog
          open={isEditModalOpen}
          onClose={handleCloseEditModal}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: '16px',
              p: 1,
            },
          }}
        >
          <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800, color: '#0F172A' }}>
                Edit Profile
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Update your account details or change your password.
              </Typography>
            </Box>
            <IconButton onClick={handleCloseEditModal} size="small" disabled={updatingProfile || changingPassword}>
              <CloseRounded fontSize="small" />
            </IconButton>
          </DialogTitle>

          <Box sx={{ px: 3, borderBottom: 1, borderColor: '#F1F5F9' }}>
            <Tabs
              value={modalTab}
              onChange={(e, v) => setModalTab(v)}
              sx={{
                minHeight: 44,
                '& .MuiTab-root': {
                  textTransform: 'none',
                  fontWeight: 700,
                  fontSize: '0.875rem',
                  minHeight: 44,
                  py: 1,
                },
              }}
            >
              <Tab icon={<PersonRounded sx={{ fontSize: 18 }} />} iconPosition="start" label="Personal Details" />
              <Tab icon={<KeyRounded sx={{ fontSize: 18 }} />} iconPosition="start" label="Change Password" />
            </Tabs>
          </Box>

          <DialogContent sx={{ py: 3, px: 3 }}>
            {/* Tab 0: Personal Details Form */}
            {modalTab === 0 && (
              <Box component="form" onSubmit={handleUpdateProfile}>
                {profileSuccessMsg && (
                  <Alert severity="success" sx={{ mb: 2.5, borderRadius: '8px' }}>
                    {profileSuccessMsg}
                  </Alert>
                )}
                {profileErrorMsg && (
                  <Alert severity="error" sx={{ mb: 2.5, borderRadius: '8px' }}>
                    {profileErrorMsg}
                  </Alert>
                )}

                <Stack spacing={2.5}>
                  <Box>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: '#0F172A', display: 'block', mb: 0.75 }}>
                      Full Name
                    </Typography>
                    <TextField
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      fullWidth
                      size="small"
                      required
                      placeholder="e.g. Rahul Kirar"
                      autoFocus
                    />
                  </Box>

                  <Box>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: '#0F172A', display: 'block', mb: 0.75 }}>
                      Phone Number
                    </Typography>
                    <TextField
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      fullWidth
                      size="small"
                      placeholder="e.g. +91 98260 11223"
                    />
                  </Box>

                  <Box sx={{ pt: 1, display: 'flex', justifyContent: 'flex-end', gap: 1.5 }}>
                    <Button
                      variant="outlined"
                      onClick={handleCloseEditModal}
                      disabled={updatingProfile}
                      sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600 }}
                    >
                      Close
                    </Button>
                    <Button
                      type="submit"
                      variant="contained"
                      startIcon={<SaveRounded />}
                      disabled={updatingProfile}
                      sx={{
                        borderRadius: '8px',
                        textTransform: 'none',
                        fontWeight: 700,
                        backgroundColor: '#0F172A',
                        '&:hover': { backgroundColor: '#1E293B' },
                      }}
                    >
                      {updatingProfile ? 'Saving…' : 'Save Details'}
                    </Button>
                  </Box>
                </Stack>
              </Box>
            )}

            {/* Tab 1: Change Password Form */}
            {modalTab === 1 && (
              <Box component="form" onSubmit={handleChangePassword}>
                {passwordSuccessMsg && (
                  <Alert severity="success" sx={{ mb: 2.5, borderRadius: '8px' }}>
                    {passwordSuccessMsg}
                  </Alert>
                )}
                {passwordErrorMsg && (
                  <Alert severity="error" sx={{ mb: 2.5, borderRadius: '8px' }}>
                    {passwordErrorMsg}
                  </Alert>
                )}

                <Stack spacing={2.5}>
                  <Box>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: '#0F172A', display: 'block', mb: 0.75 }}>
                      Current Password
                    </Typography>
                    <TextField
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      fullWidth
                      size="small"
                      required
                    />
                  </Box>

                  <Box>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: '#0F172A', display: 'block', mb: 0.75 }}>
                      New Password
                    </Typography>
                    <TextField
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      fullWidth
                      size="small"
                      required
                      helperText="Minimum 6 characters"
                    />
                  </Box>

                  <Box>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: '#0F172A', display: 'block', mb: 0.75 }}>
                      Confirm New Password
                    </Typography>
                    <TextField
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      fullWidth
                      size="small"
                      required
                    />
                  </Box>

                  <Box sx={{ pt: 1, display: 'flex', justifyContent: 'flex-end', gap: 1.5 }}>
                    <Button
                      variant="outlined"
                      onClick={handleCloseEditModal}
                      disabled={changingPassword}
                      sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600 }}
                    >
                      Close
                    </Button>
                    <Button
                      type="submit"
                      variant="contained"
                      startIcon={<LockResetRounded />}
                      disabled={changingPassword || !currentPassword || !newPassword}
                      sx={{
                        borderRadius: '8px',
                        textTransform: 'none',
                        fontWeight: 700,
                        backgroundColor: '#0F172A',
                        '&:hover': { backgroundColor: '#1E293B' },
                      }}
                    >
                      {changingPassword ? 'Updating…' : 'Update Password'}
                    </Button>
                  </Box>
                </Stack>
              </Box>
            )}
          </DialogContent>
        </Dialog>
      </Box>
    </AppLayout>
  );
};

export default Profile;