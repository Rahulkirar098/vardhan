import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  FormControlLabel,
  Grid,
  IconButton,
  InputAdornment,
  InputLabel,
  List,
  ListItem,
  ListItemText,
  MenuItem,
  Paper,
  Radio,
  RadioGroup,
  Select,
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
} from "@mui/material";
import {
  AddRounded,
  ArrowBackRounded,
  CalendarMonthRounded,
  ChatBubbleOutlineRounded,
  CheckCircleOutlineRounded,
  CheckRounded,
  CloseRounded,
  CommentOutlined,
  CopyAllRounded,
  DeleteOutlineRounded,
  DownloadOutlined,
  EditOutlined,
  ErrorOutlineRounded,
  EventNoteRounded,
  GroupAddRounded,
  PersonAddOutlined,
  PersonOutlineRounded,
  PhoneOutlined,
  PublishRounded,
  ScheduleRounded,
  SearchRounded,
  ShareOutlined,
  ShareRounded,
  ToggleOffRounded,
  ToggleOnRounded,
  VisibilityOutlined,
  WarningAmberRounded,
} from "@mui/icons-material";

import AppLayout from "../../wrapper/AppLayout";
import MainContentLoader from "../../components/common/MainContentLoader";
import PageHeader from "../../components/common/PageHeader";
import StatusBadge from "../../components/StatusBadge";
import GlassCard from "../../components/GlassCard";
import Modal from "../../components/Modal";
import { UnifiedCalendar } from "../../components/calendar";
import { generateFrontendRosterPDF } from "../../utils/rosterPdfGenerator";
import ConfirmDialog from "../../components/ConfirmDialog";
import { useSnackbar } from "../../theme/SnackbarProvider";
import EmptyState from "../../components/EmptyState";
import InitialsAvatar from "../../components/InitialsAvatar";

import rosterService from "../../services/roster.service";
import employeeService from "../../services/employee.service";
import { hasPermission, PERMISSIONS } from "../../utils/permissions";
import {
  formatDate,
  formatTime12h,
  getTodayDateStr,
  parseLocalDateStr,
} from "../../utils/dateUtils";

