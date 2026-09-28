import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
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
  useTheme,
} from '@mui/material';
import {
  AddRounded,
  ArrowBackRounded,
  CalendarMonthRounded,
  CheckCircleOutlineRounded,
  DeleteOutlineRounded,
  EditOutlined,
  EventNoteRounded,
  GroupAddRounded,
  PersonOutlineRounded,
  PublishRounded,
  ScheduleRounded,
  VisibilityOutlined,
  WarningAmberRounded,
} from '@mui/icons-material';

import AppLayout from '../../components/AppLayout';
import PageHeader from '../../components/PageHeader';
import StatusBadge from '../../components/StatusBadge';
import GlassCard from '../../components/GlassCard';
import Modal from '../../components/Modal';
import { UnifiedCalendar } from '../../components/calendar';
import ConfirmDialog from '../../components/ConfirmDialog';
import EmptyState from '../../components/EmptyState';
import InitialsAvatar from '../../components/InitialsAvatar';

import rosterService from '../../services/roster.service';
import employeeService from '../../services/employee.service';
import { hasPermission, PERMISSIONS } from '../../utils/permissions';

export default function RosterManagementPage() {
  const theme = useTheme();

  const canManage = useMemo(
    () => hasPermission(PERMISSIONS.ROSTER_MANAGE),
    []
  );

  // Tab State: 'templates' | 'drafts' | 'published' | 'my-roster'
  const [activeTab, setActiveTab] = useState(canManage ? 'templates' : 'my-roster');

  // Loading & Error States
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ open: false, message: '', severity: 'info' });

  // Data States
  const [templates, setTemplates] = useState([]);
  const [rosters, setRosters] = useState([]);
  const [myAssignments, setMyAssignments] = useState([]);
  const [activeEmployees, setActiveEmployees] = useState([]);

  // Selected Active Roster (for editor view)
  const [activeRoster, setActiveRoster] = useState(null);
  const [activeRosterDate, setActiveRosterDate] = useState('');

  // Modals & Dialogs
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [templateForm, setTemplateForm] = useState({
    title: '',
    columns: [
      { id: 'col-1', title: 'Morning', startTime: '08:00', endTime: '14:00', order: 1 },
      { id: 'col-2', title: 'Afternoon', startTime: '14:00', endTime: '20:00', order: 2 },
      { id: 'col-3', title: 'Night', startTime: '20:00', endTime: '08:00', order: 3 },
    ],
    dutyAreas: [
      { id: 'da-1', name: 'General Ward', order: 1 },
      { id: 'da-2', name: 'NICU 2nd Floor', order: 2 },
      { id: 'da-3', name: 'PICU', order: 3 },
      { id: 'da-4', name: 'ICU', order: 4 },
      { id: 'da-5', name: 'OT', order: 5 },
    ],
  });

  // Create Roster from Template Modal
  const [createRosterModalOpen, setCreateRosterModalOpen] = useState(false);
  const [selectedTemplateForRoster, setSelectedTemplateForRoster] = useState(null);
  const [createRosterForm, setCreateRosterForm] = useState({
    title: '',
    startDate: '',
    endDate: '',
  });

  // Add / Edit Assignment Modal
  const [assignmentModalOpen, setAssignmentModalOpen] = useState(false);
  const [assignmentTarget, setAssignmentTarget] = useState({
    dutyArea: '',
    shift: null,
    editingAssignment: null,
  });
  const [assignmentForm, setAssignmentForm] = useState({
    employeeId: '',
    date: '',
    columnId: '',
    shiftTitle: '',
    startTime: '',
    endTime: '',
    dutyArea: '',
    notes: '',
  });
  const [leaveWarning, setLeaveWarning] = useState(null);

  // Delete Confirm Dialogs
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, type: '', id: '', title: '' });

  const showToast = (message, severity = 'info') => {
    setToast({ open: true, message, severity });
  };

  // --- Fetching Functions ---
  const fetchTemplates = useCallback(async () => {
    try {
      setLoading(true);
      const res = await rosterService.getTemplates();
      setTemplates(res.data || []);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to fetch roster templates', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchRosters = useCallback(async () => {
    try {
      setLoading(true);
      const res = await rosterService.getRosters();
      setRosters(res.data || []);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to fetch rosters', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMyRoster = useCallback(async () => {
    try {
      setLoading(true);
      const res = await rosterService.getMyRoster();
      setMyAssignments(res.data || []);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to fetch your roster', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchActiveEmployees = useCallback(async () => {
    try {
      const res = await employeeService.listEmployees({ status: 'ACTIVE' });
      const empList = res?.data?.data?.employees || res?.data?.employees || res?.data?.data || res?.data || [];
      setActiveEmployees(Array.isArray(empList) ? empList : []);
    } catch (err) {
      console.error('Failed to load active employees:', err);
      setActiveEmployees([]);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'templates' && canManage) {
      fetchTemplates();
    } else if ((activeTab === 'drafts' || activeTab === 'published') && canManage) {
      fetchRosters();
    } else if (activeTab === 'my-roster') {
      fetchMyRoster();
    }
  }, [activeTab, canManage, fetchTemplates, fetchRosters, fetchMyRoster]);

  useEffect(() => {
    if (canManage) {
      fetchActiveEmployees();
    }
  }, [canManage, fetchActiveEmployees]);

  // Load Full Roster Details
  const handleOpenRosterDetails = async (rosterId) => {
    try {
      setLoading(true);
      const res = await rosterService.getRoster(rosterId);
      const rosterData = res.data;
      setActiveRoster(rosterData);
      if (rosterData.startDate) {
        const startIso = new Date(rosterData.startDate).toISOString().split('T')[0];
        setActiveRosterDate(startIso);
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to load roster details', 'error');
    } finally {
      setLoading(false);
    }
  };

  // --- Template Management ---
  const handleOpenNewTemplate = () => {
    setEditingTemplate(null);
    setTemplateForm({
      title: 'Nursing Roster Template',
      columns: [
        { id: `col-${Date.now()}-1`, title: 'Morning', startTime: '08:00', endTime: '14:00', order: 1 },
        { id: `col-${Date.now()}-2`, title: 'Afternoon', startTime: '14:00', endTime: '20:00', order: 2 },
        { id: `col-${Date.now()}-3`, title: 'Night', startTime: '20:00', endTime: '08:00', order: 3 },
      ],
      dutyAreas: [
        { id: `da-${Date.now()}-1`, name: 'General Ward', order: 1 },
        { id: `da-${Date.now()}-2`, name: 'NICU 2nd Floor', order: 2 },
        { id: `da-${Date.now()}-3`, name: 'PICU', order: 3 },
        { id: `da-${Date.now()}-4`, name: 'ICU', order: 4 },
        { id: `da-${Date.now()}-5`, name: 'OT', order: 5 },
      ],
    });
    setTemplateModalOpen(true);
  };

  const handleOpenEditTemplate = (tmpl) => {
    setEditingTemplate(tmpl);
    setTemplateForm({
      title: tmpl.title,
      columns: tmpl.columns.map((c) => ({ ...c })),
      dutyAreas: tmpl.dutyAreas.map((d) => ({ ...d })),
    });
    setTemplateModalOpen(true);
  };

  const handleAddTemplateColumn = () => {
    setTemplateForm((prev) => ({
      ...prev,
      columns: [
        ...prev.columns,
        {
          id: `col-${Date.now()}`,
          title: `Shift ${prev.columns.length + 1}`,
          startTime: '08:00',
          endTime: '16:00',
          order: prev.columns.length + 1,
        },
      ],
    }));
  };

  const handleRemoveTemplateColumn = (colId) => {
    setTemplateForm((prev) => ({
      ...prev,
      columns: prev.columns.filter((c) => c.id !== colId),
    }));
  };

  const handleUpdateTemplateColumn = (index, field, value) => {
    setTemplateForm((prev) => {
      const cols = [...prev.columns];
      cols[index] = { ...cols[index], [field]: value };
      return { ...prev, columns: cols };
    });
  };

  const handleAddTemplateDutyArea = () => {
    setTemplateForm((prev) => ({
      ...prev,
      dutyAreas: [
        ...prev.dutyAreas,
        {
          id: `da-${Date.now()}`,
          name: `Duty Area ${prev.dutyAreas.length + 1}`,
          order: prev.dutyAreas.length + 1,
        },
      ],
    }));
  };

  const handleRemoveTemplateDutyArea = (daId) => {
    setTemplateForm((prev) => ({
      ...prev,
      dutyAreas: prev.dutyAreas.filter((d) => d.id !== daId),
    }));
  };

  const handleUpdateTemplateDutyArea = (index, value) => {
    setTemplateForm((prev) => {
      const das = [...prev.dutyAreas];
      das[index] = { ...das[index], name: value };
      return { ...prev, dutyAreas: das };
    });
  };

  const handleSaveTemplate = async () => {
    if (!templateForm.title.trim()) {
      showToast('Template Title is required', 'warning');
      return;
    }
    if (templateForm.columns.length === 0) {
      showToast('At least one column/shift is required', 'warning');
      return;
    }
    if (templateForm.dutyAreas.length === 0) {
      showToast('At least one duty area is required', 'warning');
      return;
    }

    try {
      setLoading(true);
      if (editingTemplate) {
        await rosterService.updateTemplate(editingTemplate._id, templateForm);
        showToast('Template updated successfully', 'success');
      } else {
        await rosterService.createTemplate(templateForm);
        showToast('Template created successfully', 'success');
      }
      setTemplateModalOpen(false);
      fetchTemplates();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to save template', 'error');
    } finally {
      setLoading(false);
    }
  };

  // --- Use Template to Create Roster ---
  const handleOpenUseTemplate = (tmpl) => {
    setSelectedTemplateForRoster(tmpl);
    const today = new Date().toISOString().split('T')[0];
    const tenDays = new Date(Date.now() + 9 * 86400000).toISOString().split('T')[0];
    setCreateRosterForm({
      title: `${tmpl.title} (${today} to ${tenDays})`,
      startDate: today,
      endDate: tenDays,
    });
    setCreateRosterModalOpen(true);
  };

  const handleCreateRosterFromTemplate = async () => {
    if (!createRosterForm.title.trim()) {
      showToast('Roster Title is required', 'warning');
      return;
    }
    if (!createRosterForm.startDate || !createRosterForm.endDate) {
      showToast('Start and End Date are required', 'warning');
      return;
    }

    try {
      setLoading(true);
      const payload = {
        templateId: selectedTemplateForRoster?._id,
        title: createRosterForm.title,
        startDate: createRosterForm.startDate,
        endDate: createRosterForm.endDate,
      };
      const res = await rosterService.createRoster(payload);
      showToast('Draft Roster created successfully', 'success');
      setCreateRosterModalOpen(false);
      setActiveRoster(res.data);
      setActiveRosterDate(createRosterForm.startDate);
      setActiveTab('drafts');
      fetchRosters();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to create roster from template', 'error');
    } finally {
      setLoading(false);
    }
  };

  // --- Assignment Management ---
  const handleOpenAddAssignment = (dutyAreaName, shift) => {
    setAssignmentTarget({ dutyArea: dutyAreaName, shift, editingAssignment: null });
    setLeaveWarning(null);
    setAssignmentForm({
      employeeId: '',
      date: activeRosterDate,
      columnId: shift.id,
      shiftTitle: shift.title,
      startTime: shift.startTime,
      endTime: shift.endTime,
      dutyArea: dutyAreaName,
      notes: '',
    });
    setAssignmentModalOpen(true);
  };

  const handleSaveAssignment = async () => {
    if (!assignmentForm.employeeId) {
      showToast('Please select an employee', 'warning');
      return;
    }

    try {
      setLoading(true);
      const res = await rosterService.addAssignment(activeRoster._id, assignmentForm);
      showToast('Assignment added to roster', 'success');

      if (res.data?.leaveWarning) {
        setLeaveWarning(res.data.leaveWarning);
      }

      // Refresh active roster
      handleOpenRosterDetails(activeRoster._id);
      setAssignmentModalOpen(false);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to add assignment', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAssignment = async (assignmentId) => {
    try {
      setLoading(true);
      await rosterService.deleteAssignment(activeRoster._id, assignmentId);
      showToast('Assignment removed', 'info');
      handleOpenRosterDetails(activeRoster._id);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to remove assignment', 'error');
    } finally {
      setLoading(false);
    }
  };

  // --- Publish Roster ---
  const handlePublishRoster = async (rosterId) => {
    try {
      setLoading(true);
      await rosterService.publishRoster(rosterId);
      showToast('Roster published successfully! Assigned employees can now view their duty schedule.', 'success');
      if (activeRoster && activeRoster._id === rosterId) {
        handleOpenRosterDetails(rosterId);
      }
      fetchRosters();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to publish roster', 'error');
    } finally {
      setLoading(false);
    }
  };

  // --- Delete Template / Roster Confirmation ---
  const handleConfirmDelete = async () => {
    const { type, id } = deleteConfirm;
    try {
      setLoading(true);
      if (type === 'template') {
        await rosterService.deleteTemplate(id);
        showToast('Template deleted', 'info');
        fetchTemplates();
      } else if (type === 'roster') {
        await rosterService.deleteRoster(id);
        showToast('Draft Roster deleted', 'info');
        if (activeRoster && activeRoster._id === id) {
          setActiveRoster(null);
        }
        fetchRosters();
      }
      setDeleteConfirm({ open: false, type: '', id: '', title: '' });
    } catch (err) {
      showToast(err.response?.data?.message || 'Delete operation failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Computed Date Range for Active Roster Editor
  const activeRosterDates = useMemo(() => {
    if (!activeRoster?.startDate || !activeRoster?.endDate) return [];
    const list = [];
    const cur = new Date(activeRoster.startDate);
    const end = new Date(activeRoster.endDate);
    while (cur <= end) {
      list.push(cur.toISOString().split('T')[0]);
      cur.setDate(cur.getDate() + 1);
    }
    return list;
  }, [activeRoster]);

  // Compute Assignments map for selected active date in editor
  const assignmentsByCell = useMemo(() => {
    if (!activeRoster?.assignments || !activeRosterDate) return {};
    const map = {};
    activeRoster.assignments.forEach((ass) => {
      const assDate = new Date(ass.date).toISOString().split('T')[0];
      if (assDate === activeRosterDate) {
        const key = `${ass.dutyArea}__${ass.shiftTitle}`;
        if (!map[key]) map[key] = [];
        map[key].push(ass);
      }
    });
    return map;
  }, [activeRoster, activeRosterDate]);

  // Transform My Roster assignments into Calendar Events for UnifiedCalendar
  const myRosterCalendarEvents = useMemo(() => {
    return myAssignments.map((ass) => {
      const empName = ass.employeeId
        ? `${ass.employeeId.firstName || ''} ${ass.employeeId.lastName || ''}`.trim()
        : 'Me';
      return {
        id: ass._id,
        title: `${ass.shiftTitle} (${ass.startTime} - ${ass.endTime}) - ${ass.dutyArea}`,
        startDate: ass.date,
        endDate: ass.date,
        type: 'duty_roster',
        dutyArea: ass.dutyArea,
        shiftTitle: ass.shiftTitle,
        times: `${ass.startTime} to ${ass.endTime}`,
        employeeName: empName,
        status: 'published',
      };
    });
  }, [myAssignments]);

  const draftsList = useMemo(
    () => rosters.filter((r) => r.status === 'DRAFT'),
    [rosters]
  );

  const publishedList = useMemo(
    () => rosters.filter((r) => r.status === 'PUBLISHED'),
    [rosters]
  );

  return (
    <AppLayout title="Roster Management">
      <Box sx={{ p: { xs: 2, md: 3 } }}>
        <PageHeader
          title="Hospital Duty Roster"
          subtitle="Hospital-wide duty planning, custom roster templates, and employee shift schedules."
          action={
            canManage && activeTab === 'templates' && (
              <Button
                variant="contained"
                startIcon={<AddRounded />}
                onClick={handleOpenNewTemplate}
                sx={{ borderRadius: 2 }}
              >
                Create Template
              </Button>
            )
          }
        />

        {/* Top Navigation Tabs */}
        <Paper sx={{ mb: 3, borderRadius: 2 }}>
          <Tabs
            value={activeTab}
            onChange={(e, val) => {
              setActiveTab(val);
              setActiveRoster(null);
            }}
            indicatorColor="primary"
            textColor="primary"
            variant="scrollable"
            scrollButtons="auto"
          >
            {canManage && <Tab icon={<EventNoteRounded />} iconPosition="start" label="Templates" value="templates" />}
            {canManage && (
              <Tab
                icon={<EditOutlined />}
                iconPosition="start"
                label={`Draft Rosters (${draftsList.length})`}
                value="drafts"
              />
            )}
            {canManage && (
              <Tab
                icon={<PublishRounded />}
                iconPosition="start"
                label={`Published Rosters (${publishedList.length})`}
                value="published"
              />
            )}
            <Tab icon={<CalendarMonthRounded />} iconPosition="start" label="My Roster" value="my-roster" />
          </Tabs>
        </Paper>

        {/* ─── TAB 1: TEMPLATES ─── */}
        {activeTab === 'templates' && canManage && (
          <Box>
            {templates.length === 0 && !loading ? (
              <EmptyState
                icon={EventNoteRounded}
                title="No Roster Templates Created"
                description="Create a hospital duty roster template defining your preferred shift hours and duty area layout."
                action={
                  <Button variant="contained" startIcon={<AddRounded />} onClick={handleOpenNewTemplate}>
                    Create First Template
                  </Button>
                }
              />
            ) : (
              <Grid container spacing={3}>
                {templates.map((tmpl) => (
                  <Grid item xs={12} md={6} lg={4} key={tmpl._id}>
                    <GlassCard sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={2}>
                        <Box>
                          <Typography variant="h6" fontWeight="bold">
                            {tmpl.title}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Created: {new Date(tmpl.createdAt).toLocaleDateString()}
                          </Typography>
                        </Box>
                        <Stack direction="row" spacing={0.5}>
                          <IconButton size="small" onClick={() => handleOpenEditTemplate(tmpl)}>
                            <EditOutlined fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() =>
                              setDeleteConfirm({
                                open: true,
                                type: 'template',
                                id: tmpl._id,
                                title: tmpl.title,
                              })
                            }
                          >
                            <DeleteOutlineRounded fontSize="small" />
                          </IconButton>
                        </Stack>
                      </Stack>

                      {/* Shifts Preview */}
                      <Typography variant="subtitle2" color="primary" gutterBottom fontWeight="600">
                        Configured Shifts ({tmpl.columns?.length || 0})
                      </Typography>
                      <Stack direction="row" spacing={1} flexWrap="wrap" gap={1} mb={2}>
                        {tmpl.columns?.map((col) => (
                          <Chip
                            key={col.id || col.title}
                            size="small"
                            icon={<ScheduleRounded fontSize="small" />}
                            label={`${col.title} (${col.startTime} - ${col.endTime})`}
                            variant="outlined"
                          />
                        ))}
                      </Stack>

                      {/* Duty Areas Preview */}
                      <Typography variant="subtitle2" color="primary" gutterBottom fontWeight="600">
                        Duty Areas ({tmpl.dutyAreas?.length || 0})
                      </Typography>
                      <Stack direction="row" spacing={0.5} flexWrap="wrap" gap={0.5} mb={3}>
                        {tmpl.dutyAreas?.map((da) => (
                          <Chip key={da.id || da.name} size="small" label={da.name} color="default" />
                        ))}
                      </Stack>

                      <Box sx={{ mt: 'auto', pt: 1 }}>
                        <Button
                          fullWidth
                          variant="contained"
                          color="primary"
                          startIcon={<GroupAddRounded />}
                          onClick={() => handleOpenUseTemplate(tmpl)}
                        >
                          Use Template to Create Roster
                        </Button>
                      </Box>
                    </GlassCard>
                  </Grid>
                ))}
              </Grid>
            )}
          </Box>
        )}

        {/* ─── TAB 2: DRAFT ROSTERS & ACTIVE ROSTER EDITOR ─── */}
        {activeTab === 'drafts' && canManage && (
          <Box>
            {activeRoster ? (
              /* Active Roster Editor View */
              <Box>
                <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
                  <Stack direction="row" alignItems="center" spacing={2}>
                    <Button
                      startIcon={<ArrowBackRounded />}
                      onClick={() => setActiveRoster(null)}
                      variant="outlined"
                    >
                      Back to Rosters
                    </Button>
                    <Box>
                      <Typography variant="h5" fontWeight="bold">
                        {activeRoster.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Range: {new Date(activeRoster.startDate).toLocaleDateString()} to{' '}
                        {new Date(activeRoster.endDate).toLocaleDateString()}
                      </Typography>
                    </Box>
                    <StatusBadge status={activeRoster.status} />
                  </Stack>

                  <Stack direction="row" spacing={2}>
                    {activeRoster.status === 'DRAFT' && (
                      <Button
                        variant="contained"
                        color="success"
                        startIcon={<PublishRounded />}
                        onClick={() => handlePublishRoster(activeRoster._id)}
                      >
                        Publish Roster
                      </Button>
                    )}
                  </Stack>
                </Stack>

                {/* Date Selector Tabs */}
                <Paper sx={{ p: 1.5, mb: 3, borderRadius: 2 }}>
                  <Typography variant="subtitle2" sx={{ mb: 1, px: 1 }} color="text.secondary">
                    Select Roster Date:
                  </Typography>
                  <Stack direction="row" spacing={1} sx={{ overflowX: 'auto', pb: 1 }}>
                    {activeRosterDates.map((dStr) => {
                      const isSelected = activeRosterDate === dStr;
                      const dateObj = new Date(dStr);
                      const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
                      const formattedStr = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

                      return (
                        <Button
                          key={dStr}
                          variant={isSelected ? 'contained' : 'outlined'}
                          color={isSelected ? 'primary' : 'inherit'}
                          onClick={() => setActiveRosterDate(dStr)}
                          sx={{ minWidth: 100, flexDirection: 'column', py: 1 }}
                        >
                          <Typography variant="caption" sx={{ opacity: 0.8 }}>
                            {dayName}
                          </Typography>
                          <Typography variant="body2" fontWeight="bold">
                            {formattedStr}
                          </Typography>
                        </Button>
                      );
                    })}
                  </Stack>
                </Paper>

                {/* Interactive Roster Table Grid */}
                {activeRoster.templateId ? (
                  <TableContainer component={Paper} sx={{ borderRadius: 2, boxShadow: theme.shadows[2] }}>
                    <Table>
                      <TableHead sx={{ bgcolor: theme.palette.action.hover }}>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 'bold', width: '220px' }}>
                            Duty Area / Shift
                          </TableCell>
                          {activeRoster.templateId.columns?.map((col) => (
                            <TableCell key={col.id} align="center" sx={{ fontWeight: 'bold', minWidth: '220px' }}>
                              <Typography variant="subtitle2" fontWeight="bold">
                                {col.title}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {col.startTime} → {col.endTime}
                              </Typography>
                            </TableCell>
                          ))}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {activeRoster.templateId.dutyAreas?.map((da) => (
                          <TableRow key={da.id} hover>
                            <TableCell sx={{ fontWeight: '600', bgcolor: theme.palette.background.default }}>
                              {da.name}
                            </TableCell>

                            {activeRoster.templateId.columns?.map((col) => {
                              const cellKey = `${da.name}__${col.title}`;
                              const cellAssignments = assignmentsByCell[cellKey] || [];

                              return (
                                <TableCell key={col.id} align="center" sx={{ verticalAlign: 'top', p: 1.5 }}>
                                  <Stack spacing={1}>
                                    {cellAssignments.map((ass) => {
                                      const emp = ass.employeeId;
                                      const nameStr = emp
                                        ? `${emp.firstName || ''} ${emp.lastName || ''}`.trim()
                                        : 'Unknown Employee';
                                      const codeStr = emp?.employeeId ? `(${emp.employeeId})` : '';

                                      return (
                                        <Paper
                                          key={ass._id}
                                          variant="outlined"
                                          sx={{
                                            p: 1,
                                            textAlign: 'left',
                                            borderColor: theme.palette.primary.light,
                                            bgcolor: theme.palette.action.hover,
                                          }}
                                        >
                                          <Stack direction="row" alignItems="center" justifyContent="space-between">
                                            <Stack direction="row" alignItems="center" spacing={1}>
                                              <InitialsAvatar name={nameStr} size={28} />
                                              <Box>
                                                <Typography variant="body2" fontWeight="600">
                                                  {nameStr}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                  {codeStr} • {ass.startTime}-{ass.endTime}
                                                </Typography>
                                              </Box>
                                            </Stack>
                                            {activeRoster.status === 'DRAFT' && (
                                              <IconButton
                                                size="small"
                                                color="error"
                                                onClick={() => handleDeleteAssignment(ass._id)}
                                              >
                                                <DeleteOutlineRounded fontSize="small" />
                                              </IconButton>
                                            )}
                                          </Stack>
                                          {ass.notes && (
                                            <Typography variant="caption" color="info.main" sx={{ display: 'block', mt: 0.5 }}>
                                              Note: {ass.notes}
                                            </Typography>
                                          )}
                                        </Paper>
                                      );
                                    })}

                                    {activeRoster.status === 'DRAFT' && (
                                      <Button
                                        size="small"
                                        startIcon={<AddRounded />}
                                        onClick={() => handleOpenAddAssignment(da.name, col)}
                                        sx={{ textTransform: 'none', borderRadius: 1 }}
                                      >
                                        + Add Nurse
                                      </Button>
                                    )}
                                  </Stack>
                                </TableCell>
                              );
                            })}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : (
                  <Alert severity="warning">Template layout information missing for this roster.</Alert>
                )}
              </Box>
            ) : (
              /* Draft Rosters List */
              <Box>
                {draftsList.length === 0 ? (
                  <EmptyState
                    icon={EditOutlined}
                    title="No Active Draft Rosters"
                    description="Select a saved template to generate a new hospital roster draft."
                    action={
                      <Button variant="contained" onClick={() => setActiveTab('templates')}>
                        View Templates
                      </Button>
                    }
                  />
                ) : (
                  <Grid container spacing={3}>
                    {draftsList.map((r) => (
                      <Grid item xs={12} md={6} lg={4} key={r._id}>
                        <GlassCard sx={{ p: 3 }}>
                          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={2}>
                            <Box>
                              <Typography variant="h6" fontWeight="bold">
                                {r.title}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {new Date(r.startDate).toLocaleDateString()} to{' '}
                                {new Date(r.endDate).toLocaleDateString()}
                              </Typography>
                            </Box>
                            <StatusBadge status={r.status} />
                          </Stack>

                          <Typography variant="body2" color="text.secondary" mb={3}>
                            Assigned Staff Entries: <strong>{r.assignments?.length || 0}</strong>
                          </Typography>

                          <Stack direction="row" spacing={1}>
                            <Button
                              variant="contained"
                              color="primary"
                              startIcon={<EditOutlined />}
                              onClick={() => handleOpenRosterDetails(r._id)}
                              fullWidth
                            >
                              Edit Draft
                            </Button>
                            <Button
                              variant="outlined"
                              color="success"
                              onClick={() => handlePublishRoster(r._id)}
                            >
                              Publish
                            </Button>
                            <IconButton
                              color="error"
                              onClick={() =>
                                setDeleteConfirm({
                                  open: true,
                                  type: 'roster',
                                  id: r._id,
                                  title: r.title,
                                })
                              }
                            >
                              <DeleteOutlineRounded />
                            </IconButton>
                          </Stack>
                        </GlassCard>
                      </Grid>
                    ))}
                  </Grid>
                )}
              </Box>
            )}
          </Box>
        )}

        {/* ─── TAB 3: PUBLISHED ROSTERS ─── */}
        {activeTab === 'published' && canManage && (
          <Box>
            {activeRoster ? (
              /* Published Roster Detail View */
              <Box>
                <Stack direction="row" alignItems="center" spacing={2} mb={2}>
                  <Button startIcon={<ArrowBackRounded />} onClick={() => setActiveRoster(null)} variant="outlined">
                    Back to Published List
                  </Button>
                  <Typography variant="h5" fontWeight="bold">
                    {activeRoster.title}
                  </Typography>
                  <StatusBadge status={activeRoster.status} />
                </Stack>

                {/* Reuse Date Selector & Readonly Table */}
                <Paper sx={{ p: 1.5, mb: 3, borderRadius: 2 }}>
                  <Stack direction="row" spacing={1} sx={{ overflowX: 'auto' }}>
                    {activeRosterDates.map((dStr) => (
                      <Button
                        key={dStr}
                        variant={activeRosterDate === dStr ? 'contained' : 'outlined'}
                        onClick={() => setActiveRosterDate(dStr)}
                        size="small"
                      >
                        {dStr}
                      </Button>
                    ))}
                  </Stack>
                </Paper>

                <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
                  <Table>
                    <TableHead sx={{ bgcolor: theme.palette.action.hover }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 'bold' }}>Duty Area</TableCell>
                        {activeRoster.templateId?.columns?.map((col) => (
                          <TableCell key={col.id} align="center" sx={{ fontWeight: 'bold' }}>
                            {col.title} ({col.startTime} - {col.endTime})
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {activeRoster.templateId?.dutyAreas?.map((da) => (
                        <TableRow key={da.id}>
                          <TableCell sx={{ fontWeight: '600' }}>{da.name}</TableCell>
                          {activeRoster.templateId?.columns?.map((col) => {
                            const cellKey = `${da.name}__${col.title}`;
                            const cellAssignments = assignmentsByCell[cellKey] || [];
                            return (
                              <TableCell key={col.id} align="center">
                                {cellAssignments.map((ass) => (
                                  <Chip
                                    key={ass._id}
                                    avatar={
                                      <InitialsAvatar
                                        name={`${ass.employeeId?.firstName || ''} ${ass.employeeId?.lastName || ''}`}
                                        size={24}
                                      />
                                    }
                                    label={`${ass.employeeId?.firstName || 'Employee'} ${ass.employeeId?.lastName || ''}`}
                                    variant="outlined"
                                    sx={{ m: 0.5 }}
                                  />
                                ))}
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            ) : (
              <Grid container spacing={3}>
                {publishedList.length === 0 ? (
                  <EmptyState
                    icon={CheckCircleOutlineRounded}
                    title="No Published Rosters"
                    description="When draft rosters are published by HR/Admin, they will appear here."
                  />
                ) : (
                  publishedList.map((r) => (
                    <Grid item xs={12} md={6} lg={4} key={r._id}>
                      <GlassCard sx={{ p: 3 }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={2}>
                          <Box>
                            <Typography variant="h6" fontWeight="bold">
                              {r.title}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Published: {new Date(r.publishedAt || r.updatedAt).toLocaleDateString()}
                            </Typography>
                          </Box>
                          <StatusBadge status={r.status} />
                        </Stack>
                        <Button
                          variant="outlined"
                          startIcon={<VisibilityOutlined />}
                          onClick={() => handleOpenRosterDetails(r._id)}
                          fullWidth
                        >
                          View Schedule Grid
                        </Button>
                      </GlassCard>
                    </Grid>
                  ))
                )}
              </Grid>
            )}
          </Box>
        )}

        {/* ─── TAB 4: MY ROSTER (Employee View) ─── */}
        {activeTab === 'my-roster' && (
          <Box>
            <Paper sx={{ p: 3, borderRadius: 2, mb: 3 }}>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                My Published Duty Assignments
              </Typography>
              <Typography variant="body2" color="text.secondary" mb={3}>
                Below is your personal duty roster schedule published by hospital management.
              </Typography>

              {myAssignments.length === 0 ? (
                <EmptyState
                  icon={CalendarMonthRounded}
                  title="No Duty Assignments Found"
                  description="You currently have no published duty assignments in the system."
                />
              ) : (
                <Grid container spacing={3}>
                  <Grid item xs={12} md={7}>
                    <Typography variant="subtitle1" fontWeight="bold" mb={2}>
                      Duty Schedule List
                    </Typography>
                    <Stack spacing={2}>
                      {myAssignments.map((ass) => (
                        <Paper
                          key={ass._id}
                          variant="outlined"
                          sx={{ p: 2, borderRadius: 2, borderColor: theme.palette.primary.light }}
                        >
                          <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Box>
                              <Typography variant="subtitle1" fontWeight="bold" color="primary">
                                {new Date(ass.date).toLocaleDateString('en-US', {
                                  weekday: 'long',
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                })}
                              </Typography>
                              <Stack direction="row" spacing={1} alignItems="center" mt={0.5}>
                                <Chip
                                  icon={<ScheduleRounded fontSize="small" />}
                                  label={`${ass.shiftTitle} (${ass.startTime} - ${ass.endTime})`}
                                  size="small"
                                  color="primary"
                                />
                                <Chip label={ass.dutyArea} size="small" variant="outlined" />
                              </Stack>
                            </Box>
                            {ass.notes && (
                              <Typography variant="caption" color="text.secondary">
                                Note: {ass.notes}
                              </Typography>
                            )}
                          </Stack>
                        </Paper>
                      ))}
                    </Stack>
                  </Grid>

                  <Grid item xs={12} md={5}>
                    <Typography variant="subtitle1" fontWeight="bold" mb={2}>
                      Calendar View
                    </Typography>
                    <UnifiedCalendar events={myRosterCalendarEvents} initialView="month" />
                  </Grid>
                </Grid>
              )}
            </Paper>
          </Box>
        )}

        {/* ─── MODAL 1: TEMPLATE BUILDER ─── */}
        <Modal
          open={templateModalOpen}
          onClose={() => setTemplateModalOpen(false)}
          title={editingTemplate ? 'Edit Roster Template' : 'Create Roster Template'}
          maxWidth="md"
        >
          <Stack spacing={3} sx={{ pt: 1 }}>
            <TextField
              label="Template Title"
              value={templateForm.title}
              onChange={(e) => setTemplateForm((p) => ({ ...p, title: e.target.value }))}
              placeholder="e.g. September Nursing Roster (11/09/26 TO 20/09/26)"
              fullWidth
              required
            />

            {/* Configurable Columns / Shifts */}
            <Box>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                <Typography variant="subtitle1" fontWeight="bold">
                  Configurable Shift Columns
                </Typography>
                <Button size="small" startIcon={<AddRounded />} onClick={handleAddTemplateColumn}>
                  Add Column
                </Button>
              </Stack>
              <Stack spacing={1.5}>
                {templateForm.columns.map((col, idx) => (
                  <Paper key={col.id} variant="outlined" sx={{ p: 1.5 }}>
                    <Grid container spacing={2} alignItems="center">
                      <Grid item xs={12} sm={4}>
                        <TextField
                          label="Shift Title"
                          size="small"
                          fullWidth
                          value={col.title}
                          onChange={(e) => handleUpdateTemplateColumn(idx, 'title', e.target.value)}
                        />
                      </Grid>
                      <Grid item xs={5} sm={3}>
                        <TextField
                          label="Start Time"
                          type="time"
                          size="small"
                          fullWidth
                          InputLabelProps={{ shrink: true }}
                          value={col.startTime}
                          onChange={(e) => handleUpdateTemplateColumn(idx, 'startTime', e.target.value)}
                        />
                      </Grid>
                      <Grid item xs={5} sm={3}>
                        <TextField
                          label="End Time"
                          type="time"
                          size="small"
                          fullWidth
                          InputLabelProps={{ shrink: true }}
                          value={col.endTime}
                          onChange={(e) => handleUpdateTemplateColumn(idx, 'endTime', e.target.value)}
                        />
                      </Grid>
                      <Grid item xs={2} sm={2} align="right">
                        <IconButton
                          color="error"
                          size="small"
                          disabled={templateForm.columns.length <= 1}
                          onClick={() => handleRemoveTemplateColumn(col.id)}
                        >
                          <DeleteOutlineRounded fontSize="small" />
                        </IconButton>
                      </Grid>
                    </Grid>
                  </Paper>
                ))}
              </Stack>
            </Box>

            {/* Configurable Duty Areas */}
            <Box>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                <Typography variant="subtitle1" fontWeight="bold">
                  Duty Area Rows
                </Typography>
                <Button size="small" startIcon={<AddRounded />} onClick={handleAddTemplateDutyArea}>
                  Add Row
                </Button>
              </Stack>
              <Stack spacing={1.5}>
                {templateForm.dutyAreas.map((da, idx) => (
                  <Paper key={da.id} variant="outlined" sx={{ p: 1.5 }}>
                    <Grid container spacing={2} alignItems="center">
                      <Grid item xs={10}>
                        <TextField
                          label="Duty Area Name"
                          size="small"
                          fullWidth
                          value={da.name}
                          onChange={(e) => handleUpdateTemplateDutyArea(idx, e.target.value)}
                        />
                      </Grid>
                      <Grid item xs={2} align="right">
                        <IconButton
                          color="error"
                          size="small"
                          disabled={templateForm.dutyAreas.length <= 1}
                          onClick={() => handleRemoveTemplateDutyArea(da.id)}
                        >
                          <DeleteOutlineRounded fontSize="small" />
                        </IconButton>
                      </Grid>
                    </Grid>
                  </Paper>
                ))}
              </Stack>
            </Box>

            <Box align="right" pt={2}>
              <Button onClick={() => setTemplateModalOpen(false)} sx={{ mr: 1 }}>
                Cancel
              </Button>
              <Button variant="contained" onClick={handleSaveTemplate} loading={loading}>
                Save Template
              </Button>
            </Box>
          </Stack>
        </Modal>

        {/* ─── MODAL 2: CREATE ROSTER FROM TEMPLATE ─── */}
        <Modal
          open={createRosterModalOpen}
          onClose={() => setCreateRosterModalOpen(false)}
          title="Create Roster from Template"
          maxWidth="sm"
        >
          <Stack spacing={3} sx={{ pt: 1 }}>
            <TextField
              label="Roster Title"
              value={createRosterForm.title}
              onChange={(e) => setCreateRosterForm((p) => ({ ...p, title: e.target.value }))}
              fullWidth
              required
            />

            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  label="Start Date"
                  type="date"
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                  value={createRosterForm.startDate}
                  onChange={(e) => setCreateRosterForm((p) => ({ ...p, startDate: e.target.value }))}
                  required
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="End Date"
                  type="date"
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                  value={createRosterForm.endDate}
                  onChange={(e) => setCreateRosterForm((p) => ({ ...p, endDate: e.target.value }))}
                  required
                />
              </Grid>
            </Grid>

            <Box align="right" pt={2}>
              <Button onClick={() => setCreateRosterModalOpen(false)} sx={{ mr: 1 }}>
                Cancel
              </Button>
              <Button variant="contained" onClick={handleCreateRosterFromTemplate} loading={loading}>
                Create Draft Roster
              </Button>
            </Box>
          </Stack>
        </Modal>

        {/* ─── MODAL 3: ADD NURSE / EMPLOYEE ASSIGNMENT ─── */}
        <Modal
          open={assignmentModalOpen}
          onClose={() => setAssignmentModalOpen(false)}
          title={`Assign Employee to ${assignmentTarget.dutyArea}`}
          maxWidth="sm"
        >
          <Stack spacing={2.5} sx={{ pt: 1 }}>
            {leaveWarning && (
              <Alert severity="warning" icon={<WarningAmberRounded />}>
                {leaveWarning.message || 'Employee has approved/pending leave on this date.'}
              </Alert>
            )}

            <FormControl fullWidth required>
              <InputLabel>Select Employee / Nurse</InputLabel>
              <Select
                value={assignmentForm.employeeId}
                label="Select Employee / Nurse"
                onChange={(e) => setAssignmentForm((p) => ({ ...p, employeeId: e.target.value }))}
              >
                {(Array.isArray(activeEmployees) ? activeEmployees : []).map((emp) => (
                  <MenuItem key={emp._id} value={emp._id}>
                    {emp.firstName} {emp.lastName} ({emp.employeeId || 'Emp'}) - {emp.positionId?.name || 'Staff'}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  label="Start Time"
                  type="time"
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                  value={assignmentForm.startTime}
                  onChange={(e) => setAssignmentForm((p) => ({ ...p, startTime: e.target.value }))}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="End Time"
                  type="time"
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                  value={assignmentForm.endTime}
                  onChange={(e) => setAssignmentForm((p) => ({ ...p, endTime: e.target.value }))}
                />
              </Grid>
            </Grid>

            <TextField
              label="Assignment Notes (Optional)"
              value={assignmentForm.notes}
              onChange={(e) => setAssignmentForm((p) => ({ ...p, notes: e.target.value }))}
              fullWidth
              multiline
              rows={2}
            />

            <Box align="right" pt={1}>
              <Button onClick={() => setAssignmentModalOpen(false)} sx={{ mr: 1 }}>
                Cancel
              </Button>
              <Button variant="contained" onClick={handleSaveAssignment} loading={loading}>
                Assign Employee
              </Button>
            </Box>
          </Stack>
        </Modal>

        {/* Delete Confirmation Dialog */}
        <ConfirmDialog
          open={deleteConfirm.open}
          title={`Delete ${deleteConfirm.type === 'template' ? 'Template' : 'Draft Roster'}?`}
          description={`Are you sure you want to delete "${deleteConfirm.title}"? This action cannot be undone.`}
          onConfirm={handleConfirmDelete}
          onClose={() => setDeleteConfirm({ open: false, type: '', id: '', title: '' })}
        />

        {/* Global Toast Snackbar */}
        <Snackbar
          open={toast.open}
          autoHideDuration={6000}
          onClose={() => setToast((p) => ({ ...p, open: false }))}
        >
          <Alert severity={toast.severity} onClose={() => setToast((p) => ({ ...p, open: false }))}>
            {toast.message}
          </Alert>
        </Snackbar>
      </Box>
    </AppLayout>
  );
}
