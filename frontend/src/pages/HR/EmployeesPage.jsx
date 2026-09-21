import { useEffect, useState, useMemo, useCallback } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  Grid,
  IconButton,
  InputAdornment,
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
  BadgeRounded,
  CheckCircleOutlineRounded,
  CloseRounded,
  EditRounded,
  EmailRounded,
  GroupsRounded,
  MarkEmailReadRounded,
  PersonOffRounded,
  PersonRounded,
  SearchRounded,
  SendRounded,
  ToggleOffRounded,
  ToggleOnRounded,
} from '@mui/icons-material';
import employeeService from '../../services/employee.service';
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

// ─── Helpers ─────────────────────────────────────────────────────────────────

const canCreate = () => {
  try {
    const perms = JSON.parse(localStorage.getItem('permissions') || '[]');
    return Array.isArray(perms) && perms.includes('employee.create');
  } catch {
    return false;
  }
};

const canUpdate = () => {
  try {
    const perms = JSON.parse(localStorage.getItem('permissions') || '[]');
    return Array.isArray(perms) && perms.includes('employee.update');
  } catch {
    return false;
  }
};

const canDeactivate = () => {
  try {
    const perms = JSON.parse(localStorage.getItem('permissions') || '[]');
    return Array.isArray(perms) && perms.includes('employee.delete');
  } catch {
    return false;
  }
};

const formatDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

// ─── Invite Employee Modal ────────────────────────────────────────────────────
const InviteEmployeeModal = ({ open, onClose, onSuccess }) => {
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    designation: '',
    dateOfJoining: '',
    employeeId: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setForm({ firstName: '', lastName: '', email: '', phone: '', designation: '', dateOfJoining: '', employeeId: '' });
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
    if (!form.firstName.trim()) { setError('First name is required.'); return; }
    if (!form.lastName.trim()) { setError('Last name is required.'); return; }
    if (!form.email.trim()) { setError('Email is required.'); return; }

    try {
      setSubmitting(true);
      await employeeService.inviteEmployee({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        designation: form.designation.trim() || undefined,
        dateOfJoining: form.dateOfJoining || undefined,
        employeeId: form.employeeId.trim() || undefined,
      });
      onSuccess('Invitation sent successfully.');
      onClose();
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to send employee invitation.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
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
            label="Designation (optional)"
            name="designation"
            value={form.designation}
            onChange={handleChange}
            fullWidth
            placeholder="e.g. Nurse, Doctor"
          />
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
      </Stack>
    </Modal>
  );
};

