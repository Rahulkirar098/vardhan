import { useEffect, useState } from 'react';
import { Box, Button, Chip, IconButton, TextField, Tooltip, Typography, Select, MenuItem, FormControl, InputLabel, Snackbar, Alert } from '@mui/material';
import { AddRounded, EditRounded, PowerSettingsNewRounded, BusinessCenterRounded } from '@mui/icons-material';
import DataTable from '../../components/DataTable';
import AppLayout from '../../components/AppLayout';
import PageHeader from '../../components/PageHeader';
import StatCard from '../../components/StatCard';
import StatusBadge from '../../components/StatusBadge';
import GlassCard from '../../components/GlassCard';
import Modal from '../../components/Modal';
import ConfirmDialog from '../../components/ConfirmDialog';
import EmptyState from '../../components/EmptyState';
import ErrorState from '../../components/ErrorState';
import { positionService } from '../../services/position.service';

const PositionsPage = () => {
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
    const showSnack = (message, severity = 'success') => setSnackbar({ open: true, message, severity });
    
    const [positions, setPositions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [stats, setStats] = useState({ total: 0, active: 0, inactive: 0 });
    
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    
    const [selectedPosition, setSelectedPosition] = useState(null);
    const [formData, setFormData] = useState({ name: '' });
    const [submitting, setSubmitting] = useState(false);

    const fetchPositions = async () => {
        setLoading(true);
        setError('');
        try {
            const res = await positionService.getPositions();
            const data = res.data || [];
            setPositions(data);
            
            const active = data.filter(p => p.status === 'active').length;
            setStats({
                total: data.length,
                active,
                inactive: data.length - active
            });
        } catch (err) {
            setError(err?.response?.data?.message || 'Failed to load positions.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPositions();
    }, []);

    const handleOpenAdd = () => {
        setFormData({ name: '' });
        setIsAddOpen(true);
    };

    const handleOpenEdit = (position) => {
        setSelectedPosition(position);
        setFormData({ name: position.name });
        setIsEditOpen(true);
    };

    const handleOpenToggleStatus = (position) => {
        setSelectedPosition(position);
        setIsConfirmOpen(true);
    };

    const handleSubmitAdd = async () => {
        if (!formData.name.trim()) {
            showSnack('Position name is required', 'error');
            return;
        }
        
        try {
            setSubmitting(true);
            await positionService.createPosition({ name: formData.name });
            showSnack('Position created successfully', 'success');
            setIsAddOpen(false);
            fetchPositions();
        } catch (err) {
            showSnack(err?.response?.data?.message || 'Failed to create position', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const handleSubmitEdit = async () => {
        if (!formData.name.trim()) {
            showSnack('Position name is required', 'error');
            return;
        }

        try {
            setSubmitting(true);
            await positionService.updatePosition(selectedPosition._id, { name: formData.name });
            showSnack('Position updated successfully', 'success');
            setIsEditOpen(false);
            fetchPositions();
        } catch (err) {
            showSnack(err?.response?.data?.message || 'Failed to update position', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const handleToggleStatus = async () => {
        try {
            setSubmitting(true);
            const newStatus = selectedPosition.status === 'active' ? 'inactive' : 'active';
            await positionService.updatePositionStatus(selectedPosition._id, newStatus);
            showSnack(`Position ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`, 'success');
            setIsConfirmOpen(false);
            fetchPositions();
        } catch (err) {
            showSnack(err?.response?.data?.message || 'Failed to update status', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const columns = [
        { key: 'name', label: 'Position Name', sortable: true },
        { key: 'status', label: 'Status' }
    ];

    const renderCell = (pos, column) => {
        if (column.key === 'status') {
            return <StatusBadge status={pos.status} />;
        }
        return pos[column.key];
    };

    const renderActions = (pos) => (
        <Box display="flex" justifyContent="flex-end" gap={1}>
            <Tooltip title="Edit Position">
                <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleOpenEdit(pos); }}>
                    <EditRounded fontSize="small" />
                </IconButton>
            </Tooltip>
            <Tooltip title={pos.status === 'active' ? "Deactivate Position" : "Activate Position"}>
                <IconButton 
                    size="small" 
                    color={pos.status === 'active' ? "error" : "success"}
                    onClick={(e) => { e.stopPropagation(); handleOpenToggleStatus(pos); }}
                >
                    <PowerSettingsNewRounded fontSize="small" />
                </IconButton>
            </Tooltip>
        </Box>
    );

    if (error) {
        return (
            <AppLayout>
                <ErrorState message={error} onRetry={fetchPositions} />
            </AppLayout>
        );
    }

    return (
        <AppLayout>
            <Box mb={4}>
                <PageHeader 
                    title="Position Master" 
                    subtitle="Manage employee positions and designations across the hospital."
                    action={
                        <Button
                            variant="contained"
                            startIcon={<AddRounded />}
                            onClick={handleOpenAdd}
                        >
                            Add Position
                        </Button>
                    }
                />
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 3, mb: 4 }}>
                <StatCard 
                    label="Total Positions"
                    value={loading ? "-" : stats.total}
                    icon={BusinessCenterRounded}
                />
                <StatCard 
                    label="Active"
                    value={loading ? "-" : stats.active}
                    icon={BusinessCenterRounded}
                />
                <StatCard 
                    label="Inactive"
                    value={loading ? "-" : stats.inactive}
                    icon={BusinessCenterRounded}
                />
            </Box>

            <GlassCard>
                {loading && positions.length === 0 ? (
                    <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}>
                        <Typography color="text.secondary">Loading positions...</Typography>
                    </Box>
                ) : positions.length === 0 ? (
                    <EmptyState 
                        title="No Positions Found"
                        description="Start by adding your first hospital position."
                        icon={BusinessCenterRounded}
                        actionLabel="Add Position"
                        onAction={handleOpenAdd}
                    />
                ) : (
                    <DataTable 
                        columns={columns}
                        rows={positions}
                        getRowKey={(pos) => pos._id}
                        renderCell={renderCell}
                        renderActions={renderActions}
                    />
                )}
            </GlassCard>

            <Modal 
                open={isAddOpen}
                onClose={() => !submitting && setIsAddOpen(false)}
                title="Add New Position"
                submitLabel="Add Position"
                onSubmit={handleSubmitAdd}
                submitting={submitting}
                disableSubmit={!formData.name.trim()}
            >
                <TextField 
                    fullWidth
                    label="Position Name"
                    variant="outlined"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Senior Cardiologist, HR Manager"
                    autoFocus
                />
            </Modal>

            <Modal 
                open={isEditOpen}
                onClose={() => !submitting && setIsEditOpen(false)}
                title="Edit Position"
                submitLabel="Save Changes"
                onSubmit={handleSubmitEdit}
                submitting={submitting}
                disableSubmit={!formData.name.trim()}
            >
                <TextField 
                    fullWidth
                    label="Position Name"
                    variant="outlined"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    autoFocus
                />
            </Modal>

            <ConfirmDialog 
                open={isConfirmOpen}
                title={selectedPosition?.status === 'active' ? "Deactivate Position?" : "Activate Position?"}
                message={`Are you sure you want to ${selectedPosition?.status === 'active' ? 'deactivate' : 'activate'} the position "${selectedPosition?.name}"?`}
                confirmText={selectedPosition?.status === 'active' ? 'Deactivate' : 'Activate'}
                cancelText="Cancel"
                onConfirm={handleToggleStatus}
                onCancel={() => setIsConfirmOpen(false)}
                loading={submitting}
                destructive={selectedPosition?.status === 'active'}
            />

            <Snackbar
                open={snackbar.open}
                autoHideDuration={4000}
                onClose={() => setSnackbar({ ...snackbar, open: false })}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            >
                <Alert
                    onClose={() => setSnackbar({ ...snackbar, open: false })}
                    severity={snackbar.severity}
                    variant="filled"
                    sx={{ width: '100%' }}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </AppLayout>
    );
};

export default PositionsPage;
