import { Avatar } from '@mui/material';

const getInitials = (name) => {
  if (!name) return 'U';

  const parts = String(name).trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) return 'U';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();

  return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
};

const InitialsAvatar = ({ name, src = null, size = 40, sx = {} }) => (
  <Avatar
    src={src || undefined}
    sx={{
      width: size,
      height: size,
      backgroundColor: '#252525',
      color: '#FFFFFF',
      fontSize: Math.round(size * 0.38),
      fontWeight: 600,
      flexShrink: 0,
      ...sx,
    }}
  >
    {!src && getInitials(name)}
  </Avatar>
);

export default InitialsAvatar;
