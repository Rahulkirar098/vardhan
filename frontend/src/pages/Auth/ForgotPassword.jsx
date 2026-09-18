import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import auth from '../../services/auth';

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
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FAFAFA',
        px: 2,
      }}
    >
      <Card sx={{ width: '100%', maxWidth: 460, borderRadius: 3, p: 1 }}>
        <CardContent sx={{ p: 4 }}>
          <Stack spacing={2}>
            <Box>
              <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 2 }}>
                PASSWORD RESET
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
                Forgot Password
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Enter your email and we will send you a password reset link.
              </Typography>
            </Box>

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

                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  disabled={loading}
                  sx={{ py: 1.4 }}
                >
                  {loading ? <CircularProgress size={22} color="inherit" /> : 'Send Reset Link'}
                </Button>
              </Stack>
            </Box>

            <Divider />

            <Typography variant="body2" color="text.secondary" align="center">
              Remembered your password?{' '}
              <Link to="/login" style={{ color: '#000', fontWeight: 600 }}>
                Login
              </Link>
            </Typography>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
};

export default ForgotPassword;