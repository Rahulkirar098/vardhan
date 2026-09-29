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
  FingerprintRounded,
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

// ─── POLISHED SAAS DASHBOARD CARD ──────────────────────────────────────────────
const DashboardMetricCard = ({ label, value, hint, badgeLabel, badgeStatus, icon: Icon, actionButton }) => {
  return (
    <Box
      sx={{
        p: 2.5,
        height: '100%',
        backgroundColor: '#FFFFFF',
        border: '1px solid #E5E7EB',
        borderRadius: '14px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        transition: 'all 150ms ease',
        '&:hover': {
          borderColor: '#CBD5E1',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
        },
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
        <Typography
          sx={{
            fontSize: '0.75rem',
            fontWeight: 700,
            color: '#64748B',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            lineHeight: 1.3,
          }}
        >
          {label}
        </Typography>
        {Icon && (
          <Box
            sx={{
              width: 34,
              height: 34,
              borderRadius: '8px',
              backgroundColor: '#F8FAFC',
              border: '1px solid #F1F5F9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#475569',
              flexShrink: 0,
            }}
          >
            <Icon sx={{ fontSize: 18 }} />
          </Box>
        )}
      </Stack>

      <Box sx={{ my: 1.5 }}>
        <Typography
          sx={{
            fontSize: '1.875rem',
            fontWeight: 800,
            color: '#0F172A',
            letterSpacing: '-0.03em',
            lineHeight: 1.1,
          }}
        >
          {value}
        </Typography>
      </Box>

      <Box sx={{ pt: 0.5 }}>
        {hint && (
          <Typography sx={{ fontSize: '0.775rem', color: '#64748B', fontWeight: 500 }}>
            {hint}
          </Typography>
        )}

        {badgeLabel && (
          <Chip
            label={badgeLabel}
            size="small"
            sx={{
              fontSize: '0.7rem',
              fontWeight: 700,
              height: 22,
              borderRadius: '6px',
              backgroundColor:
                badgeStatus === 'active'
                  ? '#DCFCE7'
                  : badgeStatus === 'pending'
                  ? '#FEF3C7'
                  : '#F1F5F9',
              color:
                badgeStatus === 'active'
                  ? '#15803D'
                  : badgeStatus === 'pending'
                  ? '#D97706'
                  : '#475569',
            }}
          />
        )}

        {actionButton && <Box sx={{ mt: 1 }}>{actionButton}</Box>}
      </Box>
    </Box>
  );
};

// ─── OPERATIONAL SECTION CARD ──────────────────────────────────────────────────
const SectionCard = ({ title, subtitle, value, valueLabel, icon: Icon, action }) => {
  return (
    <Box
      sx={{
        p: 3,
        height: '100%',
        backgroundColor: '#FFFFFF',
        border: '1px solid #E5E7EB',
        borderRadius: '14px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      <Stack spacing={2} justifyContent="space-between" sx={{ height: '100%' }}>
        <Box>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography sx={{ fontSize: '1rem', fontWeight: 800, color: '#0F172A' }}>
              {title}
            </Typography>
            {Icon && <Icon sx={{ fontSize: 20, color: '#64748B' }} />}
          </Stack>
          {subtitle && (
            <Typography sx={{ fontSize: '0.8125rem', color: '#64748B', mt: 0.5 }}>
              {subtitle}
            </Typography>
          )}
        </Box>

        <Box sx={{ my: 1 }}>
          <Typography sx={{ fontSize: '2rem', fontWeight: 800, color: '#0F172A', lineHeight: 1.1 }}>
            {value}
          </Typography>
          {valueLabel && (
            <Typography sx={{ fontSize: '0.775rem', color: '#64748B', mt: 0.5, fontWeight: 500 }}>
              {valueLabel}
            </Typography>
          )}
        </Box>

        <Box pt={0.5}>{action}</Box>
      </Stack>
    </Box>
  );
};

// ─── MAIN ADMIN DASHBOARD COMPONENT ────────────────────────────────────────────
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
  // EMPLOYEE / NURSE / HR DASHBOARD VIEW
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
          {/* Header Intro */}
          <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' } }} spacing={2}>
            <Box>
              <Typography sx={{ fontSize: { xs: '1.5rem', md: '1.875rem' }, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em' }}>
                {getGreeting()}, {userName}
              </Typography>
              <Typography sx={{ fontSize: '0.875rem', color: '#64748B', mt: 0.5 }}>
                Here is your personal work and shift summary for today.
              </Typography>
            </Box>
          </Stack>

          {error && <ErrorState message={error} onRetry={fetchOverview} />}

          {loading ? (
            <Grid container spacing={2.5}>
              <Grid item xs={12} md={6}>
                <Skeleton variant="rounded" height={180} sx={{ borderRadius: '14px' }} />
              </Grid>
              <Grid item xs={12} md={6}>
                <Skeleton variant="rounded" height={180} sx={{ borderRadius: '14px' }} />
              </Grid>
            </Grid>
          ) : (
            <>
              {/* Today Status & Duty Cards */}
              <Grid container spacing={2.5}>
                {/* ATTENDANCE ACTION CARD */}
                <Grid item xs={12} md={6}>
                  <Box sx={{ p: 3, height: '100%', backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '14px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                    <Stack spacing={2} sx={{ height: '100%', justifyContent: 'space-between' }}>
                      <Box>
                        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            Today's Attendance
                          </Typography>
                          <AccessTimeRounded sx={{ color: '#64748B', fontSize: 20 }} />
                        </Stack>

                        <Typography sx={{ fontSize: '1.5rem', fontWeight: 800, color: '#0F172A', mt: 1 }}>
                          {isCheckedOut ? 'Present' : isCheckedIn ? 'Checked In' : 'Not Checked In Yet'}
                        </Typography>

                        <Typography sx={{ fontSize: '0.85rem', color: '#64748B', mt: 0.5 }}>
                          {isCheckedOut
                            ? `${format12h(todayAttendanceState?.checkInTime)} — ${format12h(todayAttendanceState?.checkOutTime)}`
                            : isCheckedIn
                            ? `Checked in at: ${format12h(todayAttendanceState?.checkInTime)}`
                            : 'Record your check-in time for today\'s shift.'}
                        </Typography>

                        {isCheckedOut && workDurationStr && (
                          <Typography sx={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600, display: 'block', mt: 0.5 }}>
                            Working: {workDurationStr}
                          </Typography>
                        )}
                      </Box>

                      <Box pt={1}>
                        {!isCheckedIn && !isCheckedOut && (
                          <Button
                            variant="contained"
                            startIcon={<LoginRounded />}
                            onClick={handleCheckIn}
                            disabled={actionLoading}
                            sx={{ backgroundColor: '#0F172A', color: '#FFFFFF', borderRadius: '8px', textTransform: 'none', px: 3, fontWeight: 700 }}
                          >
                            Check In
                          </Button>
                        )}

                        {isCheckedIn && !isCheckedOut && (
                          <Button
                            variant="outlined"
                            startIcon={<LogoutRounded />}
                            onClick={handleCheckOut}
                            disabled={actionLoading}
                            sx={{ borderColor: '#E5E7EB', color: '#0F172A', borderRadius: '8px', textTransform: 'none', px: 3, fontWeight: 600 }}
                          >
                            Check Out
                          </Button>
                        )}

                        {isCheckedOut && (
                          <Chip
                            icon={<CheckCircleOutlineRounded />}
                            label="Shift Completed"
                            sx={{ fontWeight: 600, backgroundColor: '#DCFCE7', color: '#15803D', borderRadius: '6px' }}
                          />
                        )}
                      </Box>
                    </Stack>
                  </Box>
                </Grid>

                {/* TODAY'S ROSTER DUTY CARD */}
                <Grid item xs={12} md={6}>
                  <Box sx={{ p: 3, height: '100%', backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '14px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                    <Stack spacing={2} sx={{ height: '100%', justifyContent: 'space-between' }}>
                      <Box>
                        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            Today's Roster Duty
                          </Typography>
                          <ScheduleRounded sx={{ color: '#64748B', fontSize: 20 }} />
                        </Stack>

                        {todayRosterDuty ? (
                          <>
                            <Typography sx={{ fontSize: '1.5rem', fontWeight: 800, color: '#0F172A', mt: 1 }}>
                              {todayRosterDuty.dutyArea}
                            </Typography>
                            <Typography sx={{ fontSize: '0.85rem', color: '#64748B', mt: 0.5 }}>
                              Shift: <strong>{todayRosterDuty.shiftTitle}</strong> ({format12h(todayRosterDuty.startTime)} – {format12h(todayRosterDuty.endTime)})
                            </Typography>
                            {todayRosterDuty.notes && (
                              <Typography sx={{ fontSize: '0.75rem', color: '#64748B', display: 'block', mt: 1 }}>
                                Notes: {todayRosterDuty.notes}
                              </Typography>
                            )}
                          </>
                        ) : (
                          <>
                            <Typography sx={{ fontSize: '1.25rem', fontWeight: 700, color: '#64748B', mt: 1 }}>
                              No Roster Assigned
                            </Typography>
                            <Typography sx={{ fontSize: '0.85rem', color: '#94A3B8', mt: 0.5 }}>
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
                          sx={{ borderColor: '#E5E7EB', color: '#0F172A', borderRadius: '8px', textTransform: 'none', fontWeight: 600 }}
                        >
                          View My Roster
                        </Button>
                      </Box>
                    </Stack>
                  </Box>
                </Grid>
              </Grid>

              {/* Employee Summary Cards */}
              <Grid container spacing={2.5}>
                <Grid item xs={12} sm={6} lg={3}>
                  <DashboardMetricCard
                    label="My Leaves"
                    value={myLeaves.length}
                    hint={pendingLeavesCount ? `${pendingLeavesCount} request pending approval` : 'No pending requests'}
                    icon={EventNoteRounded}
                    actionButton={
                      <Button size="small" onClick={() => navigate('/leaves')} sx={{ color: '#0F172A', textTransform: 'none', fontWeight: 600, p: 0 }}>
                        Apply Leave →
                      </Button>
                    }
                  />
                </Grid>
                <Grid item xs={12} sm={6} lg={3}>
                  <DashboardMetricCard
                    label="My Attendance"
                    value={todayAttendanceState ? 'Active' : 'Recorded'}
                    hint="View past attendance history"
                    icon={AccessTimeRounded}
                    actionButton={
                      <Button size="small" onClick={() => navigate('/attendance')} sx={{ color: '#0F172A', textTransform: 'none', fontWeight: 600, p: 0 }}>
                        Attendance History →
                      </Button>
                    }
                  />
                </Grid>
                <Grid item xs={12} sm={6} lg={3}>
                  <DashboardMetricCard
                    label="Regularization"
                    value={pendingRegsCount}
                    hint={pendingRegsCount ? 'Pending manager action' : 'No pending requests'}
                    icon={FingerprintRounded}
                    actionButton={
                      <Button size="small" onClick={() => navigate('/attendance')} sx={{ color: '#0F172A', textTransform: 'none', fontWeight: 600, p: 0 }}>
                        Request Regularization →
                      </Button>
                    }
                  />
                </Grid>
                <Grid item xs={12} sm={6} lg={3}>
                  <DashboardMetricCard
                    label="My Profile"
                    value="Account"
                    hint="Personal details & credentials"
                    icon={BadgeRounded}
                    actionButton={
                      <Button size="small" onClick={() => navigate('/profile')} sx={{ color: '#0F172A', textTransform: 'none', fontWeight: 600, p: 0 }}>
                        View Profile →
                      </Button>
                    }
                  />
                </Grid>
              </Grid>

              {/* Quick Actions Card - Outlined Secondary Style */}
              <Box sx={{ p: 3, backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '14px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                <Stack spacing={2}>
                  <Box>
                    <Typography sx={{ fontSize: '1rem', fontWeight: 800, color: '#0F172A' }}>
                      Quick Actions
                    </Typography>
                    <Typography sx={{ fontSize: '0.8125rem', color: '#64748B', mt: 0.2 }}>
                      Fast access to your self-service tools.
                    </Typography>
                  </Box>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} flexWrap="wrap">
                    <Button
                      variant="outlined"
                      startIcon={<EventNoteRounded />}
                      onClick={() => navigate('/leaves')}
                      sx={{ borderColor: '#E5E7EB', color: '#0F172A', borderRadius: '8px', textTransform: 'none', fontWeight: 600 }}
                    >
                      Apply Leave
                    </Button>
                    <Button
                      variant="outlined"
                      startIcon={<ScheduleRounded />}
                      onClick={() => navigate('/roster')}
                      sx={{ borderColor: '#E5E7EB', color: '#0F172A', borderRadius: '8px', textTransform: 'none', fontWeight: 600 }}
                    >
                      My Shift Roster
                    </Button>
                    <Button
                      variant="outlined"
                      startIcon={<AccessTimeRounded />}
                      onClick={() => navigate('/attendance')}
                      sx={{ borderColor: '#E5E7EB', color: '#0F172A', borderRadius: '8px', textTransform: 'none', fontWeight: 600 }}
                    >
                      My Attendance
                    </Button>
                  </Stack>
                </Stack>
              </Box>
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
  const hospitalDisplayName = hospital?.name || 'Vardhan Multispeciality Hospital';

  return (
    <AppLayout onLogout={handleLogout}>
      <Stack spacing={3.5}>
        {/* Header Intro & Actions */}
        <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' } }} spacing={2}>
          <Box>
            <Typography sx={{ fontSize: { xs: '1.5rem', md: '1.875rem' }, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em' }}>
              {getGreeting()}, {userName}
            </Typography>
            <Typography sx={{ fontSize: '0.875rem', color: '#64748B', mt: 0.5 }}>
              {hospitalDisplayName} · Overview of hospital operations and team.
            </Typography>
          </Box>

          {/* Quick Action Buttons */}
          <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
            <Button
              variant="outlined"
              startIcon={<AddRounded sx={{ fontSize: 18 }} />}
              onClick={() => navigate('/employees')}
              sx={{
                backgroundColor: '#FFFFFF',
                borderColor: '#E5E7EB',
                color: '#0F172A',
                fontWeight: 600,
                fontSize: '0.8125rem',
                borderRadius: '8px',
                textTransform: 'none',
                px: 2,
                py: 0.85,
                boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                '&:hover': { backgroundColor: '#F8FAFC', borderColor: '#CBD5E1' },
              }}
            >
              Add Employee
            </Button>

            <Button
              variant="outlined"
              startIcon={<AddRounded sx={{ fontSize: 18 }} />}
              onClick={() => navigate('/positions')}
              sx={{
                backgroundColor: '#FFFFFF',
                borderColor: '#E5E7EB',
                color: '#0F172A',
                fontWeight: 600,
                fontSize: '0.8125rem',
                borderRadius: '8px',
                textTransform: 'none',
                px: 2,
                py: 0.85,
                boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                '&:hover': { backgroundColor: '#F8FAFC', borderColor: '#CBD5E1' },
              }}
            >
              Create Position
            </Button>

            <Button
              variant="contained"
              startIcon={<AddRounded sx={{ fontSize: 18 }} />}
              onClick={() => navigate('/roster')}
              sx={{
                backgroundColor: '#0F172A',
                color: '#FFFFFF',
                fontWeight: 700,
                fontSize: '0.8125rem',
                borderRadius: '8px',
                textTransform: 'none',
                px: 2.25,
                py: 0.85,
                boxShadow: '0 2px 4px rgba(15,23,42,0.15)',
                '&:hover': { backgroundColor: '#1E293B' },
              }}
            >
              Create Roster
            </Button>
          </Stack>
        </Stack>

        {error && <ErrorState message={error} onRetry={fetchOverview} />}

        {loading ? (
          <Grid container spacing={2.5}>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Grid item xs={12} sm={6} lg={4} key={i}>
                <Skeleton variant="rounded" height={130} sx={{ borderRadius: '14px' }} />
              </Grid>
            ))}
          </Grid>
        ) : (
          <>
            {/* Hospital Summary KPI Grid (3 cols x 2 rows) */}
            <Grid container spacing={2.5}>
              <Grid item xs={12} sm={6} md={4}>
                <DashboardMetricCard
                  label="Total Workforce"
                  value={stats.totalEmployees || stats.activeEmployees || stats.hrCount || 0}
                  badgeLabel="Hospital Employees"
                  badgeStatus="active"
                  icon={GroupRounded}
                />
              </Grid>

              <Grid item xs={12} sm={6} md={4}>
                <DashboardMetricCard
                  label="Active Staff"
                  value={stats.activeEmployees || stats.totalEmployees || 0}
                  badgeLabel="Active Status"
                  badgeStatus="active"
                  icon={BadgeRounded}
                />
              </Grid>

              <Grid item xs={12} sm={6} md={4}>
                <DashboardMetricCard
                  label="Today's Attendance"
                  value={stats.todayAttendance}
                  hint="Present / Checked in staff today"
                  icon={AccessTimeRounded}
                  actionButton={
                    <Button size="small" onClick={() => navigate('/attendance')} sx={{ color: '#0F172A', textTransform: 'none', fontWeight: 600, p: 0 }}>
                      View Attendance →
                    </Button>
                  }
                />
              </Grid>

              <Grid item xs={12} sm={6} md={4}>
                <DashboardMetricCard
                  label="Pending Leave Requests"
                  value={stats.pendingLeaves}
                  badgeLabel={stats.pendingLeaves > 0 ? 'Action Required' : 'Up to date'}
                  badgeStatus={stats.pendingLeaves > 0 ? 'pending' : 'inactive'}
                  icon={EventNoteRounded}
                />
              </Grid>

              <Grid item xs={12} sm={6} md={4}>
                <DashboardMetricCard
                  label="Today's Scheduled Staff"
                  value={stats.todayRosterAssigned}
                  hint="Assigned in published roster today"
                  icon={ScheduleRounded}
                  actionButton={
                    <Button size="small" onClick={() => navigate('/roster')} sx={{ color: '#0F172A', textTransform: 'none', fontWeight: 600, p: 0 }}>
                      Manage Roster →
                    </Button>
                  }
                />
              </Grid>

              <Grid item xs={12} sm={6} md={4}>
                <DashboardMetricCard
                  label="Pending Regularization"
                  value={stats.pendingRegularizations}
                  badgeLabel={stats.pendingRegularizations > 0 ? 'Action Required' : 'None'}
                  badgeStatus={stats.pendingRegularizations > 0 ? 'pending' : 'inactive'}
                  icon={AccessTimeRounded}
                />
              </Grid>
            </Grid>

            {/* Operational Section Cards (2 Columns) */}
            <Grid container spacing={2.5}>
              {/* ATTENDANCE OVERVIEW */}
              {canViewAttendance && (
                <Grid item xs={12} md={6}>
                  <SectionCard
                    title="Attendance Today"
                    subtitle="Track staff check-ins, check-outs, and active duty status."
                    value={stats.todayAttendance}
                    valueLabel="Staff checked in for today's shift"
                    icon={AccessTimeRounded}
                    action={
                      <Button
                        variant="outlined"
                        size="small"
                        endIcon={<ArrowForwardRounded fontSize="small" />}
                        onClick={() => navigate('/attendance')}
                        sx={{ borderColor: '#E5E7EB', color: '#0F172A', borderRadius: '8px', textTransform: 'none', fontWeight: 600 }}
                      >
                        Open Attendance Log
                      </Button>
                    }
                  />
                </Grid>
              )}

              {/* LEAVE MANAGEMENT OVERVIEW */}
              {canViewLeaves && (
                <Grid item xs={12} md={6}>
                  <SectionCard
                    title="Leave Management"
                    subtitle="Review and approve staff leave requests."
                    value={stats.pendingLeaves}
                    valueLabel={stats.pendingLeaves === 1 ? '1 request needs review' : `${stats.pendingLeaves} requests need review`}
                    icon={EventNoteRounded}
                    action={
                      <Button
                        variant="outlined"
                        size="small"
                        endIcon={<ArrowForwardRounded fontSize="small" />}
                        onClick={() => navigate('/leaves')}
                        sx={{ borderColor: '#E5E7EB', color: '#0F172A', borderRadius: '8px', textTransform: 'none', fontWeight: 600 }}
                      >
                        Review Leave Requests
                      </Button>
                    }
                  />
                </Grid>
              )}

              {/* ROSTER OPERATIONAL OVERVIEW */}
              {canViewRoster && (
                <Grid item xs={12} md={6}>
                  <SectionCard
                    title="Roster & Duty Planning"
                    subtitle="Manage shift templates, published schedules, and duty assignments."
                    value={stats.todayRosterAssigned}
                    valueLabel="Staff assigned on published roster today"
                    icon={ScheduleRounded}
                    action={
                      <Button
                        variant="outlined"
                        size="small"
                        endIcon={<ArrowForwardRounded fontSize="small" />}
                        onClick={() => navigate('/roster')}
                        sx={{ borderColor: '#E5E7EB', color: '#0F172A', borderRadius: '8px', textTransform: 'none', fontWeight: 600 }}
                      >
                        Manage Work Roster
                      </Button>
                    }
                  />
                </Grid>
              )}

              {/* REGULARIZATION OVERVIEW */}
              {canViewAttendance && (
                <Grid item xs={12} md={6}>
                  <SectionCard
                    title="Attendance Regularization"
                    subtitle="Approve or decline attendance correction requests."
                    value={stats.pendingRegularizations}
                    valueLabel="Pending regularization requests"
                    icon={AccessTimeRounded}
                    action={
                      <Button
                        variant="outlined"
                        size="small"
                        endIcon={<ArrowForwardRounded fontSize="small" />}
                        onClick={() => navigate('/attendance')}
                        sx={{ borderColor: '#E5E7EB', color: '#0F172A', borderRadius: '8px', textTransform: 'none', fontWeight: 600 }}
                      >
                        Review Regularizations
                      </Button>
                    }
                  />
                </Grid>
              )}
            </Grid>

            {/* Quick Actions Card - All Neutral Outline Style */}
            <Box sx={{ p: 3, backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '14px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
              <Stack spacing={2}>
                <Box>
                  <Typography sx={{ fontSize: '1rem', fontWeight: 800, color: '#0F172A' }}>
                    Quick Actions
                  </Typography>
                  <Typography sx={{ fontSize: '0.8125rem', color: '#64748B', mt: 0.2 }}>
                    Jump straight into managing your hospital modules.
                  </Typography>
                </Box>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} flexWrap="wrap">
                  {canManageRoster && (
                    <Button
                      variant="outlined"
                      startIcon={<ScheduleRounded />}
                      onClick={() => navigate('/roster')}
                      sx={{ borderColor: '#E5E7EB', color: '#0F172A', borderRadius: '8px', textTransform: 'none', fontWeight: 600 }}
                    >
                      Manage Roster
                    </Button>
                  )}
                  {canViewAttendance && (
                    <Button
                      variant="outlined"
                      startIcon={<AccessTimeRounded />}
                      onClick={() => navigate('/attendance')}
                      sx={{ borderColor: '#E5E7EB', color: '#0F172A', borderRadius: '8px', textTransform: 'none', fontWeight: 600 }}
                    >
                      Attendance
                    </Button>
                  )}
                  {canViewLeaves && (
                    <Button
                      variant="outlined"
                      startIcon={<EventNoteRounded />}
                      onClick={() => navigate('/leaves')}
                      sx={{ borderColor: '#E5E7EB', color: '#0F172A', borderRadius: '8px', textTransform: 'none', fontWeight: 600 }}
                    >
                      Leave Management
                    </Button>
                  )}
                  {canAccessManagement && (
                    <Button
                      variant="outlined"
                      startIcon={<VpnKeyRounded />}
                      onClick={() => navigate('/access-management')}
                      sx={{ borderColor: '#E5E7EB', color: '#0F172A', borderRadius: '8px', textTransform: 'none', fontWeight: 600 }}
                    >
                      Access Management
                    </Button>
                  )}
                  {canViewStructure && (
                    <Button
                      variant="outlined"
                      startIcon={<LayersRounded />}
                      onClick={() => navigate('/structure')}
                      sx={{ borderColor: '#E5E7EB', color: '#0F172A', borderRadius: '8px', textTransform: 'none', fontWeight: 600 }}
                    >
                      Hospital Structure
                    </Button>
                  )}
                </Stack>
              </Stack>
            </Box>
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