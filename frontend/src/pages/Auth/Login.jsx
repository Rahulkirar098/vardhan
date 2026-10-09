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
import { StyledButton, StyledTextField } from '../../components/styled';

const Login = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
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
            <StyledTextField
              label="Email"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              autoComplete="email"
              required
            />

            <Box>
              <StyledTextField
                label="Password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={handleChange}
                autoComplete="current-password"
                required
                slotProps={{
                  input: {
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          type="button"
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                          onClick={() => setShowPassword((prev) => !prev)}
                          onMouseDown={(event) => event.preventDefault()}
                          edge="end"
                          size="small"
                        >
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  },
                }}
              />
              <Box sx={{ textAlign: 'right', mt: 1.25 }}>
                <Link
                  to="/forgot-password"
                  style={{ fontSize: '0.875rem', color: '#62748E', fontWeight: 600 }}
                >
                  Forgot password?
                </Link>
              </Box>
            </Box>

            <StyledButton type="submit" variantType="primary" size="large" disabled={loading}>
              {loading ? <CircularProgress size={22} color="inherit" /> : 'Sign In'}
            </StyledButton>
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