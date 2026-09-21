import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  ButtonGroup,
  Card,
  CardContent,
  Chip,
  Divider,
  FormControl,
  Grid,
  IconButton,
  InputAdornment,
  InputLabel,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  Skeleton,
  Snackbar,
  Stack,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  ArrowBackIosNewRounded,
  ArrowForwardIosRounded,
  AssignmentTurnedInRounded,
  BlockRounded,
  CheckCircleOutlineRounded,
  CheckCircleRounded,
  DashboardCustomizeRounded,
  EditNoteRounded,
  FilterAltRounded,
  FormatListBulletedRounded,
  HourglassEmptyRounded,
  HourglassTopRounded,
  LayersRounded,
  MoreHorizRounded,
  PendingActionsRounded,
  RadioButtonUncheckedRounded,
  RefreshRounded,
  SearchRounded,
  ViewKanbanRounded,
} from '@mui/icons-material';
import coreProgressService from '../../services/coreProgress.service';
import AppLayout from '../../components/AppLayout';
import PageHeader from '../../components/PageHeader';
import StatCard from '../../components/StatCard';
import StatusBadge from '../../components/StatusBadge';
import GlassCard from '../../components/GlassCard';
import Modal from '../../components/Modal';
import EmptyState from '../../components/EmptyState';
import ErrorState from '../../components/ErrorState';

const KANBAN_COLUMNS = [
  {
    id: 'NOT_STARTED',
    label: 'Not Started',
    icon: RadioButtonUncheckedRounded,
    color: '#64748b',
    headerBg: 'rgba(100, 116, 139, 0.08)',
    badgeBg: 'rgba(100, 116, 139, 0.18)',
    borderTopColor: '#94a3b8',
    symbol: '⬜',
  },
  {
    id: 'IN_PROGRESS',
    label: 'In Progress',
    icon: HourglassTopRounded,
    color: '#f59e0b',
    headerBg: 'rgba(245, 158, 11, 0.08)',
    badgeBg: 'rgba(245, 158, 11, 0.18)',
    borderTopColor: '#f59e0b',
    symbol: '🟡',
  },
  {
    id: 'DONE',
    label: 'Done',
    icon: CheckCircleRounded,
    color: '#10b981',
    headerBg: 'rgba(16, 185, 129, 0.08)',
    badgeBg: 'rgba(16, 185, 129, 0.18)',
    borderTopColor: '#10b981',
    symbol: '✅',
  },
  {
    id: 'BLOCKED',
    label: 'Blocked',
    icon: BlockRounded,
    color: '#ef4444',
    headerBg: 'rgba(239, 68, 68, 0.08)',
    badgeBg: 'rgba(239, 68, 68, 0.18)',
    borderTopColor: '#ef4444',
    symbol: '🔴',
  },
];

const MODULE_COLORS = {
  hospital_foundation: { bg: 'rgba(59, 130, 246, 0.1)', color: '#2563eb' },
  authentication: { bg: 'rgba(168, 85, 247, 0.1)', color: '#9333ea' },
  users: { bg: 'rgba(14, 165, 233, 0.1)', color: '#0284c7' },
  roles: { bg: 'rgba(236, 72, 153, 0.1)', color: '#db2777' },
  permissions: { bg: 'rgba(249, 115, 22, 0.1)', color: '#ea580c' },
  hospital_structure: { bg: 'rgba(16, 185, 129, 0.1)', color: '#059669' },
  module_foundation: { bg: 'rgba(99, 102, 241, 0.1)', color: '#4f46e5' },
};

