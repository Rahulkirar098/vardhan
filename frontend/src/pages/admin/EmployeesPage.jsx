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
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  AddRounded,
  CheckCircleOutlineRounded,
  CloseRounded,
  EditRounded,
  EmailRounded,
  GroupsRounded,
  MarkEmailReadRounded,
  PersonOffRounded,
  PersonRounded,
  PowerSettingsNewRounded,
  SearchRounded,
} from '@mui/icons-material';
import employeeService from '../../services/employee.service';
import positionService from '../../services/position.service';
import auth from '../../services/auth.service';
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
import DataTable from '../../components/DataTable';
import { hasPermission, PERMISSIONS } from '../../utils/permissions';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const canCreate = () => hasPermission(PERMISSIONS.EMPLOYEE_CREATE);
const canUpdate = () => hasPermission(PERMISSIONS.EMPLOYEE_UPDATE);
const canDeactivate = () => hasPermission(PERMISSIONS.EMPLOYEE_DELETE);

const formatDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

// ─── Invite Employee Modal ────────────────────────────────────────────────────
const InviteEmployeeModal = ({ open, onClose, onSuccess, positions = [] }) => {
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    positionId: '',
    role: '',
    dateOfJoining: '',
    employeeId: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const resetForm = () => {
    setForm({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      positionId: '',
      role: '',
      dateOfJoining: '',
      employeeId: '',
    });
    setError('');
    setSubmitting(false);
  };

  useEffect(() => {
    if (open) {
      resetForm();
    }
  }, [open]);

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    setError('');
    if (!form.firstName.trim()) { setError('First name is required.'); return; }
    if (!form.lastName.trim()) { setError('Last name is required.'); return; }
    if (!form.email.trim()) { setError('Email is required.'); return; }
    if (!form.positionId) { setError('Position is required.'); return; }
    if (!form.role) { setError('Vardhan Role is required.'); return; }

    try {
      setSubmitting(true);
      await employeeService.inviteEmployee({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        positionId: form.positionId,
        role: form.role,
        dateOfJoining: form.dateOfJoining || undefined,
        employeeId: form.employeeId.trim() || undefined,
      });
      onSuccess('Invitation sent successfully.');
      handleClose();
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to send employee invitation.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Invite Employee"
      description="Send an onboarding invitation to a new employee."
      submitLabel="Send Invitation"
      submittingLabel="Sending..."
      onSubmit={handleSubmit}
      submitting={submitting}
      error={error}
      startIcon={AddRounded}
    >
      <Stack spacing={2.5}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField
            label="First Name"
            name="firstName"
            value={form.firstName}
            onChange={handleChange}
            required
            fullWidth
            placeholder="e.g. Rahul"
            autoFocus
          />
          <TextField
            label="Last Name"
            name="lastName"
            value={form.lastName}
            onChange={handleChange}
            required
            fullWidth
            placeholder="e.g. Sharma"
          />
        </Stack>
        <TextField
          label="Email Address"
          name="email"
          type="email"
          value={form.email}
          onChange={handleChange}
          required
          fullWidth
          placeholder="e.g. rahul.sharma@hospital.com"
        />
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField
            label="Phone (optional)"
            name="phone"
            value={form.phone}
            onChange={handleChange}
            fullWidth
            placeholder="+91 98765 43210"
          />
          <TextField
            label="Employee ID (optional)"
            name="employeeId"
            value={form.employeeId}
            onChange={handleChange}
            fullWidth
            placeholder="Auto-generated if blank"
          />
        </Stack>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField
            select
            label="Position *"
            name="positionId"
            value={form.positionId}
            onChange={handleChange}
            required
            fullWidth
            slotProps={{
              inputLabel: { shrink: true },
              select: {
                displayEmpty: true,
                renderValue: (selected) => {
                  if (!selected) {
                    return <Typography component="span" variant="body2" color="text.secondary">Select Position</Typography>;
                  }
                  const found = positions.find((p) => p._id === selected);
                  return found ? found.name : selected;
                },
              },
            }}
          >
            <MenuItem value="">
              <em>Select Position</em>
            </MenuItem>
            {positions.map((p) => (
              <MenuItem key={p._id} value={p._id}>
                {p.name}
              </MenuItem>
            ))}
          </TextField>
        </Stack>
        <TextField
          label="Date of Joining (optional)"
          name="dateOfJoining"
          type="date"
          value={form.dateOfJoining}
          onChange={handleChange}
          fullWidth
          slotProps={{ inputLabel: { shrink: true } }}
        />
      </Stack>
    </Modal>
  );
};

