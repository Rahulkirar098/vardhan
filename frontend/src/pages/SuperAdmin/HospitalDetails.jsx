import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  Grid,
  Stack,
  Typography,
} from '@mui/material';
import superAdmin from '../../services/superAdmin';
import auth from '../../services/auth';
import AppLayout from '../../components/AppLayout';
import HospitalDetailsSkeleton from '../../components/loading/HospitalDetailsSkeleton';

const HospitalDetails = () => {
  const navigate = useNavigate();
  const { hospitalId } = useParams();
  const [hospital, setHospital] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchHospital = async () => {
      try {
        const response = await superAdmin.getHospitalById(hospitalId);
        setHospital(response?.data?.data || null);
      } catch (err) {
        setError(err?.response?.data?.message || 'Unable to load hospital details.');
      } finally {
        setLoading(false);
      }
    };

    fetchHospital();
  }, [hospitalId]);

  if (loading) {
    return (
      <Box sx={{ p: { xs: 2, md: 4 }, minHeight: '100vh' }}>
        <HospitalDetailsSkeleton />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  if (!hospital) {
    return (
      <Box sx={{ p: 4 }}>
        <Alert severity="warning">Hospital not found.</Alert>
      </Box>
    );
  }

  const admin = hospital.createdBy || {};
  const contact = hospital.contact || {};
  const address = hospital.address || {};

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        await auth.logout();
      }
    } catch (error) {
      console.error('Super admin logout error:', error);
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('role');
      navigate('/login');
    }
  };

  return (
    <AppLayout onLogout={handleLogout}>
      <Box sx={{ p: { xs: 2, md: 4 } }}>
        <Stack spacing={3}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
              Hospital Details
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              {hospital.name}
            </Typography>
          </Box>

          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card sx={{ p: 3, borderRadius: 3, border: '1px solid #E5E5E5' }}>
                <Stack spacing={2}>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    Hospital Details
                  </Typography>

                  <Box>
                    <Typography variant="caption" color="text.secondary">Code</Typography>
                    <Typography variant="body1">{hospital.code}</Typography>
                  </Box>

                  <Box>
                    <Typography variant="caption" color="text.secondary">Registration Number</Typography>
                    <Typography variant="body1">{hospital.registrationNumber || 'N/A'}</Typography>
                  </Box>

                  <Box>
                    <Typography variant="caption" color="text.secondary">Status</Typography>
                    <Typography variant="body1">{hospital.status || 'Active'}</Typography>
                  </Box>
                </Stack>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card sx={{ p: 3, borderRadius: 3, border: '1px solid #E5E5E5' }}>
                <Stack spacing={2}>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    Contact
                  </Typography>

                  <Box>
                    <Typography variant="caption" color="text.secondary">Phone</Typography>
                    <Typography variant="body1">{contact.phone || 'N/A'}</Typography>
                  </Box>

                  <Box>
                    <Typography variant="caption" color="text.secondary">Email</Typography>
                    <Typography variant="body1">{contact.email || 'N/A'}</Typography>
                  </Box>

                  <Box>
                    <Typography variant="caption" color="text.secondary">Website</Typography>
                    <Typography variant="body1">{contact.website || 'N/A'}</Typography>
                  </Box>
                </Stack>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card sx={{ p: 3, borderRadius: 3, border: '1px solid #E5E5E5' }}>
                <Stack spacing={2}>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    Address
                  </Typography>

                  <Typography variant="body1">{address.addressLine1 || 'N/A'}</Typography>
                  <Typography variant="body1">{address.addressLine2 || ''}</Typography>
                  <Typography variant="body1">
                    {address.city || ''}{address.city && address.state ? ', ' : ''}{address.state || ''}
                  </Typography>
                  <Typography variant="body1">
                    {address.country || 'India'}{address.pincode ? `, ${address.pincode}` : ''}
                  </Typography>
                </Stack>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card sx={{ p: 3, borderRadius: 3, border: '1px solid #E5E5E5' }}>
                <Stack spacing={2}>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    Hospital Admin
                  </Typography>

                  <Box>
                    <Typography variant="caption" color="text.secondary">Name</Typography>
                    <Typography variant="body1">{admin.name || 'N/A'}</Typography>
                  </Box>

                  <Box>
                    <Typography variant="caption" color="text.secondary">Email</Typography>
                    <Typography variant="body1">{admin.email || 'N/A'}</Typography>
                  </Box>

                  <Box>
                    <Typography variant="caption" color="text.secondary">Phone</Typography>
                    <Typography variant="body1">{admin.phone || 'N/A'}</Typography>
                  </Box>

                  <Box>
                    <Typography variant="caption" color="text.secondary">Status</Typography>
                    <Typography variant="body1">{admin.status || 'Active'}</Typography>
                  </Box>
                </Stack>
              </Card>
            </Grid>
          </Grid>

          <Button variant="contained" onClick={() => navigate('/super-admin/dashboard')} sx={{ alignSelf: 'flex-start' }}>
            Back to Dashboard
          </Button>
        </Stack>
      </Box>
    </AppLayout>
  );
};

export default HospitalDetails;
