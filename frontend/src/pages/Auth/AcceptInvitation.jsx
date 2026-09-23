import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  Stack,
  Typography,
  TextField,
} from '@mui/material';
import {
  BadgeRounded,
  CheckCircleRounded,
  LocalHospitalRounded,
} from '@mui/icons-material';
import employeeService from '../../services/employee.service';
import AuthLayout from '../../components/AuthLayout';
import StatusBadge from '../../components/StatusBadge';

const AcceptInvitation = () => {
  const { token } = useParams();
  const [invitation, setInvitation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    const fetchInvitation = async () => {
      try {
        const response = await employeeService.getInvitationByToken(token);
        setInvitation(response?.data?.data || null);
      } catch (err) {
        setError(
          err?.response?.data?.message ||
            'Invitation is invalid or has expired.',
        );
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchInvitation();
    }
  }, [token]);

  const handleAccept = async () => {
    setError('');
    if (!password) {
      setError('Please set a password for your Vardhan login account.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    try {
      setSubmitting(true);
      await employeeService.acceptInvitation(token, password);
      setAccepted(true);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          'Unable to complete your onboarding. The link may have expired.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <AuthLayout
        title="Staff Onboarding"
        subtitle="We are verifying your invitation…"
      >
        <Box sx={{ py: 4, display: 'flex', justifyContent: 'center' }}>
          <CircularProgress size={28} />
        </Box>
      </AuthLayout>
    );
  }

  if (error && !invitation) {
    return (
      <AuthLayout
        title="Invitation Unavailable"
        subtitle="Your invitation could not be verified."
      >
        <Alert severity="error">{error}</Alert>
      </AuthLayout>
    );
  }

  if (accepted) {
    return (
      <AuthLayout
        title="Welcome Aboard! 🎉"
        subtitle="Your staff profile is now active."
      >
        <Stack spacing={2.5}>
          <Box
            sx={{
              border: '1px solid #E5E5E5',
              borderRadius: '12px',
              backgroundColor: '#f0fdf4',
              p: 3,
              textAlign: 'center',
            }}
          >
            <CheckCircleRounded
              sx={{ fontSize: 56, color: 'success.main', mb: 1 }}
            />
            <Typography variant="h6" fontWeight={700} gutterBottom>
              Onboarding Complete
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Your account has been activated at{' '}
              <strong>{invitation?.hospitalName || 'your hospital'}</strong>.
              You can now sign in using your email and password.
            </Typography>
            <Button
              variant="contained"
              fullWidth
              component={Link}
              to="/login"
              size="large"
            >
              Go to Login
            </Button>
          </Box>
        </Stack>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Complete Your Onboarding"
      subtitle="Set your account password to get started."
    >
      <Stack spacing={2.5}>
        {error && <Alert severity="error">{error}</Alert>}

        {invitation && (
          <Box
            sx={{
              border: '1px solid #E5E5E5',
              borderRadius: '12px',
              backgroundColor: '#FAFAFA',
              p: 2.5,
            }}
          >
            <Stack spacing={1.5}>
              <Stack direction="row" spacing={1} alignItems="center">
                <LocalHospitalRounded
                  fontSize="small"
                  sx={{ color: 'text.secondary' }}
                />
                <Typography variant="body2" fontWeight={600}>
                  {invitation.hospitalName || 'Hospital'}
                </Typography>
              </Stack>

              <Divider />

              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
              >
                <Typography variant="caption" color="text.secondary">
                  Staff Member
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  {invitation.firstName} {invitation.lastName}
                </Typography>
              </Stack>

              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
              >
                <Typography variant="caption" color="text.secondary">
                  Email
                </Typography>
                <Typography variant="body2">{invitation.email}</Typography>
              </Stack>

              {invitation.positionName && (
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <Typography variant="caption" color="text.secondary">
                    Designation / Position
                  </Typography>
                  <Stack direction="row" spacing={0.5} alignItems="center">
                    <BadgeRounded
                      fontSize="small"
                      sx={{ color: 'text.secondary' }}
                    />
                    <Typography variant="body2" fontWeight={600}>
                      {invitation.positionName}
                    </Typography>
                  </Stack>
                </Stack>
              )}

              {invitation.employeeId && (
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <Typography variant="caption" color="text.secondary">
                    Staff Code
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{ fontFamily: 'monospace', fontWeight: 600 }}
                  >
                    {invitation.employeeId}
                  </Typography>
                </Stack>
              )}

              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
              >
                <Typography variant="caption" color="text.secondary">
                  Account Status
                </Typography>
                <StatusBadge status="pending" label="Pending Activation" />
              </Stack>
            </Stack>
          </Box>
        )}

        <TextField
          label="Create Login Password *"
          type="password"
          placeholder="At least 6 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          fullWidth
          required
          autoFocus
        />

        <Button
          variant="contained"
          size="large"
          onClick={handleAccept}
          disabled={submitting || !password}
          fullWidth
        >
          {submitting ? (
            <CircularProgress size={22} color="inherit" />
          ) : (
            'Complete Onboarding & Activate'
          )}
        </Button>
      </Stack>
    </AuthLayout>
  );
};

export default AcceptInvitation;
