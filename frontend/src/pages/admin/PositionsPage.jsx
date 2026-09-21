import { useEffect, useState } from 'react';
import { Box, Button, Checkbox, Chip, IconButton, Paper, Stack, TextField, Tooltip, Typography, Snackbar, Alert } from '@mui/material';
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

const AVAILABLE_MODULES = [
    { key: 'hrms', label: 'HRMS Module', description: 'Workforce management, Roster, Attendance & Leaves' },
];

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
    const [formData, setFormData] = useState({ name: '', defaultModules: ['hrms'] });
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
        setFormData({ name: '', defaultModules: ['hrms'] });
        setIsAddOpen(true);
    };

    const handleOpenEdit = (position) => {
        setSelectedPosition(position);
        setFormData({ name: position.name, defaultModules: position.defaultModules || [] });
        setIsEditOpen(true);
    };

    const handleOpenToggleStatus = (position) => {
        setSelectedPosition(position);
        setIsConfirmOpen(true);
    };

    const toggleModuleSelection = (modKey) => {
        setFormData((prev) => {
            const current = prev.defaultModules || [];
            const exists = current.includes(modKey);
            return {
                ...prev,
                defaultModules: exists ? current.filter(k => k !== modKey) : [...current, modKey]
            };
        });
    };

    const handleSubmitAdd = async () => {
        if (!formData.name.trim()) {
            showSnack('Position name is required', 'error');
            return;
        }
        
        try {
            setSubmitting(true);
            await positionService.createPosition({
                name: formData.name.trim(),
                defaultModules: formData.defaultModules || []
            });
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
            await positionService.updatePosition(selectedPosition._id, {
                name: formData.name.trim(),
                defaultModules: formData.defaultModules || []
            });
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
        { key: 'defaultModules', label: 'Default Modules' },
        { key: 'status', label: 'Status' }
    ];

    const renderCell = (pos, column) => {
        if (column.key === 'status') {
            return <StatusBadge status={pos.status} />;
        }
        if (column.key === 'defaultModules') {
            const mods = pos.defaultModules || [];
            if (mods.length === 0) {
                return <Typography variant="caption" color="text.secondary">None</Typography>;
            }
            return (
                <Box display="flex" gap={0.5} flexWrap="wrap">
                    {mods.map(m => (
                        <Chip
                            key={m}
                            label={m.toUpperCase()}
                            size="small"
                            variant="outlined"
                            color="primary"
                            sx={{ fontSize: '0.7rem', height: 22 }}
                        />
                    ))}
                </Box>
            );
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
                <Stack spacing={2.5}>
                    <TextField 
                        fullWidth
                        label="Position Name"
                        variant="outlined"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="e.g. Senior Cardiologist, HR Manager"
                        autoFocus
                    />
                    <Box>
                        <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                            Default Module Access
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
                            Employees invited with this position will automatically receive access to these modules upon joining.
                        </Typography>
                        <Stack spacing={1}>
                            {AVAILABLE_MODULES.map((mod) => {
                                const isChecked = formData.defaultModules?.includes(mod.key);
                                return (
                                    <Paper
                                        key={mod.key}
                                        variant="outlined"
                                        onClick={() => toggleModuleSelection(mod.key)}
                                        sx={{
                                            p: 1.5,
                                            borderRadius: 2,
                                            cursor: 'pointer',
                                            borderColor: isChecked ? 'primary.main' : 'divider',
                                            bgcolor: isChecked ? (t) => (t.palette.mode === 'dark' ? 'rgba(14, 165, 233, 0.08)' : '#f0f9ff') : 'transparent',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 1.5,
                                            transition: 'all 0.15s ease-in-out',
                                        }}
                                    >
                                        <Checkbox
                                            checked={isChecked}
                                            onChange={() => toggleModuleSelection(mod.key)}
                                            onClick={(e) => e.stopPropagation()}
                                            color="primary"
                                        />
                                        <Box>
                                            <Typography variant="body2" fontWeight={600} color="text.primary">
                                                {mod.label}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                {mod.description}
                                            </Typography>
                                        </Box>
                                    </Paper>
                                );
                            })}
                        </Stack>
                    </Box>
                </Stack>
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
                <Stack spacing={2.5}>
                    <TextField 
                        fullWidth
                        label="Position Name"
                        variant="outlined"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        autoFocus
                    />
                    <Box>
                        <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                            Default Module Access
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
                            Employees invited with this position will automatically receive access to these modules upon joining.
                        </Typography>
                        <Stack spacing={1}>
                            {AVAILABLE_MODULES.map((mod) => {
                                const isChecked = formData.defaultModules?.includes(mod.key);
                                return (
                                    <Paper
                                        key={mod.key}
                                        variant="outlined"
                                        onClick={() => toggleModuleSelection(mod.key)}
                                        sx={{
                                            p: 1.5,
                                            borderRadius: 2,
                                            cursor: 'pointer',
                                            borderColor: isChecked ? 'primary.main' : 'divider',
                                            bgcolor: isChecked ? (t) => (t.palette.mode === 'dark' ? 'rgba(14, 165, 233, 0.08)' : '#f0f9ff') : 'transparent',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 1.5,
                                            transition: 'all 0.15s ease-in-out',
                                        }}
                                    >
                                        <Checkbox
                                            checked={isChecked}
                                            onChange={() => toggleModuleSelection(mod.key)}
                                            onClick={(e) => e.stopPropagation()}
                                            color="primary"
                                        />
                                        <Box>
                                            <Typography variant="body2" fontWeight={600} color="text.primary">
                                                {mod.label}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                {mod.description}
                                            </Typography>
                                        </Box>
                                    </Paper>
                                );
                            })}
                        </Stack>
                    </Box>
                </Stack>
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