// ─── Edit Employee Modal ──────────────────────────────────────────────────────
const EditEmployeeModal = ({ open, employee, onClose, onSuccess, positions }) => {
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', positionId: '', dateOfJoining: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  const hasPositionUpdate = hasPermission(PERMISSIONS.EMPLOYEE_POSITION_UPDATE);

  useEffect(() => {
    if (open && employee) {
      setForm({
        firstName: employee.firstName || '',
        lastName: employee.lastName || '',
        email: employee.email || '',
        phone: employee.phone || '',
        positionId: employee.positionId?._id || employee.positionId || '',
        dateOfJoining: employee.dateOfJoining ? new Date(employee.dateOfJoining).toISOString().split('T')[0] : '',
      });
      setError('');
      setSubmitting(false);
    }
  }, [open, employee]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    setError('');
    if (!form.firstName.trim()) { setError('First name is required.'); return; }
    if (!form.lastName.trim()) { setError('Last name is required.'); return; }
    if (!form.email.trim()) { setError('Email is required.'); return; }

    try {
      setSubmitting(true);
      
      const payload = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        dateOfJoining: form.dateOfJoining || undefined,
      };

      if (hasPositionUpdate && form.positionId) {
        payload.positionId = form.positionId;
      }

      await employeeService.updateEmployee(employee._id, payload);
      
      onSuccess('Employee updated successfully.');
      onClose();
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to update employee.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Edit Employee"
      description="Update basic information for this employee."
      submitLabel="Save Changes"
      submittingLabel="Saving..."
      onSubmit={handleSubmit}
      submitting={submitting}
      error={error}
      startIcon={EditRounded}
    >
      <Stack spacing={2.5}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField
            label="First Name"
            name="firstName"
            value={form.firstName}
            onChange={handleChange}
            required
            fullWidth
            autoFocus
          />
          <TextField
            label="Last Name"
            name="lastName"
            value={form.lastName}
            onChange={handleChange}
            required
            fullWidth
          />
        </Stack>
        <TextField
          label="Email Address"
          name="email"
          type="email"
          value={form.email}
          onChange={handleChange}
          required
          fullWidth
        />
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField
            label="Phone"
            name="phone"
            value={form.phone}
            onChange={handleChange}
            fullWidth
          />
          {hasPositionUpdate ? (
            <TextField
              select
              label="Position"
              name="positionId"
              value={form.positionId}
              onChange={handleChange}
              fullWidth
              slotProps={{
                inputLabel: { shrink: true },
                select: { displayEmpty: true },
              }}
            >
              <MenuItem value="">
                <em>None</em>
              </MenuItem>
              {employee?.positionId?._id && !positions.some(p => p._id === employee.positionId?._id) && (
                <MenuItem key={employee.positionId._id} value={employee.positionId._id}>
                  {employee.positionId.name} (Current)
                </MenuItem>
              )}
              {positions.map((p) => (
                <MenuItem key={p._id} value={p._id}>{p.name}</MenuItem>
              ))}
            </TextField>
          ) : (
            <TextField
              label="Position"
              name="positionId"
              value={positions.find(p => p._id === form.positionId)?.name || employee?.positionId?.name || 'None'}
              fullWidth
              disabled
            />
          )}
        </Stack>
        <TextField
          label="Date of Joining"
          name="dateOfJoining"
          type="date"
          value={form.dateOfJoining}
          onChange={handleChange}
          fullWidth
          slotProps={{ inputLabel: { shrink: true } }}
        />
      </Stack>
    </Modal>
  );
};

