import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
  ArrowBackRounded,
  DeleteOutlineRounded,
  EditRounded,
  MeetingRoomRounded,
  MoreVertRounded,
} from '@mui/icons-material';
import structureService from '../../services/structure.service';
import auth from '../../services/auth.service';
import AppLayout from '../../components/AppLayout';
import PageHeader from '../../components/PageHeader';
import StatusBadge from '../../components/StatusBadge';
import GlassCard from '../../components/GlassCard';
import Modal from '../../components/Modal';
import ConfirmDialog from '../../components/ConfirmDialog';
import EmptyState from '../../components/EmptyState';
import ErrorState from '../../components/ErrorState';
import { hasPermission, PERMISSIONS } from '../../utils/permissions';

const initialRoomForm = {
  name: '',
  code: '',
  description: '',
};

const RoomFormModal = ({ open, onClose, onSuccess, floorId, editRoom = null }) => {
  const [form, setForm] = useState(initialRoomForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      if (editRoom) {
        setForm({
          name: editRoom.name || '',
          code: editRoom.code || '',
          description: editRoom.description || '',
        });
      } else {
        setForm(initialRoomForm);
      }
      setError('');
      setSubmitting(false);
    }
  }, [open, editRoom]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    setError('');

    if (!form.name.trim()) {
      setError('Room name is required.');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        name: form.name.trim(),
        code: form.code.trim() || null,
        description: form.description.trim() || null,
      };

      if (editRoom) {
        await structureService.updateRoom(floorId, editRoom._id, payload);
        onSuccess('Room updated successfully.');
      } else {
        await structureService.createRoom(floorId, payload);
        onSuccess('Room created successfully.');
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to save room.');
    } finally {
      setSubmitting(false);
    }
  };

  const isEdit = Boolean(editRoom);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit Room' : 'Add Room'}
      description={
        isEdit
          ? 'Update the room or ward space details.'
          : 'Create a generic admin-named space on this floor (e.g. NICU, ICU, Emergency, Room 201).'
      }
      submitLabel={isEdit ? 'Save Changes' : 'Add Room'}
      submittingLabel={isEdit ? 'Saving...' : 'Adding...'}
      onSubmit={handleSubmit}
      submitting={submitting}
      error={error}
      startIcon={isEdit ? EditRounded : AddRounded}
    >
      <Stack spacing={2.5}>
        <TextField
          label="Room Name"
          name="name"
          value={form.name}
          onChange={handleChange}
          required
          placeholder="e.g. NICU, ICU, Emergency, Room 201"
          helperText="Enter any generic space or ward name (free text)"
          fullWidth
        />
        <TextField
          label="Code"
          name="code"
          value={form.code}
          onChange={handleChange}
          placeholder="e.g. NICU-01, ICU-01, R201"
          fullWidth
        />
        <TextField
          label="Description"
          name="description"
          value={form.description}
          onChange={handleChange}
          multiline
          minRows={3}
          placeholder="Optional room details or capacity notes"
          fullWidth
        />
      </Stack>
    </Modal>
  );
};

const RoomCard = ({ room, onEdit, onDeactivate }) => {
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
              {room.name}
            </Typography>
            {room.code && (
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mt: 0.5 }}>
                Code: {room.code}
              </Typography>
            )}
          </Box>

          {(hasPermission(PERMISSIONS.STRUCTURE_UPDATE) || hasPermission(PERMISSIONS.STRUCTURE_DELETE)) && (
            <>
              <IconButton size="small" onClick={handleMenuClick} aria-label="Room actions">
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
                      onEdit(room);
                    }}
                  >
                    <ListItemIcon>
                      <EditRounded fontSize="small" />
                    </ListItemIcon>
                    <ListItemText primary="Edit Room" />
                  </MenuItem>
                )}
                {hasPermission(PERMISSIONS.STRUCTURE_DELETE) && (
                  <MenuItem
                    onClick={() => {
                      handleMenuClose();
                      onDeactivate(room);
                    }}
                    sx={{ color: 'error.main' }}
                  >
                    <ListItemIcon sx={{ color: 'inherit' }}>
                      <DeleteOutlineRounded fontSize="small" />
                    </ListItemIcon>
                    <ListItemText primary="Deactivate Room" />
                  </MenuItem>
                )}
              </Menu>
            </>
          )}
        </Stack>

        {room.description && (
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
            {room.description}
          </Typography>
        )}

        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mt: 1 }}>
          <StatusBadge status={room.status || (room.isActive ? 'active' : 'inactive')} />
        </Stack>
      </Box>

      <Box sx={{ pt: 2, mt: 'auto', display: 'flex', gap: 1 }}>
        <Button
          size="small"
          variant="outlined"
          startIcon={<EditRounded />}
          onClick={() => onEdit(room)}
          sx={{
            flex: 1,
            color: '#0A0A0A',
            borderColor: '#E5E5E5',
            fontWeight: 600,
            '&:hover': {
              backgroundColor: '#F5F5F5',
              borderColor: '#0A0A0A',
            },
          }}
        >
          Edit
        </Button>
      </Box>
    </GlassCard>
  );
};

