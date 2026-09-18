import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import departmentService from '../../services/department';
import hrService from '../../services/hr';
import auth from '../../services/auth';
import GlassCard from '../../components/GlassCard';
import AppLayout from '../../components/AppLayout';

const formatStatus = (status) => {
  if (!status) return 'Active';
  return String(status).charAt(0).toUpperCase() + String(status).slice(1);
};

const DepartmentDetails = () => {
  const navigate = useNavigate();
  const { departmentId } = useParams();
  const [department, setDepartment] = useState(null);
  const [hrs, setHrs] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [stats, setStats] = useState({ totalHRs: 0, pendingInvitations: 0 });
  const [form, setForm] = useState({ name: '', email: '', phone: '' });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const fetchDetails = async () => {
    try {
      setLoading(true);
      const response = await departmentService.getDetails(departmentId);
      const data = response?.data?.data || {};
      setDepartment(data.department || null);
      setHrs(Array.isArray(data.hrs) ? data.hrs : []);
      setInvitations(Array.isArray(data.pendingInvitationRecords) ? data.pendingInvitationRecords : []);
      setStats(data.stats || { totalHRs: 0, pendingInvitations: 0 });
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to load department details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [departmentId]);

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        await auth.logout();
      }
    } catch (logoutError) {
      console.error('Logout error:', logoutError);
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('role');
      localStorage.removeItem('userName');
      localStorage.removeItem('userEmail');
      navigate('/login');
    }
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleInvite = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');

    if (!form.name || !form.email) {
      setError('HR name and email are required.');
      return;
    }

    try {
      setSubmitting(true);
      const response = await departmentService.inviteHr(departmentId, {
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim(),
      });
      setMessage(response?.data?.message || 'Invitation sent successfully.');
      setForm({ name: '', email: '', phone: '' });
      await fetchDetails();
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to send invitation.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async (invitationId) => {
    setError('');
    setMessage('');

    try {
      setSubmitting(true);
      const response = await hrService.resendInvitation(invitationId);
      setMessage(response?.data?.message || 'Invitation resent successfully.');
      await fetchDetails();
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to resend invitation.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (invitationId) => {
    setError('');
    setMessage('');

    try {
      setSubmitting(true);
      const response = await hrService.cancelInvitation(invitationId);
      setMessage(response?.data?.message || 'Invitation cancelled successfully.');
      await fetchDetails();
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to cancel invitation.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppLayout onLogout={handleLogout}>
      <Stack spacing={3.5}>
        <Box>
          <Button variant="text" onClick={() => navigate('/departments')} sx={{ px: 0, mb: 1 }}>
            Back to Departments
          </Button>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            {department?.name || 'Department Details'}
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mt: 0.75 }}>
            Manage this department and its HR team.
          </Typography>
        </Box>

        {message && <Alert severity="success">{message}</Alert>}
        {error && <Alert severity="error">{error}</Alert>}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress />
          </Box>
        ) : !department ? (
          <Alert severity="warning">Department not found.</Alert>
        ) : (
          <>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, minmax(0, 1fr))' },
                gap: 2.5,
              }}
            >
              {[
                { label: 'HRs', value: stats.totalHRs ?? hrs.length },
                { label: 'Pending Invites', value: stats.pendingInvitations ?? 0 },
                { label: 'Status', value: formatStatus(department.status) },
              ].map((card) => (
                <GlassCard key={card.label} sx={{ p: 2.5, height: '100%' }}>
                  <Stack spacing={1}>
                    <Typography variant="caption" color="text.secondary">{card.label}</Typography>
                    <Typography variant="h5" sx={{ fontWeight: 700 }}>{card.value}</Typography>
                  </Stack>
                </GlassCard>
              ))}
            </Box>

            <GlassCard sx={{ p: { xs: 2.5, md: 3 } }}>
              <Stack spacing={1.5}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>Department Information</Typography>
                <Typography variant="body2" color="text.secondary">Code: {department.code}</Typography>
                <Typography>{department.description || 'No description provided.'}</Typography>
                <Chip
                  label={formatStatus(department.status)}
                  size="small"
                  sx={{ width: 'fit-content', backgroundColor: '#000000', color: '#FFFFFF', borderRadius: 2 }}
                />
              </Stack>
            </GlassCard>

            <GlassCard sx={{ p: { xs: 2.5, md: 3 } }}>
              <Stack spacing={2.5}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>HR Team</Typography>
                {hrs.length === 0 ? (
                  <Alert severity="info">No HR assigned to this department yet.</Alert>
                ) : (
                  <Stack spacing={1.5}>
                    {hrs.map((hr) => (
                      <Box
                        key={hr._id}
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: 2,
                          flexWrap: 'wrap',
                          border: '1px solid rgba(0,0,0,0.08)',
                          borderRadius: 2,
                          p: 1.5,
                        }}
                      >
                        <Box>
                          <Typography sx={{ fontWeight: 700 }}>{hr.name}</Typography>
                          <Typography variant="body2" color="text.secondary">{hr.email}</Typography>
                        </Box>
                        <Button variant="outlined" size="small" onClick={() => navigate(`/hr/${hr._id}`)}>
                          View Profile
                        </Button>
                      </Box>
                    ))}
                  </Stack>
                )}
              </Stack>
            </GlassCard>

            {invitations.length > 0 && (
              <GlassCard sx={{ p: { xs: 2.5, md: 3 } }}>
                <Stack spacing={2.5}>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>Pending Invitations</Typography>
                  <Stack spacing={1.5}>
                    {invitations.map((invitation) => (
                      <Box
                        key={invitation._id}
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: 2,
                          flexWrap: 'wrap',
                          border: '1px solid rgba(0,0,0,0.08)',
                          borderRadius: 2,
                          p: 1.5,
                        }}
                      >
                        <Box>
                          <Typography sx={{ fontWeight: 700 }}>{invitation.name}</Typography>
                          <Typography variant="body2" color="text.secondary">{invitation.email}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            Expires {new Date(invitation.expiresAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </Typography>
                        </Box>
                        <Stack direction="row" spacing={1}>
                          <Button variant="outlined" size="small" disabled={submitting} onClick={() => handleResend(invitation._id)}>
                            Resend
                          </Button>
                          <Button variant="outlined" size="small" color="error" disabled={submitting} onClick={() => handleCancel(invitation._id)}>
                            Cancel
                          </Button>
                        </Stack>
                      </Box>
                    ))}
                  </Stack>
                </Stack>
              </GlassCard>
            )}

            <GlassCard sx={{ p: { xs: 2.5, md: 3 } }}>
              <Box component="form" onSubmit={handleInvite} noValidate>
                <Stack spacing={2.5}>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>Invite HR</Typography>
                  <TextField label="HR Name" name="name" value={form.name} onChange={handleChange} required />
                  <TextField label="Email" type="email" name="email" value={form.email} onChange={handleChange} required />
                  <TextField label="Phone" name="phone" value={form.phone} onChange={handleChange} />
                  <Button type="submit" variant="contained" disabled={submitting} sx={{ alignSelf: 'flex-start' }}>
                    {submitting ? 'Sending Invitation...' : 'Send Invitation'}
                  </Button>
                </Stack>
              </Box>
            </GlassCard>
          </>
        )}
      </Stack>
    </AppLayout>
  );
};

export default DepartmentDetails;
