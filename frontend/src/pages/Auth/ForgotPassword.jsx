import { useState } from 'react';
import { Link } from 'react-router-dom';
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
import auth from '../../services/auth';
import AuthLayout from '../../components/AuthLayout';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!email) {
      setError('Email is required.');
      return;
    }

    try {
      setLoading(true);
      const response = await auth.forgotPassword({ email: email.trim().toLowerCase() });
      setSuccess(
        response?.data?.message ||
          'If an account exists for this email, a password reset link has been sent.',
      );
    } catch (err) {
      setError(
        err?.response?.data?.message || 'Unable to send the reset link. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Forgot Password"
      subtitle="Enter your email and we will send you a password reset link."
    >
      <Stack spacing={2.5}>
        {error && (
          <Alert severity="error" variant="outlined">
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" variant="outlined">
            {success}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit} noValidate>
          <Stack spacing={2.5}>
            <TextField
              label="Email"
              name="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
            />

            <Button type="submit" variant="contained" size="large" disabled={loading}>
              {loading ? <CircularProgress size={22} color="inherit" /> : 'Send Reset Link'}
            </Button>
          </Stack>
        </Box>

        <Divider />

        <Typography variant="body2" color="text.secondary" align="center">
          Remembered your password?{' '}
          <Link to="/login" style={{ color: '#0A0A0A', fontWeight: 700 }}>
            Login
          </Link>
        </Typography>
      </Stack>
    </AuthLayout>
  );
};

export default ForgotPassword;