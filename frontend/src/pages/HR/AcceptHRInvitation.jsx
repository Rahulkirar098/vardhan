import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import hr from '../../services/hr';

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
      <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}>
        <Typography>Loading invitation...</Typography>
      </Box>
    );
  }

  if (error && !invitation) {
    return (
      <Box sx={{ p: 4 }}>
        <Card sx={{ maxWidth: 560, mx: 'auto', p: 3 }}>
          <Alert severity="error">{error}</Alert>
        </Card>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Card sx={{ width: '100%', maxWidth: 620, p: { xs: 2, md: 3 }, borderRadius: 3 }}>
        <Stack spacing={3}>
          <Box>
            <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 2 }}>HR INVITATION</Typography>
            <Typography variant="h4" sx={{ fontWeight: 700 }}>Complete Your HR Account</Typography>
          </Box>

          <Box>
            <Typography variant="body2" color="text.secondary">Hospital</Typography>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>{invitation?.hospitalName || 'Hospital'}</Typography>
            <Typography variant="body2" color="text.secondary">Department: {invitation?.departmentName || 'Not provided'}</Typography>
          </Box>

          <Stack spacing={1}>
            <TextField label="Name" value={invitation?.name || ''} InputProps={{ readOnly: true }} />
            <TextField label="Email" value={invitation?.email || ''} InputProps={{ readOnly: true }} />
            <TextField label="Phone" value={invitation?.phone || ''} InputProps={{ readOnly: true }} />
          </Stack>

          <Box component="form" onSubmit={handleSubmit} noValidate>
            <Stack spacing={2.5}>
              <TextField
                type="password"
                label="Password"
                name="password"
                value={form.password}
                onChange={handleChange}
                required
              />
              <TextField
                type="password"
                label="Confirm Password"
                name="confirmPassword"
                value={form.confirmPassword}
                onChange={handleChange}
                required
              />

              {error && <Alert severity="error">{error}</Alert>}

              <Button type="submit" variant="contained" disabled={submitting} sx={{ alignSelf: 'flex-start' }}>
                {submitting ? 'Creating Account...' : 'Create HR Account'}
              </Button>
            </Stack>
          </Box>
        </Stack>
      </Card>
    </Box>
  );
};

export default AcceptHRInvitation;
