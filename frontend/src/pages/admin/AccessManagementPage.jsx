import { useEffect, useState, useCallback } from 'react';
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
  IconButton,
  InputAdornment,
  MenuItem,
  Paper,
  Snackbar,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  CloseRounded,
  SearchRounded,
  SecurityRounded,
  VpnKeyRounded,
  CheckCircleOutlineRounded,
  PeopleOutlineRounded,
} from '@mui/icons-material';
import accessManagementService from '../../services/accessManagement.service';
import AppLayout from '../../components/AppLayout';
import PageHeader from '../../components/PageHeader';
import StatCard from '../../components/StatCard';
import StatusBadge from '../../components/StatusBadge';
import GlassCard from '../../components/GlassCard';
import Modal from '../../components/Modal';
import EmptyState from '../../components/EmptyState';
import ErrorState from '../../components/ErrorState';
import InitialsAvatar from '../../components/InitialsAvatar';
import DataTable from '../../components/DataTable';

const PERMISSION_GROUPS = [
  {
    title: 'Hospital Structure',
    description: 'Permissions for inspecting and configuring floors and rooms.',
    permissions: [
      { key: 'structure.view', label: 'View Floors & Rooms', description: 'Inspect floors, rooms, and structural layout' },
      { key: 'structure.create', label: 'Create Floors & Rooms', description: 'Add new floors and rooms' },
      { key: 'structure.update', label: 'Edit Floors & Rooms', description: 'Update room and floor metadata' },
      { key: 'structure.delete', label: 'Delete / Deactivate Floors & Rooms', description: 'Deactivate rooms and floors safely' },
    ],
  },
  {
    title: 'Workforce & Employees',
    description: 'Permissions for managing employee rosters and invitations.',
    permissions: [
      { key: 'employee.view', label: 'View Employees', description: 'View hospital workforce and employee records' },
      { key: 'employee.create', label: 'Invite Employees', description: 'Send onboarding invitations to new staff and HR' },
      { key: 'employee.update', label: 'Edit Employee Details', description: 'Edit basic employee profile data' },
      { key: 'employee.position.update', label: 'Change Position', description: 'Assign or change an employee’s position' },
      { key: 'employee.delete', label: 'Deactivate / Reactivate Employees', description: 'Deactivate or reactivate workforce accounts' },
    ],
  },
  {
    title: 'Hospital Information',
    description: 'Permissions for hospital profile management.',
    permissions: [
      { key: 'hospital.view', label: 'View Hospital Profile', description: 'Inspect hospital profile information' },
      { key: 'hospital.update', label: 'Edit Hospital Profile', description: 'Update hospital metadata and settings' },
    ],
  },
  {
    title: 'Positions',
    description: 'Permissions for configuring designations and default onboarding modules.',
    permissions: [
      { key: 'position.view', label: 'View Positions', description: 'Inspect position master catalog' },
      { key: 'position.create', label: 'Create Positions', description: 'Add new job positions' },
      { key: 'position.update', label: 'Edit / Deactivate Positions', description: 'Update position details and status' },
    ],
  },
  {
    title: 'Leave Management',
    description: 'Permissions for submitting, inspecting, approving, and managing employee leaves.',
    permissions: [
      { key: 'leave.apply', label: 'Apply Leave', description: 'Submit leave applications for self' },
      { key: 'leave.view_own', label: 'View Own Leaves', description: 'View personal leave history and status' },
      { key: 'leave.view', label: 'View Workforce Leaves', description: 'View leave requests across hospital workforce' },
      { key: 'leave.approve', label: 'Approve / Reject Leave', description: 'Approve or reject pending leave requests' },
      { key: 'leave.manage', label: 'Manage Leaves', description: 'Broader management and cancellation of hospital leaves' },
    ],
  },
];

const MODULE_OPTIONS = [
  { key: 'hrms', label: 'HRMS Module', description: 'Employee management, Roster, Attendance, and Leave tracking' },
];

