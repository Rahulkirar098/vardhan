import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  FormControl,
  Grid,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
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
  EventBusyRounded,
  EventNoteRounded,
  FilterListRounded,
  HighlightOffRounded,
  HourglassEmptyRounded,
  InfoOutlined,
  PersonOutlineRounded,
  SearchRounded,
  VisibilityRounded,
} from '@mui/icons-material';
import DataTable from '../../components/DataTable';
import AppLayout from '../../components/AppLayout';
import PageHeader from '../../components/PageHeader';
import StatCard from '../../components/StatCard';
import StatusBadge from '../../components/StatusBadge';
import GlassCard from '../../components/GlassCard';
import Modal from '../../components/Modal';
import ConfirmDialog from '../../components/ConfirmDialog';
import EmptyState from '../../components/EmptyState';
import ErrorState from '../../components/ErrorState';
import { leaveService } from '../../services/leave.service';
import { hasPermission, PERMISSIONS } from '../../utils/permissions';

const LEAVE_TYPES = [
  { key: 'CASUAL', label: 'Casual Leave', color: '#0284C7' },
  { key: 'SICK', label: 'Sick Leave', color: '#D97706' },
  { key: 'ANNUAL', label: 'Annual Leave', color: '#16A34A' },
  { key: 'EMERGENCY', label: 'Emergency Leave', color: '#DC2626' },
  { key: 'UNPAID', label: 'Unpaid Leave', color: '#6B7280' },
];

const getLeaveTypeObj = (type) =>
  LEAVE_TYPES.find((t) => t.key === type) || { key: type, label: type || 'Leave', color: '#6B7280' };

const calculateDays = (startStr, endStr) => {
  if (!startStr || !endStr) return 0;
  const start = new Date(startStr);
  const end = new Date(endStr);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
  const startUTC = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
  const endUTC = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
  const diff = Math.floor((endUTC - startUTC) / (1000 * 60 * 60 * 24)) + 1;
  return diff > 0 ? diff : 0;
};

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return String(dateStr);
  }
};

const formatDateTime = (dateStr) => {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return String(dateStr);
  }
};

