import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Chip,
  Grid,
  Skeleton,
  Snackbar,
  Stack,
  Typography,
} from '@mui/material';
import {
  AccessTimeRounded,
  AddRounded,
  ArrowForwardRounded,
  BadgeRounded,
  CheckCircleOutlineRounded,
  EventNoteRounded,
  GroupRounded,
  LayersRounded,
  LocalHospitalRounded,
  LoginRounded,
  LogoutRounded,
  ScheduleRounded,
  VpnKeyRounded,
} from '@mui/icons-material';
import hospitalService from '../../services/hospital.service';
import attendanceService from '../../services/attendance.service';
import leaveService from '../../services/leave.service';
import rosterService from '../../services/roster.service';
import auth from '../../services/auth.service';
import AppLayout from '../../components/AppLayout';
import PageHeader from '../../components/PageHeader';
import StatCard from '../../components/StatCard';
import StatusBadge from '../../components/StatusBadge';
import GlassCard from '../../components/GlassCard';
import ErrorState from '../../components/ErrorState';
import { hasPermission, PERMISSIONS } from '../../utils/permissions';

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
};

const format12h = (timeStr) => {
  if (!timeStr) return '';
  if (timeStr.includes(':')) {
    const parts = timeStr.split(':');
    let h = parseInt(parts[0], 10);
    const m = parts[1] || '00';
    if (isNaN(h)) return timeStr;
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${h}:${m} ${ampm}`;
  }
  return timeStr;
};

const calculateWorkDuration = (inTime, outTime, minutes) => {
  if (minutes && typeof minutes === 'number' && minutes > 0) {
    const hrs = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hrs}h ${mins}m`;
  }
  if (!inTime || !outTime) return '';
  const [inH, inM] = inTime.split(':').map(Number);
  const [outH, outM] = outTime.split(':').map(Number);
  if (!isNaN(inH) && !isNaN(outH)) {
    let diffMins = (outH * 60 + outM) - (inH * 60 + inM);
    if (diffMins < 0) diffMins += 24 * 60;
    const hrs = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return `${hrs}h ${mins}m`;
  }
  return '';
};

const getUserRoleFromStorage = () => {
  const storedRole = localStorage.getItem('role');
  if (storedRole) return storedRole;
  const token = localStorage.getItem('token');
  if (token) {
    try {
      const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(atob(base64));
      return payload.role || 'employee';
    } catch {
      return 'employee';
    }
  }
  return 'employee';
};

