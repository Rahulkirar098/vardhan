import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import hr from '../../services/hr.service';
import AuthLayout from '../../components/AuthLayout';
import StatusBadge from '../../components/StatusBadge';

const AcceptHRInvitation = () => {
  const navigate = useNavigate();
  const { token } = useParams();
  const [invitation, setInvitation] = useState(null);
  const [form, setForm] = useState({ password: '', confirmPassword: '' });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchInvitation = async () => {
      try {
        const response = await hr.getInvitationByToken(token);
        setInvitation(response?.data?.data || null);
      } catch (err) {
        setError(err?.response?.data?.message || 'Invitation is invalid or has expired.');
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchInvitation();
    }
  }, [token]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (!form.password || !form.confirmPassword) {
      setError('Password and confirmation are required.');
      return;
    }

    if (form.password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    try {
      setSubmitting(true);
      await hr.acceptInvitation(token, { password: form.password });
      navigate('/login');
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to create your HR account.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <AuthLayout title="Complete Your HR Account" subtitle="We are verifying your invitation…">
        <Box sx={{ py: 4 }}>
          <CircularProgress size={28} />
        </Box>
      </AuthLayout>
    );
  }

  if (error && !invitation) {
    return (
      <AuthLayout title="Invitation Unavailable" subtitle="Your invitation could not be verified.">
        <Alert severity="error">{error}</Alert>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Complete Your HR Account"
      subtitle="Set a password to activate your HR profile."
    >
      <Stack spacing={2.5}>
        <Box
          sx={{
            border: '1px solid #E5E5E5',
            borderRadius: '12px',
            backgroundColor: '#FFFFFF',
            p: 2.5,
          }}
        >
          <Stack spacing={2}>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  {invitation?.name || 'HR Member'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {invitation?.email || ''}
                </Typography>
              </Box>
              <StatusBadge status="pending" label="Invited" />
            </Stack>

            <Divider sx={{ borderColor: '#F0F0F0' }} />

            <Typography variant="body2" color="text.secondary">
              <strong style={{ color: '#0A0A0A' }}>Hospital:</strong> {invitation?.hospitalName || 'Hospital'}
            </Typography>
          </Stack>
        </Box>

        <Box component="form" onSubmit={handleSubmit} noValidate>
          <Stack spacing={2.5}>
            <TextField
              label="Password"
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              required
            />
            <TextField
              label="Confirm Password"
              name="confirmPassword"
              type="password"
              value={form.confirmPassword}
              onChange={handleChange}
              required
            />

            {error && <Alert severity="error">{error}</Alert>}

            <Button type="submit" variant="contained" size="large" disabled={submitting}>
              {submitting ? <CircularProgress size={22} color="inherit" /> : 'Create HR Account'}
            </Button>
          </Stack>
        </Box>
      </Stack>
    </AuthLayout>
  );
};

export default AcceptHRInvitation;