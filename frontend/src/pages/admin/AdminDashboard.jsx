import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Chip,
  Grid,
  IconButton,
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
  LoginRounded,
  LogoutRounded,
  MoreHorizRounded,
  ScheduleRounded
} from '@mui/icons-material';
import hospitalService from '../../services/hospital.service';
import attendanceService from '../../services/attendance.service';
import leaveService from '../../services/leave.service';
import rosterService from '../../services/roster.service';
import employeeService from '../../services/employee.service';
import auth from '../../services/auth.service';
import AppLayout from '../../wrapper/AppLayout';
import ErrorState from '../../components/ErrorState';
import MainContentLoader from '../../components/common/MainContentLoader';
import PageHeader from '../../components/common/PageHeader';
import KPIGrid from '../../wrapper/KPIGrid';
import KPICard from '../../components/common/KPICard';
import KPICardWithAction from '../../components/common/KPICardWithAction';
import { useSnackbar } from '../../theme/SnackbarProvider';
import { hasPermission, PERMISSIONS } from '../../utils/permissions';
import { formatTime12h as format12h, getTodayDateStr } from '../../utils/dateUtils';

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
};

const calculateWorkDuration = (inTime, outTime, minutes) => {
  if (typeof minutes === 'number' && minutes > 0) {
    const hrs = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${String(hrs).padStart(2, '0')}h ${String(mins).padStart(2, '0')}m`;
  }
  if (!inTime || !outTime) return '';
  const inDate = new Date(inTime);
  const outDate = new Date(outTime);
  if (!isNaN(inDate.getTime()) && !isNaN(outDate.getTime())) {
    const diffMs = Math.max(0, outDate.getTime() - inDate.getTime());
    const totalMins = Math.floor(diffMs / 60000);
    const hrs = Math.floor(totalMins / 60);
    const mins = totalMins % 60;
    return `${String(hrs).padStart(2, '0')}h ${String(mins).padStart(2, '0')}m`;
  }
  if (typeof inTime === 'string' && typeof outTime === 'string' && inTime.includes(':') && outTime.includes(':')) {
    const [inH, inM] = inTime.split(':').map(Number);
    const [outH, outM] = outTime.split(':').map(Number);
    if (!isNaN(inH) && !isNaN(outH)) {
      let diffMins = (outH * 60 + (outM || 0)) - (inH * 60 + (inM || 0));
      if (diffMins < 0) diffMins += 24 * 60;
      const hrs = Math.floor(diffMins / 60);
      const mins = diffMins % 60;
      return `${String(hrs).padStart(2, '0')}h ${String(mins).padStart(2, '0')}m`;
    }
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



import { StyledPanel, StyledButton, StyledIconButton } from '../../components/styled';
import { useTheme } from '@mui/material/styles';

// ─── OPERATIONAL SECTION CARD ──────────────────────────────────────────────────
const SectionCard = ({ title, subtitle, value, valueLabel, icon: Icon, action }) => {
  const theme = useTheme();
  return (
    <StyledPanel
      sx={{
        p: 3,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      <Stack spacing={2} sx={{ height: '100%', justifyContent: 'space-between' }}>
        <Box>
          <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography sx={{ fontSize: '1rem', fontWeight: 800, color: theme.palette.text.primary }}>
              {title}
            </Typography>
            {Icon && <Icon sx={{ fontSize: 20, color: theme.palette.text.secondary }} />}
          </Stack>
          {subtitle && (
            <Typography sx={{ fontSize: '0.8125rem', color: theme.palette.text.secondary, mt: 0.5 }}>
              {subtitle}
            </Typography>
          )}
        </Box>

        <Box sx={{ my: 1 }}>
          <Typography sx={{ fontSize: '2rem', fontWeight: 800, color: theme.palette.text.primary, lineHeight: 1.1 }}>
            {value}
          </Typography>
          {valueLabel && (
            <Typography sx={{ fontSize: '0.775rem', color: theme.palette.text.secondary, mt: 0.5, fontWeight: 500 }}>
              {valueLabel}
            </Typography>
          )}
        </Box>

        <Box pt={0.5}>{action}</Box>
      </Stack>
    </StyledPanel>
  );
};

// ─── WORKFORCE OVERVIEW GRAPH (BAR CHART) ──────────────────────────────────────
const WorkforceOverviewGraph = ({ data = [] }) => {
  const theme = useTheme();
  const maxCount = useMemo(() => {
    if (!data.length) return 1;
    return Math.max(...data.map((d) => d.count), 1);
  }, [data]);

  return (
    <StyledPanel
      sx={{
        p: 3,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      <Box>
        <Typography sx={{ fontSize: '1rem', fontWeight: 800, color: theme.palette.text.primary }}>
          WORKFORCE OVERVIEW
        </Typography>
        <Typography sx={{ fontSize: '0.8125rem', color: theme.palette.text.secondary, mt: 0.2 }}>
          Employees by position
        </Typography>

        <Stack spacing={2} sx={{ mt: 3 }}>
          {data.length === 0 ? (
            <Typography sx={{ fontSize: '0.875rem', color: theme.palette.text.secondary, py: 2 }}>
              No employee workforce data available.
            </Typography>
          ) : (
            data.map((item, idx) => {
              const pct = Math.round((item.count / maxCount) * 100);
              const barColors = ['#0EA5E9', '#3B82F6', '#6366F1', '#8B5CF6', '#EC4899', '#14B8A6'];
              const color = barColors[idx % barColors.length];

              return (
                <Box key={item.position || idx}>
                  <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                    <Typography sx={{ fontSize: '0.8125rem', fontWeight: 700, color: theme.palette.text.primary }}>
                      {item.position}
                    </Typography>
                    <Typography sx={{ fontSize: '0.8125rem', fontWeight: 800, color: theme.palette.text.primary }}>
                      {item.count}
                    </Typography>
                  </Stack>
                  <Box sx={{ width: '100%', height: 8, backgroundColor: theme.palette.action.hover, borderRadius: 4, overflow: 'hidden' }}>
                    <Box
                      sx={{
                        width: `${pct}%`,
                        height: '100%',
                        backgroundColor: color,
                        borderRadius: 4,
                        transition: 'width 500ms ease-in-out',
                      }}
                    />
                  </Box>
                </Box>
              );
            })
          )}
        </Stack>
      </Box>
    </StyledPanel>
  );
};

// ─── ATTENDANCE GRAPH (DONUT CHART) ────────────────────────────────────────────
const AttendanceDonutGraph = ({ data }) => {
  const theme = useTheme();
  const todayDateStr = useMemo(() => {
    return new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }, []);

  const present = data?.present || 0;
  const late = data?.late || 0;
  const absent = data?.absent || 0;
  const onLeave = data?.onLeave || 0;
  const total = data?.total || (present + late + absent + onLeave);

  const radius = 54;
  const circumference = 2 * Math.PI * radius;

  const segments = useMemo(() => {
    if (total === 0) {
      return [{ color: '#CBD5E1', dasharray: `${circumference} 0`, dashoffset: 0 }];
    }
    const items = [
      { count: present, color: theme.palette.status?.success || '#10B981', label: 'Present' },
      { count: late, color: theme.palette.status?.warning || '#F59E0B', label: 'Late' },
      { count: absent, color: theme.palette.status?.danger || '#EF4444', label: 'Absent' },
      { count: onLeave, color: theme.palette.status?.info || '#6366F1', label: 'On Leave' },
    ];
    let currentOffset = 0;
    return items.map((item) => {
      const segmentLen = (item.count / total) * circumference;
      const res = {
        ...item,
        dasharray: `${segmentLen} ${circumference - segmentLen}`,
        dashoffset: -currentOffset,
      };
      currentOffset += segmentLen;
      return res;
    });
  }, [present, late, absent, onLeave, total, circumference, theme]);

  return (
    <StyledPanel
      sx={{
        p: 3,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      <Box>
        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography sx={{ fontSize: '1rem', fontWeight: 800, color: theme.palette.text.primary }}>
            ATTENDANCE
          </Typography>
          <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: theme.palette.text.secondary }}>
            Today · {todayDateStr}
          </Typography>
        </Stack>

        <Box sx={{ position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center', my: 2.5 }}>
          <svg width="140" height="140" viewBox="0 0 160 160">
            <g transform="rotate(-90 80 80)">
              {segments.map((seg, idx) => (
                <circle
                  key={idx}
                  cx="80"
                  cy="80"
                  r={radius}
                  fill="transparent"
                  stroke={seg.color}
                  strokeWidth="18"
                  strokeDasharray={seg.dasharray}
                  strokeDashoffset={seg.dashoffset}
                  strokeLinecap="butt"
                />
              ))}
            </g>
          </svg>
          <Box sx={{ position: 'absolute', textAlign: 'center' }}>
            <Typography sx={{ fontSize: '1.75rem', fontWeight: 800, color: theme.palette.text.primary, lineHeight: 1 }}>
              {total}
            </Typography>
            <Typography sx={{ fontSize: '0.75rem', color: theme.palette.text.secondary, fontWeight: 600, mt: 0.2 }}>
              Recorded
            </Typography>
          </Box>
        </Box>

        <Grid container spacing={1.5} sx={{ mt: 1 }}>
          <Grid xs={6}>
            <Stack direction="row" sx={{ alignItems: 'center' }} spacing={1}>
              <Box sx={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: theme.palette.status?.success || '#10B981' }} />
              <Typography sx={{ fontSize: '0.8125rem', color: theme.palette.text.secondary, fontWeight: 600 }}>
                Present
              </Typography>
              <Typography sx={{ fontSize: '0.8125rem', fontWeight: 800, color: theme.palette.text.primary, ml: 'auto' }}>
                {present}
              </Typography>
            </Stack>
          </Grid>
          <Grid xs={6}>
            <Stack direction="row" sx={{ alignItems: 'center' }} spacing={1}>
              <Box sx={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: theme.palette.status?.warning || '#F59E0B' }} />
              <Typography sx={{ fontSize: '0.8125rem', color: theme.palette.text.secondary, fontWeight: 600 }}>
                Late
              </Typography>
              <Typography sx={{ fontSize: '0.8125rem', fontWeight: 800, color: theme.palette.text.primary, ml: 'auto' }}>
                {late}
              </Typography>
            </Stack>
          </Grid>
          <Grid xs={6}>
            <Stack direction="row" sx={{ alignItems: 'center' }} spacing={1}>
              <Box sx={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: theme.palette.status?.danger || '#EF4444' }} />
              <Typography sx={{ fontSize: '0.8125rem', color: theme.palette.text.secondary, fontWeight: 600 }}>
                Absent
              </Typography>
              <Typography sx={{ fontSize: '0.8125rem', fontWeight: 800, color: theme.palette.text.primary, ml: 'auto' }}>
                {absent}
              </Typography>
            </Stack>
          </Grid>
          <Grid xs={6}>
            <Stack direction="row" sx={{ alignItems: 'center' }} spacing={1}>
              <Box sx={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: theme.palette.status?.info || '#6366F1' }} />
              <Typography sx={{ fontSize: '0.8125rem', color: theme.palette.text.secondary, fontWeight: 600 }}>
                On Leave
              </Typography>
              <Typography sx={{ fontSize: '0.8125rem', fontWeight: 800, color: theme.palette.text.primary, ml: 'auto' }}>
                {onLeave}
              </Typography>
            </Stack>
          </Grid>
        </Grid>
      </Box>
    </StyledPanel>
  );
};

// ─── LEAVE OVERVIEW GRAPH ──────────────────────────────────────────────────────
const LeaveOverviewGraph = ({ data }) => {
  const theme = useTheme();
  const pending = data?.pending || 0;
  const approved = data?.approved || 0;
  const rejected = data?.rejected || 0;

  const items = [
    {
      label: 'Pending requests',
      tag: 'Pending',
      count: pending,
      bg: theme.palette.status?.warning ? `${theme.palette.status.warning}1A` : '#FEF3C7',
      color: theme.palette.status?.warning || '#92400E',
    },
    {
      label: 'Approved requests',
      tag: 'Approved',
      count: approved,
      bg: theme.palette.status?.success ? `${theme.palette.status.success}1A` : '#DCFCE7',
      color: theme.palette.status?.success || '#15803D',
    },
    {
      label: 'Rejected requests',
      tag: 'Rejected',
      count: rejected,
      bg: theme.palette.status?.danger ? `${theme.palette.status.danger}1A` : '#FEE2E2',
      color: theme.palette.status?.danger || '#B91C1C',
    },
  ];

  const currentMonthYear = new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' });

  return (
    <StyledPanel
      sx={{
        p: 3,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box>
            <Typography sx={{ fontSize: '0.95rem', fontWeight: 800, color: theme.palette.text.primary, letterSpacing: '0.02em' }}>
              LEAVE OVERVIEW
            </Typography>
            <Typography sx={{ fontSize: '0.8125rem', color: theme.palette.text.secondary, mt: 0.3, fontWeight: 500 }}>
              {currentMonthYear}
            </Typography>
          </Box>
          <IconButton size="small" sx={{ color: theme.palette.text.secondary, p: 0.5 }}>
            <MoreHorizRounded />
          </IconButton>
        </Box>

        <Stack spacing={1.5} sx={{ mt: 1 }}>
          {items.map((item) => (
            <Box
              key={item.label}
              sx={{
                p: 1.5,
                px: 2,
                borderRadius: '12px',
                backgroundColor: '#F8FAFC',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Typography sx={{ fontSize: '0.875rem', fontWeight: 600, color: '#0F172A' }}>
                {item.label}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box
                  sx={{
                    px: 1.5,
                    py: 0.35,
                    borderRadius: '12px',
                    backgroundColor: item.bg,
                    color: item.color,
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {item.tag}
                </Box>
                <Typography sx={{ fontSize: '1rem', fontWeight: 800, color: '#0F172A', minWidth: 16, textAlign: 'right' }}>
                  {item.count}
                </Typography>
              </Box>
            </Box>
          ))}
        </Stack>
      </Box>
    </StyledPanel>
  );
};

// ─── OPERATIONAL GRAPHS CONTAINER (PERMISSION BASED REFLOW) ───────────────────
const OperationalGraphsSection = ({
  canViewWorkforce,
  canViewAttendance,
  canViewLeave,
  workforceData,
  attendanceData,
  leaveData,
}) => {
  const visibleCards = [];

  if (canViewWorkforce) {
    visibleCards.push({
      key: 'workforce',
      component: <WorkforceOverviewGraph data={workforceData} />,
    });
  }

  if (canViewAttendance) {
    visibleCards.push({
      key: 'attendance',
      component: <AttendanceDonutGraph data={attendanceData} />,
    });
  }

  if (canViewLeave) {
    visibleCards.push({
      key: 'leave',
      component: <LeaveOverviewGraph data={leaveData} />,
    });
  }

  if (visibleCards.length === 0) return null;

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: '1fr',
          sm: visibleCards.length === 2 ? 'repeat(2, 1fr)' : '1fr',
          md: `repeat(${Math.min(visibleCards.length, 3)}, minmax(0, 1fr))`,
        },
        gap: 2.5,
      }}
    >
      {visibleCards.map((card) => (
        <Box
          key={card.key}
          sx={{
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {card.component}
        </Box>
      ))}
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
  const { showSnackbar: showSnack } = useSnackbar();

  // Permission Checks
  const canManageRoster = hasPermission(PERMISSIONS.ROSTER_MANAGE);
  const canViewRoster = hasPermission(PERMISSIONS.ROSTER_VIEW) || canManageRoster;
  const canViewLeaves = hasPermission(PERMISSIONS.LEAVE_VIEW) || hasPermission(PERMISSIONS.LEAVE_VIEW_WORKFORCE) || userRole === 'admin';
  const canViewAttendance = hasPermission(PERMISSIONS.ATTENDANCE_VIEW) || hasPermission(PERMISSIONS.ATTENDANCE_VIEW_WORKFORCE) || userRole === 'admin';
  const canAccessManagement = hasPermission(PERMISSIONS.ACCESS_VIEW) || userRole === 'admin';
  const canViewStructure = hasPermission(PERMISSIONS.STRUCTURE_VIEW) || userRole === 'admin';

  // Permission-Based Graph Visibility Checks
  const canViewWorkforceGraph = hasPermission(PERMISSIONS.EMPLOYEE_VIEW);
  const canViewAttendanceGraph = hasPermission(PERMISSIONS.ATTENDANCE_VIEW);
  const canViewLeaveGraph = hasPermission(PERMISSIONS.LEAVE_VIEW);

  const [workforceGraphData, setWorkforceGraphData] = useState([]);
  const [attendanceGraphData, setAttendanceGraphData] = useState(null);
  const [leaveGraphData, setLeaveGraphData] = useState(null);

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
          const todayStr = getTodayDateStr();
          const todayDuty = Array.isArray(assignments)
            ? assignments.find((ass) => {
                const d = ass.date ? getTodayDateStr(ass.date) : '';
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

      // Operational Graph Data Fetching (Strictly PERMISSION -> GRAPH DATA)
      const graphPromises = [];

      if (canViewWorkforceGraph) {
        graphPromises.push(
          employeeService.listEmployees({ limit: 100 })
            .then((res) => {
              const empList = res?.data?.data?.employees || res?.data?.employees || res?.employees || (Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : []);
              const counts = {};
              if (Array.isArray(empList)) {
                empList.forEach((emp) => {
                  const posName = (typeof emp.positionId === 'object' && emp.positionId?.name) || emp.position?.name || emp.position || emp.designation || (emp.role ? String(emp.role).toUpperCase() : 'Staff');
                  counts[posName] = (counts[posName] || 0) + 1;
                });
              }
              const formatted = Object.keys(counts)
                .map((pos) => ({ position: pos, count: counts[pos] }))
                .sort((a, b) => b.count - a.count);
              setWorkforceGraphData(formatted);
            })
            .catch(() => {})
        );
      }

      if (canViewAttendanceGraph) {
        graphPromises.push(
          attendanceService.getAttendanceStats({ scope: 'hospital' })
            .then((res) => {
              const data = res?.data?.data || res?.data || res || {};
              setAttendanceGraphData({
                present: data.present || 0,
                late: data.halfDay || data.late || 0,
                absent: data.absent || 0,
                onLeave: data.onLeave || 0,
                total: (data.present || 0) + (data.halfDay || data.late || 0) + (data.absent || 0) + (data.onLeave || 0),
              });
            })
            .catch(() => {})
        );
      }

      if (canViewLeaveGraph) {
        graphPromises.push(
          leaveService.getLeaveStats()
            .then((res) => {
              const data = res?.data?.data?.stats || res?.data?.stats || res?.data || res || {};
              setLeaveGraphData({
                pending: data.pending || 0,
                approved: data.approved || 0,
                rejected: data.rejected || 0,
                currentlyOnLeave: data.currentlyOnLeave || 0,
                total: data.total || 0,
              });
            })
            .catch(() => {})
        );
      }

      await Promise.allSettled(graphPromises);
    } catch (err) {
      console.error('Dashboard Overview Error:', err);
      setError(err?.response?.data?.message || 'Unable to load dashboard metrics.');
    } finally {
      setLoading(false);
    }
  }, [userRole, canViewWorkforceGraph, canViewAttendanceGraph, canViewLeaveGraph]);

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
  const checkInVal = todayAttendanceState?.checkIn || todayAttendanceState?.checkInTime;
  const checkOutVal = todayAttendanceState?.checkOut || todayAttendanceState?.checkOutTime;

  const isCheckedOut = Boolean(checkInVal && checkOutVal) || todayAttendanceState?.status === 'CHECKED_OUT';
  const isCheckedIn = !isCheckedOut && Boolean(checkInVal);

  const isAbsent = !checkInVal && todayAttendanceState?.status === 'ABSENT';
  const isOnLeave = !checkInVal && todayAttendanceState?.status === 'ON_LEAVE';

  const [liveTimerNow, setLiveTimerNow] = useState(Date.now());

  useEffect(() => {
    if (!isCheckedIn) return;
    const timerId = setInterval(() => {
      setLiveTimerNow(Date.now());
    }, 1000);
    return () => clearInterval(timerId);
  }, [isCheckedIn]);

  const liveWorkDurationStr = useMemo(() => {
    if (!checkInVal) return '';
    const inMs = new Date(checkInVal).getTime();
    if (isNaN(inMs)) return '';
    const endMs = checkOutVal ? new Date(checkOutVal).getTime() : liveTimerNow;
    const diffMs = Math.max(0, endMs - inMs);
    const totalMins = Math.floor(diffMs / 60000);
    const hrs = Math.floor(totalMins / 60);
    const mins = totalMins % 60;
    return `${String(hrs).padStart(2, '0')}h ${String(mins).padStart(2, '0')}m`;
  }, [checkInVal, checkOutVal, liveTimerNow]);

  const workDurationStr = useMemo(() => {
    if (isCheckedOut) {
      return calculateWorkDuration(checkInVal, checkOutVal, todayAttendanceState?.workingMinutes);
    }
    if (isCheckedIn) {
      return liveWorkDurationStr;
    }
    return '';
  }, [isCheckedOut, isCheckedIn, checkInVal, checkOutVal, todayAttendanceState?.workingMinutes, liveWorkDurationStr]);

  const isCheckoutPending = useMemo(() => {
    if (!isCheckedIn || !todayRosterDuty?.endTime) return false;
    try {
      const todayStr = getTodayDateStr();
      let endStr = todayRosterDuty.endTime.trim();
      let endParts = endStr.split(':').map(Number);
      if (!isNaN(endParts[0])) {
        let endObj = new Date(`${todayStr}T${String(endParts[0]).padStart(2, '0')}:${String(endParts[1] || 0).padStart(2, '0')}:00`);
        if (todayRosterDuty.startTime) {
          let startParts = todayRosterDuty.startTime.trim().split(':').map(Number);
          if (!isNaN(startParts[0])) {
            let startObj = new Date(`${todayStr}T${String(startParts[0]).padStart(2, '0')}:${String(startParts[1] || 0).padStart(2, '0')}:00`);
            if (endObj.getTime() <= startObj.getTime()) {
              endObj = new Date(endObj.getTime() + 24 * 60 * 60 * 1000);
            }
          }
        }
        return Date.now() > endObj.getTime();
      }
    } catch (e) {
      return false;
    }
    return false;
  }, [isCheckedIn, todayRosterDuty]);

  if (userRole === 'employee') {
    return (
      <AppLayout onLogout={handleLogout}>
        <PageHeader
          title={`${getGreeting()}, ${userName}`}
            description="Here is your personal work and shift summary for today."
          />

          {error && <ErrorState message={error} onRetry={fetchOverview} />}

          {loading ? (
            <MainContentLoader />
          ) : (
            <>
              {/* Today Status & Duty Cards */}
              <Grid container spacing={2.5}>
                {/* ATTENDANCE ACTION CARD */}
                <Grid xs={12} md={6}>
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
                          {isCheckedOut
                            ? 'Present'
                            : isCheckedIn
                            ? 'Checked In'
                            : isAbsent
                            ? 'Absent'
                            : isOnLeave
                            ? 'On Leave'
                            : 'Not Checked In Yet'}
                        </Typography>

                        <Typography sx={{ fontSize: '0.85rem', color: '#64748B', mt: 0.5 }}>
                          {isCheckedOut
                            ? `${format12h(checkInVal)} — ${format12h(checkOutVal)}`
                            : isCheckedIn
                            ? `${format12h(checkInVal)}`
                            : isAbsent
                            ? 'Automatically marked absent for today\'s scheduled shift.'
                            : isOnLeave
                            ? 'Approved leave covering today.'
                            : 'Record your check-in time for today\'s shift.'}
                        </Typography>

                        {(isCheckedIn || isCheckedOut) && workDurationStr && (
                          <Typography sx={{ fontSize: '0.85rem', color: '#334155', fontWeight: 600, display: 'block', mt: 1 }}>
                            Working: {workDurationStr}
                          </Typography>
                        )}

                        {isCheckoutPending && (
                          <Box sx={{ mt: 1 }}>
                            <Chip
                              label="⚠ Checkout pending"
                              size="small"
                              sx={{
                                fontWeight: 700,
                                backgroundColor: '#FEF3C7',
                                color: '#D97706',
                                borderRadius: '6px',
                                fontSize: '0.75rem',
                              }}
                            />
                          </Box>
                        )}
                      </Box>

                      <Box pt={1}>
                        {!isCheckedIn && !isCheckedOut && !isAbsent && !isOnLeave && (
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

                        {isAbsent && (
                          <Chip
                            label="Absent"
                            sx={{ fontWeight: 600, backgroundColor: '#FEE2E2', color: '#DC2626', borderRadius: '6px' }}
                          />
                        )}

                        {isOnLeave && (
                          <Chip
                            label="On Leave"
                            sx={{ fontWeight: 600, backgroundColor: '#E0F2FE', color: '#0284C7', borderRadius: '6px' }}
                          />
                        )}
                      </Box>
                    </Stack>
                  </Box>
                </Grid>

                {/* TODAY'S ROSTER DUTY CARD */}
                <Grid xs={12} md={6}>
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
              <KPIGrid>
                <KPICardWithAction
                  title="My Leaves"
                  value={myLeaves.length}
                  description={pendingLeavesCount ? `${pendingLeavesCount} request pending approval` : 'No pending requests'}
                  icon={EventNoteRounded}
                  actionLabel="Apply Leave →"
                  onAction={() => navigate('/leaves')}
                />
                <KPICardWithAction
                  title="My Attendance"
                  value={todayAttendanceState ? 'Active' : 'Recorded'}
                  description="View past attendance history"
                  icon={AccessTimeRounded}
                  actionLabel="Attendance History →"
                  onAction={() => navigate('/attendance')}
                />
                <KPICardWithAction
                  title="Regularization"
                  value={pendingRegsCount}
                  description={pendingRegsCount ? 'Pending manager action' : 'No pending requests'}
                  icon={FingerprintRounded}
                  actionLabel="Request Regularization →"
                  onAction={() => navigate('/attendance')}
                />
                <KPICardWithAction
                  title="My Profile"
                  value="Account"
                  description="Personal details & credentials"
                  icon={BadgeRounded}
                  actionLabel="View Profile →"
                  onAction={() => navigate('/profile')}
                />
              </KPIGrid>

              {/* Permission-Based Operational Graphs */}
              <OperationalGraphsSection
                canViewWorkforce={canViewWorkforceGraph}
                canViewAttendance={canViewAttendanceGraph}
                canViewLeave={canViewLeaveGraph}
                workforceData={workforceGraphData}
                attendanceData={attendanceGraphData || {
                  present: todayAttendanceState?.checkInTime ? 1 : 0,
                  late: 0,
                  absent: 0,
                  onLeave: 0,
                  total: todayAttendanceState?.checkInTime ? 1 : 0,
                }}
                leaveData={leaveGraphData || {
                  pending: pendingLeavesCount,
                  approved: myLeaves.filter((l) => (l.status || '').toUpperCase() === 'APPROVED').length,
                  rejected: myLeaves.filter((l) => (l.status || '').toUpperCase() === 'REJECTED').length,
                  total: myLeaves.length,
                }}
              />

            </>
          )}
      </AppLayout>
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // ADMIN DASHBOARD VIEW
  // ───────────────────────────────────────────────────────────────────────────
  const hospitalDisplayName = hospital?.name || 'Nuvince Multispeciality Hospital';

  return (
    <AppLayout onLogout={handleLogout}>
      {/* Header Intro & Actions */}
      <PageHeader
          title={`${getGreeting()}, ${userName}`}
          description={`${hospitalDisplayName} · Overview of hospital operations and team.`}
          actions={
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
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
          }
        />

        {error && <ErrorState message={error} onRetry={fetchOverview} />}

        {loading ? (
          <MainContentLoader />
        ) : (
          <>
            {/* Hospital Summary KPI Grid */}
            <KPIGrid>
              <KPICard
                title="Total Workforce"
                value={stats.totalEmployees || stats.activeEmployees || stats.hrCount || 0}
                footer="All employees"
                icon={GroupRounded}
              />

              <KPICard
                title="Active Staff"
                value={stats.activeEmployees || stats.totalEmployees || 0}
                footer="Currently employed"
                icon={BadgeRounded}
              />

              <KPICardWithAction
                title="Today's Attendance"
                value={stats.todayAttendance}
                description="Present / Checked in staff today"
                icon={AccessTimeRounded}
                actionLabel="View Attendance →"
                onAction={() => navigate('/attendance')}
              />

              <KPICard
                title="Pending Leave Requests"
                value={stats.pendingLeaves}
                footer={<Chip label={stats.pendingLeaves > 0 ? 'Action Required' : 'Up to date'} size="small" sx={{ fontSize: '0.7rem', fontWeight: 700, height: 22, borderRadius: '6px', backgroundColor: stats.pendingLeaves > 0 ? '#FEF3C7' : '#F1F5F9', color: stats.pendingLeaves > 0 ? '#D97706' : '#475569' }} />}
                icon={EventNoteRounded}
              />

              <KPICardWithAction
                title="Today's Scheduled Staff"
                value={stats.todayRosterAssigned}
                description="Assigned in published roster today"
                icon={ScheduleRounded}
                actionLabel="Manage Roster →"
                onAction={() => navigate('/roster')}
              />

              <KPICard
                title="Pending Regularization"
                value={stats.pendingRegularizations}
                footer={<Chip label={stats.pendingRegularizations > 0 ? 'Action Required' : 'None'} size="small" sx={{ fontSize: '0.7rem', fontWeight: 700, height: 22, borderRadius: '6px', backgroundColor: stats.pendingRegularizations > 0 ? '#FEF3C7' : '#F1F5F9', color: stats.pendingRegularizations > 0 ? '#D97706' : '#475569' }} />}
                icon={AccessTimeRounded}
              />
            </KPIGrid>

            {/* Permission-Based Operational Graphs */}
            <OperationalGraphsSection
              canViewWorkforce={canViewWorkforceGraph}
              canViewAttendance={canViewAttendanceGraph}
              canViewLeave={canViewLeaveGraph}
              workforceData={workforceGraphData}
              attendanceData={attendanceGraphData || {
                present: stats.todayAttendance || 0,
                late: 0,
                absent: Math.max(0, (stats.activeEmployees || stats.totalEmployees || 0) - (stats.todayAttendance || 0)),
                onLeave: leaveGraphData?.currentlyOnLeave || stats.pendingLeaves || 0,
                total: stats.totalEmployees || stats.activeEmployees || 0,
              }}
              leaveData={leaveGraphData || {
                pending: stats.pendingLeaves || 0,
                approved: leaveGraphData?.approved || 0,
                rejected: leaveGraphData?.rejected || 0,
                total: stats.pendingLeaves || 0,
              }}
            />

            {/* Operational Section Cards (2 Columns) */}
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: '1fr',
                  md: 'repeat(2, 1fr)',
                },
                gap: 2.5,
              }}
            >
              {/* ATTENDANCE OVERVIEW */}
              {canViewAttendance && (
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
              )}

              {/* LEAVE MANAGEMENT OVERVIEW */}
              {canViewLeaves && (
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
              )}

              {/* ROSTER OPERATIONAL OVERVIEW */}
              {canViewRoster && (
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
              )}

              {/* REGULARIZATION OVERVIEW */}
              {canViewAttendance && (
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
              )}
            </Box>
          </>
        )}
    </AppLayout>
  );
};

export default AdminDashboard;