import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
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
  AssignmentTurnedInRounded,
  BlockRounded,
  CheckCircleOutlineRounded,
  CheckCircleRounded,
  EditNoteRounded,
  FilterListRounded,
  HourglassEmptyRounded,
  HourglassTopRounded,
  LayersRounded,
  PendingActionsRounded,
  RadioButtonUncheckedRounded,
  RefreshRounded,
  SearchRounded,
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

const STATUS_CONFIG = {
  DONE: {
    label: 'Done',
    badge: 'success',
    icon: CheckCircleRounded,
    color: '#10b981',
    bgColor: 'rgba(16, 185, 129, 0.12)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
    symbol: '✅',
  },
  IN_PROGRESS: {
    label: 'In Progress',
    badge: 'warning',
    icon: HourglassTopRounded,
    color: '#f59e0b',
    bgColor: 'rgba(245, 158, 11, 0.12)',
    borderColor: 'rgba(245, 158, 11, 0.3)',
    symbol: '🟡',
  },
  NOT_STARTED: {
    label: 'Not Started',
    badge: 'default',
    icon: RadioButtonUncheckedRounded,
    color: '#64748b',
    bgColor: 'rgba(100, 116, 139, 0.10)',
    borderColor: 'rgba(100, 116, 139, 0.25)',
    symbol: '⬜',
  },
  BLOCKED: {
    label: 'Blocked',
    badge: 'error',
    icon: BlockRounded,
    color: '#ef4444',
    bgColor: 'rgba(239, 68, 68, 0.12)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
    symbol: '🔴',
  },
};