const ManageAccessModal = ({ open, user, onClose, onSuccess }) => {
  const [selectedPermissions, setSelectedPermissions] = useState([]);
  const [selectedModules, setSelectedModules] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open && user) {
      setSelectedPermissions(user.permissions || []);
      setSelectedModules(user.modules || ['core']);
      setError('');
      setSubmitting(false);
    }
  }, [open, user]);

  const togglePermission = (key) => {
    setSelectedPermissions((prev) =>
      prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key]
    );
  };

  const toggleModule = (key) => {
    setSelectedModules((prev) =>
      prev.includes(key) ? prev.filter((m) => m !== key) : [...prev, key]
    );
  };

  const selectAllPermissionsInGroup = (perms) => {
    const keys = perms.map((p) => p.key);
    setSelectedPermissions((prev) => [...new Set([...prev, ...keys])]);
  };

  const clearPermissionsInGroup = (perms) => {
    const keys = perms.map((p) => p.key);
    setSelectedPermissions((prev) => prev.filter((p) => !keys.includes(p)));
  };

  const handleSubmit = async () => {
    setError('');
    try {
      setSubmitting(true);
      await accessManagementService.updateUserAccess(user.id, {
        permissions: selectedPermissions,
        modules: selectedModules,
      });
      onSuccess(`Access updated successfully for ${user.name}`);
      onClose();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to update user access.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Manage User Access"
      description={`Configure module access and system permissions for ${user.name}`}
      submitLabel="Save Access"
      submittingLabel="Saving..."
      onSubmit={handleSubmit}
      submitting={submitting}
      error={error}
      startIcon={SecurityRounded}
    >
      <Stack spacing={3}>
        {/* User Summary Card */}
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: '#fbfcfd' }}>
          <Stack direction="row" spacing={2} alignItems="center">
            <InitialsAvatar name={user.name} sx={{ width: 44, height: 44 }} />
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle1" fontWeight={700}>
                {user.name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {user.email} • {user.positionName || 'No Position'}
              </Typography>
            </Box>
            <Chip
              label="Employee"
              size="small"
              sx={{ fontWeight: 600, textTransform: 'uppercase', fontSize: '0.75rem' }}
            />
          </Stack>
        </Paper>

        {/* Module Access Section */}
        <Box>
          <Typography variant="subtitle2" fontWeight={700} gutterBottom>
            Module Access
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 1.5, display: 'block' }}>
            Grant this user access to business modules. Core Platform is automatically active.
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
                    bgcolor: isChecked ? (t) => (t.palette.mode === 'dark' ? 'rgba(14, 165, 233, 0.08)' : '#f0f9ff') : 'transparent',
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

        <Divider />

        {/* Grouped Permissions Section */}
        <Box>
          <Typography variant="subtitle2" fontWeight={700} gutterBottom>
            System Permissions
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
            Grant explicit granular permissions to this account.
          </Typography>

          <Stack spacing={2.5}>
            {PERMISSION_GROUPS.map((group) => {
              const groupKeys = group.permissions.map((p) => p.key);
              const allSelected = groupKeys.every((k) => selectedPermissions.includes(k));
              return (
                <Box key={group.title}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                    <Typography variant="body2" fontWeight={700}>
                      {group.title}
                    </Typography>
                    <Stack direction="row" spacing={1}>
                      <Button
                        size="small"
                        variant="text"
                        onClick={() => selectAllPermissionsInGroup(group.permissions)}
                        disabled={allSelected}
                      >
                        Select All
                      </Button>
                      <Button
                        size="small"
                        variant="text"
                        color="inherit"
                        onClick={() => clearPermissionsInGroup(group.permissions)}
                      >
                        Clear
                      </Button>
                    </Stack>
                  </Stack>
                  <FormGroup sx={{ gap: 1 }}>
                    {group.permissions.map((option) => {
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
                            bgcolor: isChecked ? (t) => (t.palette.mode === 'dark' ? 'rgba(14, 165, 233, 0.08)' : '#f0f9ff') : 'transparent',
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
              );
            })}
          </Stack>
        </Box>
      </Stack>
    </Modal>
  );
};

const AccessManagementPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const showSnack = (message, severity = 'success') =>
    setSnackbar({ open: true, message, severity });

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await accessManagementService.listWorkforceUsers();
      setUsers(res?.data?.data || []);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load workforce access list.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      !search ||
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      (u.positionName && u.positionName.toLowerCase().includes(search.toLowerCase()));

    const matchesRole = !roleFilter || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const stats = {
    total: users.length,
    hrms: users.filter((u) => u.modules?.includes('hrms')).length,
    active: users.filter((u) => u.status === 'active').length,
  };

  const columns = [
    { key: 'user', label: 'USER' },
    { key: 'role', label: 'ROLE' },
    { key: 'position', label: 'POSITION' },
    { key: 'modules', label: 'MODULES' },
    { key: 'permissions', label: 'PERMISSIONS' },
    { key: 'status', label: 'STATUS' },
  ];

  const renderCell = (u, column) => {
    switch (column.key) {
      case 'user':
        return (
          <Stack direction="row" spacing={1.5} alignItems="center">
            <InitialsAvatar name={u.name} size={32} />
            <Box>
              <Typography variant="body2" fontWeight={600}>
                {u.name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {u.email}
              </Typography>
            </Box>
          </Stack>
        );
      case 'role':
        return (
          <Chip
            label="Employee"
            size="small"
            variant="outlined"
            sx={{
              fontSize: '0.75rem',
              height: 22,
              fontWeight: 600,
              backgroundColor: 'transparent',
              borderColor: '#E5E5E5',
              color: '#0A0A0A',
            }}
          />
        );
      case 'position':
        return <Typography variant="body2">{u.positionName || '—'}</Typography>;
      case 'modules':
        return (
          <Box display="flex" gap={0.5} flexWrap="wrap">
            {(u.modules || ['core']).map((m) => (
              <Chip
                key={m}
                label={m.toUpperCase()}
                size="small"
                variant="outlined"
                sx={{ fontSize: '0.7rem', height: 20 }}
              />
            ))}
          </Box>
        );
      case 'permissions':
        return (
          <Typography variant="body2" fontWeight={500}>
            {u.permissions?.length ? `${u.permissions.length} granted` : 'Default only'}
          </Typography>
        );
      case 'status':
        return <StatusBadge status={u.status === 'active' ? 'active' : 'inactive'} />;
      default:
        return null;
    }
  };

  const renderActions = (u) => (
    <Box display="flex" justifyContent="flex-end">
      <Button
        size="small"
        variant="outlined"
        startIcon={<VpnKeyRounded fontSize="small" />}
        onClick={(e) => {
          e.stopPropagation();
          setSelectedUser(u);
        }}
        sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 1.5 }}
      >
        Manage
      </Button>
    </Box>
  );

  if (error) {
    return (
      <AppLayout>
        <ErrorState message={error} onRetry={loadUsers} />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <Box mb={4}>
        <PageHeader
          title="Access Management"
          subtitle="Configure module access and system permissions for hospital workforce."
        />
      </Box>

      {/* Summary Cards */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
          gap: 3,
          mb: 4,
        }}
      >
        <StatCard
          label="Total Workforce Users"
          value={loading ? '-' : stats.total}
          icon={PeopleOutlineRounded}
        />
        <StatCard
          label="HRMS Module Enabled"
          value={loading ? '-' : stats.hrms}
          icon={SecurityRounded}
        />
        <StatCard
          label="Active Accounts"
          value={loading ? '-' : stats.active}
          icon={CheckCircleOutlineRounded}
        />
      </Box>

      {/* Main Container Card */}
      <GlassCard sx={{ p: { xs: 2, sm: 3 } }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          alignItems={{ xs: 'stretch', sm: 'center' }}
          justifyContent="space-between"
          sx={{ mb: 3 }}
        >
          <TextField
            placeholder="Search by name, email, or position..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            size="small"
            sx={{ flex: 1, minWidth: { xs: '100%', sm: 280 } }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchRounded fontSize="small" sx={{ color: 'text.secondary' }} />
                  </InputAdornment>
                ),
                endAdornment: search ? (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setSearch('')}>
                      <CloseRounded fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ) : null,
              },
            }}
          />

        </Stack>

        {loading && users.length === 0 ? (
          <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}>
            <Typography color="text.secondary">Loading workforce access list...</Typography>
          </Box>
        ) : filteredUsers.length === 0 ? (
          <EmptyState
            title="No workforce users found"
            description={
              search || roleFilter
                ? 'No users match your search or filter criteria.'
                : 'There are currently no workforce users assigned to this hospital.'
            }
            icon={PeopleOutlineRounded}
          />
        ) : (
          <DataTable
            columns={columns}
            rows={filteredUsers}
            getRowKey={(u) => u.id}
            renderCell={renderCell}
            renderActions={renderActions}
          />
        )}
      </GlassCard>

      {/* Manage Access Modal */}
      <ManageAccessModal
        open={Boolean(selectedUser)}
        user={selectedUser}
        onClose={() => setSelectedUser(null)}
        onSuccess={(msg) => {
          showSnack(msg);
          loadUsers();
          setSelectedUser(null);
        }}
      />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((p) => ({ ...p, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          severity={snackbar.severity}
          variant="filled"
          onClose={() => setSnackbar((p) => ({ ...p, open: false }))}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </AppLayout>
  );
};

export default AccessManagementPage;
