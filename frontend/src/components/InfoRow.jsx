import { Box, Typography } from '@mui/material';

const InfoRow = ({ label, value, sx = {} }) => (
  <Box
    sx={{
      display: 'grid',
      gridTemplateColumns: { xs: '1fr', sm: '190px 1fr' },
      gap: { xs: 0.25, sm: 2 },
      alignItems: 'baseline',
      py: '12px',
      borderBottom: '1px solid #F0F0F0',
      '&:last-of-type': { borderBottom: 'none' },
      ...sx,
    }}
  >
    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
      {label}
    </Typography>
    <Typography variant="body1" sx={{ fontWeight: 500, wordBreak: 'break-word' }}>
      {value === null || value === undefined || value === '' ? '—' : value}
    </Typography>
  </Box>
);

export default InfoRow;