const FloorDetails = () => {
  const navigate = useNavigate();
  const { floorId } = useParams();
  const [floor, setFloor] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  // Dialog states
  const [formOpen, setFormOpen] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [deactivateTarget, setDeactivateTarget] = useState(null);
  const [deactivating, setDeactivating] = useState(false);

  const fetchData = useCallback(async () => {
    if (!floorId) return;
    try {
      setLoading(true);
      const [floorRes, roomsRes] = await Promise.all([
        structureService.getFloor(floorId),
        structureService.getRooms(floorId),
      ]);
      setFloor(floorRes?.data?.data || null);
      setRooms(roomsRes?.data?.data || []);
      setError('');
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to load floor rooms.');
    } finally {
      setLoading(false);
    }
  }, [floorId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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

  const handleOpenCreate = () => {
    setSelectedRoom(null);
    setFormOpen(true);
  };

  const handleOpenEdit = (room) => {
    setSelectedRoom(room);
    setFormOpen(true);
  };

  const handleOpenDeactivate = (room) => {
    setDeactivateTarget(room);
  };

  const handleConfirmDeactivate = async () => {
    if (!deactivateTarget) return;

    try {
      setDeactivating(true);
      await structureService.deactivateRoom(floorId, deactivateTarget._id);
      setToastMessage('Room deactivated successfully.');
      setDeactivateTarget(null);
      await fetchData();
    } catch (err) {
      setToastMessage(err?.response?.data?.message || 'Unable to deactivate room.');
    } finally {
      setDeactivating(false);
    }
  };

  return (
    <AppLayout onLogout={handleLogout}>
      <Stack spacing={4}>
        <Stack direction="row" sx={{ alignItems: 'center', gap: 1 }}>
          <Button
            variant="text"
            startIcon={<ArrowBackRounded />}
            onClick={() => navigate('/structure')}
            sx={{ color: 'text.secondary', fontWeight: 600, px: 1 }}
          >
            Back to Structure
          </Button>
        </Stack>

        <PageHeader
          title={floor?.name || 'Floor Details'}
          subtitle={
            floor
              ? `Floor ${floor.floorNumber}${floor.code ? ` • Code: ${floor.code}` : ''}`
              : 'Manage rooms and spaces'
          }
          actions={
            hasPermission(PERMISSIONS.STRUCTURE_CREATE) ? (
              <Button
                variant="contained"
                startIcon={<AddRounded />}
                onClick={handleOpenCreate}
                sx={{ fontWeight: 600 }}
              >
                Add Room
              </Button>
            ) : null
          }
        />

        {error && <ErrorState message={error} onRetry={fetchData} />}

        {/* Room List Grid */}
        <Box>
          <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, fontSize: 18 }}>
              Rooms & Spaces
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
              {loading ? '…' : `${rooms.length} active`}
            </Typography>
          </Stack>

          {loading ? (
            <Grid container spacing={2.5}>
              {[1, 2, 3].map((i) => (
                <Grid item xs={12} sm={6} md={4} key={i}>
                  <GlassCard sx={{ p: 2.5, height: 160 }}>
                    <Skeleton variant="text" width="60%" height={32} />
                    <Skeleton variant="text" width="40%" height={20} sx={{ mb: 2 }} />
                    <Skeleton variant="rectangular" height={36} sx={{ borderRadius: '8px', mt: 2 }} />
                  </GlassCard>
                </Grid>
              ))}
            </Grid>
          ) : rooms.length === 0 ? (
            <GlassCard sx={{ p: 3 }}>
              <EmptyState
                icon={MeetingRoomRounded}
                title="No rooms added yet"
                description="Add a room to this floor to start organizing the hospital."
                actionLabel="+ Add Room"
                onAction={handleOpenCreate}
              />
            </GlassCard>
          ) : (
            <Grid container spacing={2.5}>
              {rooms.map((room) => (
                <Grid item xs={12} sm={6} md={4} key={room._id}>
                  <RoomCard
                    room={room}
                    onEdit={handleOpenEdit}
                    onDeactivate={handleOpenDeactivate}
                  />
                </Grid>
              ))}
            </Grid>
          )}
        </Box>
      </Stack>

      {/* Add / Edit Room Modal */}
      <RoomFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        floorId={floorId}
        editRoom={selectedRoom}
        onSuccess={async (msg) => {
          setFormOpen(false);
          setToastMessage(msg);
          await fetchData();
        }}
      />

      {/* Deactivate Room Dialog */}
      <ConfirmDialog
        open={Boolean(deactivateTarget)}
        onClose={() => setDeactivateTarget(null)}
        title="Deactivate this room?"
        message={`Are you sure you want to deactivate "${deactivateTarget?.name}"?`}
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
          severity={toastMessage.includes('Unable') ? 'error' : 'success'}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {toastMessage}
        </Alert>
      </Snackbar>
    </AppLayout>
  );
};

export default FloorDetails;