// ─── Employee Details Modal ───────────────────────────────────────────────────
const EmployeeDetailsModal = ({ open, employee, onClose }) => {
  if (!employee) return null;
  const fullName = `${employee.firstName} ${employee.lastName}`;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Employee Details"
      description={`Profile information for ${fullName}`}
      hideSubmit
      closeLabel="Close"
    >
      <Stack spacing={2.5}>
        <Stack direction="row" spacing={2} alignItems="center">
          <InitialsAvatar name={fullName} sx={{ width: 56, height: 56, fontSize: '1.25rem' }} />
          <Box>
            <Typography variant="h6" fontWeight={700}>{fullName}</Typography>
            <StatusBadge status={employee.employmentStatus === 'ACTIVE' ? 'active' : 'inactive'} />
          </Box>
        </Stack>
        <Divider />
        {[
          { label: 'Employee ID', value: employee.employeeId },
          { label: 'Email', value: employee.email },
          { label: 'Phone', value: employee.phone || '—' },
          { label: 'Position', value: employee.positionId?.name || '—' },
          { label: 'Date of Joining', value: formatDate(employee.dateOfJoining) },
          { label: 'Employment Status', value: employee.employmentStatus },
          ...(employee.employmentStatus === 'INACTIVE' ? [{ label: 'Leaving Date', value: formatDate(employee.leavingDate) }] : []),
          { label: 'Vardhan Account', value: employee.userId ? (employee.employmentStatus === 'INACTIVE' ? 'Disabled' : 'Active') : 'No Login' },
          { label: 'Role', value: employee.userId ? 'Employee' : '—' },
          { label: 'Modules', value: employee.userId?.modules?.length ? employee.userId.modules.join(', ') : '—' },
          { label: 'Permissions', value: employee.userId?.permissions?.length ? employee.userId.permissions.length + ' permissions' : '—' },
          ...(employee.createdBy ? [{
            label: 'Created By',
            value: typeof employee.createdBy === 'object'
              ? (employee.createdBy.name || 'Admin')
              : 'Admin',
          }] : []),
          { label: 'Created', value: formatDate(employee.createdAt) },
        ].map(({ label, value }) => (
          <Stack key={label} direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="body2" color="text.secondary" sx={{ minWidth: 140 }}>
              {label}
            </Typography>
            <Typography variant="body2" fontWeight={500} textAlign="right" color={value === 'Disabled' ? 'error' : 'text.primary'}>
              {value}
            </Typography>
          </Stack>
        ))}
      </Stack>
    </Modal>
  );
};

