import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Grid,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Skeleton,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import {
  AddRounded,
  ArrowForwardRounded,
  DeleteOutlineRounded,
  EditRounded,
  LayersRounded,
  MeetingRoomRounded,
  MoreVertRounded,
} from '@mui/icons-material';
import structureService from '../../services/structure.service';
import auth from '../../services/auth.service';
import AppLayout from '../../components/AppLayout';
import PageHeader from '../../components/PageHeader';
import StatCard from '../../components/StatCard';
import StatusBadge from '../../components/StatusBadge';
import GlassCard from '../../components/GlassCard';
import Modal from '../../components/Modal';
import ConfirmDialog from '../../components/ConfirmDialog';
import EmptyState from '../../components/EmptyState';
import ErrorState from '../../components/ErrorState';
import { hasPermission, PERMISSIONS } from '../../utils/permissions';

const initialFloorForm = {
  name: '',
  floorNumber: '',
  code: '',
  description: '',
};

const FloorFormModal = ({ open, onClose, onSuccess, editFloor = null }) => {
  const [form, setForm] = useState(initialFloorForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      if (editFloor) {
        setForm({
          name: editFloor.name || '',
          floorNumber: editFloor.floorNumber !== undefined ? String(editFloor.floorNumber) : '',
          code: editFloor.code || '',
          description: editFloor.description || '',
        });
      } else {
        setForm(initialFloorForm);
      }
      setError('');
      setSubmitting(false);
    }
  }, [open, editFloor]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    setError('');

    if (!form.name.trim()) {
      setError('Floor name is required.');
      return;
    }

    if (form.floorNumber === '' || isNaN(Number(form.floorNumber))) {
      setError('A valid floor number is required.');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        name: form.name.trim(),
        floorNumber: parseInt(form.floorNumber, 10),
        code: form.code.trim() || null,
        description: form.description.trim() || null,
      };

      if (editFloor) {
        await structureService.updateFloor(editFloor._id, payload);
        onSuccess('Floor updated successfully.');
      } else {
        await structureService.createFloor(payload);
        onSuccess('Floor created successfully.');
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to save floor.');
    } finally {
      setSubmitting(false);
    }
  };

  const isEdit = Boolean(editFloor);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit Floor' : 'Add Floor'}
      description={
        isEdit
          ? 'Update the floor details for your hospital.'
          : 'Define a new floor level for your hospital structure.'
      }
      submitLabel={isEdit ? 'Save Changes' : 'Add Floor'}
      submittingLabel={isEdit ? 'Saving...' : 'Adding...'}
      onSubmit={handleSubmit}
      submitting={submitting}
      error={error}
      startIcon={isEdit ? EditRounded : AddRounded}
    >
      <Stack spacing={2.5}>
        <TextField
          label="Floor Name"
          name="name"
          value={form.name}
          onChange={handleChange}
          required
          placeholder="e.g. Ground Floor, 2nd Floor"
          fullWidth
        />
        <TextField
          label="Floor Number"
          name="floorNumber"
          type="number"
          value={form.floorNumber}
          onChange={handleChange}
          required
          placeholder="e.g. 0, 1, 2, -1"
          helperText="Numeric representation (e.g. 0 for Ground Floor, -1 for Basement)"
          fullWidth
        />
        <TextField
          label="Code"
          name="code"
          value={form.code}
          onChange={handleChange}
          placeholder="e.g. GF, F1, F2"
          fullWidth
        />
        <TextField
          label="Description"
          name="description"
          value={form.description}
          onChange={handleChange}
          multiline
          minRows={3}
          placeholder="Optional notes or details about this floor"
          fullWidth
        />
      </Stack>
    </Modal>
  );
};

