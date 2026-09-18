import { Box } from '@mui/material';

const cardStyle = {
  backgroundColor: '#FFFFFF',
  border: '1px solid #E5E5E5',
  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
  borderRadius: '12px',
  transition: 'box-shadow 180ms ease',
};

const GlassCard = ({ children, sx = {}, ...props }) => {
  return (
    <Box
      sx={{
        ...cardStyle,
        ...sx,
      }}
      {...props}
    >
      {children}
    </Box>
  );
};

export default GlassCard;