const FeatureDetailModal = ({ open, feature, onClose, onSuccess }) => {
  const [status, setStatus] = useState('NOT_STARTED');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open && feature) {
      setStatus(feature.status || 'NOT_STARTED');
      setNotes(feature.notes || '');
      setError('');
      setSubmitting(false);
    }
  }, [open, feature]);

  const handleSubmit = async () => {
    if (!feature) return;
    try {
      setSubmitting(true);
      setError('');
      const res = await coreProgressService.updateCoreProgressFeature(feature._id, {
        status,
        notes: notes.trim(),
      });
      onSuccess('Progress updated successfully.', res?.data?.data);
      onClose();
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to update feature progress.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!feature) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`${feature.moduleName} → ${feature.featureName}`}
      description={feature.description || 'Update implementation status and progress notes.'}
      submitLabel="Save Changes"
      submittingLabel="Saving..."
      onSubmit={handleSubmit}
      submitting={submitting}
      error={error}
      startIcon={EditNoteRounded}
    >
      <Stack spacing={2.5}>
        <FormControl fullWidth required>
          <InputLabel id="feature-status-label">Implementation Status</InputLabel>
          <Select
            labelId="feature-status-label"
            value={status}
            label="Implementation Status"
            onChange={(e) => setStatus(e.target.value)}
          >
            <MenuItem value="NOT_STARTED">
              <Stack direction="row" spacing={1} alignItems="center">
                <Box component="span" sx={{ fontSize: '1rem' }}>⬜</Box>
                <Typography variant="body2" fontWeight={600}>Not Started</Typography>
              </Stack>
            </MenuItem>
            <MenuItem value="IN_PROGRESS">
              <Stack direction="row" spacing={1} alignItems="center">
                <Box component="span" sx={{ fontSize: '1rem' }}>🟡</Box>
                <Typography variant="body2" fontWeight={600} color="warning.main">In Progress</Typography>
              </Stack>
            </MenuItem>
            <MenuItem value="DONE">
              <Stack direction="row" spacing={1} alignItems="center">
                <Box component="span" sx={{ fontSize: '1rem' }}>✅</Box>
                <Typography variant="body2" fontWeight={600} color="success.main">Done</Typography>
              </Stack>
            </MenuItem>
            <MenuItem value="BLOCKED">
              <Stack direction="row" spacing={1} alignItems="center">
                <Box component="span" sx={{ fontSize: '1rem' }}>🔴</Box>
                <Typography variant="body2" fontWeight={600} color="error.main">Blocked</Typography>
              </Stack>
            </MenuItem>
          </Select>
        </FormControl>

        <TextField
          label="Implementation Notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          multiline
          minRows={3}
          maxRows={6}
          placeholder="e.g. Verified endpoints, UI components connected, unit tests passing..."
          helperText="Persistent technical notes stored directly in MongoDB."
          fullWidth
        />

        {feature.updatedAt && (
          <Paper
            variant="outlined"
            sx={{
              p: 1.5,
              borderRadius: 1.5,
              bgcolor: (t) => (t.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : '#f8fafc'),
            }}
          >
            <Typography variant="caption" color="text.secondary">
              Last Updated:{' '}
              <strong>{new Date(feature.updatedAt).toLocaleString()}</strong>
              {feature.updatedBy?.name ? ` by ${feature.updatedBy.name}` : ''}
            </Typography>
          </Paper>
        )}
      </Stack>
    </Modal>
  );
};

