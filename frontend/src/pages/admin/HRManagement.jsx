import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  Divider,
  FormControlLabel,
  FormGroup,
  FormHelperText,
  Grid,
  IconButton,
  Paper,
  Skeleton,
  Snackbar,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  AddRounded,
  CheckCircleOutlineRounded,
  CloseRounded,
  EmailRounded,
  LockPersonRounded,
  MarkEmailReadRounded,
  PeopleRounded,
  PersonAddAlt1Rounded,
  RefreshRounded,
  SecurityRounded,
  SendRounded,
  ShieldRounded,
} from '@mui/icons-material';
import hrService from '../../services/hr.service';
import AppLayout from '../../components/AppLayout';
import PageHeader from '../../components/PageHeader';
import StatCard from '../../components/StatCard';
import StatusBadge from '../../components/StatusBadge';
import GlassCard from '../../components/GlassCard';
import Modal from '../../components/Modal';
import ConfirmDialog from '../../components/ConfirmDialog';
import EmptyState from '../../components/EmptyState';
import ErrorState from '../../components/ErrorState';
import InitialsAvatar from '../../components/InitialsAvatar';

const PERMISSION_OPTIONS = [
  {
    key: 'structure.view',
    label: 'View Floors & Rooms',
    description: 'Allow HR to inspect floors, rooms, and structural layout',
  },
  {
    key: 'structure.create',
    label: 'Create Floors & Rooms',
    description: 'Allow HR to add new floors and rooms to this hospital',
  },
  {
    key: 'structure.update',
    label: 'Edit Floors & Rooms',
    description: 'Allow HR to update room and floor metadata and configurations',
  },
  {
    key: 'structure.delete',
    label: 'Delete/Deactivate Floors & Rooms',
    description: 'Allow HR to deactivate existing rooms and floors safely',
  },
];

const InviteHRModal = ({ open, onClose, onSuccess }) => {
  const [form, setForm] = useState({ name: '', email: '', phone: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setForm({ name: '', email: '', phone: '' });
      setError('');
      setSubmitting(false);
    }
  }, [open]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    setError('');
    if (!form.name.trim()) {
      setError('HR name is required.');
      return;
    }
    if (!form.email.trim()) {
      setError('HR email address is required.');
      return;
    }

    try {
      setSubmitting(true);
      await hrService.invite({
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim() || undefined,
      });
      onSuccess('Invitation sent successfully.');
      onClose();
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to send HR invitation.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Invite HR Member"
      description="Send a secure email invitation to a new HR staff member."
      submitLabel="Send Invitation"
      submittingLabel="Sending..."
      onSubmit={handleSubmit}
      submitting={submitting}
      error={error}
      startIcon={PersonAddAlt1Rounded}
    >
      <Stack spacing={2.5}>
        <TextField
          label="Full Name"
          name="name"
          value={form.name}
          onChange={handleChange}
          required
          placeholder="e.g. Rahul Sharma"
          fullWidth
        />
        <TextField
          label="Email Address"
          name="email"
          type="email"
          value={form.email}
          onChange={handleChange}
          required
          placeholder="e.g. rahul.sharma@hospital.com"
          fullWidth
        />
        <TextField
          label="Phone Number"
          name="phone"
          value={form.phone}
          onChange={handleChange}
          placeholder="e.g. +91 98765 43210 (optional)"
          fullWidth
        />
      </Stack>
    </Modal>
  );
};

