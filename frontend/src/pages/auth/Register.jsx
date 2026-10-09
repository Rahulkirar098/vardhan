import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Alert,
  Box,
  CircularProgress,
  Divider,
  IconButton,
  InputAdornment,
  Stack,
  Typography,
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import auth from '../../services/auth.service';
import AuthLayout from '../../components/AuthLayout';
import { useSnackbar } from '../../theme/SnackbarProvider';
import { AppInput, AppButton } from '../../components/common';

const Register = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { showSnackbar } = useSnackbar();

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (!form.name || !form.email || !form.password) {
      setError('Full name, email, and password are required.');
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    try {
      setLoading(true);
      await auth.signup({
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim(),
        password: form.password,
      });

      showSnackbar('Account created successfully. Redirecting to login...', 'success');
      setTimeout(() => {
        navigate('/login');
      }, 1000);
    } catch (err) {
      setError(
        err?.response?.data?.message || 'Unable to create account. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Create Your Account"
      subtitle="Start managing your hospital workforce from one place."
    >
      <Stack spacing={2.5}>
        {error && (
          <Alert severity="error" variant="outlined">
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit} noValidate>
          <Stack spacing={2.5}>
            <AppInput label="Full Name" name="name" value={form.name} onChange={handleChange} required />
            <AppInput label="Email" name="email" type="email" value={form.email} onChange={handleChange} autoComplete="email" required />
            <AppInput label="Phone" name="phone" value={form.phone} onChange={handleChange} autoComplete="tel" />

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2.5}>
              <AppInput
                label="Password"
                name="password"
                type="password"
                value={form.password}
                onChange={handleChange}
                autoComplete="new-password"
                required
              />
              <AppInput
                label="Confirm Password"
                name="confirmPassword"
                type="password"
                value={form.confirmPassword}
                onChange={handleChange}
                autoComplete="new-password"
                required
              />
            </Stack>

            <AppButton type="submit" variant="primary" size="large" loading={loading} fullWidth>
              Create Account
            </AppButton>
          </Stack>
        </Box>

        <Divider />

        <Typography variant="body2" color="text.secondary" align="center">
          Already have an account?{' '}
          <Link to="/login" style={{ color: '#0F172B', fontWeight: 700 }}>
            Login
          </Link>
        </Typography>
      </Stack>
    </AuthLayout>
  );
};

export default Register;