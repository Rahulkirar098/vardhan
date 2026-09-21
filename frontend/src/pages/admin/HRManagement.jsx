import { useEffect, useMemo, useState } from 'react';
import DataTable from '../../components/DataTable';
import {
  Alert,
  Box,
  Button,
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
    Tabs,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  AddRounded,
  AppsRounded,
  CheckCircleOutlineRounded,
  CloseRounded,
  EmailRounded,
  LockPersonRounded,
  MarkEmailReadRounded,
  PeopleRounded,
  PersonAddAlt1Rounded,
  SecurityRounded,
  SendRounded,
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

const MODULE_OPTIONS = [
  {
    key: 'hrms',
    label: 'HRMS Module',
    description: 'Employee management, Roster, Attendance, and Leave tracking',
  },
];

// ─── Invite HR Modal ────────────────────────────────────────────────────────
const InviteHRModal = ({ open, onClose, onSuccess }) => {
  const [form, setForm] = useState({ name: '', email: '', phone: '', position: '' });
  const [selectedModules, setSelectedModules] = useState([]);
  const [selectedPermissions, setSelectedPermissions] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setForm({ name: '', email: '', phone: '', position: '' });
      setSelectedModules([]);
      setSelectedPermissions([]);
      setError('');
      setSubmitting(false);
    }
  }, [open]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const toggleModule = (key) => {
    setSelectedModules((prev) =>
      prev.includes(key) ? prev.filter((m) => m !== key) : [...prev, key],
    );
  };

  const togglePermission = (key) => {
    setSelectedPermissions((prev) =>
      prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key],
    );
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
        position: form.position.trim() || undefined,
        modules: selectedModules,
        permissions: selectedPermissions,
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
        <TextField
          label="Hospital Position (optional)"
          name="position"
          value={form.position}
          onChange={handleChange}
          placeholder="e.g. HR Manager, Lead Recruiter"
          fullWidth
        />
        <TextField
          label="Vardhan Access Role"
          value="HR"
          disabled
          fullWidth
        />

        <Divider />

        {/* Module Access */}
        <Box>
          <Typography variant="subtitle2" fontWeight={700} gutterBottom>
            Module Access
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 1.5, display: 'block' }}>
            Grant this HR access to additional business modules.
          </Typography>
          <Stack spacing={1}>
            {MODULE_OPTIONS.map((mod) => {
              const isChecked = selectedModules.includes(mod.key);
              return (
                <Paper
                  key={mod.key}
                  variant="outlined"
                  onClick={() => toggleModule(mod.key)}
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                    cursor: 'pointer',
                    borderColor: isChecked ? 'primary.main' : 'divider',
                    bgcolor: isChecked
                      ? (t) => (t.palette.mode === 'dark' ? 'rgba(14, 165, 233, 0.08)' : '#f0f9ff')
                      : 'transparent',
                    transition: 'all 0.15s ease-in-out',
                  }}
                >
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={isChecked}
                        onChange={() => toggleModule(mod.key)}
                        onClick={(e) => e.stopPropagation()}
                        color="primary"
                      />
                    }
                    label={
                      <Box sx={{ ml: 0.5 }}>
                        <Typography variant="body2" fontWeight={600} color="text.primary">
                          {mod.label}
                        </Typography>
                        <FormHelperText sx={{ m: 0 }}>{mod.description}</FormHelperText>
                      </Box>
                    }
                    sx={{ width: '100%', m: 0 }}
                  />
                </Paper>
              );
            })}
          </Stack>
        </Box>

        {/* Structure Permissions */}
        <Box>
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={0.5}>
            <Typography variant="subtitle2" fontWeight={700}>
              Hospital Structure Permissions
            </Typography>
            <Stack direction="row" spacing={1}>
              <Button
                size="small"
                variant="text"
                onClick={() => setSelectedPermissions(PERMISSION_OPTIONS.map((p) => p.key))}
              >
                Select All
              </Button>
              <Button
                size="small"
                variant="text"
                color="inherit"
                onClick={() => setSelectedPermissions([])}
              >
                Clear
              </Button>
            </Stack>
          </Stack>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 1.5, display: 'block' }}>
            Control which Hospital Structure actions this HR can perform.
          </Typography>
          <FormGroup sx={{ gap: 1 }}>
            {PERMISSION_OPTIONS.map((option) => {
              const isChecked = selectedPermissions.includes(option.key);
              return (
                <Paper
                  key={option.key}
                  variant="outlined"
                  onClick={() => togglePermission(option.key)}
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                    cursor: 'pointer',
                    borderColor: isChecked ? 'primary.main' : 'divider',
                    bgcolor: isChecked
                      ? (t) => (t.palette.mode === 'dark' ? 'rgba(14, 165, 233, 0.08)' : '#f0f9ff')
                      : 'transparent',
                    transition: 'all 0.15s ease-in-out',
                  }}
                >
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={isChecked}
                        onChange={() => togglePermission(option.key)}
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
        </Box>
      </Stack>
    </Modal>
  );
};