const FeatureUpdateModal = ({ open, feature, onClose, onSuccess }) => {
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

const CoreProgressPage = () => {
  const [data, setData] = useState({ modules: [], summary: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters state
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Edit modal
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

  const handleFeatureUpdated = (msg, updatedFeature) => {
    setSnackbar({ open: true, message: msg, severity: 'success' });
    if (!updatedFeature) {
      fetchData();
      return;
    }

    // Optimistically update feature in state & recalculate summary
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

  // Filtered modules and features
  const filteredModules = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return data.modules
      .map((mod) => {
        const matchingFeatures = mod.features.filter((f) => {
          const matchesStatus =
            statusFilter === 'ALL' || f.status === statusFilter;
          const matchesSearch =
            !query ||
            f.featureName.toLowerCase().includes(query) ||
            f.description.toLowerCase().includes(query) ||
            (f.notes && f.notes.toLowerCase().includes(query)) ||
            mod.moduleName.toLowerCase().includes(query);

          return matchesStatus && matchesSearch;
        });

        return {
          ...mod,
          filteredFeatures: matchingFeatures,
        };
      })
      .filter((mod) => mod.filteredFeatures.length > 0);
  }, [data.modules, statusFilter, searchQuery]);

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
          subtitle="Track implementation progress of the Vardhan Core Platform."
          action={
            <Button
              variant="outlined"
              startIcon={<RefreshRounded />}
              onClick={fetchData}
              disabled={loading}
              sx={{ fontWeight: 600 }}
            >
              Refresh
            </Button>
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

        {/* Filters Row */}
        <GlassCard sx={{ p: 2 }}>
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={2}
            justifyContent="space-between"
            alignItems={{ xs: 'stretch', md: 'center' }}
          >
            <Tabs
              value={statusFilter}
              onChange={(_, val) => setStatusFilter(val)}
              variant="scrollable"
              scrollButtons="auto"
              sx={{ minHeight: 40 }}
            >
              <Tab value="ALL" label={`All (${summary.totalFeatures})`} sx={{ minHeight: 40, fontWeight: 600 }} />
              <Tab value="DONE" label={`Done (${summary.completed})`} sx={{ minHeight: 40, fontWeight: 600, color: '#10b981' }} />
              <Tab value="IN_PROGRESS" label={`In Progress (${summary.inProgress})`} sx={{ minHeight: 40, fontWeight: 600, color: '#f59e0b' }} />
              <Tab value="NOT_STARTED" label={`Not Started (${summary.notStarted})`} sx={{ minHeight: 40, fontWeight: 600 }} />
              <Tab value="BLOCKED" label={`Blocked (${summary.blocked})`} sx={{ minHeight: 40, fontWeight: 600, color: '#ef4444' }} />
            </Tabs>

            <TextField
              size="small"
              placeholder="Search features or modules..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchRounded fontSize="small" color="action" />
                  </InputAdornment>
                ),
              }}
              sx={{ minWidth: 260 }}
            />
          </Stack>
        </GlassCard>

        {error && <ErrorState message={error} onRetry={fetchData} />}

        {loading ? (
          <Stack spacing={2.5}>
            <Skeleton variant="rounded" height={160} />
            <Skeleton variant="rounded" height={160} />
            <Skeleton variant="rounded" height={160} />
          </Stack>
        ) : filteredModules.length === 0 ? (
          <EmptyState
            icon={AssignmentTurnedInRounded}
            title="No Matching Features Found"
            description="Try adjusting your status filter or search keywords."
            actionLabel="Reset Filters"
            onAction={() => {
              setStatusFilter('ALL');
              setSearchQuery('');
            }}
          />
        ) : (
          <Stack spacing={3}>
            {filteredModules.map((mod) => (
              <GlassCard key={mod.moduleKey} sx={{ p: 3 }}>
                {/* Module Header */}
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

                {/* Features Grid */}
                <Grid container spacing={2}>
                  {mod.filteredFeatures.map((feature) => {
                    const cfg = STATUS_CONFIG[feature.status] || STATUS_CONFIG.NOT_STARTED;
                    const StatusIcon = cfg.icon;

                    return (
                      <Grid item xs={12} sm={6} md={4} key={feature._id}>
                        <Paper
                          variant="outlined"
                          onClick={() => setSelectedFeature(feature)}
                          sx={{
                            p: 2,
                            borderRadius: 2.5,
                            height: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            cursor: 'pointer',
                            borderColor: 'divider',
                            bgcolor: (t) =>
                              t.palette.mode === 'dark' ? 'rgba(255,255,255,0.015)' : '#ffffff',
                            transition: 'all 0.15s ease-in-out',
                            '&:hover': {
                              transform: 'translateY(-2px)',
                              borderColor: 'primary.main',
                              boxShadow: (t) =>
                                t.palette.mode === 'dark'
                                  ? '0 6px 20px rgba(0,0,0,0.4)'
                                  : '0 6px 16px rgba(0,0,0,0.06)',
                            },
                          }}
                        >
                          <Box>
                            {/* Feature Header */}
                            <Stack
                              direction="row"
                              justifyContent="space-between"
                              alignItems="flex-start"
                              spacing={1}
                              sx={{ mb: 1 }}
                            >
                              <Typography variant="subtitle2" fontWeight={700} color="text.primary">
                                {feature.featureName}
                              </Typography>

                              <Chip
                                size="small"
                                icon={<StatusIcon sx={{ fontSize: '0.9rem !important' }} />}
                                label={cfg.label}
                                sx={{
                                  height: 22,
                                  fontSize: '0.72rem',
                                  fontWeight: 700,
                                  bgcolor: cfg.bgColor,
                                  color: cfg.color,
                                  border: `1px solid ${cfg.borderColor}`,
                                  flexShrink: 0,
                                }}
                              />
                            </Stack>

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
                                  mb: 1.5,
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
                                  bgcolor: (t) =>
                                    t.palette.mode === 'dark'
                                      ? 'rgba(255,255,255,0.03)'
                                      : '#f8fafc',
                                  borderColor: 'divider',
                                  mb: 1,
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
                                  }}
                                >
                                  "{feature.notes}"
                                </Typography>
                              </Paper>
                            )}
                          </Box>

                          {/* Footer Info */}
                          <Stack
                            direction="row"
                            justifyContent="space-between"
                            alignItems="center"
                            sx={{ pt: 1, borderTop: 1, borderColor: 'divider', mt: 1 }}
                          >
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                              {feature.updatedAt
                                ? new Date(feature.updatedAt).toLocaleDateString()
                                : 'Initial'}
                            </Typography>
                            <Button
                              size="small"
                              variant="text"
                              endIcon={<EditNoteRounded sx={{ fontSize: '1rem' }} />}
                              sx={{
                                p: 0,
                                minWidth: 0,
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                textTransform: 'none',
                              }}
                            >
                              Update
                            </Button>
                          </Stack>
                        </Paper>
                      </Grid>
                    );
                  })}
                </Grid>
              </GlassCard>
            ))}
          </Stack>
        )}
      </Stack>

      {/* Feature Update Modal */}
      <FeatureUpdateModal
        open={Boolean(selectedFeature)}
        feature={selectedFeature}
        onClose={() => setSelectedFeature(null)}
        onSuccess={handleFeatureUpdated}
      />

      {/* Toast Feedback */}
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
