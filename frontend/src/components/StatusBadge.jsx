import { Chip } from '@mui/material';
import { styled } from '@mui/material/styles';

const STATUS_MAP = {
  active: { bg: '#0F172B', color: '#FFFFFF', border: '#0F172B' },
  accepted: { bg: '#0F172B', color: '#FFFFFF', border: '#0F172B' },
  verified: { bg: '#0F172B', color: '#FFFFFF', border: '#0F172B' },
  approved: { bg: '#F0FDF4', color: '#166534', border: '#BBF7D0' },
  present: { bg: '#F0FDF4', color: '#166534', border: '#BBF7D0' },
  half_day: { bg: '#FEF3C7', color: '#92400E', border: '#FDE68A' },
  'half day': { bg: '#FEF3C7', color: '#92400E', border: '#FDE68A' },
  absent: { bg: '#FEF2F2', color: '#991B1B', border: '#FECACA' },
  not_checked_in: { bg: '#F8FAFC', color: '#62748E', border: '#E2E8F0' },
  'not checked in': { bg: '#F8FAFC', color: '#62748E', border: '#E2E8F0' },
  weekly_off: { bg: '#F1F5F9', color: '#475569', border: '#CBD5E1' },
  'weekly off': { bg: '#F1F5F9', color: '#475569', border: '#CBD5E1' },
  on_leave: { bg: '#F0F9FF', color: '#075985', border: '#BAE6FD' },
  'on leave': { bg: '#F0F9FF', color: '#075985', border: '#BAE6FD' },
  leave: { bg: '#F0F9FF', color: '#075985', border: '#BAE6FD' },
  pending: { bg: '#FEF3C7', color: '#92400E', border: '#FDE68A' },
  invited: { bg: '#FEF3C7', color: '#92400E', border: '#FDE68A' },
  inactive: { bg: '#F8FAFC', color: '#62748E', border: '#E2E8F0' },
  expired: { bg: '#F8FAFC', color: '#62748E', border: '#E2E8F0' },
  rejected: { bg: '#FEF2F2', color: '#991B1B', border: '#FECACA' },
  cancelled: { bg: '#F8FAFC', color: '#62748E', border: '#E2E8F0' },
  revoked: { bg: '#FEF2F2', color: '#991B1B', border: '#FECACA' },
};

const StyledChip = styled(Chip, {
  shouldForwardProp: (prop) => prop !== 'statusKey',
})(({ theme, statusKey }) => {
  const conf = STATUS_MAP[statusKey] || STATUS_MAP.inactive;
  return {
    height: 24,
    fontSize: '0.75rem', // 12px
    fontWeight: 600,
    borderRadius: 9999,
    backgroundColor: conf.bg,
    color: conf.color,
    border: `1px solid ${conf.border}`,
    '& .MuiChip-label': {
      px: 1.25,
    },
  };
});

const formatLabel = (value) => {
  const text = String(value || '').trim();
  if (!text) return 'Unknown';

  if (text.toUpperCase() === 'HALF_DAY') return 'Half Day';
  if (text.toUpperCase() === 'PRESENT') return 'Present';
  if (text.toUpperCase() === 'ABSENT') return 'Absent';
  if (text.toUpperCase() === 'NOT_CHECKED_IN') return 'Not Checked In';
  if (text.toUpperCase() === 'WEEKLY_OFF') return 'Weekly Off';
  if (text.toUpperCase() === 'ON_LEAVE' || text.toUpperCase() === 'LEAVE') return 'On Leave';

  return text.charAt(0).toUpperCase() + text.slice(1);
};

const StatusBadge = ({ status, label, size = 'small', sx = {} }) => {
  const key = String(status || 'active').toLowerCase();

  return (
    <StyledChip
      statusKey={key}
      label={label || formatLabel(status || 'active')}
      size={size}
      sx={sx}
    />
  );
};

export default StatusBadge;