const FloorCard = ({ floor, onEdit, onDeactivate, onViewRooms }) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const menuOpen = Boolean(anchorEl);

  const handleMenuClick = (event) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  return (
    <GlassCard
      sx={{
        p: 2.5,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        height: '100%',
        position: 'relative',
      }}
    >
      <Box>
        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
          <Box sx={{ minWidth: 0, pr: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, fontSize: 18, lineHeight: 1.3 }} noWrap>
              {floor.name}
            </Typography>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mt: 0.5 }}>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                Floor {floor.floorNumber}
              </Typography>
              {floor.code && (
                <>
                  <Typography variant="caption" sx={{ color: '#D4D4D4' }}>
                    •
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{
                      backgroundColor: '#F5F5F5',
                      px: 0.75,
                      py: 0.25,
                      borderRadius: '4px',
                      fontWeight: 600,
                      color: 'text.secondary',
                    }}
                  >
                    {floor.code}
                  </Typography>
                </>
              )}
            </Stack>
          </Box>

          {(hasPermission(PERMISSIONS.STRUCTURE_UPDATE) || hasPermission(PERMISSIONS.STRUCTURE_DELETE)) && (
          <>
            <IconButton size="small" onClick={handleMenuClick} aria-label="Floor actions">
              <MoreVertRounded fontSize="small" />
            </IconButton>

            <Menu
              anchorEl={anchorEl}
              open={menuOpen}
              onClose={handleMenuClose}
              transformOrigin={{ horizontal: 'right', vertical: 'top' }}
              anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            >
              {hasPermission(PERMISSIONS.STRUCTURE_UPDATE) && (
                <MenuItem
                  onClick={() => {
                    handleMenuClose();
                    onEdit(floor);
                  }}
                >
                  <ListItemIcon>
                    <EditRounded fontSize="small" />
                  </ListItemIcon>
                  <ListItemText primary="Edit Floor" />
                </MenuItem>
              )}
              {hasPermission(PERMISSIONS.STRUCTURE_DELETE) && (
                <MenuItem
                  onClick={() => {
                    handleMenuClose();
                    onDeactivate(floor);
                  }}
                  sx={{ color: 'error.main' }}
                >
                  <ListItemIcon sx={{ color: 'inherit' }}>
                    <DeleteOutlineRounded fontSize="small" />
                  </ListItemIcon>
                  <ListItemText primary="Deactivate Floor" />
                </MenuItem>
              )}
            </Menu>
          </>
        )}
      </Stack>

        {floor.description && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              mb: 2,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              minHeight: 40,
            }}
          >
            {floor.description}
          </Typography>
        )}

        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 2.5 }}>
          <StatusBadge status={floor.status || (floor.isActive ? 'active' : 'inactive')} />
          <Typography
            variant="caption"
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.5,
              color: 'text.secondary',
              fontWeight: 600,
            }}
          >
            <MeetingRoomRounded sx={{ fontSize: 15 }} />
            {floor.roomCount !== undefined ? `${floor.roomCount} Rooms` : '0 Rooms'}
          </Typography>
        </Stack>
      </Box>

      <Button
        variant="outlined"
        fullWidth
        endIcon={<ArrowForwardRounded />}
        onClick={() => onViewRooms(floor._id)}
        sx={{
          borderRadius: '8px',
          fontWeight: 600,
          color: '#0A0A0A',
          borderColor: '#E5E5E5',
          backgroundColor: '#FAFAFA',
          '&:hover': {
            backgroundColor: '#0A0A0A',
            color: '#FFFFFF',
            borderColor: '#0A0A0A',
          },
        }}
      >
        View Rooms
      </Button>
    </GlassCard>
  );
};