export default function RosterManagementPage() {
  const theme = useTheme();

  const canManage = useMemo(() => hasPermission(PERMISSIONS.ROSTER_MANAGE), []);

  const canViewWorkforce = useMemo(
    () => hasPermission(PERMISSIONS.ROSTER_VIEW) || canManage,
    [canManage],
  );

  // Active Main Tab: 'published-matrix' | 'drafts' | 'history' | 'templates' | 'my-roster'
  const [activeTab, setActiveTab] = useState(
    canManage ? "drafts" : "published-matrix",
  );

  // Sub-tab for My Roster: 'current' | 'history'
  const [myRosterSubTab, setMyRosterSubTab] = useState("current");

  // Loading & Toast States
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // Data Collections
  const [rosters, setRosters] = useState([]);
  const [historyRosters, setHistoryRosters] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [myCurrentAssignments, setMyCurrentAssignments] = useState([]);
  const [myHistoryAssignments, setMyHistoryAssignments] = useState([]);
  const [activeEmployees, setActiveEmployees] = useState([]);

  // Selected Active Roster (for Matrix View & Editing)
  const [activeRoster, setActiveRoster] = useState(null);
  const [activeRosterDate, setActiveRosterDate] = useState("");
  const [userSelectedRosterId, setUserSelectedRosterId] = useState(null);

  // Leave Conflict Confirmation Dialog
  const [leaveConflictPrompt, setLeaveConflictPrompt] = useState({
    open: false,
    employeeName: "",
    conflictingDates: [],
    allDatesBlocked: false,
    onContinue: null,
  });

  // Roster Builder Modal (Create/Edit)
  const [rosterModalOpen, setRosterModalOpen] = useState(false);
  const [editingRoster, setEditingRoster] = useState(null);
  const [rosterForm, setRosterForm] = useState({
    templateId: "",
    title: "",
    startDate: "",
    endDate: "",
    columns: [
      {
        id: "col-1",
        title: "MORNING",
        startTime: "08:00",
        endTime: "14:00",
        order: 1,
      },
      {
        id: "col-2",
        title: "AFTERNOON",
        startTime: "14:00",
        endTime: "20:00",
        order: 2,
      },
      {
        id: "col-3",
        title: "NIGHT",
        startTime: "20:00",
        endTime: "08:00",
        order: 3,
      },
    ],
    dutyAreas: [
      {
        id: "da-1",
        name: "GENERAL WARD FEMALE + MALE + DAY CARE WARD",
        order: 1,
      },
      { id: "da-2", name: "PRIVATE WARD + LABOUR ROOM (2ND FLOOR)", order: 2 },
      { id: "da-3", name: "NICU 2ND FLOOR", order: 3 },
      { id: "da-4", name: "PICU", order: 4 },
      { id: "da-5", name: "ICU 3RD FLOOR + PRIVATE WARD", order: 5 },
      { id: "da-6", name: "OT", order: 6 },
    ],
  });

  // Template Builder Modal (Create/Edit Template)
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [templateForm, setTemplateForm] = useState({
    name: "",
    description: "",
    columns: [
      {
        id: "col-1",
        title: "MORNING",
        startTime: "08:00",
        endTime: "16:00",
        order: 1,
      },
      {
        id: "col-2",
        title: "EVENING",
        startTime: "16:00",
        endTime: "00:00",
        order: 2,
      },
      {
        id: "col-3",
        title: "NIGHT",
        startTime: "00:00",
        endTime: "08:00",
        order: 3,
      },
    ],
    dutyAreas: [
      { id: "da-1", name: "ICU", order: 1 },
      { id: "da-2", name: "EMERGENCY", order: 2 },
      { id: "da-3", name: "OPD", order: 3 },
      { id: "da-4", name: "OT", order: 4 },
    ],
    isActive: true,
  });

  // PDF Download State
  const [downloading, setDownloading] = useState(false);

  // Add / Edit Assignment Modal
  const [assignmentModalOpen, setAssignmentModalOpen] = useState(false);
  const [assignmentMode, setAssignmentMode] = useState("range"); // 'range' | 'single'
  const [assignmentTarget, setAssignmentTarget] = useState({
    dutyArea: "",
    shift: null,
    editingAssignment: null,
  });
  const [assignmentForm, setAssignmentForm] = useState({
    employeeId: "",
    date: "",
    columnId: "",
    shiftTitle: "",
    startTime: "",
    endTime: "",
    dutyArea: "",
    notes: "",
  });
  const [rangeForm, setRangeForm] = useState({
    startDate: "",
    endDate: "",
  });
  const [leaveWarning, setLeaveWarning] = useState(null);
  const [conflictPrompt, setConflictPrompt] = useState({
    open: false,
    message: "",
    existingAssignments: [],
  });

  // Share for Review Modal
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [selectedReviewerIds, setSelectedReviewerIds] = useState([]);
  const [reviewerSearch, setReviewerSearch] = useState("");

  // Review Feedback Drawer / Modal
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [newCommentText, setNewCommentText] = useState("");

  // Confirmation for Published Roster Edit
  const [publishEditConfirm, setPublishEditConfirm] = useState({
    open: false,
    pendingAction: null,
  });

  // Delete Confirm Dialog
  const [deleteConfirm, setDeleteConfirm] = useState({
    open: false,
    type: "",
    id: "",
    title: "",
  });

  // Flexible Roster Duty Removal Modal (THIS_DATE | FROM_DATE_TO_ROSTER_END)
  const [removeDutyModal, setRemoveDutyModal] = useState({
    open: false,
    assignment: null,
    scope: "THIS_DATE",
  });

  const { showSnackbar: showToast } = useSnackbar();

  // --- Data Fetching ---
  const fetchRosters = useCallback(async () => {
    try {
      setLoading(true);
      const res = await rosterService.getRosters();
      const list = res.data || [];
      setRosters(list);

      // Auto-select first current active published roster (endDate >= today) for matrix view ONLY if none selected by user
      const activePublished = list.filter((r) => {
        if (r.status !== "PUBLISHED") return false;
        const endIso = r.endDate ? getTodayDateStr(r.endDate) : "";
        return endIso >= getTodayDateStr();
      });
      if (
        activePublished.length > 0 &&
        !activeRoster &&
        !userSelectedRosterId
      ) {
        handleOpenRosterDetails(activePublished[0]._id, false);
      }
    } catch (err) {
      showToast(
        err.response?.data?.message || "Failed to load rosters",
        "error",
      );
    } finally {
      setLoading(false);
    }
  }, [activeRoster, userSelectedRosterId]);

  const fetchHistory = useCallback(async () => {
    try {
      setLoading(true);
      const res = await rosterService.getRosterHistory();
      setHistoryRosters(res.data || []);
    } catch (err) {
      showToast(
        err.response?.data?.message || "Failed to load roster history",
        "error",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTemplates = useCallback(async () => {
    try {
      setLoading(true);
      const res = await rosterService.getTemplates({ includeInactive: true });
      setTemplates(res.data || []);
    } catch (err) {
      console.error("Failed to load roster templates:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMyRoster = useCallback(async () => {
    try {
      setLoading(true);
      const [currentRes, historyRes] = await Promise.allSettled([
        rosterService.getMyRoster("current"),
        rosterService.getMyRoster("history"),
      ]);
      if (currentRes.status === "fulfilled") {
        const curList = currentRes.value?.data || currentRes.value || [];
        setMyCurrentAssignments(Array.isArray(curList) ? curList : []);
      }
      if (historyRes.status === "fulfilled") {
        const histList = historyRes.value?.data || historyRes.value || [];
        setMyHistoryAssignments(Array.isArray(histList) ? histList : []);
      }
    } catch (err) {
      console.error("Failed to load your personal roster:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchActiveEmployees = useCallback(async () => {
    try {
      const res = await employeeService.listEmployees({ status: "ACTIVE" });
      const list =
        res?.data?.data?.employees ||
        res?.data?.employees ||
        res?.data?.data ||
        res?.data ||
        [];
      setActiveEmployees(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error("Failed to load active employees:", err);
      setActiveEmployees([]);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    const init = async () => {
      try {
        if (canViewWorkforce) {
          await Promise.allSettled([
            fetchRosters(),
            fetchHistory(),
            fetchTemplates(),
            fetchActiveEmployees(),
          ]);
        }
        await fetchMyRoster();
      } finally {
        if (isMounted) setInitialLoading(false);
      }
    };
    init();
    return () => {
      isMounted = false;
    };
  }, [
    canViewWorkforce,
    fetchRosters,
    fetchHistory,
    fetchTemplates,
    fetchActiveEmployees,
    fetchMyRoster,
  ]);

  // Load Single Roster Details
  const handleOpenRosterDetails = async (rosterId, isExplicit = true) => {
    try {
      setLoading(true);
      if (isExplicit) {
        setUserSelectedRosterId(rosterId);
      }
      const res = await rosterService.getRoster(rosterId);
      const rosterData = res.data;
      setActiveRoster(rosterData);
      if (rosterData.startDate) {
        const startIso = getTodayDateStr(rosterData.startDate);
        setActiveRosterDate(startIso);
      }
      setSelectedReviewerIds(
        rosterData.sharedWith?.map((u) => u._id || u) || [],
      );
    } catch (err) {
      showToast(
        err.response?.data?.message || "Failed to load roster details",
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  // --- Roster Builder (Create / Edit) ---
  const handleOpenNewRoster = () => {
    setEditingRoster(null);
    const today = getTodayDateStr();
    const tenDays = getTodayDateStr(new Date(Date.now() + 9 * 86400000));
    setRosterForm({
      templateId: "",
      title: "HOSPITAL NURSING ROSTER",
      startDate: today,
      endDate: tenDays,
      columns: [
        {
          id: `col-${Date.now()}-1`,
          title: "MORNING",
          startTime: "08:00",
          endTime: "14:00",
          order: 1,
        },
        {
          id: `col-${Date.now()}-2`,
          title: "AFTERNOON",
          startTime: "14:00",
          endTime: "20:00",
          order: 2,
        },
        {
          id: `col-${Date.now()}-3`,
          title: "NIGHT",
          startTime: "20:00",
          endTime: "08:00",
          order: 3,
        },
      ],
      dutyAreas: [
        {
          id: `da-${Date.now()}-1`,
          name: "GENERAL WARD FEMALE + GENERAL WARD MALE + DAY CARE WARD",
          order: 1,
        },
        {
          id: `da-${Date.now()}-2`,
          name: "PRIVATE WARD + LABOUR ROOM (2ND FLOOR)",
          order: 2,
        },
        { id: `da-${Date.now()}-3`, name: "NICU 2ND FLOOR", order: 3 },
        { id: `da-${Date.now()}-4`, name: "PICU", order: 4 },
        {
          id: `da-${Date.now()}-5`,
          name: "ICU 3RD FLOOR + PRIVATE WARD",
          order: 5,
        },
        { id: `da-${Date.now()}-6`, name: "OT", order: 6 },
      ],
    });
    setRosterModalOpen(true);
  };

  const handleSelectTemplateForRoster = (tId) => {
    if (!tId) {
      setRosterForm((p) => ({ ...p, templateId: "" }));
      return;
    }
    const t = templates.find((item) => item._id === tId);
    if (t) {
      setRosterForm((p) => ({
        ...p,
        templateId: t._id,
        title: p.title || t.name,
        columns:
          Array.isArray(t.columns) && t.columns.length > 0
            ? t.columns.map((c) => ({ ...c }))
            : p.columns,
        dutyAreas:
          Array.isArray(t.dutyAreas) && t.dutyAreas.length > 0
            ? t.dutyAreas.map((d) => ({ ...d }))
            : p.dutyAreas,
      }));
    }
  };

  const handleOpenEditRoster = (roster) => {
    if (!roster) return;
    setEditingRoster(roster);
    const startStr = roster.startDate ? getTodayDateStr(roster.startDate) : "";
    const endStr = roster.endDate ? getTodayDateStr(roster.endDate) : "";
    setRosterForm({
      templateId: roster.templateId || "",
      title: roster.title || "",
      startDate: startStr,
      endDate: endStr,
      columns:
        Array.isArray(roster.columns) && roster.columns.length > 0
          ? roster.columns.map((c) => ({ ...c }))
          : [
              {
                id: `col-${Date.now()}-1`,
                title: "MORNING",
                startTime: "08:00",
                endTime: "14:00",
                order: 1,
              },
              {
                id: `col-${Date.now()}-2`,
                title: "AFTERNOON",
                startTime: "14:00",
                endTime: "20:00",
                order: 2,
              },
              {
                id: `col-${Date.now()}-3`,
                title: "NIGHT",
                startTime: "20:00",
                endTime: "08:00",
                order: 3,
              },
            ],
      dutyAreas:
        Array.isArray(roster.dutyAreas) && roster.dutyAreas.length > 0
          ? roster.dutyAreas.map((d) => ({ ...d }))
          : [
              { id: `da-${Date.now()}-1`, name: "GENERAL WARD", order: 1 },
              { id: `da-${Date.now()}-2`, name: "ICU", order: 2 },
            ],
    });
    setRosterModalOpen(true);
  };

  const handleSaveRoster = async () => {
    if (
      !rosterForm.title.trim() ||
      !rosterForm.startDate ||
      !rosterForm.endDate
    ) {
      showToast("Title, start date, and end date are required", "warning");
      return;
    }

    const payload = {
      ...rosterForm,
      templateId: rosterForm.templateId || undefined,
    };

    const saveProc = async () => {
      try {
        setLoading(true);
        if (editingRoster) {
          await rosterService.updateRoster(editingRoster._id, payload);
          showToast("Roster updated successfully", "success");
          handleOpenRosterDetails(editingRoster._id);
        } else {
          const res = await rosterService.createRoster(payload);
          showToast("Draft roster created successfully", "success");
          if (res.data?._id) {
            handleOpenRosterDetails(res.data._id);
            setActiveTab("published-matrix");
          }
        }
        setRosterModalOpen(false);
        fetchRosters();
      } catch (err) {
        showToast(
          err.response?.data?.message || "Failed to save roster",
          "error",
        );
      } finally {
        setLoading(false);
      }
    };

    if (editingRoster && editingRoster.status === "PUBLISHED") {
      setPublishEditConfirm({
        open: true,
        pendingAction: saveProc,
      });
    } else {
      await saveProc();
    }
  };

  // --- Template Management (Create / Edit / Duplicate / Activate / Deactivate) ---
  const handleOpenNewTemplate = () => {
    setEditingTemplate(null);
    setTemplateForm({
      name: "",
      description: "",
      columns: [
        {
          id: `col-${Date.now()}-1`,
          title: "MORNING",
          startTime: "08:00",
          endTime: "16:00",
          order: 1,
        },
        {
          id: `col-${Date.now()}-2`,
          title: "EVENING",
          startTime: "16:00",
          endTime: "00:00",
          order: 2,
        },
        {
          id: `col-${Date.now()}-3`,
          title: "NIGHT",
          startTime: "00:00",
          endTime: "08:00",
          order: 3,
        },
      ],
      dutyAreas: [
        { id: `da-${Date.now()}-1`, name: "ICU", order: 1 },
        { id: `da-${Date.now()}-2`, name: "EMERGENCY", order: 2 },
        { id: `da-${Date.now()}-3`, name: "OPD", order: 3 },
        { id: `da-${Date.now()}-4`, name: "OT", order: 4 },
      ],
      isActive: true,
    });
    setTemplateModalOpen(true);
  };

  const handleOpenEditTemplate = (t) => {
    setEditingTemplate(t);
    setTemplateForm({
      name: t.name || "",
      description: t.description || "",
      columns: Array.isArray(t.columns) ? t.columns.map((c) => ({ ...c })) : [],
      dutyAreas: Array.isArray(t.dutyAreas)
        ? t.dutyAreas.map((d) => ({ ...d }))
        : [],
      isActive: t.isActive !== false,
    });
    setTemplateModalOpen(true);
  };

  const handleSaveTemplate = async () => {
    if (!templateForm.name.trim()) {
      showToast("Template name is required", "warning");
      return;
    }
    try {
      setLoading(true);
      if (editingTemplate) {
        await rosterService.updateTemplate(editingTemplate._id, templateForm);
        showToast("Template updated successfully", "success");
      } else {
        await rosterService.createTemplate(templateForm);
        showToast("Template created successfully", "success");
      }
      setTemplateModalOpen(false);
      fetchTemplates();
    } catch (err) {
      showToast(
        err.response?.data?.message || "Failed to save template",
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDuplicateTemplate = async (tId) => {
    try {
      setLoading(true);
      await rosterService.duplicateTemplate(tId);
      showToast("Template duplicated successfully", "success");
      fetchTemplates();
    } catch (err) {
      showToast(
        err.response?.data?.message || "Failed to duplicate template",
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleToggleTemplateStatus = async (t) => {
    try {
      setLoading(true);
      if (t.isActive) {
        await rosterService.deactivateTemplate(t._id);
        showToast(
          `Template "${t.name}" deactivated (unavailable for new rosters)`,
          "info",
        );
      } else {
        await rosterService.updateTemplate(t._id, { isActive: true });
        showToast(`Template "${t.name}" activated`, "success");
      }
      fetchTemplates();
    } catch (err) {
      showToast(
        err.response?.data?.message || "Failed to update template status",
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  // --- PDF Generation ---
  const handleDownloadPDF = async () => {
    if (!activeRoster) return;
    try {
      setDownloading(true);
      showToast("Generating official hospital PDF layout...", "info");
      await generateFrontendRosterPDF(activeRoster);
      showToast("Roster PDF downloaded successfully!", "success");
    } catch (err) {
      console.error("PDF Generation error:", err);
      showToast("Failed to generate PDF download", "error");
    } finally {
      setDownloading(false);
    }
  };

  // --- Staff Assignment Flow (Single & Date Range) ---
  const handleOpenAddAssignment = (dutyAreaName, shiftCol) => {
    if (!activeRosterDate) {
      showToast("Please select a date first", "warning");
      return;
    }
    setAssignmentTarget({
      dutyArea: dutyAreaName,
      shift: shiftCol,
      editingAssignment: null,
    });
    setAssignmentMode("range");
    setAssignmentForm({
      employeeId: "",
      date: activeRosterDate,
      columnId: shiftCol.id || shiftCol._id,
      shiftTitle: shiftCol.title,
      startTime: shiftCol.startTime || "08:00",
      endTime: shiftCol.endTime || "16:00",
      dutyArea: dutyAreaName,
      notes: "",
    });
    setRangeForm({
      startDate: activeRoster?.startDate
        ? getTodayDateStr(activeRoster.startDate)
        : activeRosterDate,
      endDate: activeRoster?.endDate
        ? getTodayDateStr(activeRoster.endDate)
        : activeRosterDate,
    });
    setLeaveWarning(null);
    setAssignmentModalOpen(true);
  };

  const handleOpenEditAssignment = (ass) => {
    setAssignmentTarget({
      dutyArea: ass.dutyArea,
      shift: {
        id: ass.columnId,
        title: ass.shiftTitle,
        startTime: ass.startTime,
        endTime: ass.endTime,
      },
      editingAssignment: ass,
    });
    setAssignmentMode("single");
    setAssignmentForm({
      employeeId: ass.employeeId?._id || ass.employeeId || "",
      date: getTodayDateStr(ass.date),
      columnId: ass.columnId,
      shiftTitle: ass.shiftTitle,
      startTime: ass.startTime || "08:00",
      endTime: ass.endTime || "16:00",
      dutyArea: ass.dutyArea,
      notes: ass.notes || "",
    });
    setLeaveWarning(null);
    setAssignmentModalOpen(true);
  };

  const handleSaveAssignment = async (
    overwriteConflicts = false,
    skipLeaveCheck = false,
  ) => {
    if (!assignmentForm.employeeId) {
      showToast("Please select an employee", "warning");
      return;
    }

    const proceedWithSave = async () => {
      const saveProc = async () => {
        try {
          setLoading(true);

          if (assignmentTarget.editingAssignment) {
            // Edit existing single date assignment -> marks isOverride: true
            await rosterService.updateAssignment(
              activeRoster._id,
              assignmentTarget.editingAssignment._id,
              {
                employeeId: assignmentForm.employeeId,
                startTime: assignmentForm.startTime,
                endTime: assignmentForm.endTime,
                notes: assignmentForm.notes,
              },
            );
            showToast(
              "Assignment updated successfully (single date override)",
              "success",
            );
          } else if (assignmentMode === "range") {
            // Bulk Range Assignment
            const payload = {
              employeeId: assignmentForm.employeeId,
              startDate: rangeForm.startDate,
              endDate: rangeForm.endDate,
              columnId: assignmentForm.columnId,
              shiftTitle: assignmentForm.shiftTitle,
              startTime: assignmentForm.startTime,
              endTime: assignmentForm.endTime,
              dutyArea: assignmentForm.dutyArea,
              notes: assignmentForm.notes || null,
              overwriteConflicts,
            };
            const res = await rosterService.addBulkRangeAssignment(
              activeRoster._id,
              payload,
            );
            showToast(
              `Range duty assigned successfully (${res.data?.count || "multiple"} days)`,
              "success",
            );
          } else {
            // Single Date Assignment
            await rosterService.addAssignment(activeRoster._id, assignmentForm);
            showToast("Staff assigned to duty shift", "success");
          }

          setAssignmentModalOpen(false);
          setConflictPrompt({
            open: false,
            message: "",
            existingAssignments: [],
          });
          handleOpenRosterDetails(activeRoster._id);
          fetchRosters();
        } catch (err) {
          if (
            err.response?.status === 409 &&
            err.response?.data?.existingAssignments
          ) {
            // Open conflict handling confirmation
            setConflictPrompt({
              open: true,
              message:
                err.response.data.message ||
                "Some dates in this range already have assignments.",
              existingAssignments: err.response.data.existingAssignments,
            });
          } else if (
            err.response?.status === 409 &&
            (err.response?.data?.code === "LEAVE_CONFLICT" ||
              err.response?.data?.details?.approvedLeaveConflicts)
          ) {
            const details = err.response.data.details || {};
            const blockedDates =
              details.approvedLeaveConflicts ||
              (details.blockedDate
                ? [{ date: details.blockedDate, leaveType: details.leaveType }]
                : []);
            const selectedEmp = activeEmployees.find(
              (e) => String(e._id) === String(assignmentForm.employeeId),
            );
            setAssignmentModalOpen(false);
            setLeaveConflictPrompt({
              open: true,
              employeeName: selectedEmp
                ? `${selectedEmp.firstName} ${selectedEmp.lastName}`
                : details.employeeName || "This employee",
              conflictingDates: blockedDates,
              allDatesBlocked: true,
              onContinue: null,
            });
          } else {
            showToast(
              err.response?.data?.message || "Failed to save duty assignment",
              "error",
            );
          }
        } finally {
          setLoading(false);
        }
      };

      if (activeRoster && activeRoster.status === "PUBLISHED") {
        setPublishEditConfirm({
          open: true,
          pendingAction: saveProc,
        });
      } else {
        await saveProc();
      }
    };

    // Pre-check leave conflicts using authoritative backend check
    if (!skipLeaveCheck) {
      try {
        setLoading(true);
        const isRange =
          assignmentMode === "range" && !assignmentTarget.editingAssignment;
        const rawStart = isRange
          ? rangeForm.startDate
          : assignmentForm.date || activeRoster?.startDate;
        const rawEnd = isRange
          ? rangeForm.endDate
          : assignmentForm.date || activeRoster?.startDate;
        const startDate = rawStart ? getTodayDateStr(rawStart) : "";
        const endDate = rawEnd ? getTodayDateStr(rawEnd) : "";

        if (startDate && endDate) {
          const checkRes = await rosterService.checkLeaveConflicts(
            activeRoster._id,
            {
              employeeId: assignmentForm.employeeId,
              startDate,
              endDate,
            },
          );

          const hasConflict =
            checkRes?.hasConflict || checkRes?.data?.hasConflict;
          if (hasConflict) {
            const conflictingDates =
              checkRes?.conflictingDates ||
              checkRes?.data?.conflictingDates ||
              [];
            const allDatesBlocked =
              checkRes?.allDatesBlocked ??
              checkRes?.data?.allDatesBlocked ??
              false;
            const selectedEmp = activeEmployees.find(
              (e) => String(e._id) === String(assignmentForm.employeeId),
            );
            const empName = selectedEmp
              ? `${selectedEmp.firstName} ${selectedEmp.lastName}`
              : checkRes?.employeeName || "This employee";

            setAssignmentModalOpen(false);
            setLeaveConflictPrompt({
              open: true,
              employeeName: empName,
              conflictingDates,
              allDatesBlocked,
              onContinue: () => handleSaveAssignment(overwriteConflicts, true),
            });
            setLoading(false);
            return;
          }
        }
      } catch (checkErr) {
        console.warn("Pre-assignment leave check warning:", checkErr);
      } finally {
        setLoading(false);
      }
    }

    await proceedWithSave();
  };

  const handleOpenRemoveDutyModal = (ass) => {
    setRemoveDutyModal({
      open: true,
      assignment: ass,
      scope: "THIS_DATE",
    });
  };

  const handleConfirmRemoveDuty = async () => {
    const { assignment, scope } = removeDutyModal;
    if (!assignment) return;
    setRemoveDutyModal((prev) => ({ ...prev, open: false }));
    await handleDeleteAssignment(assignment._id, scope);
  };

  const handleDeleteAssignment = async (assignmentId, scope = "THIS_DATE") => {
    const deleteProc = async () => {
      try {
        setLoading(true);
        await rosterService.removeAssignment(
          activeRoster._id,
          assignmentId,
          scope,
        );
        showToast(
          scope === "FROM_DATE_TO_ROSTER_END" ||
            scope === "ALL_APPLICABLE_DATES"
            ? "Duty removed for all applicable dates"
            : "Duty assignment removed",
          "success",
        );
        handleOpenRosterDetails(activeRoster._id);
        fetchRosters();
      } catch (err) {
        showToast(
          err.response?.data?.message || "Failed to delete assignment",
          "error",
        );
      } finally {
        setLoading(false);
      }
    };

    if (activeRoster.status === "PUBLISHED") {
      setPublishEditConfirm({
        open: true,
        pendingAction: deleteProc,
      });
    } else {
      await deleteProc();
    }
  };

  // --- Publish Roster ---
  const handlePublishRoster = async (rosterId) => {
    try {
      setLoading(true);
      await rosterService.publishRoster(rosterId);
      showToast(
        "Roster published successfully! Changes are visible to all employees.",
        "success",
      );
      if (activeRoster && activeRoster._id === rosterId) {
        handleOpenRosterDetails(rosterId);
      }
      fetchRosters();
    } catch (err) {
      showToast(
        err.response?.data?.message || "Failed to publish roster",
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  // --- Review Sharing ---
  const handleSaveShareReview = async () => {
    try {
      setLoading(true);
      await rosterService.shareRosterForReview(
        activeRoster._id,
        selectedReviewerIds,
      );
      showToast("Roster shared for review successfully", "success");
      setShareModalOpen(false);
      handleOpenRosterDetails(activeRoster._id);
    } catch (err) {
      showToast(
        err.response?.data?.message || "Failed to share roster for review",
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  // --- Review Feedback Comment ---
  const handleAddComment = async () => {
    if (!newCommentText.trim()) return;
    try {
      setLoading(true);
      await rosterService.addReviewComment(activeRoster._id, newCommentText);
      showToast("Feedback comment added", "success");
      setNewCommentText("");
      handleOpenRosterDetails(activeRoster._id);
    } catch (err) {
      showToast(
        err.response?.data?.message || "Failed to post comment",
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResolveComment = async (commentId) => {
    try {
      setLoading(true);
      await rosterService.resolveReviewComment(activeRoster._id, commentId);
      showToast("Comment marked resolved", "success");
      handleOpenRosterDetails(activeRoster._id);
    } catch (err) {
      showToast(
        err.response?.data?.message || "Failed to resolve comment",
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  // --- Delete Roster ---
  const handleConfirmDelete = async () => {
    const { type, id } = deleteConfirm;
    try {
      setLoading(true);
      if (type === "roster") {
        await rosterService.deleteRoster(id);
        showToast("Draft Roster deleted", "info");
        if (activeRoster && activeRoster._id === id) {
          setActiveRoster(null);
        }
        fetchRosters();
      } else if (type === "template") {
        await rosterService.deleteTemplate(id);
        showToast("Roster Template deleted permanently", "info");
        fetchTemplates();
      }
      setDeleteConfirm({ open: false, type: "", id: "", title: "" });
    } catch (err) {
      showToast(err.response?.data?.message || "Delete failed", "error");
    } finally {
      setLoading(false);
    }
  };

  // Computed Date Range for Active Roster Matrix
  const activeRosterDates = useMemo(() => {
    if (!activeRoster?.startDate || !activeRoster?.endDate) return [];
    const list = [];
    const start = parseLocalDateStr(activeRoster.startDate);
    const end = parseLocalDateStr(activeRoster.endDate);
    if (!start || !end) return [];
    const cur = new Date(
      start.getFullYear(),
      start.getMonth(),
      start.getDate(),
    );
    const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());
    while (cur <= endDay) {
      list.push(getTodayDateStr(cur));
      cur.setDate(cur.getDate() + 1);
    }
    return list;
  }, [activeRoster]);

  // Compute Assignments Map for active selected date in matrix view
  const assignmentsByCell = useMemo(() => {
    if (!activeRoster?.assignments || !activeRosterDate) return {};
    const map = {};
    activeRoster.assignments.forEach((ass) => {
      const assDate = getTodayDateStr(ass.date);
      if (assDate === activeRosterDate) {
        const key = `${ass.dutyArea}__${ass.shiftTitle}`;
        if (!map[key]) map[key] = [];
        map[key].push(ass);
      }
    });
    return map;
  }, [activeRoster, activeRosterDate]);

  // Transform My Roster into Calendar Events for UnifiedCalendar
  const myRosterCalendarEvents = useMemo(() => {
    const list =
      myRosterSubTab === "history"
        ? myHistoryAssignments
        : myCurrentAssignments;
    return list.map((ass) => ({
      id: ass.id || ass._id,
      title: `${ass.shiftTitle} (${formatTime12h(ass.startTime)} - ${formatTime12h(ass.endTime)}) - ${ass.dutyArea}`,
      startDate: ass.date,
      endDate: ass.date,
      type: "duty_roster",
      dutyArea: ass.dutyArea,
      shiftTitle: ass.shiftTitle,
      times: `${formatTime12h(ass.startTime)} to ${formatTime12h(ass.endTime)}`,
      status: "published",
    }));
  }, [myRosterSubTab, myCurrentAssignments, myHistoryAssignments]);

  // Format Header Month & Year (e.g., SEPTEMBER 2026)
  const headerMonthYearStr = useMemo(() => {
    if (!activeRoster?.startDate) return "DUTY ROSTER";
    const d = new Date(activeRoster.startDate);
    const month = d
      .toLocaleDateString("en-US", { month: "long" })
      .toUpperCase();
    const year = d.getFullYear();
    return `${month} (${year})`;
  }, [activeRoster]);

  // Format Header Period Range (e.g., 11/09/26 TO 20/09/26)
  const headerPeriodStr = useMemo(() => {
    if (!activeRoster?.startDate || !activeRoster?.endDate) return "";
    const formatD = (dStr) => {
      const d = new Date(dStr);
      const day = String(d.getDate()).padStart(2, "0");
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const year = String(d.getFullYear()).slice(-2);
      return `${day}/${month}/${year}`;
    };
    return `${formatD(activeRoster.startDate)} TO ${formatD(activeRoster.endDate)}`;
  }, [activeRoster]);

  const draftsList = useMemo(
    () => rosters.filter((r) => r.status === "DRAFT"),
    [rosters],
  );
  const publishedList = useMemo(
    () => rosters.filter((r) => r.status === "PUBLISHED"),
    [rosters],
  );

  const activePublishedRosters = useMemo(() => {
    const todayStr = getTodayDateStr();
    return rosters.filter((r) => {
      if (r.status !== "PUBLISHED") return false;
      const endIso = r.endDate ? getTodayDateStr(r.endDate) : "";
      return endIso >= todayStr;
    });
  }, [rosters]);

  const filteredReviewerEmployees = useMemo(() => {
    const q = reviewerSearch.toLowerCase().trim();
    if (!q) return activeEmployees;
    return activeEmployees.filter(
      (e) =>
        `${e.firstName} ${e.lastName}`.toLowerCase().includes(q) ||
        (e.employeeId && e.employeeId.toLowerCase().includes(q)),
    );
  }, [activeEmployees, reviewerSearch]);

  const selectedEmployeeInfo = useMemo(() => {
    if (!assignmentForm.employeeId) return null;
    return activeEmployees.find((e) => e._id === assignmentForm.employeeId);
  }, [activeEmployees, assignmentForm.employeeId]);

  if (initialLoading) {
    return (
      <AppLayout title="Hospital Duty Roster">
        <MainContentLoader />
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Hospital Duty Roster">
      <PageHeader
        title="Hospital Duty Roster"
        description="Hospital-wide duty planning, custom shift matrix layouts, and staff allocations."
        actions={
          canManage && (
            <Stack direction="row" spacing={1.5}>
              <Button
                variant="outlined"
                startIcon={<ScheduleRounded />}
                onClick={handleOpenNewTemplate}
                sx={{ borderRadius: 2 }}
              >
                Create Template
              </Button>
              <Button
                variant="contained"
                startIcon={<AddRounded />}
                onClick={handleOpenNewRoster}
                sx={{ borderRadius: 2 }}
              >
                Create Roster
              </Button>
            </Stack>
          )
        }
      />

      {/* Top Navigation Tabs */}
      <Paper sx={{ mb: 3, borderRadius: 2 }}>
        <Tabs
          value={activeTab}
          onChange={(e, val) => {
            setActiveTab(val);
            if (
              val === "published-matrix" &&
              publishedList.length > 0 &&
              (!activeRoster || activeRoster.isHistorical)
            ) {
              handleOpenRosterDetails(publishedList[0]._id);
            }
          }}
          indicatorColor="primary"
          textColor="primary"
          variant="scrollable"
          scrollButtons="auto"
        >
          {canViewWorkforce && (
            <Tab
              icon={<PublishRounded />}
              iconPosition="start"
              label="Current Roster"
              value="published-matrix"
            />
          )}
          {canManage && (
            <Tab
              icon={<EditOutlined />}
              iconPosition="start"
              label={`Draft Rosters (${draftsList.length})`}
              value="drafts"
            />
          )}
          {canViewWorkforce && (
            <Tab
              icon={<EventNoteRounded />}
              iconPosition="start"
              label={`Roster History (${historyRosters.length})`}
              value="history"
            />
          )}
          {canManage && (
            <Tab
              icon={<ScheduleRounded />}
              iconPosition="start"
              label={`Roster Templates (${templates.length})`}
              value="templates"
            />
          )}
          <Tab
            icon={<CalendarMonthRounded />}
            iconPosition="start"
            label="My Roster"
            value="my-roster"
          />
        </Tabs>
      </Paper>

      {/* ─── TAB 1: PUBLISHED ROSTER MATRIX ─── */}
      {activeTab === "published-matrix" && (
        <Box>
          {activeRoster ? (
            <Box>
              {/* SELECT ACTIVE ROSTER DROPDOWN FOR MULTIPLE ACTIVE ROSTERS */}
              {activePublishedRosters.length > 0 &&
                !activeRoster.isHistorical && (
                  <Paper
                    sx={{
                      p: 1.5,
                      px: 2,
                      mb: 2.5,
                      borderRadius: 2,
                      border: "1px solid #CBD5E1",
                      bgcolor: "#F8FAFC",
                    }}
                  >
                    <Stack
                      direction="row"
                      spacing={2}
                      alignItems="center"
                      sx={{ flexWrap: "wrap" }}
                    >
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        fontWeight="800"
                        sx={{ letterSpacing: 0.5 }}
                      >
                        SELECT ACTIVE ROSTER:
                      </Typography>
                      <FormControl size="small" sx={{ minWidth: 320 }}>
                        <Select
                          value={activeRoster?._id || ""}
                          onChange={(e) =>
                            handleOpenRosterDetails(e.target.value)
                          }
                          sx={{
                            bgcolor: "#FFFFFF",
                            fontWeight: 700,
                            fontSize: "0.875rem",
                          }}
                        >
                          {activePublishedRosters.map((r) => (
                            <MenuItem key={r._id} value={r._id}>
                              <Typography variant="body2" fontWeight="700">
                                {r.title} ({formatDate(r.startDate)} -{" "}
                                {formatDate(r.endDate)})
                              </Typography>
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Stack>
                  </Paper>
                )}

              {/* REAL HOSPITAL ROSTER HEADER BANNER */}
              <Paper
                elevation={1}
                sx={{
                  p: 3,
                  mb: 3,
                  borderRadius: 2,
                  border: "2px solid #000000",
                  bgcolor: "#FFFFFF",
                  textAlign: "center",
                }}
              >
                <Typography
                  variant="h4"
                  fontWeight="900"
                  sx={{ letterSpacing: 1.5, color: "#000000" }}
                >
                  {headerMonthYearStr}
                </Typography>
                <Typography
                  variant="h6"
                  fontWeight="700"
                  sx={{ mt: 0.5, color: "#333333" }}
                >
                  {headerPeriodStr}
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 0.5, fontWeight: 600 }}
                >
                  {activeRoster.title}
                </Typography>

                <Stack
                  direction="row"
                  sx={{
                    justifyContent: "space-between",
                    alignItems: "center",
                    mt: 2,
                    flexWrap: "wrap",
                    gap: 1,
                  }}
                >
                  {activeRoster.isHistorical ? (
                    <Chip
                      label="Historical / Published"
                      color="default"
                      variant="outlined"
                      sx={{ fontWeight: 700 }}
                    />
                  ) : (
                    <StatusBadge status={activeRoster.status} />
                  )}

                  <Stack direction="row" spacing={1}>
                    {activeRoster.comments?.length > 0 && (
                      <Button
                        size="small"
                        variant="outlined"
                        color="info"
                        startIcon={<CommentOutlined />}
                        onClick={() => setFeedbackModalOpen(true)}
                      >
                        Feedback Comments ({activeRoster.comments.length})
                      </Button>
                    )}

                    {canManage && !activeRoster.isHistorical && (
                      <>
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<ShareOutlined />}
                          onClick={() => setShareModalOpen(true)}
                        >
                          Share for Review
                        </Button>
                        <Button
                          size="small"
                          variant="contained"
                          color="primary"
                          startIcon={<EditOutlined />}
                          onClick={() => handleOpenEditRoster(activeRoster)}
                        >
                          Edit Roster Layout
                        </Button>
                        {activeRoster.status === "DRAFT" && (
                          <Button
                            size="small"
                            variant="outlined"
                            color="error"
                            startIcon={<DeleteOutlineRounded />}
                            onClick={() =>
                              setDeleteConfirm({
                                open: true,
                                type: "roster",
                                id: activeRoster._id,
                                title: activeRoster.title,
                                description:
                                  "This draft roster and its assignments will be permanently deleted. This action cannot be undone.",
                              })
                            }
                          >
                            Delete Draft
                          </Button>
                        )}
                      </>
                    )}

                    {(activeRoster.status === "PUBLISHED" ||
                      activeRoster.isHistorical ||
                      canManage) && (
                      <Button
                        size="small"
                        variant="outlined"
                        color="success"
                        startIcon={<DownloadOutlined />}
                        onClick={handleDownloadPDF}
                        disabled={downloading}
                      >
                        {downloading ? "Downloading..." : "Download Roster"}
                      </Button>
                    )}
                  </Stack>
                </Stack>
              </Paper>

              {/* Date Navigator Bar */}
              <Paper
                sx={{
                  p: 1.25,
                  px: 2,
                  mb: 2.5,
                  borderRadius: 2,
                  border: "1px solid #E2E8F0",
                  bgcolor: "#F8FAFC",
                }}
              >
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    fontWeight="800"
                    sx={{ whiteSpace: "nowrap", letterSpacing: 0.5 }}
                  >
                    SELECT DATE:
                  </Typography>
                  <Stack
                    direction="row"
                    spacing={1}
                    sx={{ overflowX: "auto", py: 0.5 }}
                  >
                    {activeRosterDates.map((dStr) => {
                      const isSelected = activeRosterDate === dStr;
                      const dateObj = new Date(dStr);
                      const dayName = dateObj
                        .toLocaleDateString("en-US", { weekday: "short" })
                        .toUpperCase();
                      const formattedStr = dateObj.toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      });

                      return (
                        <Chip
                          key={dStr}
                          label={`${dayName} ${formattedStr}`}
                          color={isSelected ? "primary" : "default"}
                          variant={isSelected ? "filled" : "outlined"}
                          onClick={() => setActiveRosterDate(dStr)}
                          sx={{
                            fontWeight: 700,
                            fontSize: "0.75rem",
                            cursor: "pointer",
                          }}
                        />
                      );
                    })}
                  </Stack>
                </Stack>
              </Paper>

              {/* REAL HOSPITAL ROSTER MATRIX GRID */}
              {Array.isArray(activeRoster.columns) &&
              activeRoster.columns.length > 0 ? (
                <TableContainer
                  component={Paper}
                  sx={{
                    borderRadius: 2,
                    border: "2px solid #000000",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                    overflowX: "auto",
                    width: "100%",
                  }}
                >
                  <Table
                    sx={{
                      borderCollapse: "collapse",
                      width: "100%",
                      minWidth: Math.max(
                        850,
                        (activeRoster.columns.length || 4) * 160,
                      ),
                    }}
                  >
                    <TableHead>
                      <TableRow sx={{ bgcolor: "#F1F5F9" }}>
                        {activeRoster.columns.map((col) => (
                          <TableCell
                            key={col.id || col.title}
                            align="center"
                            sx={{
                              bgcolor: "#F1F5F9",
                              color: "#111827",
                              borderRight: "1px solid #CBD5E1",
                              borderBottom: "2px solid #000000",
                              py: 1.75,
                              px: 2,
                              minWidth: 160,
                              whiteSpace: "nowrap",
                            }}
                          >
                            <Typography
                              variant="subtitle1"
                              fontWeight="800"
                              sx={{
                                color: "#111827",
                                letterSpacing: 1,
                                textTransform: "uppercase",
                              }}
                            >
                              {col.title?.toUpperCase()}
                            </Typography>
                            <Typography
                              variant="caption"
                              sx={{
                                color: "#475569",
                                fontWeight: 600,
                                display: "block",
                                mt: 0.25,
                              }}
                            >
                              {formatTime12h(col.startTime)} TO{" "}
                              {formatTime12h(col.endTime)}
                            </Typography>
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {activeRoster.dutyAreas?.map((da) => (
                        <TableRow
                          key={da.id || da.name}
                          sx={{ borderBottom: "2px solid #000000" }}
                        >
                          {activeRoster.columns.map((col) => {
                            const cellKey = `${da.name}__${col.title}`;
                            const cellAssignments =
                              assignmentsByCell[cellKey] || [];

                            return (
                              <TableCell
                                key={col.id || col.title}
                                sx={{
                                  verticalAlign: "top",
                                  p: 2,
                                  width: `${100 / (activeRoster.columns.length || 1)}%`,
                                  borderRight: "1px solid #CBD5E1",
                                  bgcolor: "#FFFFFF",
                                }}
                              >
                                {/* DUTY AREA HEADING INSIDE EACH SHIFT CELL */}
                                <Box
                                  sx={{
                                    bgcolor: "#F1F5F9",
                                    p: 1,
                                    px: 1.25,
                                    mb: 1.5,
                                    borderRadius: 1,
                                    borderLeft: "4px solid #0F172A",
                                    border: "1px solid #CBD5E1",
                                    borderLeftWidth: "4px",
                                  }}
                                >
                                  <Typography
                                    variant="subtitle2"
                                    fontWeight="900"
                                    sx={{
                                      color: "#0F172A",
                                      letterSpacing: 0.5,
                                      textTransform: "uppercase",
                                      fontSize: "0.825rem",
                                    }}
                                  >
                                    {da.name?.toUpperCase()}
                                  </Typography>
                                </Box>

                                <Stack spacing={1}>
                                  {cellAssignments.map((ass) => {
                                    const emp = ass.employeeId;
                                    const rawFirstName = typeof emp === "object" ? emp?.firstName : "";
                                    const rawLastName = typeof emp === "object" ? emp?.lastName : "";
                                    const fullName = typeof emp === "object"
                                      ? `${rawFirstName || ""} ${rawLastName || ""}`.trim() || emp?.name || "UNKNOWN STAFF"
                                      : (typeof ass.fullName === "string" ? ass.fullName : "UNKNOWN STAFF");
                                    const phone = typeof emp === "object" ? (emp?.phone || emp?.mobile || null) : null;
                                    const avatarSrc = typeof emp === "object" ? (emp?.avatarUrl || emp?.avatar || emp?.profileImage || null) : null;
                                    const isCustomTime =
                                      ass.startTime !== col.startTime ||
                                      ass.endTime !== col.endTime;

                                    return (
                                      <Box
                                        key={ass._id}
                                        sx={{
                                          p: 1.25,
                                          borderLeft: ass.isOverride
                                            ? "4px solid #D97706"
                                            : "4px solid #0284C7",
                                          bgcolor: "#F8FAFC",
                                          border: "1px solid #E2E8F0",
                                          borderLeftWidth: "4px",
                                          borderRadius: 1,
                                          position: "relative",
                                        }}
                                      >
                                        <Stack
                                          direction="row"
                                          justifyContent="space-between"
                                          alignItems="flex-start"
                                          spacing={1}
                                        >
                                          <Stack
                                            direction="row"
                                            spacing={1}
                                            alignItems="flex-start"
                                            onClick={() =>
                                              canManage &&
                                              !activeRoster?.isHistorical &&
                                              handleOpenEditAssignment(ass)
                                            }
                                            sx={{
                                              cursor:
                                                canManage &&
                                                !activeRoster?.isHistorical
                                                  ? "pointer"
                                                  : "default",
                                              flexGrow: 1,
                                              minWidth: 0,
                                            }}
                                          >
                                            <InitialsAvatar
                                              name={fullName}
                                              src={avatarSrc}
                                              size={32}
                                              sx={{
                                                bgcolor: "#252525",
                                                color: "#FFFFFF",
                                                mt: 0.25,
                                              }}
                                            />
                                            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                                              <Stack
                                                direction="row"
                                                spacing={0.5}
                                                alignItems="center"
                                              >
                                                <Typography
                                                  variant="body2"
                                                  fontWeight="800"
                                                  noWrap
                                                  sx={{ color: "#0F172A" }}
                                                >
                                                  {fullName}
                                                </Typography>
                                                {ass.isOverride && (
                                                  <Chip
                                                    label="Override"
                                                    size="small"
                                                    color="warning"
                                                    sx={{
                                                      height: 16,
                                                      fontSize: "0.625rem",
                                                      fontWeight: 700,
                                                    }}
                                                  />
                                                )}
                                              </Stack>
                                              {phone && String(phone).trim() && (
                                                <Stack
                                                  direction="row"
                                                  spacing={0.5}
                                                  alignItems="center"
                                                  sx={{ mt: 0.25 }}
                                                >
                                                  <PhoneOutlined
                                                    sx={{ fontSize: "0.75rem", color: "text.secondary" }}
                                                  />
                                                  <Typography
                                                    variant="caption"
                                                    noWrap
                                                    sx={{
                                                      color: "text.secondary",
                                                      fontWeight: 600,
                                                      fontSize: "0.75rem",
                                                      lineHeight: 1.2,
                                                    }}
                                                  >
                                                    {String(phone).trim()}
                                                  </Typography>
                                                </Stack>
                                              )}
                                              {isCustomTime && (
                                                <Typography
                                                  variant="caption"
                                                  fontWeight="700"
                                                  color="primary"
                                                  sx={{ display: "block", mt: 0.25 }}
                                                >
                                                  {formatTime12h(ass.startTime)}{" "}
                                                  TO {formatTime12h(ass.endTime)}
                                                </Typography>
                                              )}
                                              {ass.notes && (
                                                <Typography
                                                  variant="caption"
                                                  color="text.secondary"
                                                  sx={{
                                                    display: "block",
                                                    fontStyle: "italic",
                                                    mt: 0.25,
                                                  }}
                                                >
                                                  Note: {ass.notes}
                                                </Typography>
                                              )}
                                            </Box>
                                          </Stack>

                                          {canManage &&
                                            !activeRoster?.isHistorical && (
                                              <IconButton
                                                size="small"
                                                color="error"
                                                onClick={() =>
                                                  handleOpenRemoveDutyModal(ass)
                                                }
                                                sx={{ p: 0.25, ml: 0.5, flexShrink: 0 }}
                                              >
                                                <CloseRounded fontSize="small" />
                                              </IconButton>
                                            )}
                                        </Stack>
                                      </Box>
                                    );
                                  })}

                                  {cellAssignments.length === 0 && (
                                    <Typography
                                      variant="caption"
                                      color="text.secondary"
                                      sx={{
                                        fontStyle: "italic",
                                        display: "block",
                                        py: 0.5,
                                      }}
                                    >
                                      No Staff Assigned
                                    </Typography>
                                  )}

                                  {canManage && !activeRoster?.isHistorical && (
                                    <Button
                                      size="small"
                                      variant="outlined"
                                      startIcon={
                                        <AddRounded fontSize="small" />
                                      }
                                      onClick={() =>
                                        handleOpenAddAssignment(da.name, col)
                                      }
                                      sx={{
                                        textTransform: "none",
                                        mt: 1,
                                        fontWeight: 700,
                                        width: "100%",
                                        justifyContent: "flex-start",
                                      }}
                                    >
                                      + Add Employee
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
                <Alert severity="warning">
                  Roster shift matrix definition not found.
                </Alert>
              )}
            </Box>
          ) : (
            <EmptyState
              icon={EventNoteRounded}
              title="No Roster Published Yet"
              description={
                canManage
                  ? "No published roster is active. Create a new roster draft and publish it when ready."
                  : "No published roster is available yet."
              }
              action={
                canManage && (
                  <Button
                    variant="contained"
                    startIcon={<AddRounded />}
                    onClick={handleOpenNewRoster}
                  >
                    Create Roster
                  </Button>
                )
              }
            />
          )}
        </Box>
      )}

      {/* ─── TAB 2: DRAFT ROSTERS ─── */}
      {activeTab === "drafts" && canManage && (
        <Grid container spacing={3}>
          {draftsList.length === 0 ? (
            <Grid xs={12}>
              <EmptyState
                icon={EditOutlined}
                title="No Active Draft Rosters"
                description="Create a new hospital duty roster draft."
                action={
                  <Button variant="contained" onClick={handleOpenNewRoster}>
                    Create Roster
                  </Button>
                }
              />
            </Grid>
          ) : (
            draftsList.map((r) => (
              <Grid xs={12} md={6} lg={4} key={r._id}>
                <GlassCard
                  sx={{
                    p: 3,
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="flex-start"
                    mb={2}
                  >
                    <Box>
                      <Typography variant="h6" fontWeight="bold">
                        {r.title}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Period: {new Date(r.startDate).toLocaleDateString()} to{" "}
                        {new Date(r.endDate).toLocaleDateString()}
                      </Typography>
                    </Box>
                    <StatusBadge status={r.status} />
                  </Stack>

                  <Typography variant="body2" color="text.secondary" mb={2}>
                    Assigned Entries:{" "}
                    <strong>{r.assignments?.length || 0}</strong> • Shared
                    Reviewers: <strong>{r.sharedWith?.length || 0}</strong>
                  </Typography>

                  <Stack spacing={1} sx={{ mt: "auto" }}>
                    <Button
                      variant="contained"
                      color="primary"
                      startIcon={<EditOutlined />}
                      onClick={() => {
                        handleOpenRosterDetails(r._id);
                        setActiveTab("published-matrix");
                      }}
                    >
                      Open Draft Matrix
                    </Button>
                    <Stack direction="row" spacing={1}>
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<EditOutlined />}
                        onClick={() => handleOpenEditRoster(r)}
                        fullWidth
                      >
                        Edit
                      </Button>
                      <Button
                        variant="outlined"
                        color="error"
                        size="small"
                        startIcon={<DeleteOutlineRounded />}
                        onClick={() =>
                          setDeleteConfirm({
                            open: true,
                            type: "roster",
                            id: r._id,
                            title: r.title,
                            description:
                              "This draft roster and its assignments will be permanently deleted. This action cannot be undone.",
                          })
                        }
                        fullWidth
                      >
                        Delete
                      </Button>
                    </Stack>
                    <Stack direction="row" spacing={1}>
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<ShareOutlined />}
                        onClick={() => {
                          setActiveRoster(r);
                          setSelectedReviewerIds(
                            r.sharedWith?.map((u) => u._id || u) || [],
                          );
                          setShareModalOpen(true);
                        }}
                        fullWidth
                      >
                        Share for Review
                      </Button>
                      <Button
                        variant="contained"
                        color="success"
                        size="small"
                        startIcon={<PublishRounded />}
                        onClick={() => handlePublishRoster(r._id)}
                        fullWidth
                      >
                        Publish
                      </Button>
                    </Stack>
                  </Stack>
                </GlassCard>
              </Grid>
            ))
          )}
        </Grid>
      )}

      {/* ─── TAB 3: ROSTER HISTORY ─── */}
      {activeTab === "history" && canViewWorkforce && (
        <Grid container spacing={3}>
          {historyRosters.length === 0 ? (
            <Grid xs={12}>
              <EmptyState
                icon={EventNoteRounded}
                title="No Previous Rosters Available"
                description="There are no previously published historical rosters."
              />
            </Grid>
          ) : (
            historyRosters.map((hr) => (
              <Grid xs={12} md={6} lg={4} key={hr._id}>
                <GlassCard
                  sx={{
                    p: 3,
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="flex-start"
                    mb={2}
                  >
                    <Box>
                      <Typography variant="h6" fontWeight="bold">
                        {hr.title}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Period: {new Date(hr.startDate).toLocaleDateString()} to{" "}
                        {new Date(hr.endDate).toLocaleDateString()}
                      </Typography>
                    </Box>
                    <Chip
                      label="Historical"
                      size="small"
                      variant="outlined"
                      color="default"
                    />
                  </Stack>

                  <Typography variant="body2" color="text.secondary" mb={2}>
                    Published:{" "}
                    <strong>
                      {hr.publishedAt
                        ? new Date(hr.publishedAt).toLocaleDateString()
                        : "Previous Period"}
                    </strong>
                  </Typography>

                  <Stack spacing={1} sx={{ mt: "auto" }}>
                    <Button
                      variant="contained"
                      color="primary"
                      startIcon={<VisibilityOutlined />}
                      onClick={() => {
                        handleOpenRosterDetails(hr._id);
                        setActiveTab("published-matrix");
                      }}
                    >
                      View
                    </Button>
                  </Stack>
                </GlassCard>
              </Grid>
            ))
          )}
        </Grid>
      )}

      {/* ─── TAB 4: ROSTER TEMPLATES ─── */}
      {activeTab === "templates" && canManage && (
        <Box>
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            mb={3}
          >
            <Box>
              <Typography variant="h6" fontWeight="bold">
                Reusable Roster Templates
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Create and manage reusable shift structures and duty area
                layouts.
              </Typography>
            </Box>
            <Button
              variant="contained"
              startIcon={<AddRounded />}
              onClick={handleOpenNewTemplate}
            >
              Create Template
            </Button>
          </Stack>

          {templates.length === 0 ? (
            <EmptyState
              icon={ScheduleRounded}
              title="No Roster Templates Created"
              description="Save time by creating reusable roster templates for ICU, Nursing, Emergency, etc."
              action={
                <Button
                  variant="contained"
                  startIcon={<AddRounded />}
                  onClick={handleOpenNewTemplate}
                >
                  Create Template
                </Button>
              }
            />
          ) : (
            <Grid container spacing={3}>
              {templates.map((t) => (
                <Grid xs={12} md={6} lg={4} key={t._id}>
                  <GlassCard
                    sx={{
                      p: 3,
                      height: "100%",
                      display: "flex",
                      flexDirection: "column",
                    }}
                  >
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      alignItems="flex-start"
                      mb={1.5}
                    >
                      <Box>
                        <Typography variant="h6" fontWeight="bold">
                          {t.name}
                        </Typography>
                        {t.description && (
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ display: "block", mt: 0.5 }}
                          >
                            {t.description}
                          </Typography>
                        )}
                      </Box>
                      <Chip
                        label={t.isActive ? "Active" : "Inactive"}
                        color={t.isActive ? "success" : "default"}
                        size="small"
                        sx={{ fontWeight: 700 }}
                      />
                    </Stack>

                    <Typography variant="body2" color="text.secondary" mb={2}>
                      Shift Columns: <strong>{t.columns?.length || 0}</strong> •
                      Duty Areas: <strong>{t.dutyAreas?.length || 0}</strong>
                    </Typography>

                    <Stack spacing={1} sx={{ mt: "auto" }}>
                      <Stack direction="row" spacing={1}>
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<EditOutlined />}
                          onClick={() => handleOpenEditTemplate(t)}
                          fullWidth
                        >
                          Edit
                        </Button>
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<CopyAllRounded />}
                          onClick={() => handleDuplicateTemplate(t._id)}
                          fullWidth
                        >
                          Copy
                        </Button>
                      </Stack>
                      <Stack direction="row" spacing={1}>
                        <Button
                          variant="contained"
                          color={t.isActive ? "warning" : "success"}
                          size="small"
                          startIcon={
                            t.isActive ? (
                              <ToggleOffRounded />
                            ) : (
                              <ToggleOnRounded />
                            )
                          }
                          onClick={() => handleToggleTemplateStatus(t)}
                          fullWidth
                        >
                          {t.isActive ? "Deactivate" : "Activate"}
                        </Button>
                        <Button
                          variant="outlined"
                          color="error"
                          size="small"
                          startIcon={<DeleteOutlineRounded />}
                          onClick={() =>
                            setDeleteConfirm({
                              open: true,
                              type: "template",
                              id: t._id,
                              title: t.name,
                              description: `Are you sure you want to delete template "${t.name}"?`,
                            })
                          }
                          fullWidth
                        >
                          Delete
                        </Button>
                      </Stack>
                    </Stack>
                  </GlassCard>
                </Grid>
              ))}
            </Grid>
          )}
        </Box>
      )}

      {/* ─── TAB 5: MY ROSTER (Employee Personal Schedule with Current / History) ─── */}
      {activeTab === "my-roster" && (
        <Paper sx={{ p: 3, borderRadius: 2 }}>
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            mb={2}
            sx={{ flexWrap: "wrap", gap: 1 }}
          >
            <Box>
              <Typography variant="h6" fontWeight="bold">
                My Duty Assignments
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Personal published shift schedule assigned by hospital
                management.
              </Typography>
            </Box>

            <Tabs
              value={myRosterSubTab}
              onChange={(e, val) => setMyRosterSubTab(val)}
              indicatorColor="primary"
              textColor="primary"
            >
              <Tab label="Current / Upcoming" value="current" />
              <Tab label="History (Past)" value="history" />
            </Tabs>
          </Stack>

          {(myRosterSubTab === "history"
            ? myHistoryAssignments
            : myCurrentAssignments
          ).length === 0 ? (
            <EmptyState
              icon={CalendarMonthRounded}
              title={
                myRosterSubTab === "current"
                  ? "No Current or Upcoming Duty Found"
                  : "No Past Duty History Found"
              }
              description={
                myRosterSubTab === "current"
                  ? "You have no upcoming duty shifts assigned."
                  : "No past published shifts were found."
              }
            />
          ) : (
            <Grid container spacing={3}>
              <Grid xs={12} md={7}>
                <Stack spacing={2}>
                  {(myRosterSubTab === "history"
                    ? myHistoryAssignments
                    : myCurrentAssignments
                  ).map((ass) => (
                    <Paper
                      key={ass.id || ass._id}
                      variant="outlined"
                      sx={{ p: 2, borderRadius: 2, borderColor: "#0284C7" }}
                    >
                      <Stack
                        direction="row"
                        justifyContent="space-between"
                        alignItems="center"
                      >
                        <Box>
                          <Typography
                            variant="subtitle1"
                            fontWeight="bold"
                            color="primary"
                          >
                            {new Date(ass.date).toLocaleDateString("en-US", {
                              weekday: "long",
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })}
                          </Typography>
                          <Stack
                            direction="row"
                            spacing={1}
                            alignItems="center"
                            mt={0.5}
                          >
                            <Chip
                              icon={<ScheduleRounded fontSize="small" />}
                              label={`${ass.shiftTitle} (${formatTime12h(ass.startTime)} - ${formatTime12h(ass.endTime)})`}
                              size="small"
                              color="primary"
                            />
                            <Chip
                              label={ass.dutyArea}
                              size="small"
                              variant="outlined"
                            />
                          </Stack>
                        </Box>
                      </Stack>
                    </Paper>
                  ))}
                </Stack>
              </Grid>
              <Grid xs={12} md={5}>
                <UnifiedCalendar
                  events={myRosterCalendarEvents}
                  initialView="month"
                />
              </Grid>
            </Grid>
          )}
        </Paper>
      )}

      {/* ─── MODAL 1: CREATE / EDIT ROSTER BUILDER (WITH TEMPLATE SELECTION) ─── */}
      <Modal
        open={rosterModalOpen}
        onClose={() => setRosterModalOpen(false)}
        title={
          editingRoster
            ? "Edit Roster Details & Layout"
            : "Create Hospital Roster"
        }
        maxWidth="md"
        actions={
          <>
            <Button
              onClick={() => setRosterModalOpen(false)}
              variant="outlined"
              color="inherit"
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleSaveRoster}
              disabled={loading}
            >
              {editingRoster ? "Save Changes" : "Create Draft Roster"}
            </Button>
          </>
        }
      >
        <Stack spacing={3} sx={{ pt: 1 }}>
          {!editingRoster && templates.length > 0 && (
            <FormControl fullWidth>
              <InputLabel>Use Template (Optional)</InputLabel>
              <Select
                value={rosterForm.templateId}
                label="Use Template (Optional)"
                onChange={(e) => handleSelectTemplateForRoster(e.target.value)}
              >
                <MenuItem value="">
                  <em>No Template (Custom Roster)</em>
                </MenuItem>
                {templates
                  .filter((t) => t.isActive)
                  .map((t) => (
                    <MenuItem key={t._id} value={t._id}>
                      {t.name} ({t.columns?.length || 0} Shifts,{" "}
                      {t.dutyAreas?.length || 0} Duty Areas)
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>
          )}

          <TextField
            label="Roster Title"
            value={rosterForm.title}
            onChange={(e) =>
              setRosterForm((p) => ({ ...p, title: e.target.value }))
            }
            placeholder="e.g. HOSPITAL NURSING ROSTER"
            fullWidth
            required
          />

          <Grid container spacing={2}>
            <Grid xs={6}>
              <TextField
                label="Start Date"
                type="date"
                fullWidth
                InputLabelProps={{ shrink: true }}
                value={rosterForm.startDate}
                onChange={(e) =>
                  setRosterForm((p) => ({ ...p, startDate: e.target.value }))
                }
                required
              />
            </Grid>
            <Grid xs={6}>
              <TextField
                label="End Date"
                type="date"
                fullWidth
                InputLabelProps={{ shrink: true }}
                value={rosterForm.endDate}
                onChange={(e) =>
                  setRosterForm((p) => ({ ...p, endDate: e.target.value }))
                }
                required
              />
            </Grid>
          </Grid>

          {/* Configurable Shift Columns */}
          <Box>
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              mb={1}
            >
              <Typography variant="subtitle1" fontWeight="bold">
                Configurable Shift Columns
              </Typography>
              <Button
                size="small"
                startIcon={<AddRounded />}
                onClick={() =>
                  setRosterForm((p) => ({
                    ...p,
                    columns: [
                      ...p.columns,
                      {
                        id: `col-${Date.now()}`,
                        title: `SHIFT ${p.columns.length + 1}`,
                        startTime: "08:00",
                        endTime: "16:00",
                        order: p.columns.length + 1,
                      },
                    ],
                  }))
                }
              >
                Add Shift
              </Button>
            </Stack>
            <Stack spacing={1.5}>
              {rosterForm.columns.map((col, idx) => (
                <Paper key={col.id} variant="outlined" sx={{ p: 1.5 }}>
                  <Grid container spacing={2} alignItems="center">
                    <Grid xs={12} sm={4}>
                      <TextField
                        label="Shift Title"
                        size="small"
                        fullWidth
                        value={col.title}
                        onChange={(e) => {
                          const cols = [...rosterForm.columns];
                          cols[idx].title = e.target.value.toUpperCase();
                          setRosterForm((p) => ({ ...p, columns: cols }));
                        }}
                      />
                    </Grid>
                    <Grid xs={5} sm={3}>
                      <TextField
                        label="Start Time"
                        type="time"
                        size="small"
                        fullWidth
                        InputLabelProps={{ shrink: true }}
                        value={col.startTime}
                        onChange={(e) => {
                          const cols = [...rosterForm.columns];
                          cols[idx].startTime = e.target.value;
                          setRosterForm((p) => ({ ...p, columns: cols }));
                        }}
                      />
                    </Grid>
                    <Grid xs={5} sm={3}>
                      <TextField
                        label="End Time"
                        type="time"
                        size="small"
                        fullWidth
                        InputLabelProps={{ shrink: true }}
                        value={col.endTime}
                        onChange={(e) => {
                          const cols = [...rosterForm.columns];
                          cols[idx].endTime = e.target.value;
                          setRosterForm((p) => ({ ...p, columns: cols }));
                        }}
                      />
                    </Grid>
                    <Grid xs={2} sm={2} align="right">
                      <IconButton
                        color="error"
                        size="small"
                        disabled={rosterForm.columns.length <= 1}
                        onClick={() =>
                          setRosterForm((p) => ({
                            ...p,
                            columns: p.columns.filter((c) => c.id !== col.id),
                          }))
                        }
                      >
                        <DeleteOutlineRounded fontSize="small" />
                      </IconButton>
                    </Grid>
                  </Grid>
                </Paper>
              ))}
            </Stack>
          </Box>

          {/* Configurable Duty Area Rows */}
          <Box>
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              mb={1}
            >
              <Typography variant="subtitle1" fontWeight="bold">
                Duty Area Rows
              </Typography>
              <Button
                size="small"
                startIcon={<AddRounded />}
                onClick={() =>
                  setRosterForm((p) => ({
                    ...p,
                    dutyAreas: [
                      ...p.dutyAreas,
                      {
                        id: `da-${Date.now()}`,
                        name: `DUTY AREA ${p.dutyAreas.length + 1}`,
                        order: p.dutyAreas.length + 1,
                      },
                    ],
                  }))
                }
              >
                Add Row
              </Button>
            </Stack>
            <Stack spacing={1.5}>
              {rosterForm.dutyAreas.map((da, idx) => (
                <Paper key={da.id} variant="outlined" sx={{ p: 1.5 }}>
                  <Grid container spacing={2} alignItems="center">
                    <Grid xs={10}>
                      <TextField
                        label="Duty Area Name"
                        size="small"
                        fullWidth
                        value={da.name}
                        onChange={(e) => {
                          const das = [...rosterForm.dutyAreas];
                          das[idx].name = e.target.value.toUpperCase();
                          setRosterForm((p) => ({ ...p, dutyAreas: das }));
                        }}
                      />
                    </Grid>
                    <Grid xs={2} align="right">
                      <IconButton
                        color="error"
                        size="small"
                        disabled={rosterForm.dutyAreas.length <= 1}
                        onClick={() =>
                          setRosterForm((p) => ({
                            ...p,
                            dutyAreas: p.dutyAreas.filter(
                              (d) => d.id !== da.id,
                            ),
                          }))
                        }
                      >
                        <DeleteOutlineRounded fontSize="small" />
                      </IconButton>
                    </Grid>
                  </Grid>
                </Paper>
              ))}
            </Stack>
          </Box>
        </Stack>
      </Modal>

      {/* ─── MODAL 2: CREATE / EDIT TEMPLATE ─── */}
      <Modal
        open={templateModalOpen}
        onClose={() => setTemplateModalOpen(false)}
        title={
          editingTemplate ? "Edit Roster Template" : "Create Roster Template"
        }
        maxWidth="md"
        actions={
          <>
            <Button
              onClick={() => setTemplateModalOpen(false)}
              variant="outlined"
              color="inherit"
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleSaveTemplate}
              disabled={loading}
            >
              {editingTemplate ? "Save Template" : "Create Template"}
            </Button>
          </>
        }
      >
        <Stack spacing={3} sx={{ pt: 1 }}>
          <TextField
            label="Template Name"
            value={templateForm.name}
            onChange={(e) =>
              setTemplateForm((p) => ({ ...p, name: e.target.value }))
            }
            placeholder="e.g. ICU 3 Shift Template"
            fullWidth
            required
          />

          <TextField
            label="Description (Optional)"
            value={templateForm.description}
            onChange={(e) =>
              setTemplateForm((p) => ({ ...p, description: e.target.value }))
            }
            placeholder="e.g. Standard 3-shift pattern for Intensive Care Unit"
            fullWidth
          />

          {/* Shift Columns Config */}
          <Box>
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              mb={1}
            >
              <Typography variant="subtitle1" fontWeight="bold">
                Template Shift Columns
              </Typography>
              <Button
                size="small"
                startIcon={<AddRounded />}
                onClick={() =>
                  setTemplateForm((p) => ({
                    ...p,
                    columns: [
                      ...p.columns,
                      {
                        id: `col-${Date.now()}`,
                        title: `SHIFT ${p.columns.length + 1}`,
                        startTime: "08:00",
                        endTime: "16:00",
                        order: p.columns.length + 1,
                      },
                    ],
                  }))
                }
              >
                Add Shift
              </Button>
            </Stack>
            <Stack spacing={1.5}>
              {templateForm.columns.map((col, idx) => (
                <Paper key={col.id} variant="outlined" sx={{ p: 1.5 }}>
                  <Grid container spacing={2} alignItems="center">
                    <Grid xs={12} sm={4}>
                      <TextField
                        label="Shift Title"
                        size="small"
                        fullWidth
                        value={col.title}
                        onChange={(e) => {
                          const cols = [...templateForm.columns];
                          cols[idx].title = e.target.value.toUpperCase();
                          setTemplateForm((p) => ({ ...p, columns: cols }));
                        }}
                      />
                    </Grid>
                    <Grid xs={5} sm={3}>
                      <TextField
                        label="Start Time"
                        type="time"
                        size="small"
                        fullWidth
                        InputLabelProps={{ shrink: true }}
                        value={col.startTime}
                        onChange={(e) => {
                          const cols = [...templateForm.columns];
                          cols[idx].startTime = e.target.value;
                          setTemplateForm((p) => ({ ...p, columns: cols }));
                        }}
                      />
                    </Grid>
                    <Grid xs={5} sm={3}>
                      <TextField
                        label="End Time"
                        type="time"
                        size="small"
                        fullWidth
                        InputLabelProps={{ shrink: true }}
                        value={col.endTime}
                        onChange={(e) => {
                          const cols = [...templateForm.columns];
                          cols[idx].endTime = e.target.value;
                          setTemplateForm((p) => ({ ...p, columns: cols }));
                        }}
                      />
                    </Grid>
                    <Grid xs={2} sm={2} align="right">
                      <IconButton
                        color="error"
                        size="small"
                        disabled={templateForm.columns.length <= 1}
                        onClick={() =>
                          setTemplateForm((p) => ({
                            ...p,
                            columns: p.columns.filter((c) => c.id !== col.id),
                          }))
                        }
                      >
                        <DeleteOutlineRounded fontSize="small" />
                      </IconButton>
                    </Grid>
                  </Grid>
                </Paper>
              ))}
            </Stack>
          </Box>

          {/* Duty Areas Config */}
          <Box>
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              mb={1}
            >
              <Typography variant="subtitle1" fontWeight="bold">
                Template Duty Areas
              </Typography>
              <Button
                size="small"
                startIcon={<AddRounded />}
                onClick={() =>
                  setTemplateForm((p) => ({
                    ...p,
                    dutyAreas: [
                      ...p.dutyAreas,
                      {
                        id: `da-${Date.now()}`,
                        name: `DUTY AREA ${p.dutyAreas.length + 1}`,
                        order: p.dutyAreas.length + 1,
                      },
                    ],
                  }))
                }
              >
                Add Duty Area
              </Button>
            </Stack>
            <Stack spacing={1.5}>
              {templateForm.dutyAreas.map((da, idx) => (
                <Paper key={da.id} variant="outlined" sx={{ p: 1.5 }}>
                  <Grid container spacing={2} alignItems="center">
                    <Grid xs={10}>
                      <TextField
                        label="Duty Area Name"
                        size="small"
                        fullWidth
                        value={da.name}
                        onChange={(e) => {
                          const das = [...templateForm.dutyAreas];
                          das[idx].name = e.target.value.toUpperCase();
                          setTemplateForm((p) => ({ ...p, dutyAreas: das }));
                        }}
                      />
                    </Grid>
                    <Grid xs={2} align="right">
                      <IconButton
                        color="error"
                        size="small"
                        disabled={templateForm.dutyAreas.length <= 1}
                        onClick={() =>
                          setTemplateForm((p) => ({
                            ...p,
                            dutyAreas: p.dutyAreas.filter(
                              (d) => d.id !== da.id,
                            ),
                          }))
                        }
                      >
                        <DeleteOutlineRounded fontSize="small" />
                      </IconButton>
                    </Grid>
                  </Grid>
                </Paper>
              ))}
            </Stack>
          </Box>
        </Stack>
      </Modal>

      {/* ─── MODAL 3: ASSIGN STAFF (SINGLE OR RANGE) ─── */}
      <Modal
        open={assignmentModalOpen}
        onClose={() => setAssignmentModalOpen(false)}
        title={`Assign Staff to ${assignmentTarget.dutyArea}`}
        maxWidth="sm"
        actions={
          <>
            <Button
              onClick={() => setAssignmentModalOpen(false)}
              variant="outlined"
              color="inherit"
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={() => handleSaveAssignment(false)}
              disabled={loading}
            >
              {assignmentMode === "range" && !assignmentTarget.editingAssignment
                ? "Apply Range Duty"
                : "Assign Staff"}
            </Button>
          </>
        }
      >
        <Stack spacing={2.5} sx={{ pt: 1 }}>
          {!assignmentTarget.editingAssignment && (
            <Tabs
              value={assignmentMode}
              onChange={(e, val) => setAssignmentMode(val)}
              indicatorColor="primary"
              textColor="primary"
              variant="fullWidth"
            >
              <Tab label="Apply Date Range (Auto-Assign)" value="range" />
              <Tab label="Single Date Only" value="single" />
            </Tabs>
          )}

          <FormControl fullWidth required>
            <InputLabel>Select Employee / Nurse</InputLabel>
            <Select
              value={assignmentForm.employeeId}
              label="Select Employee / Nurse"
              onChange={(e) =>
                setAssignmentForm((p) => ({ ...p, employeeId: e.target.value }))
              }
            >
              {(Array.isArray(activeEmployees) ? activeEmployees : []).map(
                (emp) => (
                  <MenuItem key={emp._id} value={emp._id}>
                    {emp.firstName} {emp.lastName} ({emp.employeeId || "Staff"})
                    - {emp.positionId?.name || "Staff"}
                  </MenuItem>
                ),
              )}
            </Select>
          </FormControl>

          {assignmentMode === "range" &&
            !assignmentTarget.editingAssignment && (
              <Grid container spacing={2}>
                <Grid xs={6}>
                  <TextField
                    label="From Date"
                    type="date"
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                    value={rangeForm.startDate}
                    onChange={(e) =>
                      setRangeForm((p) => ({ ...p, startDate: e.target.value }))
                    }
                    required
                  />
                </Grid>
                <Grid xs={6}>
                  <TextField
                    label="To Date"
                    type="date"
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                    value={rangeForm.endDate}
                    onChange={(e) =>
                      setRangeForm((p) => ({ ...p, endDate: e.target.value }))
                    }
                    required
                  />
                </Grid>
              </Grid>
            )}

          <Grid container spacing={2}>
            <Grid xs={6}>
              <TextField
                label="Start Time"
                type="time"
                fullWidth
                InputLabelProps={{ shrink: true }}
                value={assignmentForm.startTime}
                onChange={(e) =>
                  setAssignmentForm((p) => ({
                    ...p,
                    startTime: e.target.value,
                  }))
                }
              />
            </Grid>
            <Grid xs={6}>
              <TextField
                label="End Time"
                type="time"
                fullWidth
                InputLabelProps={{ shrink: true }}
                value={assignmentForm.endTime}
                onChange={(e) =>
                  setAssignmentForm((p) => ({ ...p, endTime: e.target.value }))
                }
              />
            </Grid>
          </Grid>

          <TextField
            label="Notes (Optional)"
            value={assignmentForm.notes}
            onChange={(e) =>
              setAssignmentForm((p) => ({ ...p, notes: e.target.value }))
            }
            fullWidth
          />
        </Stack>
      </Modal>

      {/* CONFLICT CONFIRMATION MODAL FOR RANGE ASSIGNMENT */}
      <Dialog
        open={conflictPrompt.open}
        onClose={() =>
          setConflictPrompt({
            open: false,
            message: "",
            existingAssignments: [],
          })
        }
        slotProps={{
          backdrop: {
            onClick: () =>
              setConflictPrompt({
                open: false,
                message: "",
                existingAssignments: [],
              }),
          },
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            setConflictPrompt({
              open: false,
              message: "",
              existingAssignments: [],
            });
          }
        }}
      >
        <DialogTitle
          sx={{
            fontWeight: 800,
            color: "error.main",
            display: "flex",
            alignItems: "center",
            gap: 1,
          }}
        >
          <WarningAmberRounded color="error" /> Existing Assignment Conflict
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" mb={2}>
            {conflictPrompt.message}
          </Typography>
          <Paper
            variant="outlined"
            sx={{ p: 2, maxH: 180, overflowY: "auto", bgcolor: "#FEF2F2" }}
          >
            <Typography
              variant="subtitle2"
              fontWeight={700}
              color="error"
              gutterBottom
            >
              Conflicting Dates:
            </Typography>
            {conflictPrompt.existingAssignments?.map((item, i) => (
              <Typography
                key={i}
                variant="caption"
                sx={{ display: "block", color: "#991B1B", fontWeight: 600 }}
              >
                • {item.date ? getTodayDateStr(item.date) : item}:{" "}
                {item.shiftTitle || "Assigned"} in{" "}
                {item.dutyArea || "Duty Area"}
              </Typography>
            ))}
          </Paper>
          <Typography variant="body2" color="text.secondary" mt={2}>
            Choose whether to keep existing assignments or overwrite all
            conflicting dates with the new shift assignment.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() =>
              setConflictPrompt({
                open: false,
                message: "",
                existingAssignments: [],
              })
            }
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="warning"
            onClick={() => handleSaveAssignment(true)}
          >
            Overwrite Existing
          </Button>
        </DialogActions>
      </Dialog>

      {/* LEAVE CONFLICT CONFIRMATION MODAL */}
      <Dialog
        open={leaveConflictPrompt.open}
        onClose={() => {
          setLeaveConflictPrompt((prev) => ({
            ...prev,
            open: false,
            onContinue: null,
          }));
          setAssignmentModalOpen(true);
        }}
        maxWidth="xs"
        fullWidth
        slotProps={{
          backdrop: {
            onClick: () => {
              setLeaveConflictPrompt((prev) => ({
                ...prev,
                open: false,
                onContinue: null,
              }));
              setAssignmentModalOpen(true);
            },
          },
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            setLeaveConflictPrompt((prev) => ({
              ...prev,
              open: false,
              onContinue: null,
            }));
            setAssignmentModalOpen(true);
          }
        }}
        PaperProps={{
          sx: { borderRadius: "16px", p: 1 },
        }}
      >
        <DialogTitle
          sx={{
            fontWeight: 800,
            color: "#92400E",
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            pb: 1,
          }}
        >
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: "8px",
              backgroundColor: "#FEF3C7",
              color: "#D97706",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <WarningAmberRounded fontSize="small" />
          </Box>
          Leave Conflict
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography
              variant="body2"
              sx={{ color: "#1E293B", fontWeight: 600 }}
            >
              {leaveConflictPrompt.employeeName} is on leave on the following{" "}
              {leaveConflictPrompt.conflictingDates.length === 1
                ? "date"
                : "dates"}
              :
            </Typography>

            <Paper
              variant="outlined"
              sx={{
                p: 2,
                maxHeight: 180,
                overflowY: "auto",
                bgcolor: "#FFFBEB",
                borderColor: "#FDE68A",
              }}
            >
              <Stack spacing={0.75}>
                {leaveConflictPrompt.conflictingDates?.map((item, i) => {
                  const dateStr = typeof item === "string" ? item : item.date;
                  const formatted = dateStr
                    ? new Date(dateStr + "T12:00:00Z").toLocaleDateString(
                        "en-GB",
                        { day: "numeric", month: "long", year: "numeric" },
                      )
                    : dateStr;
                  return (
                    <Typography
                      key={i}
                      variant="body2"
                      sx={{ color: "#92400E", fontWeight: 600 }}
                    >
                      • {formatted}{" "}
                      {item.leaveType ? `(${item.leaveType})` : ""}
                    </Typography>
                  );
                })}
              </Stack>
            </Paper>

            <Typography variant="body2" sx={{ color: "#475569" }}>
              {leaveConflictPrompt.allDatesBlocked
                ? "All requested dates are approved leave dates. No duty assignments will be created."
                : `Duty will not be assigned on ${leaveConflictPrompt.conflictingDates.length === 1 ? "the leave date" : "these leave dates"}. The duty will be assigned on the remaining available dates.`}
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, pt: 1 }}>
          <Button
            variant="outlined"
            color="inherit"
            onClick={() => {
              setLeaveConflictPrompt((prev) => ({
                ...prev,
                open: false,
                onContinue: null,
              }));
              setAssignmentModalOpen(true);
            }}
            sx={{ textTransform: "none", borderRadius: "8px", fontWeight: 600 }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={() => {
              const action = leaveConflictPrompt.onContinue;
              setLeaveConflictPrompt((prev) => ({
                ...prev,
                open: false,
                onContinue: null,
              }));
              if (action) action();
            }}
            sx={{
              textTransform: "none",
              borderRadius: "8px",
              fontWeight: 700,
              px: 2.5,
            }}
          >
            Continue
          </Button>
        </DialogActions>
      </Dialog>

      {/* ─── MODAL 4: SHARE ROSTER FOR REVIEW ─── */}
      <Modal
        open={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        title="Share Roster for Review"
        maxWidth="sm"
        actions={
          <>
            <Button
              onClick={() => setShareModalOpen(false)}
              variant="outlined"
              color="inherit"
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleSaveShareReview}
              disabled={loading}
            >
              Share with Selected ({selectedReviewerIds.length})
            </Button>
          </>
        }
      >
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Select workforce employees who can review this draft roster and
            leave feedback comments.
          </Typography>

          <TextField
            size="small"
            placeholder="Search employee..."
            value={reviewerSearch}
            onChange={(e) => setReviewerSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchRounded fontSize="small" />
                </InputAdornment>
              ),
            }}
          />

          <Paper variant="outlined" sx={{ maxHeight: 260, overflowY: "auto" }}>
            <List size="small">
              {filteredReviewerEmployees.map((emp) => {
                const uId = emp.userId?._id || emp.userId || emp._id;
                const isChecked = selectedReviewerIds.includes(uId);

                return (
                  <ListItem
                    key={emp._id}
                    button
                    onClick={() => {
                      setSelectedReviewerIds((prev) =>
                        prev.includes(uId)
                          ? prev.filter((id) => id !== uId)
                          : [...prev, uId],
                      );
                    }}
                  >
                    <Checkbox
                      checked={isChecked}
                      edge="start"
                      tabIndex={-1}
                      disableRipple
                    />
                    <ListItemText
                      primary={`${emp.firstName} ${emp.lastName}`}
                      secondary={`${emp.employeeId || "Staff"} • ${emp.positionId?.name || "Position"}`}
                    />
                  </ListItem>
                );
              })}
            </List>
          </Paper>
        </Stack>
      </Modal>

      {/* ─── MODAL 5: REVIEW FEEDBACK COMMENTS ─── */}
      <Modal
        open={feedbackModalOpen}
        onClose={() => setFeedbackModalOpen(false)}
        title="Roster Review Feedback Comments"
        maxWidth="sm"
        actions={
          <>
            <Button
              onClick={() => setFeedbackModalOpen(false)}
              variant="outlined"
              color="inherit"
            >
              Close
            </Button>
            <Button
              variant="contained"
              onClick={handleAddComment}
              disabled={!newCommentText.trim()}
            >
              Post Comment
            </Button>
          </>
        }
      >
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Box sx={{ maxHeight: 260, overflowY: "auto" }}>
            {activeRoster?.comments?.length === 0 ? (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ fontStyle: "italic", py: 2, textAlign: "center" }}
              >
                No feedback comments yet.
              </Typography>
            ) : (
              <Stack spacing={1.5}>
                {activeRoster?.comments?.map((c) => (
                  <Paper
                    key={c._id}
                    variant="outlined"
                    sx={{ p: 1.5, bgcolor: c.resolved ? "#F0FDF4" : "#F8FAFC" }}
                  >
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      alignItems="flex-start"
                    >
                      <Box>
                        <Typography variant="subtitle2" fontWeight="bold">
                          {c.userId?.name || "Reviewer"}
                        </Typography>
                        <Typography variant="body2">{c.comment}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(c.createdAt).toLocaleString()}
                        </Typography>
                      </Box>
                      {canManage && !c.resolved && (
                        <Button
                          size="small"
                          startIcon={<CheckRounded />}
                          onClick={() => handleResolveComment(c._id)}
                        >
                          Resolve
                        </Button>
                      )}
                      {c.resolved && (
                        <Chip
                          label="Resolved"
                          size="small"
                          color="success"
                          sx={{ height: 20 }}
                        />
                      )}
                    </Stack>
                  </Paper>
                ))}
              </Stack>
            )}
          </Box>

          <Divider />

          <Typography variant="subtitle2" fontWeight="bold">
            Add Review Feedback:
          </Typography>
          <TextField
            placeholder="e.g. Please change Nurse A from NICU morning to PICU morning on 15 Sep."
            value={newCommentText}
            onChange={(e) => setNewCommentText(e.target.value)}
            multiline
            rows={2}
            fullWidth
          />
        </Stack>
      </Modal>

      {/* Confirmation Dialog for Editing Published Roster */}
      <ConfirmDialog
        open={publishEditConfirm.open}
        title="Update Published Roster?"
        description="This roster is already published. Any modifications to shift assignments will be visible to employees immediately."
        confirmText="Update Roster"
        onConfirm={() => {
          const act = publishEditConfirm.pendingAction;
          setPublishEditConfirm({ open: false, pendingAction: null });
          if (act) act();
        }}
        onClose={() =>
          setPublishEditConfirm({ open: false, pendingAction: null })
        }
      />

      {/* Global Delete Confirmation */}
      <ConfirmDialog
        open={deleteConfirm.open}
        title="Delete Draft Roster?"
        description="This draft roster and its assignments will be permanently deleted. This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        danger={true}
        onConfirm={handleConfirmDelete}
        onClose={() =>
          setDeleteConfirm({
            open: false,
            type: "",
            id: "",
            title: "",
            description: "",
          })
        }
      />

      {/* Duty Removal Confirmation Modal */}
      <Dialog
        open={removeDutyModal.open}
        onClose={() => setRemoveDutyModal((prev) => ({ ...prev, open: false }))}
        maxWidth="xs"
        fullWidth
        slotProps={{
          backdrop: {
            onClick: () =>
              setRemoveDutyModal((prev) => ({ ...prev, open: false })),
          },
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            setRemoveDutyModal((prev) => ({ ...prev, open: false }));
          }
        }}
        PaperProps={{
          sx: { borderRadius: "16px", p: 1 },
        }}
      >
        <DialogTitle
          sx={{ fontWeight: 800, color: "#0F172A", fontSize: "1.25rem", pb: 1 }}
        >
          Remove Duty
        </DialogTitle>
        <DialogContent>
          {removeDutyModal.assignment && (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <Box
                sx={{
                  backgroundColor: "#F8FAFC",
                  border: "1px solid #E2E8F0",
                  borderRadius: "10px",
                  p: 2,
                }}
              >
                <Typography
                  variant="subtitle2"
                  sx={{ fontWeight: 700, color: "#0F172A" }}
                >
                  {removeDutyModal.assignment.employeeId?.name ||
                    removeDutyModal.assignment.employeeName ||
                    "Employee"}
                </Typography>
                <Typography variant="body2" sx={{ color: "#475569", mt: 0.5 }}>
                  <strong>Duty:</strong> {removeDutyModal.assignment.shiftTitle}{" "}
                  → {removeDutyModal.assignment.dutyArea}
                </Typography>
                <Typography variant="body2" sx={{ color: "#475569", mt: 0.25 }}>
                  <strong>Date:</strong>{" "}
                  {removeDutyModal.assignment.date
                    ? new Date(
                        removeDutyModal.assignment.date,
                      ).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })
                    : "—"}
                </Typography>
              </Box>

              <Typography
                variant="body2"
                sx={{ fontWeight: 600, color: "#1E293B" }}
              >
                How would you like to remove this duty?
              </Typography>

              <RadioGroup
                value={removeDutyModal.scope}
                onChange={(e) =>
                  setRemoveDutyModal((prev) => ({
                    ...prev,
                    scope: e.target.value,
                  }))
                }
              >
                <FormControlLabel
                  value="THIS_DATE"
                  control={<Radio size="small" color="primary" />}
                  label={
                    <Typography
                      variant="body2"
                      sx={{ fontWeight: 500, color: "#0F172A" }}
                    >
                      This date only
                    </Typography>
                  }
                />
                <FormControlLabel
                  value="ALL_APPLICABLE_DATES"
                  control={<Radio size="small" color="primary" />}
                  label={
                    <Typography
                      variant="body2"
                      sx={{ fontWeight: 500, color: "#0F172A" }}
                    >
                      This duty for all applicable dates
                    </Typography>
                  }
                />
              </RadioGroup>
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, pt: 1 }}>
          <Button
            variant="outlined"
            onClick={() =>
              setRemoveDutyModal((prev) => ({ ...prev, open: false }))
            }
            sx={{ textTransform: "none", borderRadius: "8px", fontWeight: 600 }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleConfirmRemoveDuty}
            sx={{
              textTransform: "none",
              borderRadius: "8px",
              fontWeight: 700,
              px: 2.5,
            }}
          >
            Remove Duty
          </Button>
        </DialogActions>
      </Dialog>
    </AppLayout>
  );
}
