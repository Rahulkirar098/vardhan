import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  IconButton,
  InputAdornment,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import auth from '../../services/auth.service';
import AuthLayout from '../../components/AuthLayout';

const Register = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successOpen, setSuccessOpen] = useState(false);

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

      setSuccessOpen(true);
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
            <TextField label="Full Name" name="name" value={form.name} onChange={handleChange} required />
            <TextField label="Email" name="email" type="email" value={form.email} onChange={handleChange} autoComplete="email" required />
            <TextField label="Phone" name="phone" value={form.phone} onChange={handleChange} autoComplete="tel" />

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2.5}>
              <TextField
                label="Password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={handleChange}
                autoComplete="new-password"
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
              <TextField
                label="Confirm Password"
                name="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                value={form.confirmPassword}
                onChange={handleChange}
                autoComplete="new-password"
                required
                slotProps={{
                  input: {
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          type="button"
                          aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                          onClick={() => setShowConfirmPassword((prev) => !prev)}
                          onMouseDown={(event) => event.preventDefault()}
                          edge="end"
                          size="small"
                        >
                          {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  },
                }}
              />
            </Stack>

            <Button type="submit" variant="contained" size="large" disabled={loading}>
              {loading ? <CircularProgress size={22} color="inherit" /> : 'Create Account'}
            </Button>
          </Stack>
        </Box>

        <Divider />

        <Typography variant="body2" color="text.secondary" align="center">
          Already have an account?{' '}
          <Link to="/login" style={{ color: '#0A0A0A', fontWeight: 700 }}>
            Login
          </Link>
        </Typography>
      </Stack>

      <Snackbar
        open={successOpen}
        autoHideDuration={2000}
        onClose={() => setSuccessOpen(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert severity="success" variant="filled">
          Account created successfully. Please login.
        </Alert>
      </Snackbar>
    </AuthLayout>
  );
};

export default Register;