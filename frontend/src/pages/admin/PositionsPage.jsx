import { useEffect, useState } from 'react';
import { Box, Button, Checkbox, Chip, FormControlLabel, FormGroup, IconButton, Paper, Stack, TextField, Tooltip, Typography, Snackbar, Alert } from '@mui/material';
import { AddRounded, EditRounded, PowerSettingsNewRounded, BusinessCenterRounded, CalendarMonthRounded } from '@mui/icons-material';
import DataTable from '../../components/DataTable';
import AppLayout from '../../components/AppLayout';
import MainContentLoader from '../../components/common/MainContentLoader';
import PageHeader from '../../components/PageHeader';
import KPICard from '../../components/common/KPICard';
import StatusBadge from '../../components/StatusBadge';
import GlassCard from '../../components/GlassCard';
import Modal from '../../components/Modal';
import ConfirmDialog from '../../components/ConfirmDialog';
import EmptyState from '../../components/EmptyState';
import ErrorState from '../../components/ErrorState';
import { positionService } from '../../services/position.service';
import { hasPermission, PERMISSIONS } from '../../utils/permissions';

const AVAILABLE_MODULES = [
    { key: 'hrms', label: 'HRMS Module', description: 'Workforce management, Roster, Attendance & Leaves' },
];

const DEFAULT_SCHEDULE = {
    monday: { workingDay: true, startTime: '09:00', endTime: '18:00' },
    tuesday: { workingDay: true, startTime: '09:00', endTime: '18:00' },
    wednesday: { workingDay: true, startTime: '09:00', endTime: '18:00' },
    thursday: { workingDay: true, startTime: '09:00', endTime: '18:00' },
    friday: { workingDay: true, startTime: '09:00', endTime: '18:00' },
    saturday: { workingDay: true, startTime: '09:00', endTime: '18:00' },
    sunday: { workingDay: false, startTime: null, endTime: null },
};

const DAYS = [
    { key: 'monday', label: 'Monday', short: 'Mon' },
    { key: 'tuesday', label: 'Tuesday', short: 'Tue' },
    { key: 'wednesday', label: 'Wednesday', short: 'Wed' },
    { key: 'thursday', label: 'Thursday', short: 'Thu' },
    { key: 'friday', label: 'Friday', short: 'Fri' },
    { key: 'saturday', label: 'Saturday', short: 'Sat' },
    { key: 'sunday', label: 'Sunday', short: 'Sun' },
];

const formatScheduleSummary = (schedule) => {
    if (!schedule) return 'Mon–Sat: 09:00–18:00 | Sun: OFF';

    const items = DAYS.map((d) => {
        const val = schedule[d.key];
        let isWorking = false;
        let start = '09:00';
        let end = '18:00';

        if (typeof val === 'boolean') {
            isWorking = val;
        } else if (val && typeof val === 'object') {
            isWorking = Boolean(val.workingDay);
            start = val.startTime || '09:00';
            end = val.endTime || '18:00';
        }

        return {
            short: d.short,
            isWorking,
            timingKey: isWorking ? `${start}–${end}` : 'OFF',
        };
    });

    const groups = [];
    let cur = null;
    for (const item of items) {
        if (!cur) {
            cur = { startDay: item.short, endDay: item.short, timingKey: item.timingKey };
        } else if (cur.timingKey === item.timingKey) {
            cur.endDay = item.short;
        } else {
            groups.push(cur);
            cur = { startDay: item.short, endDay: item.short, timingKey: item.timingKey };
        }
    }
    if (cur) groups.push(cur);

    return groups
        .map((g) => {
            const dayRange = g.startDay === g.endDay ? g.startDay : `${g.startDay}–${g.endDay}`;
            return `${dayRange}: ${g.timingKey}`;
        })
        .join(' | ');
};

const normalizeScheduleForState = (schedule) => {
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const result = {};
    for (const d of days) {
        const val = schedule?.[d];
        if (typeof val === 'boolean') {
            result[d] = {
                workingDay: val,
                startTime: val ? '09:00' : null,
                endTime: val ? '18:00' : null,
            };
        } else if (val && typeof val === 'object') {
            const isWorking = Boolean(val.workingDay);
            result[d] = {
                workingDay: isWorking,
                startTime: isWorking ? (val.startTime || '09:00') : null,
                endTime: isWorking ? (val.endTime || '18:00') : null,
            };
        } else {
            const defaultIsWorking = d !== 'sunday';
            result[d] = {
                workingDay: defaultIsWorking,
                startTime: defaultIsWorking ? '09:00' : null,
                endTime: defaultIsWorking ? '18:00' : null,
            };
        }
    }
    return result;
};