const StructurePage = () => {
  const navigate = useNavigate();
  const [floors, setFloors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  // Dialog states
  const [formOpen, setFormOpen] = useState(false);
  const [selectedFloor, setSelectedFloor] = useState(null);
  const [deactivateTarget, setDeactivateTarget] = useState(null);
  const [deactivating, setDeactivating] = useState(false);

  const fetchFloors = async () => {
    try {
      setLoading(true);
      const res = await structureService.getFloors();
      setFloors(res?.data?.data || []);
      setError('');
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to load hospital structure.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFloors();
  }, []);

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        await auth.logout();
      }
    } catch (e) {
      console.error('Logout error:', e);
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('role');
      localStorage.removeItem('userName');
      localStorage.removeItem('userEmail');
      navigate('/login');
    }
  };

  // Summary stats
  const stats = useMemo(() => {
    const totalFloors = floors.length;
    const totalRooms = floors.reduce((acc, f) => acc + (f.roomCount || 0), 0);
    const activeRooms = totalRooms; // floors endpoint only returns active room counts
    return { totalFloors, totalRooms, activeRooms };
  }, [floors]);

  const handleOpenCreate = () => {
    setSelectedFloor(null);
    setFormOpen(true);
  };

  const handleOpenEdit = (floor) => {
    setSelectedFloor(floor);
    setFormOpen(true);
  };

  const handleOpenDeactivate = (floor) => {
    setDeactivateTarget(floor);
  };

  const handleConfirmDeactivate = async () => {
    if (!deactivateTarget) return;

    try {
      setDeactivating(true);
      await structureService.deactivateFloor(deactivateTarget._id);
      setToastMessage('Floor deactivated successfully.');
      setDeactivateTarget(null);
      await fetchFloors();
    } catch (err) {
      setToastMessage(
        err?.response?.data?.message || 'Cannot deactivate this floor while it has active rooms.'
      );
    } finally {
      setDeactivating(false);
    }
  };

  return (
    <AppLayout onLogout={handleLogout}>
      <Stack spacing={4}>
        <PageHeader
          title="Hospital Structure"
          subtitle="Manage hospital floors and rooms"
          actions={
            hasPermission(PERMISSIONS.STRUCTURE_CREATE) ? (
              <Button
                variant="contained"
                startIcon={<AddRounded />}
                onClick={handleOpenCreate}
                sx={{ fontWeight: 600 }}
              >
                Add Floor
              </Button>
            ) : null
          }
        />

        {error && <ErrorState message={error} onRetry={fetchFloors} />}

        {/* Summary Stats */}
        <Grid container spacing={2}>
          <Grid item xs={12} sm={4}>
            <StatCard
              label="Total Floors"
              value={loading ? '…' : stats.totalFloors}
              hint="Active hospital levels"
              icon={LayersRounded}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <StatCard
              label="Total Rooms"
              value={loading ? '…' : stats.totalRooms}
              hint="Generic spaces across floors"
              icon={MeetingRoomRounded}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <StatCard
              label="Active Rooms"
              value={loading ? '…' : stats.activeRooms}
              hint="Currently operational rooms"
              icon={MeetingRoomRounded}
            />
          </Grid>
        </Grid>

        {/* Floor List */}
        <Box>
          <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, fontSize: 18 }}>
              Hospital Floors
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
              {loading ? '…' : `${floors.length} total`}
            </Typography>
          </Stack>

          {loading ? (
            <Grid container spacing={2.5}>
              {[1, 2, 3].map((i) => (
                <Grid item xs={12} sm={6} md={4} key={i}>
                  <GlassCard sx={{ p: 2.5, height: 180 }}>
                    <Skeleton variant="text" width="60%" height={32} />
                    <Skeleton variant="text" width="40%" height={20} sx={{ mb: 2 }} />
                    <Skeleton variant="rectangular" height={36} sx={{ borderRadius: '8px', mt: 3 }} />
                  </GlassCard>
                </Grid>
              ))}
            </Grid>
          ) : floors.length === 0 ? (
            <GlassCard sx={{ p: 3 }}>
              <EmptyState
                icon={LayersRounded}
                title="No floors added yet"
                description="Create your first floor to start organizing the hospital."
                actionLabel={hasPermission(PERMISSIONS.STRUCTURE_CREATE) ? "+ Add Floor" : null}
                onAction={hasPermission(PERMISSIONS.STRUCTURE_CREATE) ? handleOpenCreate : null}
              />
            </GlassCard>
          ) : (
            <Grid container spacing={2.5}>
              {floors.map((floor) => (
                <Grid item xs={12} sm={6} md={4} key={floor._id}>
                  <FloorCard
                    floor={floor}
                    onEdit={handleOpenEdit}
                    onDeactivate={handleOpenDeactivate}
                    onViewRooms={(id) => navigate(`/structure/${id}`)}
                  />
                </Grid>
              ))}
            </Grid>
          )}
        </Box>
      </Stack>

      {/* Add / Edit Floor Modal */}
      <FloorFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        editFloor={selectedFloor}
        onSuccess={async (msg) => {
          setFormOpen(false);
          setToastMessage(msg);
          await fetchFloors();
        }}
      />

      {/* Deactivate Confirmation Dialog */}
      <ConfirmDialog
        open={Boolean(deactivateTarget)}
        onClose={() => setDeactivateTarget(null)}
        title="Deactivate this floor?"
        message={`Are you sure you want to deactivate "${deactivateTarget?.name}"? Floors with active rooms cannot be deactivated.`}
        confirmLabel="Deactivate"
        danger
        submitting={deactivating}
        onConfirm={handleConfirmDeactivate}
      />

      {/* Toast Feedback */}
      <Snackbar
        open={Boolean(toastMessage)}
        autoHideDuration={4000}
        onClose={() => setToastMessage('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setToastMessage('')}
          severity={toastMessage.includes('Cannot') || toastMessage.includes('Unable') ? 'error' : 'success'}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {toastMessage}
        </Alert>
      </Snackbar>
    </AppLayout>
  );
};

export default StructurePage;