// ─── Apply Leave Modal Component ─────────────────────────────────────────────
const ApplyLeaveModal = ({ open, onClose, onSuccess }) => {
  const [leaveType, setLeaveType] = useState('CASUAL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setLeaveType('CASUAL');
      const today = new Date().toISOString().split('T')[0];
      setStartDate(today);
      setEndDate(today);
      setReason('');
      setError('');
      setSubmitting(false);
    }
  }, [open]);

  const totalDays = useMemo(() => calculateDays(startDate, endDate), [startDate, endDate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!startDate || !endDate) {
      setError('Please select both start and end dates.');
      return;
    }
    if (totalDays <= 0) {
      setError('End date cannot be before start date.');
      return;
    }
    if (!reason.trim()) {
      setError('Please provide a reason for the leave request.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      await leaveService.applyLeave({
        leaveType,
        startDate,
        endDate,
        reason: reason.trim(),
      });
      onSuccess?.('Leave request submitted successfully.');
      onClose();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to submit leave request.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Apply for Leave"
      description="Submit a new leave request for approval."
      SubmitIcon={EventNoteRounded}
      submitLabel="Submit Leave Request"
      cancelLabel="Cancel"
      submitting={submitting}
      onSubmit={handleSubmit}
      maxWidth="sm"
    >
      <Stack spacing={2.5} sx={{ mt: 1 }}>
        {error && (
          <Alert severity="error" onClose={() => setError('')} sx={{ borderRadius: '10px' }}>
            {error}
          </Alert>
        )}

        <FormControl fullWidth required>
          <InputLabel id="leave-type-label">Leave Type</InputLabel>
          <Select
            labelId="leave-type-label"
            value={leaveType}
            label="Leave Type"
            onChange={(e) => setLeaveType(e.target.value)}
          >
            {LEAVE_TYPES.map((t) => (
              <MenuItem key={t.key} value={t.key}>
                {t.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Start Date"
              type="date"
              fullWidth
              required
              InputLabelProps={{ shrink: true }}
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="End Date"
              type="date"
              fullWidth
              required
              InputLabelProps={{ shrink: true }}
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </Grid>
        </Grid>

        <Box
          sx={{
            p: 1.5,
            borderRadius: '10px',
            backgroundColor: totalDays > 0 ? '#F0FDF4' : '#FEF2F2',
            border: `1px solid ${totalDays > 0 ? '#BBF7D0' : '#FECACA'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Typography variant="body2" sx={{ fontWeight: 600, color: totalDays > 0 ? '#166534' : '#991B1B' }}>
            Calculated Duration
          </Typography>
          <Chip
            label={totalDays > 0 ? `${totalDays} ${totalDays === 1 ? 'Day' : 'Days'}` : 'Invalid Date Range'}
            size="small"
            sx={{
              fontWeight: 700,
              backgroundColor: totalDays > 0 ? '#22C55E' : '#EF4444',
              color: '#FFFFFF',
            }}
          />
        </Box>

        <TextField
          label="Reason for Leave"
          multiline
          rows={3}
          fullWidth
          required
          placeholder="Briefly describe the reason for your leave request..."
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </Stack>
    </Modal>
  );
};

// ─── Reject Leave Modal Component ────────────────────────────────────────────
const RejectLeaveModal = ({ open, leave, onClose, onSuccess }) => {
  const [rejectionReason, setRejectionReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setRejectionReason('');
      setError('');
      setSubmitting(false);
    }
  }, [open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!rejectionReason.trim()) {
      setError('A rejection reason is required.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      await leaveService.rejectLeave(leave._id, { rejectionReason: rejectionReason.trim() });
      onSuccess?.('Leave request rejected.');
      onClose();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to reject leave request.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Reject Leave Request"
      description="Specify the reason for rejecting this leave request."
      SubmitIcon={HighlightOffRounded}
      submitLabel="Reject Leave"
      cancelLabel="Cancel"
      submitting={submitting}
      onSubmit={handleSubmit}
      maxWidth="sm"
    >
      <Stack spacing={2} sx={{ mt: 1 }}>
        {error && (
          <Alert severity="error" onClose={() => setError('')} sx={{ borderRadius: '10px' }}>
            {error}
          </Alert>
        )}

        <Box sx={{ p: 1.5, borderRadius: '8px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
          <Typography variant="caption" color="text.secondary">
            Employee Request
          </Typography>
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            {leave?.employeeId?.firstName} {leave?.employeeId?.lastName} ({getLeaveTypeObj(leave?.leaveType).label})
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {formatDate(leave?.startDate)} → {formatDate(leave?.endDate)} ({leave?.totalDays} {leave?.totalDays === 1 ? 'Day' : 'Days'})
          </Typography>
        </Box>

        <TextField
          label="Rejection Reason"
          multiline
          rows={3}
          fullWidth
          required
          placeholder="Enter the justification for rejecting this request..."
          value={rejectionReason}
          onChange={(e) => setRejectionReason(e.target.value)}
        />
      </Stack>
    </Modal>
  );
};

// ─── Read-Only Leave Details Modal Component ─────────────────────────────────
const LeaveDetailsModal = ({ open, leave, onClose }) => {
  if (!leave) return null;

  const typeObj = getLeaveTypeObj(leave.leaveType);
  const emp = leave.employeeId || {};

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Leave Details"
      description="Read-only breakdown of the employee leave request and review history."
      maxWidth="sm"
      hideSubmit={true}
      closeLabel="Close"
    >
      <Stack spacing={2.5} sx={{ mt: 1 }}>
        {/* Status Header */}
        <Box
          sx={{
            p: 2,
            borderRadius: '12px',
            backgroundColor: '#F8FAFC',
            border: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700 }}>
              Leave Status
            </Typography>
            <Box sx={{ mt: 0.5 }}>
              <StatusBadge status={leave.status} />
            </Box>
          </Box>
          <Chip
            label={typeObj.label}
            sx={{
              fontWeight: 700,
              backgroundColor: `${typeObj.color}15`,
              color: typeObj.color,
              border: `1px solid ${typeObj.color}40`,
            }}
          />
        </Box>

        {/* Employee & Timing Info Grid */}
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <Paper variant="outlined" sx={{ p: 2, borderRadius: '10px' }}>
              <Typography variant="caption" color="text.secondary">
                Employee
              </Typography>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mt: 0.25 }}>
                {emp.firstName ? `${emp.firstName} ${emp.lastName}` : '—'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                ID: {emp.employeeId || '—'} {emp.positionId?.name ? `• ${emp.positionId.name}` : ''}
              </Typography>
            </Paper>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Paper variant="outlined" sx={{ p: 2, borderRadius: '10px' }}>
              <Typography variant="caption" color="text.secondary">
                Duration
              </Typography>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mt: 0.25 }}>
                {leave.totalDays} {leave.totalDays === 1 ? 'Day' : 'Days'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {formatDate(leave.startDate)} → {formatDate(leave.endDate)}
              </Typography>
            </Paper>
          </Grid>
        </Grid>

        {/* Reason */}
        <Paper variant="outlined" sx={{ p: 2, borderRadius: '10px' }}>
          <Typography variant="caption" color="text.secondary">
            Reason for Leave
          </Typography>
          <Typography variant="body2" sx={{ mt: 0.5, whiteSpace: 'pre-wrap' }}>
            {leave.reason || '—'}
          </Typography>
        </Paper>

        {/* Audit Details */}
        {leave.status === 'approved' && (
          <Box sx={{ p: 2, borderRadius: '10px', backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0' }}>
            <Typography variant="caption" sx={{ color: '#166534', fontWeight: 700, textTransform: 'uppercase' }}>
              Approval Details
            </Typography>
            <Typography variant="body2" sx={{ color: '#166534', mt: 0.5 }}>
              Approved by <strong>{leave.approvedBy?.name || 'Administrator'}</strong> on {formatDateTime(leave.approvedAt)}
            </Typography>
          </Box>
        )}

        {leave.status === 'rejected' && (
          <Box sx={{ p: 2, borderRadius: '10px', backgroundColor: '#FEF2F2', border: '1px solid #FECACA' }}>
            <Typography variant="caption" sx={{ color: '#991B1B', fontWeight: 700, textTransform: 'uppercase' }}>
              Rejection Details
            </Typography>
            <Typography variant="body2" sx={{ color: '#991B1B', mt: 0.5 }}>
              Rejected by <strong>{leave.rejectedBy?.name || 'Authorized Approver'}</strong> on {formatDateTime(leave.rejectedAt)}
            </Typography>
            <Typography variant="body2" sx={{ color: '#991B1B', mt: 1, fontStyle: 'italic' }}>
              Reason: "{leave.rejectionReason || 'No reason provided'}"
            </Typography>
          </Box>
        )}

        {leave.status === 'cancelled' && (
          <Box sx={{ p: 2, borderRadius: '10px', backgroundColor: '#F3F4F6', border: '1px solid #E5E7EB' }}>
            <Typography variant="caption" sx={{ color: '#374151', fontWeight: 700, textTransform: 'uppercase' }}>
              Cancellation Details
            </Typography>
            <Typography variant="body2" sx={{ color: '#374151', mt: 0.5 }}>
              Cancelled by <strong>{leave.cancelledBy?.name || 'Requester'}</strong> on {formatDateTime(leave.cancelledAt)}
            </Typography>
          </Box>
        )}

        <Box sx={{ display: 'flex', justifyContent: 'space-between', pt: 1 }}>
          <Typography variant="caption" color="text.secondary">
            Requested on: {formatDateTime(leave.createdAt)}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Ref: {leave._id}
          </Typography>
        </Box>
      </Stack>
    </Modal>
  );
};

// ─── Main Leave Management Page ──────────────────────────────────────────────
const LeaveManagementPage = () => {
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const showSnack = (message, severity = 'success') => setSnackbar({ open: true, message, severity });

  const [activeTab, setActiveTab] = useState(0); // 0: All, 1: Pending, 2: Approved, 3: Rejected, 4: My Leave
  const [leaves, setLeaves] = useState([]);
  const [stats, setStats] = useState({ pending: 0, approved: 0, rejected: 0, currentlyOnLeave: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  // Modals
  const [isApplyOpen, setIsApplyOpen] = useState(false);
  const [detailsLeave, setDetailsLeave] = useState(null);
  const [rejectingLeave, setRejectingLeave] = useState(null);
  const [approvingLeave, setApprovingLeave] = useState(null);
  const [cancellingLeave, setCancellingLeave] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const currentUserRole = localStorage.getItem('role') || 'employee';
  const currentUserId = localStorage.getItem('userId') || '';
  const canApprove = hasPermission(PERMISSIONS.LEAVE_APPROVE) || currentUserRole === 'admin';
  const canApply = hasPermission(PERMISSIONS.LEAVE_APPLY) || currentUserRole === 'admin' || currentUserRole === 'employee';
  const canViewManagement = hasPermission(PERMISSIONS.LEAVE_VIEW) || currentUserRole === 'admin';

  // Load stats
  const loadStats = useCallback(async () => {
    try {
      if (canViewManagement) {
        const res = await leaveService.getLeaveStats();
        setStats(res?.data?.stats || { pending: 0, approved: 0, rejected: 0, currentlyOnLeave: 0, total: 0 });
      }
    } catch {
      // stats failure is non-blocking
    }
  }, [canViewManagement]);

  // Load leaves
  const loadLeaves = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const isMyLeaveTab = activeTab === 4;
      let statusParam = undefined;
      if (activeTab === 1) statusParam = 'pending';
      if (activeTab === 2) statusParam = 'approved';
      if (activeTab === 3) statusParam = 'rejected';

      const params = {
        status: statusParam,
        leaveType: typeFilter || undefined,
        search: search ? search.trim() : undefined,
      };

      let res;
      if (isMyLeaveTab || !canViewManagement) {
        res = await leaveService.getMyLeaves(params);
      } else {
        res = await leaveService.getHospitalLeaves(params);
      }

      setLeaves(res?.data?.leaves || []);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load leave requests.');
    } finally {
      setLoading(false);
    }
  }, [activeTab, typeFilter, search, canViewManagement]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    const t = setTimeout(loadLeaves, search ? 300 : 0);
    return () => clearTimeout(t);
  }, [loadLeaves, search]);

  // Approve action
  const handleApproveConfirm = async () => {
    if (!approvingLeave) return;
    setActionLoading(true);
    try {
      await leaveService.approveLeave(approvingLeave._id);
      showSnack('Leave request approved successfully.');
      setApprovingLeave(null);
      loadLeaves();
      loadStats();
    } catch (err) {
      showSnack(err?.response?.data?.message || 'Failed to approve leave request.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Cancel action
  const handleCancelConfirm = async () => {
    if (!cancellingLeave) return;
    setActionLoading(true);
    try {
      await leaveService.cancelLeave(cancellingLeave._id);
      showSnack('Leave request cancelled successfully.');
      setCancellingLeave(null);
      loadLeaves();
      loadStats();
    } catch (err) {
      showSnack(err?.response?.data?.message || 'Failed to cancel leave request.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Table Columns
  const columns = useMemo(
    () => [
      {
        id: 'employee',
        label: 'Employee',
        render: (row) => {
          const emp = row.employeeId || {};
          const isMe = String(row.appliedBy?._id || row.appliedBy) === String(currentUserId);
          return (
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {emp.firstName ? `${emp.firstName} ${emp.lastName}` : row.appliedBy?.name || '—'}
                {isMe && (
                  <Chip label="You" size="small" sx={{ ml: 1, height: 18, fontSize: '0.65rem', fontWeight: 700 }} />
                )}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {emp.email || row.appliedBy?.email || '—'}
              </Typography>
            </Box>
          );
        },
      },
      {
        id: 'employeeId',
        label: 'Employee ID',
        render: (row) => (
          <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
            {row.employeeId?.employeeId || '—'}
          </Typography>
        ),
      },
      {
        id: 'leaveType',
        label: 'Leave Type',
        render: (row) => {
          const t = getLeaveTypeObj(row.leaveType);
          return (
            <Chip
              label={t.label}
              size="small"
              sx={{
                fontWeight: 600,
                backgroundColor: `${t.color}15`,
                color: t.color,
                border: `1px solid ${t.color}35`,
              }}
            />
          );
        },
      },
      {
        id: 'duration',
        label: 'Dates & Days',
        render: (row) => (
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {formatDate(row.startDate)} → {formatDate(row.endDate)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {row.totalDays} {row.totalDays === 1 ? 'Day' : 'Days'}
            </Typography>
          </Box>
        ),
      },
      {
        id: 'reason',
        label: 'Reason',
        render: (row) => (
          <Tooltip title={row.reason || ''} arrow placement="top-start">
            <Typography
              variant="body2"
              sx={{
                maxWidth: 200,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                color: 'text.secondary',
              }}
            >
              {row.reason || '—'}
            </Typography>
          </Tooltip>
        ),
      },
      {
        id: 'status',
        label: 'Status',
        render: (row) => <StatusBadge status={row.status} />,
      },
      {
        id: 'requestedDate',
        label: 'Requested',
        render: (row) => (
          <Typography variant="caption" color="text.secondary">
            {formatDate(row.createdAt)}
          </Typography>
        ),
      },
      {
        id: 'actions',
        label: 'Actions',
        align: 'right',
        render: (row) => {
          const isOwn = String(row.appliedBy?._id || row.appliedBy) === String(currentUserId);
          const isPending = row.status === 'pending';

          return (
            <Stack direction="row" spacing={0.5} sx={{ justifyContent: 'flex-end' }}>
              <Tooltip title="View Details">
                <IconButton size="small" onClick={() => setDetailsLeave(row)}>
                  <VisibilityRounded fontSize="small" />
                </IconButton>
              </Tooltip>

              {/* Management Actions: Approve & Reject (only for other employees when permitted) */}
              {isPending && canApprove && !isOwn && activeTab !== 4 && (
                <>
                  <Tooltip title="Approve Request">
                    <IconButton
                      size="small"
                      color="success"
                      onClick={() => setApprovingLeave(row)}
                      sx={{ '&:hover': { backgroundColor: '#F0FDF4' } }}
                    >
                      <CheckCircleOutlineRounded fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Reject Request">
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => setRejectingLeave(row)}
                      sx={{ '&:hover': { backgroundColor: '#FEF2F2' } }}
                    >
                      <HighlightOffRounded fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </>
              )}

              {/* Requester Action: Cancel own pending request */}
              {isPending && (isOwn || activeTab === 4) && (
                <Tooltip title="Cancel Request">
                  <IconButton
                    size="small"
                    color="warning"
                    onClick={() => setCancellingLeave(row)}
                    sx={{ '&:hover': { backgroundColor: '#FFFBEB' } }}
                  >
                    <CloseRounded fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
            </Stack>
          );
        },
      },
    ],
    [currentUserId, canApprove, activeTab]
  );

  return (
    <AppLayout>
      <Stack spacing={3}>
        {/* Header */}
        <PageHeader
          title="Leave Management"
          description="Review employee leave applications, approve workforce requests, and manage personal leave history."
          action={
            canApply && (
              <Button
                variant="contained"
                startIcon={<AddRounded />}
                onClick={() => setIsApplyOpen(true)}
                sx={{
                  backgroundColor: '#000000',
                  color: '#FFFFFF',
                  fontWeight: 600,
                  '&:hover': { backgroundColor: '#222222' },
                }}
              >
                Apply Leave
              </Button>
            )
          }
        />

        {/* Top Metric Cards */}
        {canViewManagement && (
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                label="Pending Requests"
                value={stats.pending}
                icon={HourglassEmptyRounded}
                color="#D97706"
                loading={loading}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                label="Approved Leaves"
                value={stats.approved}
                icon={CheckCircleOutlineRounded}
                color="#16A34A"
                loading={loading}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                label="Rejected Leaves"
                value={stats.rejected}
                icon={HighlightOffRounded}
                color="#DC2626"
                loading={loading}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                label="Currently On Leave"
                value={stats.currentlyOnLeave}
                icon={PersonOutlineRounded}
                color="#0284C7"
                loading={loading}
              />
            </Grid>
          </Grid>
        )}

        {/* Main Content Area */}
        <GlassCard sx={{ p: 0, overflow: 'hidden' }}>
          {/* Tabs Bar */}
          <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 2, pt: 1, backgroundColor: '#FAFAFA' }}>
            <Tabs
              value={activeTab}
              onChange={(_, val) => setActiveTab(val)}
              variant="scrollable"
              scrollButtons="auto"
              sx={{
                '& .MuiTab-root': {
                  fontWeight: 600,
                  textTransform: 'none',
                  minHeight: 48,
                  fontSize: '0.9rem',
                },
              }}
            >
              {canViewManagement && <Tab label="All Requests" />}
              {canViewManagement && <Tab label={`Pending (${stats.pending})`} />}
              {canViewManagement && <Tab label="Approved" />}
              {canViewManagement && <Tab label="Rejected" />}
              <Tab label="My Leave" />
            </Tabs>
          </Box>

          {/* Search & Filter Controls */}
          <Box sx={{ p: 2.5, borderBottom: '1px solid #F1F5F9' }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={6} md={4}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Search by employee name or ID..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchRounded fontSize="small" sx={{ color: 'text.secondary' }} />
                      </InputAdornment>
                    ),
                    endAdornment: search && (
                      <InputAdornment position="end">
                        <IconButton size="small" onClick={() => setSearch('')}>
                          <CloseRounded fontSize="small" />
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel id="type-filter-label">Leave Type</InputLabel>
                  <Select
                    labelId="type-filter-label"
                    value={typeFilter}
                    label="Leave Type"
                    onChange={(e) => setTypeFilter(e.target.value)}
                  >
                    <MenuItem value="">All Leave Types</MenuItem>
                    {LEAVE_TYPES.map((t) => (
                      <MenuItem key={t.key} value={t.key}>
                        {t.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Box>

          {/* Table / Error / Empty States */}
          {error ? (
            <Box sx={{ p: 4 }}>
              <ErrorState message={error} onRetry={loadLeaves} />
            </Box>
          ) : leaves.length === 0 && !loading ? (
            <Box sx={{ p: 6 }}>
              <EmptyState
                icon={EventBusyRounded}
                title={activeTab === 4 ? 'No Leave History Found' : 'No Leave Requests'}
                description={
                  search || typeFilter
                    ? 'No leave requests match your search or filter criteria.'
                    : activeTab === 4
                    ? 'You have not submitted any leave requests yet.'
                    : 'There are no leave requests in this category.'
                }
                action={
                  canApply && (
                    <Button
                      variant="contained"
                      startIcon={<AddRounded />}
                      onClick={() => setIsApplyOpen(true)}
                      sx={{ mt: 1, backgroundColor: '#000000', '&:hover': { backgroundColor: '#222222' } }}
                    >
                      Apply for Leave
                    </Button>
                  )
                }
              />
            </Box>
          ) : (
            <DataTable columns={columns} data={leaves} loading={loading} />
          )}
        </GlassCard>
      </Stack>

      {/* Apply Leave Modal */}
      <ApplyLeaveModal
        open={isApplyOpen}
        onClose={() => setIsApplyOpen(false)}
        onSuccess={(msg) => {
          showSnack(msg);
          loadLeaves();
          loadStats();
        }}
      />

      {/* Read-Only Leave Details Modal */}
      <LeaveDetailsModal
        open={!!detailsLeave}
        leave={detailsLeave}
        onClose={() => setDetailsLeave(null)}
      />

      {/* Reject Modal */}
      <RejectLeaveModal
        open={!!rejectingLeave}
        leave={rejectingLeave}
        onClose={() => setRejectingLeave(null)}
        onSuccess={(msg) => {
          showSnack(msg);
          loadLeaves();
          loadStats();
        }}
      />

      {/* Approve Confirm Dialog */}
      <ConfirmDialog
        open={!!approvingLeave}
        title="Approve Leave Request"
        description={`Are you sure you want to approve the ${getLeaveTypeObj(approvingLeave?.leaveType).label} for ${
          approvingLeave?.employeeId?.firstName
        } ${approvingLeave?.employeeId?.lastName} (${approvingLeave?.totalDays} ${
          approvingLeave?.totalDays === 1 ? 'Day' : 'Days'
        })?`}
        confirmLabel="Approve Leave"
        confirmColor="success"
        loading={actionLoading}
        onCancel={() => setApprovingLeave(null)}
        onConfirm={handleApproveConfirm}
      />

      {/* Cancel Confirm Dialog */}
      <ConfirmDialog
        open={!!cancellingLeave}
        title="Cancel Leave Request"
        description="Are you sure you want to cancel your pending leave request?"
        confirmLabel="Cancel Request"
        confirmColor="warning"
        loading={actionLoading}
        onCancel={() => setCancellingLeave(null)}
        onConfirm={handleCancelConfirm}
      />

      {/* Global Toast */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: '100%', borderRadius: '8px', boxShadow: 3 }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </AppLayout>
  );
};

export default LeaveManagementPage;