// ─── Main EmployeesPage ───────────────────────────────────────────────────────
const EmployeesPage = () => {
  const [employees, setEmployees] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [positions, setPositions] = useState([]);
  const [stats, setStats] = useState({ total: 0, active: 0, inactive: 0, pendingInvitations: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tabIndex, setTabIndex] = useState(0);

  // Search & filter
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  // Modals
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editEmployee, setEditEmployee] = useState(null);
  const [detailsEmployee, setDetailsEmployee] = useState(null);
  const [deactivateTarget, setDeactivateTarget] = useState(null);
  const [deactivating, setDeactivating] = useState(false);

  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const showSnack = (message, severity = 'success') =>
    setSnackbar({ open: true, message, severity });

  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    auth.me().then(res => {
      const user = res?.data?.data;
      if (user) {
        setCurrentUser(user);
        if (user.permissions) {
          localStorage.setItem('permissions', JSON.stringify(user.permissions));
        }
        if (user.modules) {
          localStorage.setItem('modules', JSON.stringify(user.modules));
        }
      }
    }).catch(() => {});
  }, []);

  const hasCreate = hasPermission(PERMISSIONS.EMPLOYEE_CREATE, currentUser?.role, currentUser?.permissions);
  const hasUpdate = hasPermission(PERMISSIONS.EMPLOYEE_UPDATE, currentUser?.role, currentUser?.permissions);
  const hasDeactivate = hasPermission(PERMISSIONS.EMPLOYEE_DELETE, currentUser?.role, currentUser?.permissions);

  const loadEmployees = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const [empRes, invRes, statRes, posRes] = await Promise.all([
        employeeService.listEmployees({ search: search || undefined, status: statusFilter || undefined, role: roleFilter || undefined }),
        employeeService.listInvitations().catch(() => ({ data: { data: [] } })),
        employeeService.getEmployeeStats().catch(() => ({ data: { data: { total: 0, active: 0, inactive: 0, pendingInvitations: 0 } } })),
        positionService.getPositions({ status: 'active' }).catch(() => ({ data: [] })),
      ]);
      setEmployees(empRes?.data?.data?.employees || []);
      const allInvs = invRes?.data?.data || [];
      setInvitations(allInvs.filter(i => i.status === 'pending'));
      setStats(statRes?.data?.data || { total: 0, active: 0, inactive: 0, pendingInvitations: 0 });
      setPositions(posRes?.data || []);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load employees.');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, roleFilter]);

  useEffect(() => {
    const t = setTimeout(loadEmployees, search ? 350 : 0);
    return () => clearTimeout(t);
  }, [loadEmployees]);

  const handleDeactivateConfirm = async () => {
    if (!deactivateTarget) return;
    const isActive = deactivateTarget.employmentStatus === 'ACTIVE';
    const newStatus = isActive ? 'INACTIVE' : 'ACTIVE';
    try {
      setDeactivating(true);
      await employeeService.updateEmployeeStatus(deactivateTarget._id, newStatus);
      showSnack(`Employee ${isActive ? 'deactivated' : 'activated'} successfully.`);
      setDeactivateTarget(null);
      loadEmployees();
    } catch (err) {
      showSnack(err?.response?.data?.message || 'Failed to update employee status.', 'error');
    } finally {
      setDeactivating(false);
    }
  };

  const employeeColumns = [
    { key: 'employee', label: 'EMPLOYEE' },
    { key: 'employeeId', label: 'EMPLOYEE ID' },
    { key: 'position', label: 'POSITION' },
    { key: 'role', label: 'VARDHAN ROLE' },
    { key: 'joined', label: 'JOINED' },
    { key: 'status', label: 'STATUS' }
  ];
  
  const renderEmployeeCell = (emp, column) => {
    const fullName = `${emp.firstName} ${emp.lastName}`;
    const isActive = emp.employmentStatus === 'ACTIVE';
    const roleLabel = emp.userId ? 'Employee' : 'No Login';
  
    switch (column.key) {
      case 'employee':
        return (
          <Stack direction="row" spacing={1.5} alignItems="center">
            <InitialsAvatar name={fullName} size={32} />
            <Box>
              <Typography variant="body2" fontWeight={600}>{fullName}</Typography>
              <Typography variant="caption" color="text.secondary">{emp.email}</Typography>
            </Box>
          </Stack>
        );
      case 'employeeId':
        return (
          <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
            {emp.employeeId || '—'}
          </Typography>
        );
      case 'position':
        return <Typography variant="body2">{emp.positionId?.name || '—'}</Typography>;
      case 'role':
        return (
          <Chip
            label={roleLabel}
            size="small"
            variant="outlined"
            sx={{
              fontSize: '0.75rem',
              height: 22,
              fontWeight: 600,
              backgroundColor: '#F5F5F5',
              borderColor: '#E5E5E5',
              color: '#0A0A0A'
            }}
          />
        );
      case 'joined':
        return <Typography variant="body2">{formatDate(emp.dateOfJoining)}</Typography>;
      case 'status':
        return <StatusBadge status={isActive ? 'active' : 'inactive'} />;
      default:
        return null;
    }
  };
  
  const renderEmployeeActions = (emp) => {
    const isActive = emp.employmentStatus === 'ACTIVE';
    return (
      <Box display="flex" justifyContent="flex-end" gap={0.5}>
        <Tooltip title="View Details">
          <IconButton size="small" onClick={(e) => { e.stopPropagation(); setDetailsEmployee(emp); }}>
            <PersonRounded fontSize="small" />
          </IconButton>
        </Tooltip>
        {hasUpdate && isActive && (
          <Tooltip title="Edit Employee">
            <IconButton size="small" onClick={(e) => { e.stopPropagation(); setEditEmployee(emp); }}>
              <EditRounded fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
        {hasDeactivate && (
          <Tooltip title={isActive ? 'Deactivate Employee' : 'Activate Employee'}>
            <IconButton
              size="small"
              color={isActive ? 'error' : 'success'}
              onClick={(e) => { e.stopPropagation(); setDeactivateTarget(emp); }}
            >
              <PowerSettingsNewRounded fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </Box>
    );
  };

  const invitationColumns = [
    { key: 'name', label: 'NAME' },
    { key: 'email', label: 'EMAIL' },
    { key: 'position', label: 'POSITION' },
    { key: 'status', label: 'STATUS' },
    { key: 'expires', label: 'EXPIRES' }
  ];
  
  const renderInvitationCell = (inv, column) => {
    const isExpiredByDate = inv.status === 'pending' && new Date(inv.expiresAt) < new Date();
    const effectiveStatus = isExpiredByDate ? 'expired' : inv.status;
  
    switch (column.key) {
      case 'name':
        return <Typography variant="body2" fontWeight={600}>{inv.firstName} {inv.lastName}</Typography>;
      case 'email':
        return <Typography variant="body2">{inv.email}</Typography>;
      case 'position':
        return <Typography variant="body2">{inv.positionId?.name || '—'}</Typography>;
      case 'status':
        return <StatusBadge status={effectiveStatus} />;
      case 'expires':
        return <Typography variant="body2">{inv.expiresAt ? formatDate(inv.expiresAt) : '—'}</Typography>;
      default:
        return null;
    }
  };
  
  const renderInvitationActions = (inv) => {
    const isExpiredByDate = inv.status === 'pending' && new Date(inv.expiresAt) < new Date();
    if (inv.status === 'pending' && !isExpiredByDate && hasCreate) {
      return (
        <Box display="flex" justifyContent="flex-end">
          <Tooltip title="Cancel Invitation">
            <IconButton
              size="small"
              color="error"
              onClick={async (e) => {
                e.stopPropagation();
                try {
                  await employeeService.cancelInvitation(inv._id);
                  showSnack('Invitation cancelled.');
                  loadEmployees();
                } catch (err) {
                  showSnack(err?.response?.data?.message || 'Failed to cancel.', 'error');
                }
              }}
            >
              <CloseRounded fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      );
    }
    return null;
  };

  if (error) {
    return (
      <AppLayout>
        <ErrorState message={error} onRetry={loadEmployees} />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      {/* Header */}
      <Box mb={4}>
        <PageHeader
          title="Employees"
          subtitle="Manage your hospital's employee roster."
          action={
            hasCreate && (
              <Button
                variant="contained"
                startIcon={<AddRounded />}
                onClick={() => setInviteOpen(true)}
              >
                Invite Employee
              </Button>
            )
          }
        />
      </Box>

      {/* Summary StatCards */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
          gap: 3,
          mb: 4,
        }}
      >
        <StatCard
          label="Total Employees"
          value={loading ? '-' : stats.total}
          icon={GroupsRounded}
        />
        <StatCard
          label="Active"
          value={loading ? '-' : stats.active}
          icon={CheckCircleOutlineRounded}
        />
        <StatCard
          label="Inactive"
          value={loading ? '-' : stats.inactive}
          icon={PersonOffRounded}
        />
        <StatCard
          label="Pending Invitations"
          value={loading ? '-' : (stats.pendingInvitations ?? invitations.length)}
          icon={MarkEmailReadRounded}
        />
      </Box>

      {/* Main Container Card */}
      <GlassCard sx={{ p: { xs: 2, sm: 3 } }}>
        {/* Tabs for Employees vs Invitations */}
        <Box sx={{ borderBottom: '1px solid #E5E5E5', mb: 3 }}>
          <Tabs
            value={tabIndex}
            onChange={(_, v) => setTabIndex(v)}
            textColor="primary"
            indicatorColor="primary"
            sx={{
              minHeight: 40,
              '& .MuiTab-root': {
                minHeight: 40,
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '0.875rem',
                py: 1,
              },
            }}
          >
            <Tab
              label={`Employees (${employees.length})`}
              icon={<GroupsRounded fontSize="small" />}
              iconPosition="start"
            />
            <Tab
              label={`Invitations (${invitations.length})`}
              icon={<EmailRounded fontSize="small" />}
              iconPosition="start"
            />
          </Tabs>
        </Box>

        {/* Employees Tab Content */}
        {tabIndex === 0 && (
          <>
            {/* Filter Row: Search + Role Filter + Status Filter */}
            <Stack
              direction={{ xs: 'column', md: 'row' }}
              spacing={2}
              alignItems={{ xs: 'stretch', md: 'center' }}
              justifyContent="space-between"
              sx={{ mb: 3 }}
            >
              <TextField
                placeholder="Search employees..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                size="small"
                sx={{ flex: 1, minWidth: { xs: '100%', sm: 260 } }}
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

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>

                <TextField
                  select
                  size="small"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  sx={{ minWidth: 150 }}
                  slotProps={{
                    select: {
                      displayEmpty: true,
                    },
                  }}
                >
                  <MenuItem value="">All Status</MenuItem>
                  <MenuItem value="ACTIVE">Active</MenuItem>
                  <MenuItem value="INACTIVE">Inactive</MenuItem>
                </TextField>
              </Stack>
            </Stack>

            {/* Data Table */}
            {loading && employees.length === 0 ? (
              <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}>
                <Typography color="text.secondary">Loading employees...</Typography>
              </Box>
            ) : employees.length === 0 ? (
              <EmptyState
                title="No employees found"
                description={
                  search || statusFilter || roleFilter
                    ? 'No employees match your search or filter criteria.'
                    : 'Start by inviting your first hospital employee.'
                }
                icon={GroupsRounded}
                actionLabel={hasCreate ? 'Invite Employee' : undefined}
                onAction={hasCreate ? () => setInviteOpen(true) : undefined}
              />
            ) : (
              <DataTable
                columns={employeeColumns}
                rows={employees}
                getRowKey={(emp) => emp._id}
                renderCell={renderEmployeeCell}
                renderActions={renderEmployeeActions}
              />
            )}
          </>
        )}

        {/* Invitations Tab Content */}
        {tabIndex === 1 && (
          <>
            {loading && invitations.length === 0 ? (
              <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}>
                <Typography color="text.secondary">Loading invitations...</Typography>
              </Box>
            ) : invitations.length === 0 ? (
              <EmptyState
                title="No invitations found"
                description="There are currently no pending employee invitations."
                icon={EmailRounded}
                actionLabel={hasCreate ? 'Invite Employee' : undefined}
                onAction={hasCreate ? () => setInviteOpen(true) : undefined}
              />
            ) : (
              <DataTable
                columns={invitationColumns}
                rows={invitations}
                getRowKey={(inv) => inv._id}
                renderCell={renderInvitationCell}
                renderActions={renderInvitationActions}
              />
            )}
          </>
        )}
      </GlassCard>

      {/* Modals */}
      <InviteEmployeeModal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        onSuccess={(msg) => { showSnack(msg); loadEmployees(); }}
        positions={positions}
      />

      <EditEmployeeModal
        open={Boolean(editEmployee)}
        employee={editEmployee}
        onClose={() => setEditEmployee(null)}
        onSuccess={(msg) => { showSnack(msg); loadEmployees(); setEditEmployee(null); }}
        positions={positions}
      />

      <EmployeeDetailsModal
        open={Boolean(detailsEmployee)}
        employee={detailsEmployee}
        onClose={() => setDetailsEmployee(null)}
      />

      <ConfirmDialog
        open={Boolean(deactivateTarget)}
        title={deactivateTarget?.employmentStatus === 'ACTIVE' ? 'Deactivate Employee?' : 'Activate Employee?'}
        message={
          deactivateTarget?.employmentStatus === 'ACTIVE'
            ? `Are you sure you want to deactivate ${deactivateTarget?.firstName} ${deactivateTarget?.lastName}? Their login will also be disabled.`
            : `Are you sure you want to reactivate ${deactivateTarget?.firstName} ${deactivateTarget?.lastName}?`
        }
        confirmText={deactivateTarget?.employmentStatus === 'ACTIVE' ? 'Deactivate' : 'Activate'}
        cancelText="Cancel"
        loading={deactivating}
        destructive={deactivateTarget?.employmentStatus === 'ACTIVE'}
        onConfirm={handleDeactivateConfirm}
        onCancel={() => setDeactivateTarget(null)}
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

export default EmployeesPage;