const ManagePermissionsModal = ({ open, hrUser, onClose, onSuccess }) => {
  const [selectedPermissions, setSelectedPermissions] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open && hrUser) {
      setSelectedPermissions(Array.isArray(hrUser.permissions) ? hrUser.permissions : []);
      setError('');
      setSubmitting(false);
    }
  }, [open, hrUser]);

  const handleToggle = (permKey) => {
    setSelectedPermissions((prev) =>
      prev.includes(permKey) ? prev.filter((p) => p !== permKey) : [...prev, permKey],
    );
  };

  const handleSelectAll = () => {
    setSelectedPermissions(PERMISSION_OPTIONS.map((p) => p.key));
  };

  const handleClearAll = () => {
    setSelectedPermissions([]);
  };

  const handleSubmit = async () => {
    if (!hrUser) return;
    setError('');
    try {
      setSubmitting(true);
      await hrService.updatePermissions(hrUser._id, selectedPermissions);
      onSuccess(`Permissions updated for ${hrUser.name}.`, hrUser._id, selectedPermissions);
      onClose();
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to update permissions.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!hrUser) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Manage HR Permissions"
      description={`Control specific system permissions for ${hrUser.name}.`}
      submitLabel="Save Permissions"
      submittingLabel="Saving..."
      onSubmit={handleSubmit}
      submitting={submitting}
      error={error}
      startIcon={SecurityRounded}
    >
      <Stack spacing={2.5}>
        <Paper
          variant="outlined"
          sx={{
            p: 2,
            borderRadius: 2,
            bgcolor: (t) => (t.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : '#f8fafc'),
            borderColor: 'divider',
          }}
        >
          <Stack direction="row" spacing={2} alignItems="center">
            <InitialsAvatar name={hrUser.name} sx={{ width: 44, height: 44 }} />
            <Box>
              <Typography variant="subtitle1" fontWeight={700}>
                {hrUser.name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {hrUser.email}
              </Typography>
            </Box>
          </Stack>
        </Paper>

        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="subtitle2" fontWeight={700} color="text.primary">
            Hospital Structure Permissions
          </Typography>
          <Stack direction="row" spacing={1}>
            <Button size="small" variant="text" onClick={handleSelectAll}>
              Select All
            </Button>
            <Button size="small" variant="text" color="inherit" onClick={handleClearAll}>
              Clear All
            </Button>
          </Stack>
        </Stack>

        <FormGroup sx={{ gap: 1.5 }}>
          {PERMISSION_OPTIONS.map((option) => {
            const isChecked = selectedPermissions.includes(option.key);
            return (
              <Paper
                key={option.key}
                variant="outlined"
                onClick={() => handleToggle(option.key)}
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  cursor: 'pointer',
                  borderColor: isChecked ? 'primary.main' : 'divider',
                  bgcolor: isChecked
                    ? (t) => (t.palette.mode === 'dark' ? 'rgba(14, 165, 233, 0.08)' : '#f0f9ff')
                    : 'transparent',
                  transition: 'all 0.15s ease-in-out',
                  '&:hover': {
                    borderColor: 'primary.light',
                  },
                }}
              >
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={isChecked}
                      onChange={() => handleToggle(option.key)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  }
                  label={
                    <Box sx={{ ml: 0.5 }}>
                      <Typography variant="body2" fontWeight={600} color="text.primary">
                        {option.label}
                      </Typography>
                      <FormHelperText sx={{ m: 0 }}>{option.description}</FormHelperText>
                    </Box>
                  }
                  sx={{ width: '100%', m: 0 }}
                />
              </Paper>
            );
          })}
        </FormGroup>
      </Stack>
    </Modal>
  );
};

