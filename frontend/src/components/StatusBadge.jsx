import { Chip } from '@mui/material';

const STATUS_STYLES = {
  active: { backgroundColor: '#0A0A0A', color: '#FFFFFF', borderColor: '#0A0A0A' },
  accepted: { backgroundColor: '#0A0A0A', color: '#FFFFFF', borderColor: '#0A0A0A' },
  verified: { backgroundColor: '#0A0A0A', color: '#FFFFFF', borderColor: '#0A0A0A' },
  approved: { backgroundColor: '#ECFDF5', color: '#166534', borderColor: '#BBF7D0' },
  pending: { backgroundColor: '#FFFBEB', color: '#B45309', borderColor: '#FDE68A' },
  invited: { backgroundColor: '#FFF7E6', color: '#B45309', borderColor: '#F1DFBF' },
  inactive: { backgroundColor: '#F5F5F5', color: '#525252', borderColor: '#E5E5E5' },
  expired: { backgroundColor: '#F5F5F5', color: '#8A8A8A', borderColor: '#E5E5E5' },
  rejected: { backgroundColor: '#FEF2F2', color: '#991B1B', borderColor: '#FECACA' },
  cancelled: { backgroundColor: '#F3F4F6', color: '#4B5563', borderColor: '#E5E7EB' },
  revoked: { backgroundColor: '#FDECEC', color: '#B42318', borderColor: '#F5D0D0' },
};

const formatLabel = (value) => {
  const text = String(value || '').trim();
  if (!text) return 'Unknown';

  return text.charAt(0).toUpperCase() + text.slice(1);
};

const StatusBadge = ({ status, label, size = 'small', sx = {} }) => {
  const key = String(status || 'active').toLowerCase();
  const style = STATUS_STYLES[key] || STATUS_STYLES.inactive;

  return (
    <Chip
      label={label || formatLabel(status || 'active')}
      size={size}
      sx={{
        height: 24,
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: 0.2,
        borderRadius: 999,
        '& .MuiChip-label': { px: 1.25 },
        ...style,
        ...sx,
      }}
    />
  );
};

export default StatusBadge;
