import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
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

const Login = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (!form.email || !form.password) {
      setError('Email and password are required.');
      return;
    }

    try {
      setLoading(true);
      const response = await auth.login({
        email: form.email.trim().toLowerCase(),
        password: form.password,
      });

      const token = response?.data?.data?.token;

      if (token) {
        localStorage.setItem('token', token);

        try {
          const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
          const payload = JSON.parse(atob(base64));
          const currentUid = response?.data?.data?.user?._id || response?.data?.data?.user?.id || payload.id || '';
          localStorage.setItem('userId', currentUid);
          const role = payload.role || 'admin';
          localStorage.setItem('role', role);
          localStorage.setItem('userName', response?.data?.data?.user?.name || 'User');
          localStorage.setItem('userEmail', response?.data?.data?.user?.email || '');
          localStorage.setItem('positionName', response?.data?.data?.user?.positionName || '');
          localStorage.setItem('hospitalId', response?.data?.data?.user?.hospitalId || '');
          localStorage.setItem('hospitalName', response?.data?.data?.user?.hospitalName || '');
          localStorage.setItem('employeeId', response?.data?.data?.user?.employeeId || '');
          localStorage.setItem('permissions', JSON.stringify(response?.data?.data?.user?.permissions || []));
          localStorage.setItem('modules', JSON.stringify(response?.data?.data?.user?.modules || ['core']));

          navigate('/dashboard');
          return;
        } catch (decodeError) {
          console.error('Token decode error:', decodeError);
        }
      }

      navigate('/dashboard');
    } catch (err) {
      setError(
        err?.response?.data?.message || 'Invalid email or password',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Welcome Back"
      subtitle="Sign in to manage your hospital workforce."
    >
      <Stack spacing={2.5}>
        {error && (
          <Alert severity="error" variant="outlined">
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit} noValidate>
          <Stack spacing={2.5}>
            <AppInput
              label="Email"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              autoComplete="email"
              required
            />

            <Box>
              <AppInput
                label="Password"
                name="password"
                type="password"
                value={form.password}
                onChange={handleChange}
                autoComplete="current-password"
                required
              />
              <Box sx={{ textAlign: 'right', mt: 1.25 }}>
                <Link
                  to="/forgot-password"
                  style={{ fontSize: '0.875rem', color: '#6B7280', fontWeight: 600 }}
                >
                  Forgot password?
                </Link>
              </Box>
            </Box>

            <AppButton type="submit" variant="primary" size="large" loading={loading} fullWidth>
              Sign In
            </AppButton>
          </Stack>
        </Box>

        <Divider />

        <Typography variant="body2" color="text.secondary" align="center">
          Don&apos;t have an account?{' '}
          <Link
            to="/register"
            style={{ color: '#0F172B', fontWeight: 700 }}
          >
            Register
          </Link>
        </Typography>
      </Stack>
    </AuthLayout>
  );
};

export default Login;