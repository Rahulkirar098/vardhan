import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
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

const ResetPassword = () => {
  const navigate = useNavigate();
  const { token } = useParams();
  const [form, setForm] = useState({ password: '', confirmPassword: '' });
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

    if (!form.password || !form.confirmPassword) {
      setError('Please enter and confirm your new password.');
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (form.password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    try {
      setLoading(true);
      await auth.resetPassword({ token, password: form.password });
      setSuccessOpen(true);
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(
        err?.response?.data?.message || 'Unable to reset password. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Create New Password"
      subtitle="Enter your new password below."
    >
      <Stack spacing={2.5}>
        {error && (
          <Alert severity="error" variant="outlined">
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit} noValidate>
          <Stack spacing={2.5}>
            <TextField
              label="New Password"
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
              label="Confirm New Password"
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

            <Button type="submit" variant="contained" size="large" disabled={loading}>
              {loading ? <CircularProgress size={22} color="inherit" /> : 'Reset Password'}
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

      <Snackbar
        open={successOpen}
        autoHideDuration={2000}
        onClose={() => setSuccessOpen(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert severity="success" variant="filled">
          Password reset successfully. Redirecting to login.
        </Alert>
      </Snackbar>
    </AuthLayout>
  );
};

export default ResetPassword;