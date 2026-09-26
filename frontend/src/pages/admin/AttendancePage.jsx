import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  IconButton,
  Paper,
  Snackbar,
  Stack,
  Tab,
  Tabs,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  AccessTimeRounded,
  AddRounded,
  CheckCircleOutlineRounded,
  CloseRounded,
  EditCalendarRounded,
  EventAvailableRounded,
  EventBusyRounded,
  HourglassEmptyRounded,
  LoginRounded,
  LogoutRounded,
  PersonOutlineRounded,
  RefreshRounded,
  ScheduleRounded,
  TodayRounded,
} from '@mui/icons-material';
import AppLayout from '../../components/AppLayout';
import PageHeader from '../../components/PageHeader';
import StatCard from '../../components/StatCard';
import StatusBadge from '../../components/StatusBadge';
import DataTable from '../../components/DataTable';
import EmptyState from '../../components/EmptyState';
import InitialsAvatar from '../../components/InitialsAvatar';
import ConfirmDialog from '../../components/ConfirmDialog';
import RequestRegularizationModal from '../../components/attendance/RequestRegularizationModal';
import { UnifiedCalendar } from '../../components/calendar';
import attendanceService from '../../services/attendance.service';
import leaveService from '../../services/leave.service';
import { hasPermission, PERMISSIONS } from '../../utils/permissions';

const formatTime = (isoString) => {
  if (!isoString) return '—';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return '—';
  }
};

const formatDuration = (minutes) => {
  if (!minutes || minutes <= 0) return '—';
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hrs > 0 && mins > 0) return `${hrs}h ${mins}m`;
  if (hrs > 0) return `${hrs}h`;
  return `${mins}m`;
};

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    return d.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return String(dateStr);
  }
};

const formatDateTime = (dateStr) => {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    return d.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return String(dateStr);
  }
};

const formatDayFull = (dateStr) => {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    return d.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return String(dateStr);
  }
};