// ─── Edit Employee Modal ──────────────────────────────────────────────────────
const EditEmployeeModal = ({ open, employee, onClose, onSuccess }) => {
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', designation: '', dateOfJoining: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open && employee) {
      setForm({
        firstName: employee.firstName || '',
        lastName: employee.lastName || '',
        email: employee.email || '',
        phone: employee.phone || '',
        designation: employee.designation || '',
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
      await employeeService.updateEmployee(employee._id, {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || null,
        designation: form.designation.trim() || null,
        dateOfJoining: form.dateOfJoining || null,
      });
      onSuccess(`Employee ${form.firstName} updated successfully.`);
      onClose();
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to update employee.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!employee) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Edit Employee"
      description={`Update information for ${employee.firstName} ${employee.lastName}`}
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
          <TextField
            label="Designation"
            name="designation"
            value={form.designation}
            onChange={handleChange}
            fullWidth
          />
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
          { label: 'Designation', value: employee.designation || '—' },
          { label: 'Date of Joining', value: formatDate(employee.dateOfJoining) },
          { label: 'Employment Status', value: employee.employmentStatus },
          { label: 'Created', value: formatDate(employee.createdAt) },
        ].map(({ label, value }) => (
          <Stack key={label} direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="body2" color="text.secondary" sx={{ minWidth: 140 }}>
              {label}
            </Typography>
            <Typography variant="body2" fontWeight={500} textAlign="right">
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
  const [stats, setStats] = useState({ total: 0, active: 0, inactive: 0, pendingInvitations: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tabIndex, setTabIndex] = useState(0);

  // Search & filter
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

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
      const [empRes, invRes, statRes] = await Promise.all([
        employeeService.listEmployees({ search: search || undefined, status: statusFilter || undefined }),
        employeeService.listInvitations().catch(() => ({ data: { data: [] } })),
        employeeService.getEmployeeStats().catch(() => ({ data: { data: { total: 0, active: 0, inactive: 0, pendingInvitations: 0 } } })),
      ]);
      setEmployees(empRes?.data?.data?.employees || []);
      setInvitations(invRes?.data?.data || []);
      setStats(statRes?.data?.data || { total: 0, active: 0, inactive: 0, pendingInvitations: 0 });
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load employees.');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

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

  const pendingInvitations = useMemo(
    () => invitations.filter((i) => i.status === 'pending'),
    [invitations]
  );

  return (
    <AppLayout>
      <Stack spacing={3}>
        <PageHeader
          title="Employees"
          subtitle="Manage your hospital's employee roster. Invite, view, and update employee records."
          action={
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
              <Stack direction="row" spacing={1}>
                {[
                  { label: 'All', value: '' },
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

            <GlassCard sx={{ p: 0, overflow: 'hidden' }}>
              {loading ? (
                <Box sx={{ p: 3 }}>
                  {[1, 2, 3].map((k) => <Skeleton key={k} height={54} sx={{ mb: 1 }} />)}
                </Box>
              ) : employees.length === 0 ? (
                <EmptyState
                  icon={GroupsRounded}
                  title="No employees found"
                  description={
                    search || statusFilter
                      ? 'No employees match your search or filter.'
                      : 'No employees yet. Send an invitation to onboard your first employee.'
                  }
                  actionLabel={hasCreate && !search && !statusFilter ? 'Invite Employee' : null}
                  onAction={hasCreate && !search && !statusFilter ? () => setInviteOpen(true) : null}
                />
              ) : (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700 }}>Employee</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Employee ID</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Contact</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Designation</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Joined</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700 }}>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {employees.map((emp) => {
                        const fullName = `${emp.firstName} ${emp.lastName}`;
                        const isActive = emp.employmentStatus === 'ACTIVE';
                        return (
                          <TableRow key={emp._id} hover>
                            <TableCell>
                              <Stack direction="row" spacing={1.5} alignItems="center">
                                <InitialsAvatar name={fullName} />
                                <Box>
                                  <Typography variant="body2" fontWeight={600}>{fullName}</Typography>
                                  <Typography variant="caption" color="text.secondary">{emp.email}</Typography>
                                </Box>
                              </Stack>
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={emp.employeeId}
                                size="small"
                                variant="outlined"
                                sx={{ fontWeight: 600, fontFamily: 'monospace' }}
                              />
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">{emp.email}</Typography>
                              {emp.phone && (
                                <Typography variant="caption" color="text.secondary">{emp.phone}</Typography>
                              )}
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">{emp.designation || '—'}</Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">{formatDate(emp.dateOfJoining)}</Typography>
                            </TableCell>
                            <TableCell>
                              <StatusBadge status={isActive ? 'active' : 'inactive'} />
                            </TableCell>
                            <TableCell align="right">
                              <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                                <Tooltip title="View details">
                                  <IconButton size="small" onClick={() => setDetailsEmployee(emp)}>
                                    <PersonRounded fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                {hasUpdate && (
                                  <Tooltip title="Edit employee">
                                    <IconButton size="small" color="primary" onClick={() => setEditEmployee(emp)}>
                                      <EditRounded fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                )}
                                {hasDeactivate && (
                                  <Tooltip title={isActive ? 'Deactivate' : 'Activate'}>
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
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </GlassCard>
          </>
        )}

        {/* Invitations Tab */}
        {tabIndex === 1 && (
          <GlassCard sx={{ p: 0, overflow: 'hidden' }}>
            {loading ? (
              <Box sx={{ p: 3 }}>
                {[1, 2].map((k) => <Skeleton key={k} height={54} sx={{ mb: 1 }} />)}
              </Box>
            ) : invitations.length === 0 ? (
              <EmptyState
                icon={EmailRounded}
                title="No invitations"
                description="No employee invitations found."
                actionLabel={hasCreate ? 'Invite Employee' : null}
                onAction={hasCreate ? () => setInviteOpen(true) : null}
              />
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>Name</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Email</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Designation</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Expires</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {invitations.map((inv) => {
                      const isExpiredByDate =
                        inv.status === 'pending' && new Date(inv.expiresAt) < new Date();
                      const effectiveStatus = isExpiredByDate ? 'expired' : inv.status;
                      return (
                        <TableRow key={inv._id} hover>
                          <TableCell>
                            <Typography variant="body2" fontWeight={600}>
                              {inv.firstName} {inv.lastName}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">{inv.email}</Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">{inv.designation || '—'}</Typography>
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={effectiveStatus} />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {inv.expiresAt ? new Date(inv.expiresAt).toLocaleDateString() : '—'}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            {inv.status === 'pending' && !isExpiredByDate && hasCreate && (
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
                            )}
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

      {/* Modals */}
      <InviteEmployeeModal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        onSuccess={(msg) => { showSnack(msg); loadEmployees(); }}
      />

      <EditEmployeeModal
        open={Boolean(editEmployee)}
        employee={editEmployee}
        onClose={() => setEditEmployee(null)}
        onSuccess={(msg) => { showSnack(msg); loadEmployees(); setEditEmployee(null); }}
      />

      <EmployeeDetailsModal
        open={Boolean(detailsEmployee)}
        employee={detailsEmployee}
        onClose={() => setDetailsEmployee(null)}
      />

      <ConfirmDialog
        open={Boolean(deactivateTarget)}
        title={deactivateTarget?.employmentStatus === 'ACTIVE' ? 'Deactivate Employee' : 'Activate Employee'}
        description={
          deactivateTarget?.employmentStatus === 'ACTIVE'
            ? `Are you sure you want to deactivate ${deactivateTarget?.firstName} ${deactivateTarget?.lastName}? They will no longer be counted as active.`
            : `Are you sure you want to activate ${deactivateTarget?.firstName} ${deactivateTarget?.lastName}?`
        }
        confirmLabel={deactivateTarget?.employmentStatus === 'ACTIVE' ? 'Deactivate' : 'Activate'}
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
