import { Box } from '@mui/material';

const KPIGrid = ({ children, sx = {} }) => {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: '1fr',
          sm: 'repeat(2, 1fr)',
          md: 'repeat(4, 1fr)',
        },
        gap: 2,
        width: '100%',
        boxSizing: 'border-box',
        ...sx,
      }}
    >
      {children}
    </Box>
  );
};

export default KPIGrid;