// ─── Manage Permissions Modal ────────────────────────────────────────────────
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

// ─── Manage Modules Modal ────────────────────────────────────────────────────
const ManageModulesModal = ({ open, hrUser, onClose, onSuccess }) => {
  const [selectedModules, setSelectedModules] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open && hrUser) {
      const grantedNonCore = (hrUser.modules || []).filter((m) => m !== 'core');
      setSelectedModules(grantedNonCore);
      setError('');
      setSubmitting(false);
    }
  }, [open, hrUser]);

  const handleToggle = (key) => {
    setSelectedModules((prev) =>
      prev.includes(key) ? prev.filter((m) => m !== key) : [...prev, key],
    );
  };

  const handleSubmit = async () => {
    if (!hrUser) return;
    setError('');
    try {
      setSubmitting(true);
      const modules = ['core', ...selectedModules];
      await hrService.updateModules(hrUser._id, modules);
      onSuccess(`Module access updated for ${hrUser.name}.`, hrUser._id, modules);
      onClose();
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to update module access.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!hrUser) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Manage Module Access"
      description={`Grant or revoke business module access for ${hrUser.name}.`}
      submitLabel="Save Module Access"
      submittingLabel="Saving..."
      onSubmit={handleSubmit}
      submitting={submitting}
      error={error}
      startIcon={AppsRounded}
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

        {/* Core — always granted, not editable */}
        <Paper
          variant="outlined"
          sx={{
            p: 1.5,
            borderRadius: 2,
            borderColor: 'divider',
            bgcolor: (t) => (t.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : '#f8fafc'),
          }}
        >
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Checkbox checked disabled />
            <Box sx={{ flex: 1 }}>
              <Typography variant="body2" fontWeight={600} color="text.primary">
                Core Platform
              </Typography>
              <FormHelperText sx={{ m: 0 }}>
                Always granted — Authentication, Hospital, Users, Roles, Permissions
              </FormHelperText>
            </Box>
            <Chip label="Default" size="small" color="default" />
          </Stack>
        </Paper>

        <Typography variant="subtitle2" fontWeight={700} color="text.primary">
          Business Modules
        </Typography>

        <FormGroup sx={{ gap: 1.5 }}>
          {MODULE_OPTIONS.map((mod) => {
            const isChecked = selectedModules.includes(mod.key);
            return (
              <Paper
                key={mod.key}
                variant="outlined"
                onClick={() => handleToggle(mod.key)}
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
                      onChange={() => handleToggle(mod.key)}
                      onClick={(e) => e.stopPropagation()}
                      color="primary"
                    />
                  }
                  label={
                    <Box sx={{ ml: 0.5 }}>
                      <Typography variant="body2" fontWeight={600} color="text.primary">
                        {mod.label}
                      </Typography>
                      <FormHelperText sx={{ m: 0 }}>{mod.description}</FormHelperText>
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

// ─── Main HRManagement Page ──────────────────────────────────────────────────
const HRManagement = () => {
  const [hrList, setHrList] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tabIndex, setTabIndex] = useState(0);
  const [statusFilter, setStatusFilter] = useState('active');

  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [permissionModalHr, setPermissionModalHr] = useState(null);
  const [moduleModalHr, setModuleModalHr] = useState(null);
  const [cancelInviteTarget, setCancelInviteTarget] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

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

  const filteredHrList = useMemo(() => {
    if (!statusFilter) return hrList;
    return hrList.filter((hr) => hr.status === statusFilter);
  }, [hrList, statusFilter]);

  const handleResendInvitation = async (invitationId) => {
    try {
      await hrService.resendInvitation(invitationId);
      setSnackbar({ open: true, message: 'Invitation resent successfully.', severity: 'success' });
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
      setSnackbar({ open: true, message: 'Invitation cancelled successfully.', severity: 'success' });
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
      prev.map((item) => (item._id === hrId ? { ...item, permissions: updatedPermissions } : item)),
    );
  };

  const handleModulesUpdated = (msg, hrId, updatedModules) => {
    setSnackbar({ open: true, message: msg, severity: 'success' });
    setHrList((prev) =>
      prev.map((item) => (item._id === hrId ? { ...item, modules: updatedModules } : item)),
    );
  };

  const formatPermissionLabel = (permKey) => {
    const match = PERMISSION_OPTIONS.find((p) => p.key === permKey);
    return match ? match.label.replace(' Floors & Rooms', '') : permKey;
  };

  const formatModuleLabel = (moduleKey) => {
    if (moduleKey === 'core') return null;
    const match = MODULE_OPTIONS.find((m) => m.key === moduleKey);
    return match ? match.label : moduleKey;
  };

    const hrColumns = [
    { key: 'name', label: 'HR Member' },
    { key: 'contact', label: 'Contact' },
    { key: 'status', label: 'Status' },
    { key: 'modules', label: 'Modules' },
    { key: 'permissions', label: 'Structure Permissions' },
  ];

  const renderHrCell = (hr, column) => {
    switch (column.key) {
      case 'name':
        return (
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
        );
      case 'contact':
        return (
          <Box>
            <Typography variant="body2">{hr.email}</Typography>
            {hr.phone && (
              <Typography variant="caption" color="text.secondary">
                {hr.phone}
              </Typography>
            )}
          </Box>
        );
      case 'status':
        return <StatusBadge status={hr.status || 'active'} />;
      case 'modules': {
        const mods = (Array.isArray(hr.modules) ? hr.modules : ['core']).filter((m) => m !== 'core');
        if (mods.length === 0) {
          return (
            <Typography variant="caption" color="text.secondary" fontStyle="italic">
              Core only
            </Typography>
          );
        }
        return (
          <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ gap: 0.5 }}>
            {mods.map((m) => {
              const label = formatModuleLabel(m);
              return label ? (
                <Chip key={m} label={label} size="small" color="primary" sx={{ fontWeight: 500, fontSize: '0.72rem' }} />
              ) : null;
            })}
          </Stack>
        );
      }
      case 'permissions': {
        const perms = Array.isArray(hr.permissions) ? hr.permissions : [];
        if (perms.length === 0) {
          return (
            <Typography variant="caption" color="text.secondary" fontStyle="italic">
              No structure permissions
            </Typography>
          );
        }
        return (
          <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ gap: 0.5 }}>
            {perms.map((p) => (
              <Chip key={p} label={formatPermissionLabel(p)} size="small" color="primary" variant="outlined" sx={{ fontWeight: 500, fontSize: '0.72rem' }} />
            ))}
          </Stack>
        );
      }
      default:
        return null;
    }
  };

  const renderHrActions = (hr) => {
    if (hr.status === 'inactive') return null;
    return (
      <Stack direction="row" spacing={1} justifyContent="flex-end">
        <Tooltip title="Manage module access">
          <Button variant="outlined" size="small" startIcon={<AppsRounded />} onClick={() => setModuleModalHr(hr)} sx={{ fontWeight: 600, textTransform: 'none' }}>Modules</Button>
        </Tooltip>
        <Button variant="outlined" size="small" startIcon={<LockPersonRounded />} onClick={() => setPermissionModalHr(hr)} sx={{ fontWeight: 600, textTransform: 'none' }}>Permissions</Button>
      </Stack>
    );
  };

  const invitationColumns = [
    { key: 'name', label: 'Invited Person' },
    { key: 'email', label: 'Email' },
    { key: 'status', label: 'Status' },
    { key: 'modules', label: 'Modules Granted' },
    { key: 'expires', label: 'Expires At' },
  ];

  const renderInvitationCell = (inv, column) => {
    const isExpired = inv.status === 'pending' && new Date(inv.expiresAt) < new Date();
    const currentStatus = isExpired ? 'expired' : inv.status;
    
    switch (column.key) {
      case 'name':
        return <Typography variant="body2" fontWeight={600}>{inv.name}</Typography>;
      case 'email':
        return <Typography variant="body2">{inv.email}</Typography>;
      case 'status':
        return <StatusBadge status={currentStatus} />;
      case 'modules': {
        const mods = (Array.isArray(inv.modules) ? inv.modules : ['core']).filter((m) => m !== 'core');
        if (mods.length === 0) {
          return <Typography variant="caption" color="text.secondary" fontStyle="italic">Core only</Typography>;
        }
        return (
          <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ gap: 0.5 }}>
            {mods.map((m) => {
              const label = formatModuleLabel(m);
              return label ? <Chip key={m} label={label} size="small" color="primary" variant="outlined" sx={{ fontWeight: 500, fontSize: '0.72rem' }} /> : null;
            })}
          </Stack>
        );
      }
      case 'expires':
        return <Typography variant="body2">{new Date(inv.expiresAt).toLocaleDateString()}</Typography>;
      default:
        return null;
    }
  };

  const renderInvitationActions = (inv) => {
    const isExpired = inv.status === 'pending' && new Date(inv.expiresAt) < new Date();
    if (inv.status === 'pending' && !isExpired) {
      return (
        <Tooltip title="Cancel invitation">
          <IconButton size="small" color="error" onClick={() => {
            setConfirmAction(() => () => handleCancelInvitation(inv._id));
            setConfirmModalOpen(true);
          }}>
            <CloseRounded fontSize="small" />
          </IconButton>
        </Tooltip>
      );
    }
    return null;
  };

  return (
    <AppLayout>
      <Stack spacing={3}>
        <PageHeader
          title="HR Management"
          subtitle="Invite HR members and manage their hospital permissions and module access."
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

        {/* Stats */}
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

        {/* Tabs */}
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
            <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', justifyContent: 'flex-end' }}>
              <Stack direction="row" spacing={1}>
                {[
                  { label: 'All', value: '' },
                  { label: 'Active', value: 'active' },
                  { label: 'Inactive', value: 'inactive' },
                ].map(({ label, value }) => (
                  <Button
                    key={label}
                    variant={statusFilter === value ? 'contained' : 'outlined'}
                    size="small"
                    onClick={() => setStatusFilter(value)}
                    sx={{ fontWeight: 600, minWidth: 80 }}
                  >
                    {label}
                  </Button>
                ))}
              </Stack>
            </Box>
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
              <DataTable
                columns={hrColumns}
                rows={filteredHrList}
                getRowKey={(row) => row._id}
                emptyTitle="No HR members"
                emptyDescription={statusFilter ? `No HR members with status "${statusFilter}" found.` : "No HR members found. Click 'Invite HR' to add one."}
                emptyIcon={PeopleRounded}
                renderCell={renderHrCell}
                renderActions={renderHrActions}
              />
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
              <DataTable
                columns={invitationColumns}
                rows={invitations}
                getRowKey={(row) => row._id}
                renderCell={renderInvitationCell}
                renderActions={renderInvitationActions}
              />
            )}
          </GlassCard>
        )}
      </Stack>

      {/* Modals */}
      <InviteHRModal
        open={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
        onSuccess={(msg) => {
          setSnackbar({ open: true, message: msg, severity: 'success' });
          loadData();
        }}
      />

      <ManagePermissionsModal
        open={Boolean(permissionModalHr)}
        hrUser={permissionModalHr}
        onClose={() => setPermissionModalHr(null)}
        onSuccess={handlePermissionsUpdated}
      />

      <ManageModulesModal
        open={Boolean(moduleModalHr)}
        hrUser={moduleModalHr}
        onClose={() => setModuleModalHr(null)}
        onSuccess={handleModulesUpdated}
      />

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
