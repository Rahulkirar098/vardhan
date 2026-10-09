import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Alert,
  Box,
  Divider,
  Stack,
  Typography,
} from '@mui/material';
import auth from '../../services/auth.service';
import AuthLayout from '../../components/AuthLayout';
import { AppInput, AppButton } from '../../components/common';

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
            <AppInput
              label="Email"
              name="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
            />

            <AppButton type="submit" variant="primary" size="large" loading={loading} fullWidth>
              Send Reset Link
            </AppButton>
          </Stack>
        </Box>

        <Divider />

        <Typography variant="body2" color="text.secondary" align="center">
          Remembered your password?{' '}
          <Link to="/login" style={{ color: '#0F172B', fontWeight: 700 }}>
            Login
          </Link>
        </Typography>
      </Stack>
    </AuthLayout>
  );
};

export default ForgotPassword;