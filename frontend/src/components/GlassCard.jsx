import { Box } from '@mui/material';

const glassStyle = {
  background: 'rgba(255, 255, 255, 0.65)',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  border: '1px solid rgba(0, 0, 0, 0.08)',
  boxShadow: '0 8px 30px rgba(0, 0, 0, 0.06)',
  borderRadius: 3,
  transition: 'all 150ms ease',
};

const GlassCard = ({ children, sx = {}, ...props }) => {
  return (
    <Box
      sx={{
        ...glassStyle,
        ...sx,
      }}
      {...props}
    >
      {children}
    </Box>
  );
};

export default GlassCard;