const HRManagement = () => {
  const [hrList, setHrList] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tabIndex, setTabIndex] = useState(0);

  // Modals state
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [permissionModalHr, setPermissionModalHr] = useState(null);
  const [cancelInviteTarget, setCancelInviteTarget] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  // Snackbar state
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success',
  });

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      const [hrRes, invRes] = await Promise.all([
        hrService.getAll().catch(() => ({ data: { data: [] } })),
        hrService.getInvitations().catch(() => ({ data: { data: [] } })),
      ]);
      setHrList(hrRes?.data?.data || []);
      setInvitations(invRes?.data?.data || []);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load HR management data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const stats = useMemo(() => {
    const totalHR = hrList.length;
    const activeHR = hrList.filter((h) => h.status === 'active').length;
    const pendingInv = invitations.filter((i) => i.status === 'pending').length;
    return { totalHR, activeHR, pendingInv };
  }, [hrList, invitations]);

  const handleResendInvitation = async (invitationId) => {
    try {
      await hrService.resendInvitation(invitationId);
      setSnackbar({
        open: true,
        message: 'Invitation resent successfully.',
        severity: 'success',
      });
      loadData();
    } catch (err) {
      setSnackbar({
        open: true,
        message: err?.response?.data?.message || 'Failed to resend invitation.',
        severity: 'error',
      });
    }
  };

  const handleConfirmCancelInvitation = async () => {
    if (!cancelInviteTarget) return;
    try {
      setCancelling(true);
      await hrService.cancelInvitation(cancelInviteTarget._id);
      setSnackbar({
        open: true,
        message: 'Invitation cancelled successfully.',
        severity: 'success',
      });
      setCancelInviteTarget(null);
      loadData();
    } catch (err) {
      setSnackbar({
        open: true,
        message: err?.response?.data?.message || 'Failed to cancel invitation.',
        severity: 'error',
      });
    } finally {
      setCancelling(false);
    }
  };

  const handlePermissionsUpdated = (msg, hrId, updatedPermissions) => {
    setSnackbar({ open: true, message: msg, severity: 'success' });
    setHrList((prev) =>
      prev.map((item) =>
        item._id === hrId ? { ...item, permissions: updatedPermissions } : item,
      ),
    );
  };

  const formatPermissionLabel = (permKey) => {
    const match = PERMISSION_OPTIONS.find((p) => p.key === permKey);
    return match ? match.label.replace(' Floors & Rooms', '') : permKey;
  };

  return (
    <AppLayout>
      <Stack spacing={3}>
        <PageHeader
          title="HR Management"
          subtitle="Invite HR members and manage their hospital permissions."
          action={
            <Button
              variant="contained"
              startIcon={<AddRounded />}
              onClick={() => setInviteModalOpen(true)}
              sx={{ fontWeight: 600, px: 2.5 }}
            >
              Invite HR
            </Button>
          }
        />

        {/* Stats Row */}
        <Grid container spacing={2.5}>
          <Grid item xs={12} sm={4}>
            <StatCard
              title="Total HR Staff"
              value={loading ? '...' : stats.totalHR}
              icon={PeopleRounded}
              color="primary"
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <StatCard
              title="Active HR Staff"
              value={loading ? '...' : stats.activeHR}
              icon={CheckCircleOutlineRounded}
              color="success"
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <StatCard
              title="Pending Invitations"
              value={loading ? '...' : stats.pendingInv}
              icon={MarkEmailReadRounded}
              color="warning"
            />
          </Grid>
        </Grid>

        {/* Navigation Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs
            value={tabIndex}
            onChange={(_, val) => setTabIndex(val)}
            textColor="primary"
            indicatorColor="primary"
          >
            <Tab
              label={`Active HR Members (${hrList.length})`}
              icon={<PeopleRounded />}
              iconPosition="start"
              sx={{ fontWeight: 600 }}
            />
            <Tab
              label={`Invitations (${invitations.length})`}
              icon={<EmailRounded />}
              iconPosition="start"
              sx={{ fontWeight: 600 }}
            />
          </Tabs>
        </Box>

        {error && <ErrorState message={error} onRetry={loadData} />}

        {/* Active HR Tab */}
        {tabIndex === 0 && (
          <GlassCard sx={{ p: 0, overflow: 'hidden' }}>
            {loading ? (
              <Box sx={{ p: 3 }}>
                <Skeleton height={50} />
                <Skeleton height={50} />
                <Skeleton height={50} />
              </Box>
            ) : hrList.length === 0 ? (
              <EmptyState
                icon={PeopleRounded}
                title="No HR Members Found"
                description="Your hospital currently has no active HR staff. Click below to send an invitation."
                actionLabel="Invite HR"
                onAction={() => setInviteModalOpen(true)}
              />
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>HR Member</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Contact</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Assigned Permissions</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>
                        Actions
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {hrList.map((hr) => {
                      const perms = Array.isArray(hr.permissions) ? hr.permissions : [];
                      return (
                        <TableRow key={hr._id} hover>
                          <TableCell>
                            <Stack direction="row" spacing={1.5} alignItems="center">
                              <InitialsAvatar name={hr.name} />
                              <Box>
                                <Typography variant="body2" fontWeight={600}>
                                  {hr.name}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  HR Specialist
                                </Typography>
                              </Box>
                            </Stack>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">{hr.email}</Typography>
                            {hr.phone && (
                              <Typography variant="caption" color="text.secondary">
                                {hr.phone}
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={hr.status || 'active'} />
                          </TableCell>
                          <TableCell>
                            {perms.length === 0 ? (
                              <Typography variant="caption" color="text.secondary" fontStyle="italic">
                                No structure permissions granted
                              </Typography>
                            ) : (
                              <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ gap: 0.5 }}>
                                {perms.map((p) => (
                                  <Chip
                                    key={p}
                                    label={formatPermissionLabel(p)}
                                    size="small"
                                    color="primary"
                                    variant="outlined"
                                    sx={{ fontWeight: 500, fontSize: '0.72rem' }}
                                  />
                                ))}
                              </Stack>
                            )}
                          </TableCell>
                          <TableCell align="right">
                            <Button
                              variant="outlined"
                              size="small"
                              startIcon={<LockPersonRounded />}
                              onClick={() => setPermissionModalHr(hr)}
                              sx={{ fontWeight: 600, textTransform: 'none' }}
                            >
                              Manage Permissions
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </GlassCard>
        )}

        {/* Invitations Tab */}
        {tabIndex === 1 && (
          <GlassCard sx={{ p: 0, overflow: 'hidden' }}>
            {loading ? (
              <Box sx={{ p: 3 }}>
                <Skeleton height={50} />
                <Skeleton height={50} />
              </Box>
            ) : invitations.length === 0 ? (
              <EmptyState
                icon={EmailRounded}
                title="No Invitations"
                description="You have no pending or past HR invitations."
                actionLabel="Invite HR"
                onAction={() => setInviteModalOpen(true)}
              />
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>Invited Person</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Email</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Expires At</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>
                        Actions
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {invitations.map((inv) => {
                      const isExpired =
                        inv.status === 'expired' ||
                        (inv.status === 'pending' && new Date(inv.expiresAt) < new Date());
                      const effectiveStatus = isExpired ? 'expired' : inv.status;

                      return (
                        <TableRow key={inv._id} hover>
                          <TableCell>
                            <Typography variant="body2" fontWeight={600}>
                              {inv.name}
                            </Typography>
                            {inv.phone && (
                              <Typography variant="caption" color="text.secondary">
                                {inv.phone}
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">{inv.email}</Typography>
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={effectiveStatus} />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {inv.expiresAt
                                ? new Date(inv.expiresAt).toLocaleDateString()
                                : '—'}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Stack
                              direction="row"
                              spacing={1}
                              justifyContent="flex-end"
                            >
                              {(inv.status === 'pending' || isExpired) && (
                                <Tooltip title="Resend invitation email">
                                  <IconButton
                                    size="small"
                                    color="primary"
                                    onClick={() => handleResendInvitation(inv._id)}
                                  >
                                    <SendRounded fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              )}
                              {inv.status === 'pending' && (
                                <Tooltip title="Cancel invitation">
                                  <IconButton
                                    size="small"
                                    color="error"
                                    onClick={() => setCancelInviteTarget(inv)}
                                  >
                                    <CloseRounded fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              )}
                            </Stack>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </GlassCard>
        )}
      </Stack>

      {/* Invite HR Modal */}
      <InviteHRModal
        open={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
        onSuccess={(msg) => {
          setSnackbar({ open: true, message: msg, severity: 'success' });
          loadData();
        }}
      />

      {/* Manage Permissions Modal */}
      <ManagePermissionsModal
        open={Boolean(permissionModalHr)}
        hrUser={permissionModalHr}
        onClose={() => setPermissionModalHr(null)}
        onSuccess={handlePermissionsUpdated}
      />

      {/* Confirm Cancel Invitation Dialog */}
      <ConfirmDialog
        open={Boolean(cancelInviteTarget)}
        title="Cancel Invitation"
        description={`Are you sure you want to cancel the invitation sent to ${cancelInviteTarget?.email}? This link will no longer be valid.`}
        confirmLabel="Cancel Invitation"
        confirmColor="error"
        loading={cancelling}
        onConfirm={handleConfirmCancelInvitation}
        onClose={() => setCancelInviteTarget(null)}
      />

      {/* Feedback Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
          sx={{ width: '100%', boxShadow: 3 }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </AppLayout>
  );
};

export default HRManagement;
