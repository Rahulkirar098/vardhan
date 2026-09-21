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
  Grid,
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
  SearchRounded,
  SecurityRounded,
  ToggleOffRounded,
  ToggleOnRounded,
} from '@mui/icons-material';
import employeeService from '../../services/employee.service';
import positionService from '../../services/position.service';
import hrService from '../../services/hr.service';
import AppLayout from '../../components/AppLayout';
import PageHeader from '../../components/PageHeader';
import StatCard from '../../components/StatCard';
import StatusBadge from '../../components/StatusBadge';
import Modal from '../../components/Modal';
import ConfirmDialog from '../../components/ConfirmDialog';
import ErrorState from '../../components/ErrorState';
import InitialsAvatar from '../../components/InitialsAvatar';
import DataTable from '../../components/DataTable';
import { hasPermission, PERMISSIONS } from '../../utils/permissions';

const PERMISSION_OPTIONS = [
  { key: 'structure.view', label: 'View Floors & Rooms', description: 'Allow HR to inspect floors, rooms, and structural layout' },
  { key: 'structure.create', label: 'Create Floors & Rooms', description: 'Allow HR to add new floors and rooms' },
  { key: 'structure.update', label: 'Edit Floors & Rooms', description: 'Allow HR to update room and floor metadata' },
  { key: 'structure.delete', label: 'Delete/Deactivate Floors & Rooms', description: 'Allow HR to deactivate rooms and floors safely' },
];

