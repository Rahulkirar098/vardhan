import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
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

const AcceptEmployeeInvitation = () => {
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
    try {
      setSubmitting(true);
      await employeeService.acceptInvitation(token, invitation.createLogin ? password : undefined);
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
        title="Employee Onboarding"
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
        subtitle="Your employee profile is now active."
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
            <Typography variant="body2" color="text.secondary">
              Your employee record has been activated at{' '}
              <strong>{invitation?.hospitalName || 'your hospital'}</strong>.
              Please contact your HR for next steps.
            </Typography>
          </Box>
        </Stack>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Employee Onboarding"
      subtitle="Confirm your invitation to join the hospital."
    >
      <Stack spacing={2.5}>
        {/* Invitation Card */}
        <Box
          sx={{
            border: '1px solid #E5E5E5',
            borderRadius: '12px',
            backgroundColor: '#FFFFFF',
            p: 2.5,
          }}
        >
          <Stack spacing={2}>
            {/* Name + Status */}
            <Stack
              direction="row"
              spacing={1.5}
              alignItems="center"
              justifyContent="space-between"
              flexWrap="wrap"
            >
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="h6" fontWeight={700}>
                  {invitation?.firstName} {invitation?.lastName}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {invitation?.email}
                </Typography>
              </Box>
              <StatusBadge status="pending" label="Invited" />
            </Stack>

            <Divider sx={{ borderColor: '#F0F0F0' }} />

            {/* Hospital */}
            <Stack direction="row" spacing={1} alignItems="center">
              <LocalHospitalRounded
                fontSize="small"
                sx={{ color: 'text.secondary' }}
              />
              <Typography variant="body2" color="text.secondary">
                <strong style={{ color: '#0A0A0A' }}>Hospital:</strong>{' '}
                {invitation?.hospitalName || 'Hospital'}
              </Typography>
            </Stack>

            {/* Position */}
            {(invitation?.positionId || invitation?.position) && (
              <Stack direction="row" spacing={1} alignItems="center">
                <BadgeRounded
                  fontSize="small"
                  sx={{ color: 'text.secondary' }}
                />
                <Typography variant="body2" color="text.secondary">
                  <strong style={{ color: '#0A0A0A' }}>Position:</strong>{' '}
                  {invitation?.positionId?.name || invitation?.positionId || invitation?.position}
                </Typography>
              </Stack>
            )}

            {/* Expiry */}
            {invitation?.expiresAt && (
              <Typography variant="caption" color="text.secondary">
                This invitation expires on{' '}
                {new Date(invitation.expiresAt).toLocaleDateString('en-IN', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                })}
              </Typography>
            )}
          </Stack>
        </Box>

        {invitation?.createLogin && (
          <TextField
            label="Create Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            fullWidth
            required
            helperText="Create a password to access Vardhan"
          />
        )}

        {error && <Alert severity="error">{error}</Alert>}

        <Button
          variant="contained"
          size="large"
          onClick={handleAccept}
          disabled={submitting || (invitation?.createLogin && !password)}
          fullWidth
          sx={{ fontWeight: 700, py: 1.5 }}
        >
          {submitting ? (
            <CircularProgress size={22} color="inherit" />
          ) : (
            'Accept & Complete Onboarding'
          )}
        </Button>

        <Typography
          variant="caption"
          color="text.secondary"
          align="center"
          sx={{ display: 'block' }}
        >
          By accepting, your employee profile will be activated at{' '}
          <strong>{invitation?.hospitalName || 'this hospital'}</strong>. 
          {invitation?.createLogin ? ' Your Vardhan login account will be created.' : ' No login account will be created at this time.'}
        </Typography>
      </Stack>
    </AuthLayout>
  );
};

export default AcceptEmployeeInvitation;