const KanbanCard = ({ feature, onClick, onQuickMove }) => {
  const modStyle = MODULE_COLORS[feature.moduleKey] || {
    bg: 'rgba(100, 116, 139, 0.1)',
    color: '#475569',
  };

  const currentStatusIndex = KANBAN_COLUMNS.findIndex((c) => c.id === feature.status);
  const canMoveLeft = currentStatusIndex > 0;
  const canMoveRight = currentStatusIndex < KANBAN_COLUMNS.length - 1;

  const handlePrev = (e) => {
    e.stopPropagation();
    if (canMoveLeft) {
      onQuickMove(feature, KANBAN_COLUMNS[currentStatusIndex - 1].id);
    }
  };

  const handleNext = (e) => {
    e.stopPropagation();
    if (canMoveRight) {
      onQuickMove(feature, KANBAN_COLUMNS[currentStatusIndex + 1].id);
    }
  };

  return (
    <Paper
      elevation={0}
      variant="outlined"
      onClick={onClick}
      sx={{
        p: 2,
        borderRadius: 2.5,
        bgcolor: (t) => (t.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : '#ffffff'),
        borderColor: 'divider',
        cursor: 'pointer',
        transition: 'all 0.2s ease-in-out',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        '&:hover': {
          transform: 'translateY(-2px)',
          borderColor: 'primary.main',
          boxShadow: (t) =>
            t.palette.mode === 'dark'
              ? '0 8px 24px rgba(0,0,0,0.45)'
              : '0 8px 20px rgba(0,0,0,0.07)',
        },
      }}
    >
      <Box>
        {/* Module Chip */}
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
          <Chip
            label={feature.moduleName}
            size="small"
            sx={{
              fontWeight: 700,
              fontSize: '0.68rem',
              height: 20,
              bgcolor: modStyle.bg,
              color: modStyle.color,
            }}
          />
          <Tooltip title="Click to view/edit details">
            <IconButton size="small" sx={{ p: 0.25 }} onClick={onClick}>
              <MoreHorizRounded fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>

        {/* Feature Title */}
        <Typography variant="subtitle2" fontWeight={750} sx={{ mb: 0.75, lineHeight: 1.35 }}>
          {feature.featureName}
        </Typography>

        {/* Description */}
        {feature.description && (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              lineHeight: 1.4,
              mb: 1.25,
            }}
          >
            {feature.description}
          </Typography>
        )}

        {/* Notes Preview */}
        {feature.notes && (
          <Paper
            variant="outlined"
            sx={{
              p: 1,
              borderRadius: 1.5,
              bgcolor: (t) => (t.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : '#f8fafc'),
              borderColor: 'divider',
              mb: 1.25,
            }}
          >
            <Typography
              variant="caption"
              color="text.primary"
              sx={{
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                fontStyle: 'italic',
                fontSize: '0.72rem',
              }}
            >
              "{feature.notes}"
            </Typography>
          </Paper>
        )}
      </Box>

      {/* Card Footer with Quick Move Buttons */}
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        sx={{ pt: 1, borderTop: 1, borderColor: 'divider', mt: 0.5 }}
      >
        <Stack direction="row" spacing={0.5}>
          {canMoveLeft && (
            <Tooltip title={`Move to ${KANBAN_COLUMNS[currentStatusIndex - 1].label}`}>
              <IconButton size="small" onClick={handlePrev} sx={{ p: 0.5 }}>
                <ArrowBackIosNewRounded sx={{ fontSize: '0.75rem' }} />
              </IconButton>
            </Tooltip>
          )}
          {canMoveRight && (
            <Tooltip title={`Move to ${KANBAN_COLUMNS[currentStatusIndex + 1].label}`}>
              <IconButton size="small" onClick={handleNext} sx={{ p: 0.5 }}>
                <ArrowForwardIosRounded sx={{ fontSize: '0.75rem' }} />
              </IconButton>
            </Tooltip>
          )}
        </Stack>

        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.68rem', fontWeight: 600 }}>
          {feature.updatedAt ? new Date(feature.updatedAt).toLocaleDateString() : 'Initial'}
        </Typography>
      </Stack>
    </Paper>
  );
};