const AdminDashboard = () => {
  const navigate = useNavigate();
  const userRole = getUserRoleFromStorage();
  const userName = localStorage.getItem('userName') || 'User';

  const [hospital, setHospital] = useState(null);
  const [stats, setStats] = useState({
    totalEmployees: 0,
    activeEmployees: 0,
    pendingLeaves: 0,
    todayAttendance: 0,
    todayRosterAssigned: 0,
    pendingRegularizations: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Employee Dashboard State
  const [todayAttendanceState, setTodayAttendanceState] = useState(null);
  const [todayRosterDuty, setTodayRosterDuty] = useState(null);
  const [myLeaves, setMyLeaves] = useState([]);
  const [myRegularizations, setMyRegularizations] = useState([]);
  const [actionLoading, setActionLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });

  const showSnack = (message, severity = 'info') => {
    setSnackbar({ open: true, message, severity });
  };

  // Permission Checks
  const canManageRoster = hasPermission(PERMISSIONS.ROSTER_MANAGE);
  const canViewRoster = hasPermission(PERMISSIONS.ROSTER_VIEW) || canManageRoster;
  const canViewLeaves = hasPermission(PERMISSIONS.LEAVE_VIEW) || hasPermission(PERMISSIONS.LEAVE_VIEW_WORKFORCE) || userRole === 'admin';
  const canViewAttendance = hasPermission(PERMISSIONS.ATTENDANCE_VIEW) || hasPermission(PERMISSIONS.ATTENDANCE_VIEW_WORKFORCE) || userRole === 'admin';
  const canAccessManagement = hasPermission(PERMISSIONS.ACCESS_VIEW) || userRole === 'admin';
  const canViewStructure = hasPermission(PERMISSIONS.STRUCTURE_VIEW) || userRole === 'admin';

  const fetchOverview = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      if (userRole === 'admin') {
        const res = await hospitalService.getOverview();
        const data = res?.data?.data || res?.data || {};
        setHospital(data.hospital || null);
        setStats(data.stats || {
          totalEmployees: 0,
          activeEmployees: 0,
          pendingLeaves: 0,
          todayAttendance: 0,
          todayRosterAssigned: 0,
          pendingRegularizations: 0,
        });
      } else {
        // Employee Dashboard Data
        const [attRes, rosterRes, leaveRes, regRes] = await Promise.allSettled([
          attendanceService.getToday(),
          rosterService.getMyRoster(),
          leaveService.getMyLeaves(),
          attendanceService.getMyRegularizations(),
        ]);

        if (attRes.status === 'fulfilled') {
          const attData = attRes.value?.data || attRes.value || null;
          setTodayAttendanceState(attData);
        }

        if (rosterRes.status === 'fulfilled') {
          const assignments = rosterRes.value?.data || rosterRes.value || [];
          const todayStr = new Date().toISOString().split('T')[0];
          const todayDuty = Array.isArray(assignments)
            ? assignments.find((ass) => {
                const d = ass.date ? new Date(ass.date).toISOString().split('T')[0] : '';
                return d === todayStr;
              })
            : null;
          setTodayRosterDuty(todayDuty || null);
        }

        if (leaveRes.status === 'fulfilled') {
          const lData = leaveRes.value?.data || leaveRes.value || [];
          setMyLeaves(Array.isArray(lData) ? lData : []);
        }

        if (regRes.status === 'fulfilled') {
          const rData = regRes.value || [];
          setMyRegularizations(Array.isArray(rData) ? rData : []);
        }
      }
    } catch (err) {
      console.error('Dashboard Overview Error:', err);
      setError(err?.response?.data?.message || 'Unable to load dashboard metrics.');
    } finally {
      setLoading(false);
    }
  }, [userRole]);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        await auth.logout();
      }
    } catch (logoutError) {
      console.error('Logout error:', logoutError);
    } finally {
      localStorage.clear();
      navigate('/login');
    }
  };

  const handleCheckIn = async () => {
    try {
      setActionLoading(true);
      const res = await attendanceService.checkIn();
      const attData = res?.data || res;
      if (attData) setTodayAttendanceState(attData);
      showSnack('Checked in successfully', 'success');
      await fetchOverview();
    } catch (err) {
      console.error('Check in error:', err);
      showSnack(err?.response?.data?.message || 'Check in failed', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckOut = async () => {
    try {
      setActionLoading(true);
      const res = await attendanceService.checkOut();
      const attData = res?.data || res;
      if (attData) setTodayAttendanceState(attData);
      showSnack('Checked out successfully', 'success');
      await fetchOverview();
    } catch (err) {
      console.error('Check out error:', err);
      showSnack(err?.response?.data?.message || 'Check out failed', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const pendingLeavesCount = useMemo(
    () => myLeaves.filter((l) => (l.status || '').toUpperCase() === 'PENDING').length,
    [myLeaves]
  );

  const pendingRegsCount = useMemo(
    () => myRegularizations.filter((r) => (r.status || '').toUpperCase() === 'PENDING').length,
    [myRegularizations]
  );

  // ───────────────────────────────────────────────────────────────────────────
  // EMPLOYEE / NURSE DASHBOARD VIEW
  // ───────────────────────────────────────────────────────────────────────────
  if (userRole === 'employee') {
    const isCheckedOut =
      todayAttendanceState?.status === 'CHECKED_OUT' ||
      todayAttendanceState?.status === 'PRESENT' ||
      Boolean(todayAttendanceState?.checkInTime && todayAttendanceState?.checkOutTime);

    const isCheckedIn =
      !isCheckedOut &&
      (todayAttendanceState?.status === 'CHECKED_IN' ||
        Boolean(todayAttendanceState?.checkInTime && !todayAttendanceState?.checkOutTime));

    const workDurationStr = calculateWorkDuration(
      todayAttendanceState?.checkInTime,
      todayAttendanceState?.checkOutTime,
      todayAttendanceState?.workDurationMinutes
    );

    return (
      <AppLayout onLogout={handleLogout}>
        <Stack spacing={3.5}>
          <PageHeader
            title={`${getGreeting()}, ${userName}`}
            subtitle="Here is your personal work and shift summary for today."
          />

          {error && <ErrorState message={error} onRetry={fetchOverview} />}

          {loading ? (
            <Grid container spacing={2.5}>
              <Grid item xs={12} md={6}>
                <Skeleton variant="rounded" height={180} sx={{ borderRadius: '12px' }} />
              </Grid>
              <Grid item xs={12} md={6}>
                <Skeleton variant="rounded" height={180} sx={{ borderRadius: '12px' }} />
              </Grid>
            </Grid>
          ) : (
            <>
              {/* Today Status & Duty Cards */}
              <Grid container spacing={2.5}>
                {/* ATTENDANCE ACTION CARD */}
                <Grid item xs={12} md={6}>
                  <GlassCard sx={{ p: 3, height: '100%' }}>
                    <Stack spacing={2} sx={{ height: '100%', justifyContent: 'space-between' }}>
                      <Box>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Typography variant="overline" color="text.secondary" fontWeight={700}>
                            Today's Attendance
                          </Typography>
                          <AccessTimeRounded color="action" fontSize="small" />
                        </Stack>

                        <Typography variant="h5" fontWeight={700} sx={{ mt: 1 }}>
                          {isCheckedOut
                            ? 'Present'
                            : isCheckedIn
                            ? 'Checked In'
                            : 'Not Checked In Yet'}
                        </Typography>

                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                          {isCheckedOut ? (
                            `${format12h(todayAttendanceState?.checkInTime)} — ${format12h(todayAttendanceState?.checkOutTime)}`
                          ) : isCheckedIn ? (
                            `Checked in at: ${format12h(todayAttendanceState?.checkInTime)}`
                          ) : (
                            'Record your check-in time for today\'s shift.'
                          )}
                        </Typography>

                        {isCheckedOut && workDurationStr && (
                          <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ display: 'block', mt: 0.5 }}>
                            Working: {workDurationStr}
                          </Typography>
                        )}
                      </Box>

                      <Box pt={1}>
                        {!isCheckedIn && !isCheckedOut && (
                          <Button
                            variant="contained"
                            color="primary"
                            startIcon={<LoginRounded />}
                            onClick={handleCheckIn}
                            disabled={actionLoading}
                            fullWidth
                          >
                            Check In
                          </Button>
                        )}

                        {isCheckedIn && !isCheckedOut && (
                          <Button
                            variant="outlined"
                            color="primary"
                            startIcon={<LogoutRounded />}
                            onClick={handleCheckOut}
                            disabled={actionLoading}
                            fullWidth
                          >
                            Check Out
                          </Button>
                        )}

                        {isCheckedOut && (
                          <Chip
                            icon={<CheckCircleOutlineRounded />}
                            label="Shift Completed"
                            color="success"
                            variant="outlined"
                            sx={{ fontWeight: 600 }}
                          />
                        )}
                      </Box>
                    </Stack>
                  </GlassCard>
                </Grid>

                {/* TODAY'S ROSTER DUTY CARD */}
                <Grid item xs={12} md={6}>
                  <GlassCard sx={{ p: 3, height: '100%' }}>
                    <Stack spacing={2} sx={{ height: '100%', justifyContent: 'space-between' }}>
                      <Box>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Typography variant="overline" color="text.secondary" fontWeight={700}>
                            Today's Roster Duty
                          </Typography>
                          <ScheduleRounded color="action" fontSize="small" />
                        </Stack>

                        {todayRosterDuty ? (
                          <>
                            <Typography variant="h5" fontWeight={700} sx={{ mt: 1 }}>
                              {todayRosterDuty.dutyArea}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                              Shift: <strong>{todayRosterDuty.shiftTitle}</strong> (
                              {format12h(todayRosterDuty.startTime)} – {format12h(todayRosterDuty.endTime)})
                            </Typography>
                            {todayRosterDuty.notes && (
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                                Notes: {todayRosterDuty.notes}
                              </Typography>
                            )}
                          </>
                        ) : (
                          <>
                            <Typography variant="h6" fontWeight={600} color="text.secondary" sx={{ mt: 1 }}>
                              No Roster Assigned
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                              No roster assigned for today.
                            </Typography>
                          </>
                        )}
                      </Box>

                      <Box pt={1}>
                        <Button
                          variant="outlined"
                          size="small"
                          endIcon={<ArrowForwardRounded fontSize="small" />}
                          onClick={() => navigate('/roster')}
                        >
                          View My Roster
                        </Button>
                      </Box>
                    </Stack>
                  </GlassCard>
                </Grid>
              </Grid>

              {/* Employee Summary & Quick Links */}
              <Grid container spacing={2.5}>
                <Grid item xs={12} sm={6} lg={3}>
                  <StatCard
                    label="My Leaves"
                    value={myLeaves.length}
                    hint={pendingLeavesCount ? `${pendingLeavesCount} request pending approval` : 'No pending requests'}
                    footer={
                      <Button size="small" onClick={() => navigate('/leaves')}>
                        Apply Leave
                      </Button>
                    }
                  />
                </Grid>
                <Grid item xs={12} sm={6} lg={3}>
                  <StatCard
                    label="My Attendance"
                    value={todayAttendanceState ? 'Active' : 'Recorded'}
                    hint="View past attendance history"
                    footer={
                      <Button size="small" onClick={() => navigate('/attendance')}>
                        Attendance History
                      </Button>
                    }
                  />
                </Grid>
                <Grid item xs={12} sm={6} lg={3}>
                  <StatCard
                    label="Regularization"
                    value={pendingRegsCount}
                    hint={pendingRegsCount ? 'Pending manager action' : 'No pending requests'}
                    footer={
                      <Button size="small" onClick={() => navigate('/attendance')}>
                        Request Regularization
                      </Button>
                    }
                  />
                </Grid>
                <Grid item xs={12} sm={6} lg={3}>
                  <StatCard
                    label="My Profile"
                    value="Account"
                    hint="Personal details & credentials"
                    footer={
                      <Button size="small" onClick={() => navigate('/profile')}>
                        View Profile
                      </Button>
                    }
                  />
                </Grid>
              </Grid>

              {/* Quick Actions Card - All Outline Secondary Style */}
              <GlassCard sx={{ p: 3 }}>
                <Stack spacing={2}>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 700, fontSize: 18 }}>
                      Quick Actions
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Fast access to your self-service tools.
                    </Typography>
                  </Box>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} flexWrap="wrap" useFlexGap>
                    <Button
                      variant="outlined"
                      startIcon={<EventNoteRounded />}
                      onClick={() => navigate('/leaves')}
                    >
                      Apply Leave
                    </Button>
                    <Button
                      variant="outlined"
                      startIcon={<ScheduleRounded />}
                      onClick={() => navigate('/roster')}
                    >
                      My Shift Roster
                    </Button>
                    <Button
                      variant="outlined"
                      startIcon={<AccessTimeRounded />}
                      onClick={() => navigate('/attendance')}
                    >
                      My Attendance
                    </Button>
                  </Stack>
                </Stack>
              </GlassCard>
            </>
          )}

          <Snackbar
            open={snackbar.open}
            autoHideDuration={4000}
            onClose={() => setSnackbar((p) => ({ ...p, open: false }))}
          >
            <Alert
              onClose={() => setSnackbar((p) => ({ ...p, open: false }))}
              severity={snackbar.severity}
              variant="filled"
              sx={{ width: '100%' }}
            >
              {snackbar.message}
            </Alert>
          </Snackbar>
        </Stack>
      </AppLayout>
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // ADMIN DASHBOARD VIEW
  // ───────────────────────────────────────────────────────────────────────────
  return (
    <AppLayout onLogout={handleLogout}>
      <Stack spacing={3.5}>
        <PageHeader
          title={`${getGreeting()}, ${userName}`}
          subtitle={hospital?.name ? `${hospital.name} · Overview of hospital operations and team.` : 'Overview of hospital operations and team.'}
        />

        {error && <ErrorState message={error} onRetry={fetchOverview} />}

        {loading ? (
          <Grid container spacing={2.5}>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Grid item xs={12} sm={6} lg={4} key={i}>
                <Skeleton variant="rounded" height={130} sx={{ borderRadius: '12px' }} />
              </Grid>
            ))}
          </Grid>
        ) : (
          <>
            {/* Hospital Summary KPI Grid */}
            <Grid container spacing={2.5}>
              <Grid item xs={12} sm={6} lg={4}>
                <StatCard
                  label="Total Workforce"
                  value={stats.totalEmployees || stats.activeEmployees || stats.hrCount || 0}
                  footer={<StatusBadge status="active" label="Hospital Employees" />}
                />
              </Grid>

              <Grid item xs={12} sm={6} lg={4}>
                <StatCard
                  label="Active Staff"
                  value={stats.activeEmployees || stats.totalEmployees || 0}
                  footer={<StatusBadge status="active" label="Active Status" />}
                />
              </Grid>

              <Grid item xs={12} sm={6} lg={4}>
                <StatCard
                  label="Today's Attendance"
                  value={stats.todayAttendance}
                  hint="Present / Checked in staff today"
                  footer={
                    <Button size="small" onClick={() => navigate('/attendance')}>
                      View Attendance
                    </Button>
                  }
                />
              </Grid>

              <Grid item xs={12} sm={6} lg={4}>
                <StatCard
                  label="Pending Leave Requests"
                  value={stats.pendingLeaves}
                  footer={
                    <StatusBadge
                      status={stats.pendingLeaves > 0 ? 'pending' : 'inactive'}
                      label={stats.pendingLeaves > 0 ? 'Action Required' : 'Up to date'}
                    />
                  }
                />
              </Grid>

              <Grid item xs={12} sm={6} lg={4}>
                <StatCard
                  label="Today's Scheduled Staff"
                  value={stats.todayRosterAssigned}
                  hint="Assigned in published roster today"
                  footer={
                    <Button size="small" onClick={() => navigate('/roster')}>
                      Manage Roster
                    </Button>
                  }
                />
              </Grid>

              <Grid item xs={12} sm={6} lg={4}>
                <StatCard
                  label="Pending Regularization"
                  value={stats.pendingRegularizations}
                  footer={
                    <StatusBadge
                      status={stats.pendingRegularizations > 0 ? 'pending' : 'inactive'}
                      label={stats.pendingRegularizations > 0 ? 'Action Required' : 'None'}
                    />
                  }
                />
              </Grid>
            </Grid>

            {/* Operational Section Cards */}
            <Grid container spacing={2.5}>
              {/* ATTENDANCE OVERVIEW */}
              {canViewAttendance && (
                <Grid item xs={12} md={6}>
                  <GlassCard sx={{ p: 3, height: '100%' }}>
                    <Stack spacing={2} justifyContent="space-between" sx={{ height: '100%' }}>
                      <Box>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Typography variant="h6" fontWeight={700} fontSize={18}>
                            Attendance Today
                          </Typography>
                          <AccessTimeRounded color="action" fontSize="small" />
                        </Stack>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                          Track staff check-ins, check-outs, and active duty status.
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="h4" fontWeight={700}>
                          {stats.todayAttendance}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Staff checked in for today's shift
                        </Typography>
                      </Box>
                      <Box>
                        <Button
                          variant="outlined"
                          size="small"
                          endIcon={<ArrowForwardRounded fontSize="small" />}
                          onClick={() => navigate('/attendance')}
                        >
                          Open Attendance Log
                        </Button>
                      </Box>
                    </Stack>
                  </GlassCard>
                </Grid>
              )}

              {/* LEAVE MANAGEMENT OVERVIEW */}
              {canViewLeaves && (
                <Grid item xs={12} md={6}>
                  <GlassCard sx={{ p: 3, height: '100%' }}>
                    <Stack spacing={2} justifyContent="space-between" sx={{ height: '100%' }}>
                      <Box>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Typography variant="h6" fontWeight={700} fontSize={18}>
                            Leave Management
                          </Typography>
                          <EventNoteRounded color="action" fontSize="small" />
                        </Stack>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                          Review and approve staff leave requests.
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="h4" fontWeight={700}>
                          {stats.pendingLeaves}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {stats.pendingLeaves === 1 ? '1 request needs review' : `${stats.pendingLeaves} requests need review`}
                        </Typography>
                      </Box>
                      <Box>
                        <Button
                          variant="outlined"
                          size="small"
                          endIcon={<ArrowForwardRounded fontSize="small" />}
                          onClick={() => navigate('/leaves')}
                        >
                          Review Leave Requests
                        </Button>
                      </Box>
                    </Stack>
                  </GlassCard>
                </Grid>
              )}

              {/* ROSTER OPERATIONAL OVERVIEW */}
              {canViewRoster && (
                <Grid item xs={12} md={6}>
                  <GlassCard sx={{ p: 3, height: '100%' }}>
                    <Stack spacing={2} justifyContent="space-between" sx={{ height: '100%' }}>
                      <Box>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Typography variant="h6" fontWeight={700} fontSize={18}>
                            Roster & Duty Planning
                          </Typography>
                          <ScheduleRounded color="action" fontSize="small" />
                        </Stack>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                          Manage shift templates, published schedules, and duty assignments.
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="h4" fontWeight={700}>
                          {stats.todayRosterAssigned}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Staff assigned on published roster today
                        </Typography>
                      </Box>
                      <Box>
                        <Button
                          variant="outlined"
                          size="small"
                          endIcon={<ArrowForwardRounded fontSize="small" />}
                          onClick={() => navigate('/roster')}
                        >
                          Manage Work Roster
                        </Button>
                      </Box>
                    </Stack>
                  </GlassCard>
                </Grid>
              )}

              {/* REGULARIZATION OVERVIEW */}
              {canViewAttendance && (
                <Grid item xs={12} md={6}>
                  <GlassCard sx={{ p: 3, height: '100%' }}>
                    <Stack spacing={2} justifyContent="space-between" sx={{ height: '100%' }}>
                      <Box>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Typography variant="h6" fontWeight={700} fontSize={18}>
                            Attendance Regularization
                          </Typography>
                          <AccessTimeRounded color="action" fontSize="small" />
                        </Stack>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                          Approve or decline attendance correction requests.
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="h4" fontWeight={700}>
                          {stats.pendingRegularizations}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Pending regularization requests
                        </Typography>
                      </Box>
                      <Box>
                        <Button
                          variant="outlined"
                          size="small"
                          endIcon={<ArrowForwardRounded fontSize="small" />}
                          onClick={() => navigate('/attendance')}
                        >
                          Review Regularizations
                        </Button>
                      </Box>
                    </Stack>
                  </GlassCard>
                </Grid>
              )}
            </Grid>

            {/* Quick Actions Card - All Neutral Outline Style */}
            <GlassCard sx={{ p: 3 }}>
              <Stack spacing={2}>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 700, fontSize: 18 }}>
                    Quick Actions
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Jump straight into managing your hospital modules.
                  </Typography>
                </Box>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} flexWrap="wrap" useFlexGap>
                  {canManageRoster && (
                    <Button
                      variant="outlined"
                      startIcon={<ScheduleRounded />}
                      onClick={() => navigate('/roster')}
                    >
                      Manage Roster
                    </Button>
                  )}
                  {canViewAttendance && (
                    <Button
                      variant="outlined"
                      startIcon={<AccessTimeRounded />}
                      onClick={() => navigate('/attendance')}
                    >
                      Attendance
                    </Button>
                  )}
                  {canViewLeaves && (
                    <Button
                      variant="outlined"
                      startIcon={<EventNoteRounded />}
                      onClick={() => navigate('/leaves')}
                    >
                      Leave Management
                    </Button>
                  )}
                  {canAccessManagement && (
                    <Button
                      variant="outlined"
                      startIcon={<VpnKeyRounded />}
                      onClick={() => navigate('/access-management')}
                    >
                      Access Management
                    </Button>
                  )}
                  {canViewStructure && (
                    <Button
                      variant="outlined"
                      startIcon={<LayersRounded />}
                      onClick={() => navigate('/structure')}
                    >
                      Hospital Structure
                    </Button>
                  )}
                </Stack>
              </Stack>
            </GlassCard>
          </>
        )}

        <Snackbar
          open={snackbar.open}
          autoHideDuration={4000}
          onClose={() => setSnackbar((p) => ({ ...p, open: false }))}
        >
          <Alert
            onClose={() => setSnackbar((p) => ({ ...p, open: false }))}
            severity={snackbar.severity}
            variant="filled"
            sx={{ width: '100%' }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Stack>
    </AppLayout>
  );
};

export default AdminDashboard;