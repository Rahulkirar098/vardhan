import { styled } from '@mui/material/styles';
import Box from '@mui/material/Box';

const GlassCard = styled(Box)(({ theme }) => ({
  backgroundColor: theme.palette.background.paper,
  border: `1px solid ${theme.palette.divider}`,
  boxShadow: theme.shadows[1] || '0 1px 3px rgba(0, 0, 0, 0.05)',
  borderRadius: theme.shape.borderRadius,
  transition: 'box-shadow 180ms ease, background-color 180ms ease',
}));

export default GlassCard;