const CoreProgressPage = () => {
  const [data, setData] = useState({ modules: [], summary: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // View mode: 'kanban' or 'list'
  const [viewMode, setViewMode] = useState('kanban');

  // Filters
  const [selectedModule, setSelectedModule] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected feature modal
  const [selectedFeature, setSelectedFeature] = useState(null);

  // Toast
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await coreProgressService.getCoreProgress();
      setData(res?.data?.data || { modules: [], summary: null });
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to load Core Progress data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Quick move status handler from Kanban board card arrows
  const handleQuickMove = async (feature, newStatus) => {
    try {
      const res = await coreProgressService.updateCoreProgressFeature(feature._id, {
        status: newStatus,
      });
      handleFeatureUpdated(`Moved to ${newStatus.replace('_', ' ')}`, res?.data?.data);
    } catch (err) {
      setSnackbar({
        open: true,
        message: err?.response?.data?.message || 'Failed to move card.',
        severity: 'error',
      });
    }
  };

  const handleFeatureUpdated = (msg, updatedFeature) => {
    setSnackbar({ open: true, message: msg, severity: 'success' });
    if (!updatedFeature) {
      fetchData();
      return;
    }

    setData((prev) => {
      const newModules = prev.modules.map((mod) => {
        if (mod.moduleKey !== updatedFeature.moduleKey) return mod;

        const newFeatures = mod.features.map((f) =>
          f._id === updatedFeature._id ? { ...f, ...updatedFeature } : f,
        );

        let completed = 0;
        let inProgress = 0;
        let notStarted = 0;
        let blocked = 0;

        newFeatures.forEach((f) => {
          if (f.status === 'DONE') completed++;
          else if (f.status === 'IN_PROGRESS') inProgress++;
          else if (f.status === 'BLOCKED') blocked++;
          else notStarted++;
        });

        const total = newFeatures.length;
        const completionPercentage = total > 0 ? Math.round((completed / total) * 100) : 0;

        return {
          ...mod,
          features: newFeatures,
          completed,
          inProgress,
          notStarted,
          blocked,
          completionPercentage,
        };
      });

      let overallCompleted = 0;
      let overallInProgress = 0;
      let overallNotStarted = 0;
      let overallBlocked = 0;
      let totalFeatures = 0;

      newModules.forEach((m) => {
        overallCompleted += m.completed;
        overallInProgress += m.inProgress;
        overallNotStarted += m.notStarted;
        overallBlocked += m.blocked;
        totalFeatures += m.features.length;
      });

      const overallPercentage =
        totalFeatures > 0 ? Math.round((overallCompleted / totalFeatures) * 100) : 0;

      return {
        modules: newModules,
        summary: {
          totalFeatures,
          completed: overallCompleted,
          inProgress: overallInProgress,
          notStarted: overallNotStarted,
          blocked: overallBlocked,
          completionPercentage: overallPercentage,
        },
      };
    });
  };

  // Flattened features matching search & module filter
  const filteredFeatures = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const all = [];

    data.modules.forEach((mod) => {
      if (selectedModule !== 'ALL' && mod.moduleKey !== selectedModule) {
        return;
      }

      mod.features.forEach((f) => {
        const matchesQuery =
          !query ||
          f.featureName.toLowerCase().includes(query) ||
          f.description.toLowerCase().includes(query) ||
          (f.notes && f.notes.toLowerCase().includes(query)) ||
          mod.moduleName.toLowerCase().includes(query);

        if (matchesQuery) {
          all.push({ ...f, moduleName: mod.moduleName, moduleKey: mod.moduleKey });
        }
      });
    });

    return all;
  }, [data.modules, selectedModule, searchQuery]);

  // Group filtered features into Kanban columns
  const kanbanColumns = useMemo(() => {
    const cols = {
      NOT_STARTED: [],
      IN_PROGRESS: [],
      DONE: [],
      BLOCKED: [],
    };

    filteredFeatures.forEach((f) => {
      if (cols[f.status]) {
        cols[f.status].push(f);
      } else {
        cols.NOT_STARTED.push(f);
      }
    });

    return cols;
  }, [filteredFeatures]);

  const summary = data.summary || {
    totalFeatures: 0,
    completed: 0,
    inProgress: 0,
    notStarted: 0,
    blocked: 0,
    completionPercentage: 0,
  };

  return (
    <AppLayout>
      <Stack spacing={3}>
        <PageHeader
          title="Core Progress"
          subtitle="Interactive Kanban tracking checklist for the Vardhan Core Platform (Super Admin only)."
          action={
            <Stack direction="row" spacing={1.5}>
              {/* View Switcher */}
              <ButtonGroup size="small" variant="outlined" sx={{ bgcolor: 'background.paper' }}>
                <Button
                  variant={viewMode === 'kanban' ? 'contained' : 'outlined'}
                  startIcon={<ViewKanbanRounded />}
                  onClick={() => setViewMode('kanban')}
                  sx={{ fontWeight: 600, textTransform: 'none' }}
                >
                  Kanban Board
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'contained' : 'outlined'}
                  startIcon={<FormatListBulletedRounded />}
                  onClick={() => setViewMode('list')}
                  sx={{ fontWeight: 600, textTransform: 'none' }}
                >
                  Module List
                </Button>
              </ButtonGroup>

              <Button
                variant="outlined"
                startIcon={<RefreshRounded />}
                onClick={fetchData}
                disabled={loading}
                sx={{ fontWeight: 600 }}
              >
                Refresh
              </Button>
            </Stack>
          }
        />

        {/* Summary Stat Cards */}
        <Grid container spacing={2.5}>
          <Grid item xs={12} sm={6} md={2.4}>
            <GlassCard sx={{ p: 2.5, height: '100%' }}>
              <Typography variant="caption" fontWeight={700} color="text.secondary" textTransform="uppercase">
                Overall Progress
              </Typography>
              <Typography variant="h3" fontWeight={800} color="primary.main" sx={{ my: 0.5 }}>
                {loading ? '…' : `${summary.completionPercentage}%`}
              </Typography>
              <LinearProgress
                variant="determinate"
                value={summary.completionPercentage}
                sx={{ height: 8, borderRadius: 4, my: 1 }}
              />
              <Typography variant="caption" color="text.secondary" fontWeight={600}>
                {summary.completed} / {summary.totalFeatures} completed
              </Typography>
            </GlassCard>
          </Grid>

          <Grid item xs={6} sm={6} md={2.4}>
            <StatCard
              title="Completed"
              value={loading ? '…' : summary.completed}
              icon={CheckCircleRounded}
              color="success"
            />
          </Grid>

          <Grid item xs={6} sm={6} md={2.4}>
            <StatCard
              title="In Progress"
              value={loading ? '…' : summary.inProgress}
              icon={HourglassTopRounded}
              color="warning"
            />
          </Grid>

          <Grid item xs={6} sm={6} md={2.4}>
            <StatCard
              title="Not Started"
              value={loading ? '…' : summary.notStarted}
              icon={RadioButtonUncheckedRounded}
              color="primary"
            />
          </Grid>

          <Grid item xs={6} sm={6} md={2.4}>
            <StatCard
              title="Blocked"
              value={loading ? '…' : summary.blocked}
              icon={BlockRounded}
              color="error"
            />
          </Grid>
        </Grid>

        {/* Filter Controls Bar */}
        <GlassCard sx={{ p: 2 }}>
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={2}
            justifyContent="space-between"
            alignItems={{ xs: 'stretch', md: 'center' }}
          >
            {/* Module Filter Dropdown */}
            <FormControl size="small" sx={{ minWidth: 240 }}>
              <InputLabel id="filter-module-label">Filter by Module</InputLabel>
              <Select
                labelId="filter-module-label"
                value={selectedModule}
                label="Filter by Module"
                onChange={(e) => setSelectedModule(e.target.value)}
              >
                <MenuItem value="ALL">
                  <em>All Core Modules ({data.modules.length})</em>
                </MenuItem>
                {data.modules.map((m) => (
                  <MenuItem key={m.moduleKey} value={m.moduleKey}>
                    {m.moduleName} ({m.completed}/{m.totalFeatures})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Keyword Search Input */}
            <TextField
              size="small"
              placeholder="Search features by name, notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchRounded fontSize="small" color="action" />
                  </InputAdornment>
                ),
              }}
              sx={{ minWidth: 280 }}
            />
          </Stack>
        </GlassCard>

        {error && <ErrorState message={error} onRetry={fetchData} />}

        {loading ? (
          <Grid container spacing={2}>
            {KANBAN_COLUMNS.map((col) => (
              <Grid item xs={12} sm={6} md={3} key={col.id}>
                <Skeleton variant="rounded" height={450} />
              </Grid>
            ))}
          </Grid>
        ) : filteredFeatures.length === 0 ? (
          <EmptyState
            icon={AssignmentTurnedInRounded}
            title="No Features Match Your Filter"
            description="Try changing your search query or selected module."
            actionLabel="Reset Filters"
            onAction={() => {
              setSelectedModule('ALL');
              setSearchQuery('');
            }}
          />
        ) : viewMode === 'kanban' ? (
          /* ========================================================== */
          /* KANBAN BOARD VIEW */
          /* ========================================================== */
          <Box sx={{ overflowX: 'auto', pb: 2 }}>
            <Grid container spacing={2.5} sx={{ minWidth: { md: 1000 } }}>
              {KANBAN_COLUMNS.map((col) => {
                const cards = kanbanColumns[col.id] || [];
                const ColIcon = col.icon;

                return (
                  <Grid item xs={12} sm={6} md={3} key={col.id}>
                    <Paper
                      elevation={0}
                      variant="outlined"
                      sx={{
                        borderRadius: 3,
                        bgcolor: (t) =>
                          t.palette.mode === 'dark' ? 'rgba(255,255,255,0.015)' : '#f8fafc',
                        borderColor: 'divider',
                        borderTop: `4px solid ${col.borderTopColor}`,
                        display: 'flex',
                        flexDirection: 'column',
                        height: '100%',
                        minHeight: 520,
                      }}
                    >
                      {/* Column Header */}
                      <Box
                        sx={{
                          p: 2,
                          bgcolor: col.headerBg,
                          borderBottom: 1,
                          borderColor: 'divider',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <Stack direction="row" spacing={1} alignItems="center">
                          <ColIcon sx={{ color: col.color, fontSize: '1.25rem' }} />
                          <Typography variant="subtitle2" fontWeight={800} color="text.primary">
                            {col.label}
                          </Typography>
                        </Stack>

                        <Chip
                          label={cards.length}
                          size="small"
                          sx={{
                            fontWeight: 800,
                            fontSize: '0.75rem',
                            height: 22,
                            bgcolor: col.badgeBg,
                            color: col.color,
                          }}
                        />
                      </Box>

                      {/* Cards Container */}
                      <Stack
                        spacing={1.75}
                        sx={{
                          p: 1.75,
                          flexGrow: 1,
                          overflowY: 'auto',
                          maxHeight: 'calc(100vh - 380px)',
                        }}
                      >
                        {cards.length === 0 ? (
                          <Box
                            sx={{
                              p: 4,
                              textAlign: 'center',
                              border: '1.5px dashed',
                              borderColor: 'divider',
                              borderRadius: 2,
                              color: 'text.secondary',
                            }}
                          >
                            <Typography variant="caption" fontWeight={600}>
                              No features in this column
                            </Typography>
                          </Box>
                        ) : (
                          cards.map((f) => (
                            <KanbanCard
                              key={f._id}
                              feature={f}
                              onClick={() => setSelectedFeature(f)}
                              onQuickMove={handleQuickMove}
                            />
                          ))
                        )}
                      </Stack>
                    </Paper>
                  </Grid>
                );
              })}
            </Grid>
          </Box>
        ) : (
          /* ========================================================== */
          /* MODULE LIST VIEW */
          /* ========================================================== */
          <Stack spacing={3}>
            {data.modules
              .filter((m) => selectedModule === 'ALL' || m.moduleKey === selectedModule)
              .map((mod) => (
                <GlassCard key={mod.moduleKey} sx={{ p: 3 }}>
                  <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={1.5}
                    justifyContent="space-between"
                    alignItems={{ xs: 'flex-start', sm: 'center' }}
                    sx={{ mb: 2 }}
                  >
                    <Box>
                      <Typography variant="h6" fontWeight={800} color="text.primary">
                        {mod.moduleName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" fontWeight={600}>
                        {mod.completed} / {mod.totalFeatures} completed
                      </Typography>
                    </Box>

                    <Stack direction="row" spacing={2} alignItems="center" sx={{ width: { xs: '100%', sm: 'auto' } }}>
                      <Box sx={{ width: { xs: 120, sm: 160 } }}>
                        <LinearProgress
                          variant="determinate"
                          value={mod.completionPercentage}
                          sx={{
                            height: 8,
                            borderRadius: 4,
                            bgcolor: (t) => (t.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : '#e2e8f0'),
                            '& .MuiLinearProgress-bar': {
                              bgcolor:
                                mod.completionPercentage === 100
                                  ? '#10b981'
                                  : mod.completionPercentage > 50
                                  ? 'primary.main'
                                  : '#f59e0b',
                            },
                          }}
                        />
                      </Box>
                      <Chip
                        label={`${mod.completionPercentage}%`}
                        size="small"
                        sx={{
                          fontWeight: 700,
                          bgcolor:
                            mod.completionPercentage === 100
                              ? 'rgba(16, 185, 129, 0.15)'
                              : 'rgba(14, 165, 233, 0.15)',
                          color:
                            mod.completionPercentage === 100 ? '#10b981' : 'primary.main',
                        }}
                      />
                    </Stack>
                  </Stack>

                  <Divider sx={{ mb: 2.5 }} />

                  <Grid container spacing={2}>
                    {mod.features
                      .filter((f) => {
                        const query = searchQuery.trim().toLowerCase();
                        return (
                          !query ||
                          f.featureName.toLowerCase().includes(query) ||
                          f.description.toLowerCase().includes(query) ||
                          (f.notes && f.notes.toLowerCase().includes(query))
                        );
                      })
                      .map((f) => (
                        <Grid item xs={12} sm={6} md={4} key={f._id}>
                          <KanbanCard
                            feature={{ ...f, moduleName: mod.moduleName, moduleKey: mod.moduleKey }}
                            onClick={() => setSelectedFeature({ ...f, moduleName: mod.moduleName, moduleKey: mod.moduleKey })}
                            onQuickMove={handleQuickMove}
                          />
                        </Grid>
                      ))}
                  </Grid>
                </GlassCard>
              ))}
          </Stack>
        )}
      </Stack>

      {/* Feature Detail / Edit Modal */}
      <FeatureDetailModal
        open={Boolean(selectedFeature)}
        feature={selectedFeature}
        onClose={() => setSelectedFeature(null)}
        onSuccess={handleFeatureUpdated}
      />

      {/* Toast Notification */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3500}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
          sx={{ width: '100%', boxShadow: 3 }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </AppLayout>
  );
};

export default CoreProgressPage;