const MODULE_OPTIONS = [
  { key: 'hrms', label: 'HRMS Module', description: 'Employee management, Roster, Attendance, and Leave tracking' },
];

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
            label="Position"
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
                    return <Typography component="span" variant="body1" color="text.secondary">Select Position</Typography>;
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
          <TextField
            select
            label="Vardhan Role"
            name="role"
            value={form.role}
            onChange={handleChange}
            required
            fullWidth
            slotProps={{
              inputLabel: { shrink: true },
              select: {
                displayEmpty: true,
                renderValue: (selected) => {
                  if (!selected) {
                    return <Typography component="span" variant="body1" color="text.secondary">Select Role</Typography>;
                  }
                  if (selected === 'employee') return 'Employee';
                  if (selected === 'hr') return 'HR';
                  return selected;
                },
              },
            }}
          >
            <MenuItem value="">
              <em>Select Role</em>
            </MenuItem>
            <MenuItem value="employee">Employee</MenuItem>
            <MenuItem value="hr">HR</MenuItem>
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
  const [selectedModules, setSelectedModules] = useState([]);
  const [selectedPermissions, setSelectedPermissions] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  const hasPositionUpdate = hasPermission(PERMISSIONS.EMPLOYEE_POSITION_UPDATE);
  const isHR = employee?.userId?.role === 'hr';

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
      setSelectedModules(employee.userId?.modules || []);
      setSelectedPermissions(employee.userId?.permissions || []);
      setError('');
      setSubmitting(false);
    }
  }, [open, employee]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const toggleModule = (key) => {
    setSelectedModules((prev) => prev.includes(key) ? prev.filter((m) => m !== key) : [...prev, key]);
  };

  const togglePermission = (key) => {
    setSelectedPermissions((prev) => prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key]);
  };

  const handleSubmit = async () => {
    setError('');
    if (!form.firstName.trim()) { setError('First name is required.'); return; }
    if (!form.lastName.trim()) { setError('Last name is required.'); return; }
    if (!form.email.trim()) { setError('Email is required.'); return; }

    try {
      setSubmitting(true);
      
      const updatePromises = [
        employeeService.updateEmployee(employee._id, {
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          email: form.email.trim(),
          phone: form.phone.trim() || undefined,
          positionId: form.positionId || undefined,
          dateOfJoining: form.dateOfJoining || undefined,
        })
      ];

      // Update HR permissions and modules concurrently if they are HR
      if (isHR && employee.userId?._id) {
        updatePromises.push(hrService.updatePermissions(employee.userId._id, selectedPermissions));
        updatePromises.push(hrService.updateModules(employee.userId._id, selectedModules));
      }

      await Promise.all(updatePromises);
      
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
              {positions.map((p) => (
                <MenuItem key={p._id} value={p._id}>{p.name}</MenuItem>
              ))}
            </TextField>
          ) : (
            <TextField
              label="Position"
              name="positionId"
              value={positions.find(p => p._id === form.positionId)?.name || 'None'}
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

        {isHR && (
          <>
            <Divider />
            <Box>
              <Typography variant="subtitle2" fontWeight={700} gutterBottom>Module Access</Typography>
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
                        p: 1.5, borderRadius: 2, cursor: 'pointer',
                        borderColor: isChecked ? 'primary.main' : 'divider',
                        bgcolor: isChecked ? (t) => (t.palette.mode === 'dark' ? 'rgba(14, 165, 233, 0.08)' : '#f0f9ff') : 'transparent',
                        transition: 'all 0.15s ease-in-out',
                      }}
                    >
                      <FormControlLabel
                        control={
                          <Checkbox checked={isChecked} onChange={() => toggleModule(mod.key)} onClick={(e) => e.stopPropagation()} color="primary" />
                        }
                        label={
                          <Box sx={{ ml: 0.5 }}>
                            <Typography variant="body2" fontWeight={600} color="text.primary">{mod.label}</Typography>
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
            
            <Box>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={0.5}>
                <Typography variant="subtitle2" fontWeight={700}>Hospital Structure Permissions</Typography>
                <Stack direction="row" spacing={1}>
                  <Button size="small" variant="text" onClick={() => setSelectedPermissions(PERMISSION_OPTIONS.map(p => p.key))}>Select All</Button>
                  <Button size="small" variant="text" color="inherit" onClick={() => setSelectedPermissions([])}>Clear</Button>
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
                        p: 1.5, borderRadius: 2, cursor: 'pointer',
                        borderColor: isChecked ? 'primary.main' : 'divider',
                        bgcolor: isChecked ? (t) => (t.palette.mode === 'dark' ? 'rgba(14, 165, 233, 0.08)' : '#f0f9ff') : 'transparent',
                        transition: 'all 0.15s ease-in-out',
                      }}
                    >
                      <FormControlLabel
                        control={
                          <Checkbox checked={isChecked} onChange={() => togglePermission(option.key)} onClick={(e) => e.stopPropagation()} />
                        }
                        label={
                          <Box sx={{ ml: 0.5 }}>
                            <Typography variant="body2" fontWeight={600} color="text.primary">{option.label}</Typography>
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
          </>
        )}
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
          { label: 'Role', value: employee.userId ? (employee.userId.role === 'hr' ? 'HR' : 'Employee') : '—' },
          { label: 'Modules', value: employee.userId?.modules?.length ? employee.userId.modules.join(', ') : '—' },
          { label: 'Permissions', value: employee.userId?.permissions?.length ? employee.userId.permissions.length + ' permissions' : '—' },
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
  const [statusFilter, setStatusFilter] = useState('ACTIVE');
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

  const hasCreate = canCreate();
  const hasUpdate = canUpdate();
  const hasDeactivate = canDeactivate();

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
    { key: 'employee', label: 'Employee' },
    { key: 'employeeId', label: 'Employee ID' },
    { key: 'contact', label: 'Contact' },
    { key: 'position', label: 'Position' },
    { key: 'role', label: 'Vardhan Role' },
    { key: 'joined', label: 'Joined' },
    { key: 'status', label: 'Status' }
  ];
  
  const renderEmployeeCell = (emp, column) => {
    const fullName = `${emp.firstName} ${emp.lastName}`;
    const isActive = emp.employmentStatus === 'ACTIVE';
  
    switch (column.key) {
      case 'employee':
        return (
          <Stack direction="row" spacing={1.5} alignItems="center">
            <InitialsAvatar name={fullName} />
            <Box>
              <Typography variant="body2" fontWeight={600}>{fullName}</Typography>
              <Typography variant="caption" color="text.secondary">{emp.email}</Typography>
            </Box>
          </Stack>
        );
      case 'employeeId':
        return (
          <Chip
            label={emp.employeeId}
            size="small"
            variant="outlined"
            sx={{ fontWeight: 600, fontFamily: 'monospace' }}
          />
        );
      case 'contact':
        return (
          <>
            <Typography variant="body2">{emp.email}</Typography>
            {emp.phone && (
              <Typography variant="caption" color="text.secondary">{emp.phone}</Typography>
            )}
          </>
        );
      case 'position':
        return <Typography variant="body2">{emp.positionId?.name || '—'}</Typography>;
      case 'role':
        return (
          <Chip
            label={emp.userId ? (emp.userId.role === 'hr' ? 'HR' : 'Employee') : 'No Login'}
            size="small"
            color={emp.userId ? 'primary' : 'default'}
            variant="outlined"
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
      <Stack direction="row" spacing={0.5} justifyContent="flex-end">
        <Tooltip title="View details">
          <IconButton size="small" onClick={() => setDetailsEmployee(emp)}>
            <PersonRounded fontSize="small" />
          </IconButton>
        </Tooltip>
        {hasUpdate && isActive && (
          <Tooltip title="Edit employee">
            <IconButton size="small" color="primary" onClick={() => setEditEmployee(emp)}>
              <EditRounded fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
        {hasDeactivate && (
          <Tooltip title={isActive ? 'Deactivate' : 'Reactivate'}>
            <IconButton
              size="small"
              color={isActive ? 'error' : 'success'}
              onClick={() => setDeactivateTarget(emp)}
            >
              {isActive ? <ToggleOffRounded fontSize="small" /> : <ToggleOnRounded fontSize="small" />}
            </IconButton>
          </Tooltip>
        )}
      </Stack>
    );
  };

  const invitationColumns = [
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' },
    { key: 'position', label: 'Position' },
    { key: 'status', label: 'Status' },
    { key: 'expires', label: 'Expires' }
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
        return <Typography variant="body2">{inv.expiresAt ? new Date(inv.expiresAt).toLocaleDateString() : '—'}</Typography>;
      default:
        return null;
    }
  };
  
  const renderInvitationActions = (inv) => {
    const isExpiredByDate = inv.status === 'pending' && new Date(inv.expiresAt) < new Date();
    if (inv.status === 'pending' && !isExpiredByDate && hasCreate) {
      return (
        <Tooltip title="Cancel invitation">
          <IconButton
            size="small"
            color="error"
            onClick={async () => {
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
      );
    }
    return null;
  };

  return (
    <AppLayout>
      <Stack spacing={3}>
        <PageHeader
          title="Employees"
          subtitle="Manage your hospital's employee roster. Invite, view, and update employee records."
          actions={
            hasCreate && (
              <Button
                variant="contained"
                startIcon={<AddRounded />}
                onClick={() => setInviteOpen(true)}
                sx={{ fontWeight: 600, px: 2.5 }}
              >
                Invite Employee
              </Button>
            )
          }
        />

        {/* Stats */}
        <Grid container spacing={2.5}>
          <Grid item xs={6} sm={3}>
            <StatCard title="Total Employees" value={loading ? '...' : stats.total} icon={GroupsRounded} color="primary" />
          </Grid>
          <Grid item xs={6} sm={3}>
            <StatCard title="Active" value={loading ? '...' : stats.active} icon={CheckCircleOutlineRounded} color="success" />
          </Grid>
          <Grid item xs={6} sm={3}>
            <StatCard title="Inactive" value={loading ? '...' : stats.inactive} icon={PersonOffRounded} color="error" />
          </Grid>
          <Grid item xs={6} sm={3}>
            <StatCard title="Pending Invites" value={loading ? '...' : stats.pendingInvitations} icon={MarkEmailReadRounded} color="warning" />
          </Grid>
        </Grid>

        {/* Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabIndex} onChange={(_, v) => setTabIndex(v)} textColor="primary" indicatorColor="primary">
            <Tab label={`Employees (${employees.length})`} icon={<GroupsRounded />} iconPosition="start" sx={{ fontWeight: 600 }} />
            <Tab label={`Invitations (${invitations.length})`} icon={<EmailRounded />} iconPosition="start" sx={{ fontWeight: 600 }} />
          </Tabs>
        </Box>

        {error && <ErrorState message={error} onRetry={loadEmployees} />}

        {/* Employees Tab */}
        {tabIndex === 0 && (
          <>
            {/* Search + Filter */}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="stretch">
              <TextField
                placeholder="Search by name, email, or ID…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                size="small"
                sx={{ flex: 1 }}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchRounded fontSize="small" />
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
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} justifyContent="space-between">
                <Stack direction="row" spacing={1}>
                  {[
                    { label: 'All Roles', value: '' },
                    { label: 'HR', value: 'hr' },
                    { label: 'Employee', value: 'employee' },
                  ].map(({ label, value }) => (
                    <Button
                      key={label}
                      variant={roleFilter === value ? 'contained' : 'outlined'}
                      size="small"
                      onClick={() => setRoleFilter(value)}
                      sx={{ fontWeight: 600, minWidth: 80 }}
                    >
                      {label}
                    </Button>
                  ))}
                </Stack>
                <Stack direction="row" spacing={1}>
                  {[
                    { label: 'All Status', value: '' },
                    { label: 'Active', value: 'ACTIVE' },
                    { label: 'Inactive', value: 'INACTIVE' },
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
              </Stack>
            </Stack>

            <DataTable 
              columns={employeeColumns}
              rows={employees}
              getRowKey={(emp) => emp._id}
              loading={loading}
              emptyTitle="No employees found"
              emptyDescription={search || statusFilter ? 'No employees match your search or filter.' : 'No employees yet. Send an invitation to onboard your first employee.'}
              emptyIcon={GroupsRounded}
              renderCell={renderEmployeeCell}
              renderActions={renderEmployeeActions}
            />
          </>
        )}

        {/* Invitations Tab */}
        {tabIndex === 1 && (
          <DataTable 
            columns={invitationColumns}
            rows={invitations}
            getRowKey={(inv) => inv._id}
            loading={loading}
            emptyTitle="No invitations"
            emptyDescription="No employee invitations found."
            emptyIcon={EmailRounded}
            renderCell={renderInvitationCell}
            renderActions={renderInvitationActions}
          />
        )}
      </Stack>

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
        title={deactivateTarget?.employmentStatus === 'ACTIVE' ? 'Deactivate Employee' : 'Reactivate Employee'}
        description={
          deactivateTarget?.employmentStatus === 'ACTIVE'
            ? `Are you sure you want to deactivate ${deactivateTarget?.firstName} ${deactivateTarget?.lastName}?\n\nThe employee will no longer be considered active.\nIf the employee has a Vardhan login, their login will also be disabled.\n\nHistorical records will be preserved.`
            : `Are you sure you want to reactivate ${deactivateTarget?.firstName} ${deactivateTarget?.lastName}?\n\nThis will make the employee active again.\nIf they have an existing Vardhan account, their account may be re-enabled.`
        }
        confirmLabel={deactivateTarget?.employmentStatus === 'ACTIVE' ? 'Deactivate' : 'Reactivate'}
        confirmColor={deactivateTarget?.employmentStatus === 'ACTIVE' ? 'error' : 'primary'}
        loading={deactivating}
        onConfirm={handleDeactivateConfirm}
        onClose={() => setDeactivateTarget(null)}
      />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((p) => ({ ...p, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar((p) => ({ ...p, open: false }))}
          sx={{ width: '100%', boxShadow: 3 }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </AppLayout>
  );
};

export default EmployeesPage;
