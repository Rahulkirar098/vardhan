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
  CalendarMonthRounded,
  CheckCircleOutlineRounded,
  ChevronLeftRounded,
  ChevronRightRounded,
  CloseRounded,
  EventBusyRounded,
  EventNoteRounded,
  HighlightOffRounded,
  HourglassEmptyRounded,
  PersonOutlineRounded,
  SearchRounded,
  TodayRounded,
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
import InitialsAvatar from '../../components/InitialsAvatar';
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
  const [dayType, setDayType] = useState('FULL_DAY'); // 'FULL_DAY' | 'HALF_DAY'
  const [halfDaySession, setHalfDaySession] = useState('FIRST_HALF'); // 'FIRST_HALF' | 'SECOND_HALF'
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  useEffect(() => {
    if (open) {
      setLeaveType('CASUAL');
      setStartDate(todayStr);
      setEndDate(todayStr);
      setDayType('FULL_DAY');
      setHalfDaySession('FIRST_HALF');
      setReason('');
      setError('');
      setSubmitting(false);
    }
  }, [open, todayStr]);

  // Derived total duration calculation
  const totalDays = useMemo(() => {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;

    const startUTC = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
    const endUTC = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
    const diffDays = Math.floor((endUTC - startUTC) / (1000 * 60 * 60 * 24)) + 1;

    if (diffDays <= 0) return 0;

    if (dayType === 'HALF_DAY') {
      if (diffDays === 1) {
        return 0.5;
      }
      // Multi-day with half-day portion (e.g. 24-26 Sep = 2.5 days)
      return Math.max(0.5, diffDays - 0.5);
    }

    return diffDays;
  }, [startDate, endDate, dayType]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!startDate || !endDate) {
      setError('Start Date and End Date are both required.');
      return;
    }

    if (totalDays <= 0) {
      setError('End Date cannot be before Start Date.');
      return;
    }

    if (!reason.trim()) {
      setError('Please provide a reason for the leave request.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const isHalf = dayType === 'HALF_DAY';
      await leaveService.applyLeave({
        leaveType,
        startDate,
        endDate,
        isHalfDay: isHalf,
        halfDaySession: isHalf ? halfDaySession : null,
        totalDays,
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
      description="Submit a new leave request for authorization."
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

        {/* Leave Type */}
        <FormControl fullWidth required>
          <InputLabel id="leave-type-select-label">Leave Type</InputLabel>
          <Select
            labelId="leave-type-select-label"
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

        {/* Start Date & End Date (Always visible) */}
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Start Date"
              type="date"
              fullWidth
              required
              InputLabelProps={{ shrink: true }}
              inputProps={{ min: todayStr }}
              value={startDate}
              onChange={(e) => {
                const newStart = e.target.value;
                setStartDate(newStart);
                if (endDate && new Date(endDate) < new Date(newStart)) {
                  setEndDate(newStart);
                }
              }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="End Date"
              type="date"
              fullWidth
              required
              InputLabelProps={{ shrink: true }}
              inputProps={{ min: startDate || todayStr }}
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </Grid>
        </Grid>

        {/* Day Type Dropdown */}
        <Grid container spacing={2}>
          <Grid item xs={12} sm={dayType === 'HALF_DAY' ? 6 : 12}>
            <FormControl fullWidth required>
              <InputLabel id="day-type-select-label">Day Type</InputLabel>
              <Select
                labelId="day-type-select-label"
                value={dayType}
                label="Day Type"
                onChange={(e) => setDayType(e.target.value)}
              >
                <MenuItem value="FULL_DAY">Full Day</MenuItem>
                <MenuItem value="HALF_DAY">Half Day</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          {/* Half Day Session Dropdown (only visible when Day Type is Half Day) */}
          {dayType === 'HALF_DAY' && (
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required>
                <InputLabel id="half-day-session-label">Half Day Session</InputLabel>
                <Select
                  labelId="half-day-session-label"
                  value={halfDaySession}
                  label="Half Day Session"
                  onChange={(e) => setHalfDaySession(e.target.value)}
                >
                  <MenuItem value="FIRST_HALF">First Half (Morning)</MenuItem>
                  <MenuItem value="SECOND_HALF">Second Half (Afternoon)</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          )}
        </Grid>

        {/* Calculated Total Duration Banner */}
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
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 600, color: totalDays > 0 ? '#166534' : '#991B1B' }}>
              Calculated Duration
            </Typography>
            {dayType === 'HALF_DAY' && totalDays > 0 && (
              <Typography variant="caption" sx={{ color: '#166534' }}>
                {startDate === endDate
                  ? `Half Day: ${halfDaySession === 'FIRST_HALF' ? 'First Half (Morning)' : 'Second Half (Afternoon)'}`
                  : `Includes half-day session on end date (${formatDate(endDate)})`}
              </Typography>
            )}
          </Box>
          <Chip
            label={totalDays > 0 ? `${totalDays} ${totalDays === 1 ? 'Day' : 'Days'}` : 'Invalid Dates'}
            size="small"
            sx={{
              fontWeight: 700,
              backgroundColor: totalDays > 0 ? '#22C55E' : '#EF4444',
              color: '#FFFFFF',
            }}
          />
        </Box>

        {/* Reason for Leave */}
        <TextField
          label="Reason for Leave"
          multiline
          rows={3}
          fullWidth
          required
          placeholder="Enter reason for leave..."
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
      description="Specify the justification for rejecting this leave request."
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
            Employee Leave Request
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
          placeholder="Provide the reason for rejecting this request..."
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
      description="Read-only summary of the employee leave request and review history."
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
                {leave.isHalfDay && (
                  <Chip
                    label={leave.halfDaySession === 'SECOND_HALF' ? '2nd Half' : '1st Half'}
                    size="small"
                    sx={{ ml: 1, height: 20, fontSize: 10, fontWeight: 700 }}
                  />
                )}
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
          <Box sx={{ p: 2, borderRadius: '10px', backgroundColor: '#ECFDF5', border: '1px solid #BBF7D0' }}>
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
              Reason: &ldquo;{leave.rejectionReason || 'No reason provided'}&rdquo;
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

// ─── Leave Calendar & Who's On Leave Component ───────────────────────────────
const LeaveCalendarView = ({ leaves, canViewManagement }) => {
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedDateStr, setSelectedDateStr] = useState(() => new Date().toISOString().split('T')[0]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthName = currentDate.toLocaleString('en-US', { month: 'long', year: 'numeric' });

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToToday = () => {
    const today = new Date();
    setCurrentDate(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedDateStr(today.toISOString().split('T')[0]);
  };

  // Generate complete 7-column calendar grid (Sun to Sat)
  const calendarGrid = useMemo(() => {
    const firstDayIndex = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const days = [];

    // Previous month padding
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      const d = new Date(year, month - 1, dayNum);
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      days.push({
        dateStr: `${d.getFullYear()}-${mm}-${dd}`,
        dayNum,
        isCurrentMonth: false,
      });
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(year, month, i);
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      days.push({
        dateStr: `${d.getFullYear()}-${mm}-${dd}`,
        dayNum: i,
        isCurrentMonth: true,
      });
    }

    // Next month padding to complete 7-column weeks
    const remaining = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i);
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      days.push({
        dateStr: `${d.getFullYear()}-${mm}-${dd}`,
        dayNum: i,
        isCurrentMonth: false,
      });
    }

    return days;
  }, [year, month]);

  // Map leaves to dates
  const leavesByDate = useMemo(() => {
    const map = {};
    leaves.forEach((l) => {
      if (l.status === 'cancelled') return;
      const start = new Date(l.startDate);
      const end = new Date(l.endDate);

      const cur = new Date(start.getFullYear(), start.getMonth(), start.getDate());
      const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());

      while (cur <= endDay) {
        const mm = String(cur.getMonth() + 1).padStart(2, '0');
        const dd = String(cur.getDate()).padStart(2, '0');
        const key = `${cur.getFullYear()}-${mm}-${dd}`;
        if (!map[key]) map[key] = [];
        map[key].push(l);
        cur.setDate(cur.getDate() + 1);
      }
    });
    return map;
  }, [leaves]);

  const selectedDateLeaves = leavesByDate[selectedDateStr] || [];

  return (
    <Grid container spacing={3} sx={{ alignItems: 'stretch' }}>
      {/* Left: 7-Column Calendar Grid (65-70% width) */}
      <Grid item xs={12} md={7} lg={7.5} xl={8}>
        <Paper
          variant="outlined"
          sx={{
            p: { xs: 1.5, sm: 2.5 },
            borderRadius: '14px',
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Header & Controls */}
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            sx={{ mb: { xs: 2, sm: 2.5 }, flexWrap: 'wrap', gap: 1 }}
          >
            <Stack direction="row" spacing={1.5} alignItems="center">
              <CalendarMonthRounded color="primary" />
              <Typography variant="h6" sx={{ fontWeight: 800, fontSize: { xs: '1.05rem', sm: '1.25rem' } }}>
                {monthName}
              </Typography>
            </Stack>

            <Stack direction="row" spacing={1} alignItems="center">
              <Button
                size="small"
                variant="outlined"
                startIcon={<TodayRounded />}
                onClick={goToToday}
                sx={{
                  textTransform: 'none',
                  fontWeight: 600,
                  borderRadius: '8px',
                  borderColor: '#E2E8F0',
                  color: '#0F172A',
                  '&:hover': { borderColor: '#CBD5E1', backgroundColor: '#F8FAFC' },
                }}
              >
                Today
              </Button>
              <IconButton
                size="small"
                onClick={prevMonth}
                aria-label="Previous Month"
                sx={{ border: '1px solid #E2E8F0', borderRadius: '8px' }}
              >
                <ChevronLeftRounded fontSize="small" />
              </IconButton>
              <IconButton
                size="small"
                onClick={nextMonth}
                aria-label="Next Month"
                sx={{ border: '1px solid #E2E8F0', borderRadius: '8px' }}
              >
                <ChevronRightRounded fontSize="small" />
              </IconButton>
            </Stack>
          </Stack>

          {/* 7-Column Day Headers */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gap: { xs: 0.5, sm: 1 },
              mb: 1,
              textAlign: 'center',
            }}
          >
            {[
              { full: 'Sunday', short: 'Sun', letter: 'S' },
              { full: 'Monday', short: 'Mon', letter: 'M' },
              { full: 'Tuesday', short: 'Tue', letter: 'T' },
              { full: 'Wednesday', short: 'Wed', letter: 'W' },
              { full: 'Thursday', short: 'Thu', letter: 'T' },
              { full: 'Friday', short: 'Fri', letter: 'F' },
              { full: 'Saturday', short: 'Sat', letter: 'S' },
            ].map((d) => (
              <Box key={d.full} sx={{ py: 0.5 }}>
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: 700,
                    color: '#64748B',
                    letterSpacing: 0.5,
                    display: { xs: 'none', sm: 'block' },
                  }}
                >
                  {d.short}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: 700,
                    color: '#64748B',
                    display: { xs: 'block', sm: 'none' },
                  }}
                >
                  {d.letter}
                </Typography>
              </Box>
            ))}
          </Box>

          {/* 7-Column Monthly Date Grid */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gap: { xs: 0.5, sm: 1 },
              flexGrow: 1,
            }}
          >
            {calendarGrid.map((day) => {
              const dayLeaves = leavesByDate[day.dateStr] || [];
              const isSelected = day.dateStr === selectedDateStr;
              const todayObj = new Date();
              const todayFormatted = `${todayObj.getFullYear()}-${String(todayObj.getMonth() + 1).padStart(2, '0')}-${String(todayObj.getDate()).padStart(2, '0')}`;
              const isToday = day.dateStr === todayFormatted;

              const hasApproved = dayLeaves.some((l) => l.status === 'approved');
              const hasPending = dayLeaves.some((l) => l.status === 'pending');
              const hasRejected = dayLeaves.some((l) => l.status === 'rejected');

              // Soft continuous range background for leaves
              let cellBg = day.isCurrentMonth ? '#FFFFFF' : '#FAFAFA';
              let cellBorder = '#F1F5F9';

              if (hasApproved) {
                cellBg = '#F0FDF4';
                cellBorder = '#DCFCE7';
              } else if (hasPending) {
                cellBg = '#FFFBEB';
                cellBorder = '#FEF3C7';
              } else if (hasRejected) {
                cellBg = '#FEF2F2';
                cellBorder = '#FEE2E2';
              }

              if (isSelected) {
                cellBg = '#F0F9FF';
                cellBorder = '#0284C7';
              }

              return (
                <Box
                  key={day.dateStr}
                  onClick={() => setSelectedDateStr(day.dateStr)}
                  sx={{
                    minHeight: { xs: 54, sm: 70, md: 78 },
                    p: { xs: 0.5, sm: 0.85 },
                    borderRadius: '10px',
                    cursor: 'pointer',
                    border: isSelected ? '2px solid #0284C7' : `1px solid ${cellBorder}`,
                    backgroundColor: cellBg,
                    opacity: day.isCurrentMonth ? 1 : 0.38,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    transition: 'all 120ms ease',
                    boxSizing: 'border-box',
                    '&:hover': {
                      backgroundColor: isSelected ? '#F0F9FF' : '#F8FAFC',
                      borderColor: isSelected ? '#0284C7' : '#CBD5E1',
                    },
                  }}
                >
                  {/* Date Number with Today Pill/Dot */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography
                      variant="caption"
                      sx={{
                        fontWeight: isToday || isSelected ? 800 : day.isCurrentMonth ? 600 : 400,
                        color: isSelected ? '#0284C7' : isToday ? '#0284C7' : day.isCurrentMonth ? '#1E293B' : '#94A3B8',
                        fontSize: { xs: 11, sm: 12.5 },
                        width: isToday ? 22 : 'auto',
                        height: isToday ? 22 : 'auto',
                        display: isToday ? 'flex' : 'inline',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: isToday ? '50%' : 'none',
                        backgroundColor: isToday ? '#E0F2FE' : 'transparent',
                      }}
                    >
                      {day.dayNum}
                    </Typography>

                    {isToday && !isSelected && (
                      <Box sx={{ width: 5, height: 5, borderRadius: '50%', backgroundColor: '#0284C7' }} />
                    )}
                  </Box>

                  {/* Clean Status Indicator Dots (No repeated names) */}
                  <Stack
                    direction="row"
                    spacing={0.5}
                    sx={{
                      justifyContent: 'center',
                      alignItems: 'center',
                      minHeight: 10,
                      pb: 0.25,
                    }}
                  >
                    {hasApproved && (
                      <Tooltip title="Approved Leave">
                        <Box sx={{ width: 6.5, height: 6.5, borderRadius: '50%', backgroundColor: '#16A34A' }} />
                      </Tooltip>
                    )}
                    {hasPending && (
                      <Tooltip title="Pending Request">
                        <Box sx={{ width: 6.5, height: 6.5, borderRadius: '50%', backgroundColor: '#D97706' }} />
                      </Tooltip>
                    )}
                    {hasRejected && (
                      <Tooltip title="Rejected Request">
                        <Box sx={{ width: 6.5, height: 6.5, borderRadius: '50%', backgroundColor: '#DC2626' }} />
                      </Tooltip>
                    )}
                  </Stack>
                </Box>
              );
            })}
          </Box>

          {/* Calendar Status Legend */}
          <Stack
            direction="row"
            spacing={{ xs: 1.5, sm: 3 }}
            sx={{
              mt: 2.5,
              pt: 2,
              borderTop: '1px solid #F1F5F9',
              justifyContent: 'center',
              flexWrap: 'wrap',
              gap: 1,
            }}
          >
            <Stack direction="row" spacing={0.75} alignItems="center">
              <Box sx={{ width: 7.5, height: 7.5, borderRadius: '50%', backgroundColor: '#16A34A' }} />
              <Typography variant="caption" color="text.secondary" fontWeight={600}>
                Approved Leave
              </Typography>
            </Stack>
            <Stack direction="row" spacing={0.75} alignItems="center">
              <Box sx={{ width: 7.5, height: 7.5, borderRadius: '50%', backgroundColor: '#D97706' }} />
              <Typography variant="caption" color="text.secondary" fontWeight={600}>
                Pending Leave
              </Typography>
            </Stack>
            <Stack direction="row" spacing={0.75} alignItems="center">
              <Box sx={{ width: 7.5, height: 7.5, borderRadius: '50%', backgroundColor: '#DC2626' }} />
              <Typography variant="caption" color="text.secondary" fontWeight={600}>
                Rejected Leave
              </Typography>
            </Stack>
            <Stack direction="row" spacing={0.75} alignItems="center">
              <Box sx={{ width: 7.5, height: 7.5, borderRadius: '50%', backgroundColor: '#0284C7' }} />
              <Typography variant="caption" color="text.secondary" fontWeight={600}>
                Today / Selected Date
              </Typography>
            </Stack>
          </Stack>
        </Paper>
      </Grid>

      {/* Right: Who's On Leave (30-35% width) */}
      <Grid item xs={12} md={5} lg={4.5} xl={4}>
        <Paper
          variant="outlined"
          sx={{
            p: { xs: 2, sm: 2.5 },
            borderRadius: '14px',
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <Stack direction="row" spacing={1.25} alignItems="center" sx={{ mb: 0.5 }}>
            <PersonOutlineRounded color="primary" />
            <Typography variant="h6" sx={{ fontWeight: 800, fontSize: '1.15rem' }}>
              Who&apos;s On Leave
            </Typography>
          </Stack>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            People who are on leave for <strong>{formatDate(selectedDateStr)}</strong>.
          </Typography>

          <Box sx={{ flexGrow: 1, overflowY: 'auto', minHeight: 220, maxHeight: 520, pr: 0.5 }}>
            {selectedDateLeaves.length === 0 ? (
              <Box sx={{ p: 4, textAlign: 'center', backgroundColor: '#F8FAFC', borderRadius: '12px', border: '1px dashed #E2E8F0', my: 'auto' }}>
                <EventBusyRounded sx={{ fontSize: 42, color: '#94A3B8', mb: 1 }} />
                <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                  No one is on leave for this date.
                </Typography>
              </Box>
            ) : (
              <Stack spacing={1.5}>
                {selectedDateLeaves.map((leave) => {
                  const emp = leave.employeeId || {};
                  const typeObj = getLeaveTypeObj(leave.leaveType);
                  return (
                    <Box
                      key={leave._id}
                      sx={{
                        p: 1.75,
                        borderRadius: '10px',
                        border: '1px solid #E2E8F0',
                        backgroundColor: '#FFFFFF',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                        transition: 'border-color 150ms ease',
                        '&:hover': { borderColor: '#CBD5E1' },
                      }}
                    >
                      <Stack direction="row" spacing={1.5} alignItems="center">
                        <InitialsAvatar name={emp.firstName ? `${emp.firstName} ${emp.lastName}` : leave.appliedBy?.name} size={38} />
                        <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 700 }} noWrap>
                            {emp.firstName ? `${emp.firstName} ${emp.lastName}` : leave.appliedBy?.name || 'Employee'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" noWrap>
                            {emp.positionId?.name || 'Staff'} • {typeObj.label}
                          </Typography>
                        </Box>
                        <StatusBadge status={leave.status} />
                      </Stack>

                      <Box
                        sx={{
                          mt: 1.25,
                          pt: 1,
                          borderTop: '1px solid #F1F5F9',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <Typography variant="caption" color="text.secondary">
                          {formatDate(leave.startDate)} → {formatDate(leave.endDate)}
                        </Typography>
                        <Typography variant="caption" sx={{ fontWeight: 700, color: '#0F172A' }}>
                          {leave.totalDays} {leave.totalDays === 1 ? 'Day' : 'Days'}
                          {leave.isHalfDay ? ` (${leave.halfDaySession === 'SECOND_HALF' ? '2nd Half' : '1st Half'})` : ''}
                        </Typography>
                      </Box>
                    </Box>
                  );
                })}
              </Stack>
            )}
          </Box>
        </Paper>
      </Grid>
    </Grid>
  );
};


// ─── Main Leave Management Page ──────────────────────────────────────────────
const LeaveManagementPage = () => {
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const showSnack = (message, severity = 'success') => setSnackbar({ open: true, message, severity });

  const currentUserRole = localStorage.getItem('role') || 'employee';
  const currentUserId = useMemo(() => {
    const stored = localStorage.getItem('userId');
    if (stored) return stored;
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.id || payload._id || payload.userId || '';
      } catch {
        return '';
      }
    }
    return '';
  }, []);

  const canApprove = hasPermission(PERMISSIONS.LEAVE_APPROVE) || currentUserRole === 'admin';
  const canApply = hasPermission(PERMISSIONS.LEAVE_APPLY) || currentUserRole === 'admin';
  const canViewManagement = hasPermission(PERMISSIONS.LEAVE_VIEW) || currentUserRole === 'admin';
  const canViewOwn = hasPermission(PERMISSIONS.LEAVE_VIEW_OWN) || currentUserRole === 'admin';
  const canManage = hasPermission(PERMISSIONS.LEAVE_MANAGE) || currentUserRole === 'admin';

  // Exactly the 6 required tabs: 'all' | 'pending' | 'approved' | 'rejected' | 'my' | 'calendar'
  const [activeTab, setActiveTab] = useState(canViewManagement ? 'all' : 'my');
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

  // Initialize active tab based on view permissions
  useEffect(() => {
    if (!canViewManagement && canViewOwn && activeTab !== 'calendar') {
      setActiveTab('my');
    } else if (canViewManagement && activeTab === 'my' && !canViewOwn) {
      setActiveTab('all');
    }
  }, [canViewManagement, canViewOwn, activeTab]);

  // Load stats
  const loadStats = useCallback(async () => {
    try {
      if (canViewManagement) {
        const res = await leaveService.getLeaveStats();
        setStats(res?.data?.stats || { pending: 0, approved: 0, rejected: 0, currentlyOnLeave: 0, total: 0 });
      }
    } catch {
      // non-blocking
    }
  }, [canViewManagement]);

  // Load leaves
  const loadLeaves = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const isMyLeaveTab = activeTab === 'my' || (!canViewManagement && activeTab === 'calendar');
      let statusParam = undefined;
      if (activeTab === 'pending') statusParam = 'pending';
      if (activeTab === 'approved') statusParam = 'approved';
      if (activeTab === 'rejected') statusParam = 'rejected';

      const params = {
        status: statusParam,
        leaveType: typeFilter || undefined,
        search: search ? search.trim() : undefined,
      };

      let res;
      if (isMyLeaveTab) {
        if (!canViewOwn) {
          setLeaves([]);
          setLoading(false);
          return;
        }
        res = await leaveService.getMyLeaves(params);
      } else {
        if (!canViewManagement) {
          setLeaves([]);
          setLoading(false);
          return;
        }
        res = await leaveService.getHospitalLeaves(params);
      }

      setLeaves(res?.data?.leaves || []);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load leave requests.');
    } finally {
      setLoading(false);
    }
  }, [activeTab, typeFilter, search, canViewManagement, canViewOwn]);

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

  // Required Primary Columns: Employee, Leave Type, From, To, Days, Reason, Status, Requested, Actions
  const columns = useMemo(() => {
    const baseCols = [];
    if (activeTab !== 'my') {
      baseCols.push({ key: 'employee', label: 'Employee' });
    }
    baseCols.push(
      { key: 'leaveType', label: 'Leave Type' },
      { key: 'from', label: 'From' },
      { key: 'to', label: 'To' },
      { key: 'days', label: 'Days' },
      { key: 'reason', label: 'Reason' },
      { key: 'status', label: 'Status' },
      { key: 'requested', label: 'Requested' }
    );
    return baseCols;
  }, [activeTab]);

  const renderLeaveCell = (row, column) => {
    switch (column.key) {
      case 'employee': {
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
      }
      case 'leaveType': {
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
      }
      case 'from':
        return (
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            {formatDate(row.startDate)}
          </Typography>
        );
      case 'to':
        return (
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            {formatDate(row.endDate)}
          </Typography>
        );
      case 'days':
        return (
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              {row.totalDays} {row.totalDays === 1 ? 'Day' : 'Days'}
            </Typography>
            {row.isHalfDay && (
              <Chip
                label={row.halfDaySession === 'SECOND_HALF' ? '2nd Half' : '1st Half'}
                size="small"
                sx={{ height: 16, fontSize: 9, fontWeight: 700, mt: 0.25 }}
              />
            )}
          </Box>
        );
      case 'reason':
        return (
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
        );
      case 'status':
        return <StatusBadge status={row.status} />;
      case 'requested':
        return (
          <Typography variant="caption" color="text.secondary">
            {formatDate(row.createdAt)}
          </Typography>
        );
      default:
        return null;
    }
  };

  const renderLeaveActions = (row) => {
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
        {isPending && canApprove && !isOwn && activeTab !== 'my' && (
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

        {/* Requester / Manager Action: Cancel pending request */}
        {isPending && (isOwn || canManage || activeTab === 'my') && (
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
  };

  return (
    <AppLayout>
      <Stack spacing={3}>
        {/* Header */}
        <PageHeader
          title="Leave Management"
          description="Review employee leave applications, authorize workforce requests, and manage personal leave history."
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

        {/* Exactly 4 Summary Metric Cards */}
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
          {/* Exactly 6 Required Tabs */}
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
              {canViewManagement && <Tab value="all" label="All Requests" />}
              {canViewManagement && <Tab value="pending" label={`Pending (${stats.pending})`} />}
              {canViewManagement && <Tab value="approved" label="Approved" />}
              {canViewManagement && <Tab value="rejected" label="Rejected" />}
              {canViewOwn && <Tab value="my" label="My Leave" />}
              <Tab value="calendar" label="Calendar & Who's On Leave" />
            </Tabs>
          </Box>

          {/* Calendar View vs Table View */}
          {activeTab === 'calendar' ? (
            <Box sx={{ p: 3 }}>
              <LeaveCalendarView leaves={leaves} canViewManagement={canViewManagement} />
            </Box>
          ) : (
            <>
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
                      <InputLabel id="type-filter-select-label">Leave Type</InputLabel>
                      <Select
                        labelId="type-filter-select-label"
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
                    title={activeTab === 'my' ? 'No Leave History Found' : 'No Leave Requests'}
                    description={
                      search || typeFilter
                        ? 'No leave requests match your search or filter criteria.'
                        : activeTab === 'my'
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
                <DataTable
                  columns={columns}
                  rows={leaves}
                  getRowKey={(row) => row._id}
                  renderCell={renderLeaveCell}
                  renderActions={renderLeaveActions}
                  loading={loading}
                />
              )}
            </>
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