const AttendancePage = () => {
  const currentRole = localStorage.getItem('role') || 'employee';
  const canViewWorkforce =
    currentRole === 'admin' ||
    hasPermission(PERMISSIONS.ATTENDANCE_VIEW) ||
    hasPermission(PERMISSIONS.ATTENDANCE_MANAGE);

  const [activeTab, setActiveTab] = useState('my');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [myHistory, setMyHistory] = useState([]);
  const [workforceHistory, setWorkforceHistory] = useState([]);
  const [myLeaves, setMyLeaves] = useState([]);
  const [myRegularizations, setMyRegularizations] = useState([]);
  const [stats, setStats] = useState({ present: 0, halfDay: 0, absent: 0, workingDays: 0 });
  const [selectedDateStr, setSelectedDateStr] = useState(() => new Date().toISOString().split('T')[0]);
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });

  // Regularization modal & cancel state
  const [isRegularizationModalOpen, setIsRegularizationModalOpen] = useState(false);
  const [cancellingRequest, setCancellingRequest] = useState(null);
  const [cancellingLoading, setCancellingLoading] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [todayRes, myRes, statsRes, leavesRes, regRes] = await Promise.all([
        attendanceService.getToday().catch(() => ({ data: null })),
        attendanceService.getMyAttendance().catch(() => ({ data: [] })),
        attendanceService.getAttendanceStats().catch(() => ({ data: { present: 0, halfDay: 0, absent: 0, workingDays: 0 } })),
        leaveService.getMyLeaves().catch(() => ({ data: [] })),
        attendanceService.getMyRegularizations().catch(() => []),
      ]);

      setTodayAttendance(todayRes?.data || null);
      setMyHistory(Array.isArray(myRes?.data) ? myRes.data : []);
      setStats(statsRes?.data || { present: 0, halfDay: 0, absent: 0, workingDays: 0 });
      setMyLeaves(Array.isArray(leavesRes?.data) ? leavesRes.data : []);
      setMyRegularizations(Array.isArray(regRes?.data) ? regRes.data : []);

      if (canViewWorkforce) {
        const wfRes = await attendanceService.getHospitalAttendance().catch(() => ({ data: [] }));
        setWorkforceHistory(Array.isArray(wfRes?.data) ? wfRes.data : []);
      }
    } catch {
      setToast({ open: true, message: 'Failed to load attendance data.', severity: 'error' });
    } finally {
      setLoading(false);
    }
  }, [canViewWorkforce]);


  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCheckIn = async () => {
    setSubmitting(true);
    try {
      await attendanceService.checkIn();
      setToast({ open: true, message: 'Checked in successfully! Have a productive day.', severity: 'success' });
      await loadData();
    } catch (err) {
      setToast({
        open: true,
        message: err?.response?.data?.message || 'Check-in failed. Please try again.',
        severity: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCheckOut = async () => {
    setSubmitting(true);
    try {
      await attendanceService.checkOut();
      setToast({ open: true, message: 'Checked out successfully! Working hours recorded.', severity: 'success' });
      await loadData();
    } catch (err) {
      setToast({
        open: true,
        message: err?.response?.data?.message || 'Check-out failed. Please try again.',
        severity: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Map calendar events: combine attendance + approved leaves
  const combinedCalendarEvents = useMemo(() => {
    const events = [];

    // Attendance events
    myHistory.forEach((att) => {
      let statusKey = 'approved'; // green
      if (att.status === 'HALF_DAY') statusKey = 'pending'; // amber
      if (att.status === 'ABSENT') statusKey = 'rejected'; // red

      events.push({
        _id: `att-${att._id}`,
        id: `att-${att._id}`,
        date: att.dateStr,
        startDate: att.dateStr,
        endDate: att.dateStr,
        status: statusKey,
        type: 'attendance',
        attendanceRecord: att,
      });
    });

    // Approved leaves
    myLeaves.forEach((l) => {
      if (l.status === 'cancelled') return;
      events.push({
        ...l,
        type: 'leave',
      });
    });

    return events;
  }, [myHistory, myLeaves]);

  // Selected date's attendance & leave information
  const selectedDateAttendance = useMemo(() => {
    return myHistory.find((a) => a.dateStr === selectedDateStr) || null;
  }, [myHistory, selectedDateStr]);

  const selectedDateLeave = useMemo(() => {
    return (
      myLeaves.find((l) => {
        if (l.status === 'cancelled') return false;
        const start = l.startDate?.split('T')[0];
        const end = l.endDate?.split('T')[0];
        return selectedDateStr >= start && selectedDateStr <= end;
      }) || null
    );
  }, [myLeaves, selectedDateStr]);

  // Table Columns
  const myColumns = [
    {
      id: 'dateStr',
      label: 'Date',
      render: (row) => (
        <Typography variant="body2" sx={{ fontWeight: 700, color: '#0F172A' }}>
          {formatDate(row.dateStr || row.date)}
        </Typography>
      ),
    },
    {
      id: 'status',
      label: 'Status',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      id: 'checkIn',
      label: 'Check In',
      render: (row) => (
        <Typography variant="body2" sx={{ color: '#334155' }}>
          {formatTime(row.checkIn)}
        </Typography>
      ),
    },
    {
      id: 'checkOut',
      label: 'Check Out',
      render: (row) => (
        <Typography variant="body2" sx={{ color: '#334155' }}>
          {formatTime(row.checkOut)}
        </Typography>
      ),
    },
    {
      id: 'workingMinutes',
      label: 'Working Hours',
      render: (row) => (
        <Typography variant="body2" sx={{ fontWeight: 700, color: '#0F172A' }}>
          {formatDuration(row.workingMinutes)}
        </Typography>
      ),
    },
    {
      id: 'notes',
      label: 'Notes',
      render: (row) => (
        <Typography variant="caption" sx={{ color: '#64748B' }}>
          {row.notes || '—'}
        </Typography>
      ),
    },
  ];

  const workforceColumns = [
    {
      id: 'employee',
      label: 'Employee',
      render: (row) => {
        const emp = row.employeeId || {};
        const name = emp.firstName ? `${emp.firstName} ${emp.lastName}` : 'Staff Employee';
        return (
          <Stack direction="row" spacing={1.5} alignItems="center">
            <InitialsAvatar name={name} size={34} />
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 700, color: '#0F172A' }} noWrap>
                {name}
              </Typography>
              <Typography variant="caption" sx={{ color: '#64748B' }} noWrap>
                {emp.employeeId || '—'} • {emp.positionId?.name || 'Staff'}
              </Typography>
            </Box>
          </Stack>
        );
      },
    },
    {
      id: 'dateStr',
      label: 'Date',
      render: (row) => (
        <Typography variant="body2" sx={{ fontWeight: 700, color: '#0F172A' }}>
          {formatDate(row.dateStr || row.date)}
        </Typography>
      ),
    },
    {
      id: 'status',
      label: 'Status',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      id: 'checkIn',
      label: 'Check In',
      render: (row) => (
        <Typography variant="body2" sx={{ color: '#334155' }}>
          {formatTime(row.checkIn)}
        </Typography>
      ),
    },
    {
      id: 'checkOut',
      label: 'Check Out',
      render: (row) => (
        <Typography variant="body2" sx={{ color: '#334155' }}>
          {formatTime(row.checkOut)}
        </Typography>
      ),
    },
    {
      id: 'workingMinutes',
      label: 'Duration',
      render: (row) => (
        <Typography variant="body2" sx={{ fontWeight: 700, color: '#0F172A' }}>
          {formatDuration(row.workingMinutes)}
        </Typography>
      ),
    },
  ];

  const handleCancelConfirm = async () => {
    if (!cancellingRequest) return;
    setCancellingLoading(true);
    try {
      await attendanceService.cancelRegularization(cancellingRequest._id);
      setToast({ open: true, message: 'Regularization request cancelled successfully.', severity: 'success' });
      setCancellingRequest(null);
      await loadData();
    } catch (err) {
      setToast({
        open: true,
        message: err?.response?.data?.message || 'Failed to cancel regularization request.',
        severity: 'error',
      });
    } finally {
      setCancellingLoading(false);
    }
  };

  const regularizationColumns = [
    {
      id: 'date',
      label: 'Date',
      render: (row) => (
        <Typography variant="body2" sx={{ fontWeight: 700, color: '#0F172A' }}>
          {formatDate(row.dateStr || row.date)}
        </Typography>
      ),
    },
    {
      id: 'requestedStatus',
      label: 'Requested Status',
      render: (row) => <StatusBadge status={row.requestedStatus} />,
    },
    {
      id: 'requestedCheckIn',
      label: 'Check In',
      render: (row) => (
        <Typography variant="body2" sx={{ color: '#334155' }}>
          {formatTime(row.requestedCheckIn)}
        </Typography>
      ),
    },
    {
      id: 'requestedCheckOut',
      label: 'Check Out',
      render: (row) => (
        <Typography variant="body2" sx={{ color: '#334155' }}>
          {formatTime(row.requestedCheckOut)}
        </Typography>
      ),
    },
    {
      id: 'reason',
      label: 'Reason',
      render: (row) => (
        <Tooltip title={row.reason || ''} arrow placement="top">
          <Typography
            variant="body2"
            sx={{
              color: '#334155',
              maxWidth: 240,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
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
      id: 'submittedAt',
      label: 'Submitted',
      render: (row) => (
        <Typography variant="caption" sx={{ color: '#64748B' }}>
          {formatDateTime(row.submittedAt || row.createdAt)}
        </Typography>
      ),
    },
    {
      id: 'actions',
      label: 'Actions',
      render: (row) => {
        if (row.status === 'PENDING') {
          return (
            <Button
              size="small"
              variant="outlined"
              onClick={() => setCancellingRequest(row)}
              sx={{
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '0.8rem',
                borderRadius: '8px',
                borderColor: '#E2E8F0',
                color: '#DC2626',
                py: 0.25,
                px: 1.5,
                '&:hover': {
                  borderColor: '#FECACA',
                  backgroundColor: '#FEF2F2',
                },
              }}
            >
              Cancel
            </Button>
          );
        }
        return (
          <Typography variant="caption" sx={{ color: '#94A3B8' }}>
            —
          </Typography>
        );
      },
    },
  ];


  return (
    <AppLayout>
      <Box sx={{ width: '100%', maxWidth: 1280, mx: 'auto', pb: 6 }}>
        {/* Page Header */}
        <PageHeader
          title="Attendance"
          description="Track your daily attendance and working history."
          actions={
            <Button
              variant="outlined"
              size="small"
              startIcon={<RefreshRounded />}
              onClick={loadData}
              disabled={loading}
              sx={{
                borderRadius: '8px',
                textTransform: 'none',
                fontWeight: 600,
                borderColor: '#E2E8F0',
                color: '#0F172A',
                '&:hover': { borderColor: '#CBD5E1', backgroundColor: '#F8FAFC' },
              }}
            >
              Refresh
            </Button>
          }
        />

        {/* ─── 1. TODAY'S ATTENDANCE ACTION CARD ───────────────────────────── */}
        <Paper
          variant="outlined"
          sx={{
            p: { xs: 2.25, sm: 3 },
            mb: 3,
            borderRadius: '16px',
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            boxShadow: '0 2px 6px rgba(15,23,42,0.03)',
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: { xs: 'flex-start', sm: 'center' },
              justifyContent: 'space-between',
              flexDirection: { xs: 'column', sm: 'row' },
              gap: 2,
              mb: 2.5,
              pb: 2,
              borderBottom: '1px solid #F1F5F9',
            }}
          >
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Box
                sx={{
                  width: 42,
                  height: 42,
                  borderRadius: '10px',
                  backgroundColor: '#0F172A',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <ScheduleRounded />
              </Box>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 800, color: '#0F172A', fontSize: '1.15rem' }}>
                  Today&apos;s Attendance
                </Typography>
                <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 500 }}>
                  {formatDayFull(new Date())}
                </Typography>
              </Box>
            </Stack>

            {/* Check In / Check Out Action Button */}
            {!todayAttendance ? (
              <Button
                variant="contained"
                startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : <LoginRounded />}
                onClick={handleCheckIn}
                disabled={submitting || loading}
                sx={{
                  backgroundColor: '#0F172A',
                  color: '#FFFFFF',
                  textTransform: 'none',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  px: 3,
                  py: 1,
                  borderRadius: '10px',
                  boxShadow: '0 2px 8px rgba(15,23,42,0.2)',
                  '&:hover': { backgroundColor: '#1E293B' },
                }}
              >
                Check In
              </Button>
            ) : !todayAttendance.checkOut ? (
              <Button
                variant="contained"
                startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : <LogoutRounded />}
                onClick={handleCheckOut}
                disabled={submitting || loading}
                sx={{
                  backgroundColor: '#D97706',
                  color: '#FFFFFF',
                  textTransform: 'none',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  px: 3,
                  py: 1,
                  borderRadius: '10px',
                  boxShadow: '0 2px 8px rgba(217,119,6,0.25)',
                  '&:hover': { backgroundColor: '#B45309' },
                }}
              >
                Check Out
              </Button>
            ) : (
              <Button
                variant="outlined"
                startIcon={<CheckCircleOutlineRounded sx={{ color: '#16A34A' }} />}
                disabled
                sx={{
                  textTransform: 'none',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  px: 2.5,
                  py: 1,
                  borderRadius: '10px',
                  borderColor: '#BBF7D0',
                  color: '#166534',
                  backgroundColor: '#F0FDF4',
                  '&.Mui-disabled': { color: '#166534', borderColor: '#BBF7D0', backgroundColor: '#F0FDF4' },
                }}
              >
                Completed Today
              </Button>
            )}
          </Box>

          {/* Today's Status Details Grid */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(4, 1fr)' },
              gap: { xs: 2, sm: 2.5 },
            }}
          >
            <Box>
              <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>
                Status
              </Typography>
              <Box sx={{ mt: 0.5 }}>
                <StatusBadge status={todayAttendance ? todayAttendance.status : 'NOT_CHECKED_IN'} />
              </Box>
            </Box>

            <Box>
              <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>
                Check In
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 700, color: '#0F172A', mt: 0.5 }}>
                {todayAttendance?.checkIn ? formatTime(todayAttendance.checkIn) : '—'}
              </Typography>
            </Box>

            <Box>
              <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>
                Check Out
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 700, color: '#0F172A', mt: 0.5 }}>
                {todayAttendance?.checkOut ? formatTime(todayAttendance.checkOut) : '—'}
              </Typography>
            </Box>

            <Box>
              <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>
                Working Duration
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 700, color: '#0F172A', mt: 0.5 }}>
                {todayAttendance?.workingMinutes ? formatDuration(todayAttendance.workingMinutes) : '—'}
              </Typography>
            </Box>
          </Box>
        </Paper>

        {/* ─── 2. SUMMARY KPI CARDS ────────────────────────────────────────── */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' },
            gap: 2,
            mb: 3.5,
          }}
        >
          <StatCard
            title="Present"
            value={stats.present}
            icon={CheckCircleOutlineRounded}
            color="#16A34A"
            caption="Days recorded"
          />
          <StatCard
            title="Half Day"
            value={stats.halfDay}
            icon={HourglassEmptyRounded}
            color="#D97706"
            caption="Half day logs"
          />
          <StatCard
            title="Absent"
            value={stats.absent}
            icon={EventBusyRounded}
            color="#DC2626"
            caption="Absences"
          />
          <StatCard
            title="Working Days"
            value={stats.workingDays}
            icon={EventAvailableRounded}
            color="#0284C7"
            caption="Total attended"
          />
        </Box>

        {/* ─── 3. TABS (MY ATTENDANCE vs REGULARIZATION vs WORKFORCE) ──────── */}
        <Box sx={{ borderBottom: '1px solid #E2E8F0', mb: 3 }}>
          <Tabs
            value={activeTab}
            onChange={(e, val) => setActiveTab(val)}
            sx={{
              '& .MuiTab-root': {
                textTransform: 'none',
                fontWeight: 700,
                fontSize: '0.925rem',
                minHeight: 44,
                color: '#64748B',
                '&.Mui-selected': { color: '#0F172A' },
              },
              '& .MuiTabs-indicator': { backgroundColor: '#0F172A', height: 3 },
            }}
          >
            <Tab value="my" label="My Attendance" />
            <Tab value="regularization" label="Regularization" />
            {canViewWorkforce && <Tab value="workforce" label="Workforce Attendance" />}
          </Tabs>
        </Box>

        {/* ─── 4. TAB CONTENT ──────────────────────────────────────────────── */}
        {activeTab === 'regularization' ? (
          /* ─── REGULARIZATION TAB ────────────────────────────────────────── */
          <Box sx={{ mb: 4 }}>
            <Paper
              variant="outlined"
              sx={{
                p: { xs: 2.25, sm: 3 },
                mb: 3,
                borderRadius: '16px',
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                boxShadow: '0 2px 6px rgba(15,23,42,0.03)',
                display: 'flex',
                alignItems: { xs: 'flex-start', sm: 'center' },
                justifyContent: 'space-between',
                flexDirection: { xs: 'column', sm: 'row' },
                gap: 2,
              }}
            >
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 800, color: '#0F172A', fontSize: '1.15rem' }}>
                  Regularization
                </Typography>
                <Typography variant="body2" sx={{ color: '#64748B', mt: 0.25 }}>
                  Request correction for attendance that was missing or incorrect.
                </Typography>
              </Box>

              <Button
                variant="contained"
                startIcon={<AddRounded />}
                onClick={() => setIsRegularizationModalOpen(true)}
                sx={{
                  backgroundColor: '#0F172A',
                  color: '#FFFFFF',
                  textTransform: 'none',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  px: 2.5,
                  py: 1,
                  borderRadius: '10px',
                  boxShadow: '0 2px 8px rgba(15,23,42,0.2)',
                  '&:hover': { backgroundColor: '#1E293B' },
                }}
              >
                + Request Regularization
              </Button>
            </Paper>

            <DataTable
              columns={regularizationColumns}
              data={myRegularizations}
              keyField="_id"
              loading={loading}
              emptyTitle="No regularization requests yet"
              emptyDescription="Submit a request if your attendance was missing or incorrectly marked."
            />
          </Box>
        ) : activeTab === 'my' ? (
          /* ─── MY ATTENDANCE TAB ─────────────────────────────────────────── */
          <Box sx={{ mb: 4 }}>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: '1fr',
                  lg: 'minmax(0, 1fr) minmax(300px, 32%)',
                },
                gap: 3,
                alignItems: 'start',
                width: '100%',
                minWidth: 0,
              }}
            >
              {/* Left: Reusable Unified Calendar */}
              <Box sx={{ width: '100%', minWidth: 0 }}>
                <UnifiedCalendar
                  events={combinedCalendarEvents}
                  selectedDate={selectedDateStr}
                  onDateSelect={(dateStr) => setSelectedDateStr(dateStr)}
                  legend={
                    <Stack
                      direction="row"
                      spacing={{ xs: 1.5, sm: 2.5 }}
                      sx={{
                        justifyContent: 'center',
                        flexWrap: 'wrap',
                        gap: 1,
                      }}
                    >
                      <Stack direction="row" spacing={0.75} alignItems="center">
                        <Box sx={{ width: 7.5, height: 7.5, borderRadius: '50%', backgroundColor: '#16A34A' }} />
                        <Typography variant="caption" color="text.secondary" fontWeight={600}>
                          Present
                        </Typography>
                      </Stack>
                      <Stack direction="row" spacing={0.75} alignItems="center">
                        <Box sx={{ width: 7.5, height: 7.5, borderRadius: '50%', backgroundColor: '#D97706' }} />
                        <Typography variant="caption" color="text.secondary" fontWeight={600}>
                          Half Day
                        </Typography>
                      </Stack>
                      <Stack direction="row" spacing={0.75} alignItems="center">
                        <Box sx={{ width: 7.5, height: 7.5, borderRadius: '50%', backgroundColor: '#DC2626' }} />
                        <Typography variant="caption" color="text.secondary" fontWeight={600}>
                          Absent
                        </Typography>
                      </Stack>
                      <Stack direction="row" spacing={0.75} alignItems="center">
                        <Box sx={{ width: 7.5, height: 7.5, borderRadius: '50%', backgroundColor: '#0284C7' }} />
                        <Typography variant="caption" color="text.secondary" fontWeight={600}>
                          Today / Selected
                        </Typography>
                      </Stack>
                    </Stack>
                  }
                />
              </Box>

              {/* Right: Selected Date Log Card */}
              <Box sx={{ width: '100%', minWidth: 0 }}>
                <Paper
                  variant="outlined"
                  sx={{
                    p: { xs: 2, sm: 2.5 },
                    borderRadius: '14px',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                    display: 'flex',
                    flexDirection: 'column',
                    width: '100%',
                    minWidth: 0,
                    boxSizing: 'border-box',
                  }}
                >
                  <Stack direction="row" spacing={1.25} alignItems="center" sx={{ mb: 0.5 }}>
                    <TodayRounded color="primary" />
                    <Typography variant="h6" sx={{ fontWeight: 800, fontSize: '1.15rem' }}>
                      Daily Log
                    </Typography>
                  </Stack>

                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Attendance details for <strong>{formatDate(selectedDateStr)}</strong>.
                  </Typography>

                  {/* Daily Log Info Card */}
                  <Box sx={{ flexGrow: 1, minHeight: 200, display: 'flex', flexDirection: 'column' }}>
                    {selectedDateAttendance ? (
                      <Stack spacing={2} sx={{ p: 2, backgroundColor: '#F8FAFC', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>
                            Status
                          </Typography>
                          <StatusBadge status={selectedDateAttendance.status} />
                        </Box>

                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600 }}>
                            Check In
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 700, color: '#0F172A' }}>
                            {formatTime(selectedDateAttendance.checkIn)}
                          </Typography>
                        </Box>

                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600 }}>
                            Check Out
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 700, color: '#0F172A' }}>
                            {formatTime(selectedDateAttendance.checkOut)}
                          </Typography>
                        </Box>

                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600 }}>
                            Working Duration
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 700, color: '#0F172A' }}>
                            {formatDuration(selectedDateAttendance.workingMinutes)}
                          </Typography>
                        </Box>

                        {selectedDateAttendance.notes && (
                          <Box sx={{ pt: 1, borderTop: '1px solid #E2E8F0' }}>
                            <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600, display: 'block' }}>
                              Notes
                            </Typography>
                            <Typography variant="body2" sx={{ color: '#334155', mt: 0.25 }}>
                              {selectedDateAttendance.notes}
                            </Typography>
                          </Box>
                        )}
                      </Stack>
                    ) : (
                      <Box
                        sx={{
                          p: 3,
                          textAlign: 'center',
                          backgroundColor: '#F8FAFC',
                          borderRadius: '12px',
                          border: '1px dashed #E2E8F0',
                          my: 'auto',
                        }}
                      >
                        <EventBusyRounded sx={{ fontSize: 38, color: '#94A3B8', mb: 1 }} />
                        <Typography variant="body2" sx={{ fontWeight: 600, color: '#64748B' }}>
                          No attendance recorded
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#94A3B8', mt: 0.5, display: 'block' }}>
                          No check-in or working hours logged for this date.
                        </Typography>
                      </Box>
                    )}

                    {/* Associated Leave info on this day if any */}
                    {selectedDateLeave && (
                      <Box sx={{ mt: 2, p: 2, borderRadius: '10px', backgroundColor: '#F0F9FF', border: '1px solid #BAE6FD' }}>
                        <Typography variant="caption" sx={{ fontWeight: 700, color: '#0369A1', display: 'block' }}>
                          Approved Leave Request
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#0C4A6E', fontWeight: 600, mt: 0.25 }}>
                          {selectedDateLeave.leaveType} ({selectedDateLeave.totalDays} {selectedDateLeave.totalDays === 1 ? 'Day' : 'Days'})
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#0369A1', mt: 0.25, display: 'block' }}>
                          Reason: {selectedDateLeave.reason}
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </Paper>
              </Box>
            </Box>

            {/* ─── 5. ATTENDANCE HISTORY TABLE ───────────────────────────── */}
            <Box sx={{ mt: 4 }}>
              <Typography variant="h6" sx={{ fontWeight: 800, color: '#0F172A', mb: 2 }}>
                Attendance History
              </Typography>
              <DataTable
                columns={myColumns}
                data={myHistory}
                keyField="_id"
                loading={loading}
                emptyTitle="No attendance records yet"
                emptyDescription="Your check-in and working duration history will appear here."
              />
            </Box>
          </Box>
        ) : (
          /* ─── 6. WORKFORCE ATTENDANCE TABLE ───────────────────────────── */
          <Box sx={{ mt: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 800, color: '#0F172A', mb: 2 }}>
              Hospital Workforce Attendance
            </Typography>
            <DataTable
              columns={workforceColumns}
              data={workforceHistory}
              keyField="_id"
              loading={loading}
              emptyTitle="No workforce records found"
              emptyDescription="Attendance records for your hospital workforce will appear here."
            />
          </Box>
        )}
      </Box>

      {/* Request Regularization Modal */}
      <RequestRegularizationModal
        open={isRegularizationModalOpen}
        onClose={() => setIsRegularizationModalOpen(false)}
        onSuccess={(msg) => {
          setToast({ open: true, message: msg, severity: 'success' });
          loadData();
        }}
      />

      {/* Cancel Regularization Confirmation Dialog */}
      <ConfirmDialog
        open={Boolean(cancellingRequest)}
        title="Cancel Regularization Request"
        message="Are you sure you want to cancel this regularization request?"
        confirmLabel="Cancel Request"
        confirmColor="error"
        danger={true}
        submitting={cancellingLoading}
        onConfirm={handleCancelConfirm}
        onClose={() => setCancellingRequest(null)}
      />

      {/* Toast Notification */}
      <Snackbar
        open={toast.open}
        autoHideDuration={4000}
        onClose={() => setToast((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          severity={toast.severity}
          onClose={() => setToast((prev) => ({ ...prev, open: false }))}
          sx={{ borderRadius: '10px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </AppLayout>
  );
};

export default AttendancePage;