const ScheduleEditor = ({ value, onChange }) => {
    return (
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: '#F8FAFC' }}>
            <Stack spacing={1}>
                {DAYS.map((day) => {
                    const dayConfig = value?.[day.key] || { workingDay: false, startTime: null, endTime: null };
                    const isWorking = typeof dayConfig === 'boolean' ? dayConfig : Boolean(dayConfig.workingDay);
                    const startTime = typeof dayConfig === 'object' && dayConfig.startTime ? dayConfig.startTime : '09:00';
                    const endTime = typeof dayConfig === 'object' && dayConfig.endTime ? dayConfig.endTime : '18:00';

                    const handleToggle = (e) => {
                        const checked = e.target.checked;
                        onChange({
                            ...value,
                            [day.key]: {
                                workingDay: checked,
                                startTime: checked ? startTime : null,
                                endTime: checked ? endTime : null,
                            },
                        });
                    };

                    const handleTimeChange = (field, val) => {
                        onChange({
                            ...value,
                            [day.key]: {
                                workingDay: true,
                                startTime: field === 'startTime' ? val : startTime,
                                endTime: field === 'endTime' ? val : endTime,
                            },
                        });
                    };

                    return (
                        <Box
                            key={day.key}
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                py: 0.75,
                                px: 1.5,
                                borderRadius: 1.5,
                                bgcolor: isWorking ? '#FFFFFF' : 'transparent',
                                border: isWorking ? '1px solid #E2E8F0' : '1px solid transparent',
                            }}
                        >
                            <FormControlLabel
                                control={
                                    <Checkbox
                                        checked={isWorking}
                                        onChange={handleToggle}
                                        size="small"
                                        color="primary"
                                    />
                                }
                                label={
                                    <Typography variant="body2" fontWeight={600} color={isWorking ? 'text.primary' : 'text.secondary'} sx={{ minWidth: 70 }}>
                                        {day.label}
                                    </Typography>
                                }
                                sx={{ mr: 0 }}
                            />

                            {isWorking ? (
                                <Stack direction="row" spacing={1} alignItems="center">
                                    <TextField
                                        type="time"
                                        size="small"
                                        value={startTime}
                                        onChange={(e) => handleTimeChange('startTime', e.target.value)}
                                        inputProps={{ step: 300 }}
                                        sx={{ width: 130, '& .MuiOutlinedInput-input': { py: 0.5, px: 1, fontSize: '0.8125rem' } }}
                                    />
                                    <Typography variant="caption" color="text.secondary">to</Typography>
                                    <TextField
                                        type="time"
                                        size="small"
                                        value={endTime}
                                        onChange={(e) => handleTimeChange('endTime', e.target.value)}
                                        inputProps={{ step: 300 }}
                                        sx={{ width: 130, '& .MuiOutlinedInput-input': { py: 0.5, px: 1, fontSize: '0.8125rem' } }}
                                    />
                                </Stack>
                            ) : (
                                <Typography variant="caption" color="text.disabled" sx={{ fontStyle: 'italic', pr: 2 }}>
                                    OFF
                                </Typography>
                            )}
                        </Box>
                    );
                })}
            </Stack>
        </Paper>
    );
};

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
    const [formData, setFormData] = useState({
        name: '',
        defaultModules: ['hrms'],
        rosterEligible: false,
        workSchedule: normalizeScheduleForState(DEFAULT_SCHEDULE),
    });
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
        setFormData({
            name: '',
            defaultModules: ['hrms'],
            rosterEligible: false,
            workSchedule: normalizeScheduleForState(DEFAULT_SCHEDULE),
        });
        setIsAddOpen(true);
    };

    const handleOpenEdit = (position) => {
        setSelectedPosition(position);
        setFormData({
            name: position.name,
            defaultModules: position.defaultModules || [],
            rosterEligible: Boolean(position.rosterEligible),
            workSchedule: position.rosterEligible ? null : normalizeScheduleForState(position.workSchedule),
        });
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

    const handleToggleRosterEligible = (targetState) => {
        setFormData((prev) => {
            const isEligible = typeof targetState === 'boolean' ? targetState : !prev.rosterEligible;
            return {
                ...prev,
                rosterEligible: isEligible,
                workSchedule: isEligible ? null : (prev.workSchedule || normalizeScheduleForState(DEFAULT_SCHEDULE))
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
                defaultModules: formData.defaultModules || [],
                rosterEligible: Boolean(formData.rosterEligible),
                workSchedule: formData.rosterEligible ? null : (formData.workSchedule || DEFAULT_SCHEDULE),
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
                defaultModules: formData.defaultModules || [],
                rosterEligible: Boolean(formData.rosterEligible),
                workSchedule: formData.rosterEligible ? null : (formData.workSchedule || DEFAULT_SCHEDULE),
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
        { key: 'rosterEligible', label: 'Roster Eligible' },
        { key: 'workSchedule', label: 'Work Schedule' },
        { key: 'status', label: 'Status' }
    ];

    const renderCell = (pos, column) => {
        if (column.key === 'status') {
            return <StatusBadge status={pos.status} />;
        }
        if (column.key === 'rosterEligible') {
            return (
                <Chip
                    label={pos.rosterEligible ? 'Eligible' : 'Not Eligible'}
                    size="small"
                    color={pos.rosterEligible ? 'success' : 'default'}
                    variant="outlined"
                    sx={{ fontSize: '0.75rem', fontWeight: 600 }}
                />
            );
        }
        if (column.key === 'workSchedule') {
            if (pos.rosterEligible) {
                return (
                    <Typography variant="caption" sx={{ fontWeight: 600, color: 'primary.main', display: 'block' }}>
                        Roster Assignments
                    </Typography>
                );
            }
            const summaryText = formatScheduleSummary(pos.workSchedule);
            return (
                <Typography variant="caption" sx={{ fontWeight: 600, color: '#334155', display: 'block', maxWidth: 360 }}>
                    {summaryText}
                </Typography>
            );
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

    const canCreate = hasPermission(PERMISSIONS.POSITION_CREATE);
    const canUpdate = hasPermission(PERMISSIONS.POSITION_UPDATE) || hasPermission(PERMISSIONS.POSITION_SCHEDULE_MANAGE);

    const renderActions = (pos) => {
        if (!canUpdate) return null;
        return (
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
    };

    if (error) {
        return (
            <AppLayout>
                <ErrorState message={error} onRetry={fetchPositions} />
            </AppLayout>
        );
    }

    if (loading) {
        return (
            <AppLayout>
                <MainContentLoader />
            </AppLayout>
        );
    }

    return (
        <AppLayout>
            <Box mb={4}>
                <PageHeader 
                    title="Position Master" 
                    subtitle="Manage employee positions and designations across the hospital."
                    actions={
                        canCreate ? (
                            <Button
                                variant="contained"
                                startIcon={<AddRounded />}
                                onClick={handleOpenAdd}
                            >
                                Add Position
                            </Button>
                        ) : null
                    }
                />
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 3, mb: 4 }}>
                <KPICard 
                    title="Total Positions"
                    value={stats.total}
                    icon={BusinessCenterRounded}
                />
                <KPICard 
                    title="Active"
                    value={stats.active}
                    icon={BusinessCenterRounded}
                />
                <KPICard 
                    title="Inactive"
                    value={stats.inactive}
                    icon={BusinessCenterRounded}
                />
            </Box>

            <GlassCard>
                {positions.length === 0 ? (
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

                    <Paper
                        variant="outlined"
                        onClick={() => handleToggleRosterEligible(!formData.rosterEligible)}
                        sx={{
                            p: 1.5,
                            borderRadius: 2,
                            cursor: 'pointer',
                            borderColor: formData.rosterEligible ? 'primary.main' : 'divider',
                            bgcolor: formData.rosterEligible ? (t) => (t.palette.mode === 'dark' ? 'rgba(14, 165, 233, 0.08)' : '#f0f9ff') : 'transparent',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1.5,
                            transition: 'all 0.15s ease-in-out',
                        }}
                    >
                        <Checkbox
                            checked={Boolean(formData.rosterEligible)}
                            onChange={(e) => handleToggleRosterEligible(e.target.checked)}
                            onClick={(e) => e.stopPropagation()}
                            color="primary"
                        />
                        <Box>
                            <Typography variant="body2" fontWeight={600} color="text.primary">
                                Roster Eligible
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                Allow employees with this position to be assigned to hospital duty rosters.
                            </Typography>
                        </Box>
                    </Paper>

                    {formData.rosterEligible ? (
                        <Paper
                            variant="outlined"
                            sx={{
                                p: 2,
                                borderRadius: 2,
                                bgcolor: (t) => (t.palette.mode === 'dark' ? 'rgba(14, 165, 233, 0.08)' : '#F0F9FF'),
                                borderColor: 'primary.light',
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: 1.5,
                            }}
                        >
                            <Box sx={{ color: 'primary.main', mt: 0.25, display: 'flex' }}>
                                <CalendarMonthRounded fontSize="small" />
                            </Box>
                            <Box>
                                <Typography variant="subtitle2" fontWeight={700} color="primary.main">
                                    Roster Employment Model Active
                                </Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, lineHeight: 1.4 }}>
                                    Roster-eligible employees receive their expected work schedule through hospital duty roster assignments. Normal employment working days and shift timings are not applicable for this position.
                                </Typography>
                            </Box>
                        </Paper>
                    ) : (
                        <Box>
                            <Typography variant="subtitle2" fontWeight={700} gutterBottom sx={{ color: '#0F172A' }}>
                                Normal Employment Work Schedule & Shift Timing
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
                                Configure working days and shift timings (start and end times) for employees in this position when not assigned to duty rosters.
                            </Typography>
                            <ScheduleEditor
                                value={formData.workSchedule || normalizeScheduleForState(DEFAULT_SCHEDULE)}
                                onChange={(sched) => setFormData((prev) => ({ ...prev, workSchedule: sched }))}
                            />
                        </Box>
                    )}
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

                    <Paper
                        variant="outlined"
                        onClick={() => handleToggleRosterEligible(!formData.rosterEligible)}
                        sx={{
                            p: 1.5,
                            borderRadius: 2,
                            cursor: 'pointer',
                            borderColor: formData.rosterEligible ? 'primary.main' : 'divider',
                            bgcolor: formData.rosterEligible ? (t) => (t.palette.mode === 'dark' ? 'rgba(14, 165, 233, 0.08)' : '#f0f9ff') : 'transparent',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1.5,
                            transition: 'all 0.15s ease-in-out',
                        }}
                    >
                        <Checkbox
                            checked={Boolean(formData.rosterEligible)}
                            onChange={(e) => handleToggleRosterEligible(e.target.checked)}
                            onClick={(e) => e.stopPropagation()}
                            color="primary"
                        />
                        <Box>
                            <Typography variant="body2" fontWeight={600} color="text.primary">
                                Roster Eligible
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                Allow employees with this position to be assigned to hospital duty rosters.
                            </Typography>
                        </Box>
                    </Paper>

                    {formData.rosterEligible ? (
                        <Paper
                            variant="outlined"
                            sx={{
                                p: 2,
                                borderRadius: 2,
                                bgcolor: (t) => (t.palette.mode === 'dark' ? 'rgba(14, 165, 233, 0.08)' : '#F0F9FF'),
                                borderColor: 'primary.light',
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: 1.5,
                            }}
                        >
                            <Box sx={{ color: 'primary.main', mt: 0.25, display: 'flex' }}>
                                <CalendarMonthRounded fontSize="small" />
                            </Box>
                            <Box>
                                <Typography variant="subtitle2" fontWeight={700} color="primary.main">
                                    Roster Employment Model Active
                                </Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, lineHeight: 1.4 }}>
                                    Roster-eligible employees receive their expected work schedule through hospital duty roster assignments. Normal employment working days and shift timings are not applicable for this position.
                                </Typography>
                            </Box>
                        </Paper>
                    ) : (
                        <Box>
                            <Typography variant="subtitle2" fontWeight={700} gutterBottom sx={{ color: '#0F172A' }}>
                                Normal Employment Work Schedule & Shift Timing
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
                                Configure working days and shift timings (start and end times) for employees in this position when not assigned to duty rosters.
                            </Typography>
                            <ScheduleEditor
                                value={formData.workSchedule || normalizeScheduleForState(DEFAULT_SCHEDULE)}
                                onChange={(sched) => setFormData((prev) => ({ ...prev, workSchedule: sched }))}
                            />
                        </Box>
                    )}
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
