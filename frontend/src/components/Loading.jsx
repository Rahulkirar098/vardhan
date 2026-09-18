import { Box, CircularProgress, Typography } from '@mui/material';

const Loading = ({ label = 'Loading...', height = '100%' }) => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 1.5,
        py: 4,
        height,
      }}
    >
      <CircularProgress size={40} />
      {label && (
        <Typography variant="body2" color="text.secondary">
          {label}
        </Typography>
      )}
    </Box>
  );
};

export default Loading;