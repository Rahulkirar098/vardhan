import { Box, CircularProgress, Typography } from '@mui/material';

const MainContentLoader = ({ label = 'Loading...' }) => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '400px',
        height: '100%',
        width: '100%',
        py: 8,
        gap: 2,
      }}
    >
      <CircularProgress
        size={40}
        thickness={4}
        sx={{
          color: '#0A0A0A',
        }}
      />
      {label && (
        <Typography
          variant="body2"
          sx={{
            color: 'text.secondary',
            fontWeight: 500,
            letterSpacing: '0.01em',
          }}
        >
          {label}
        </Typography>
      )}
    </Box>
  );
};

export default MainContentLoader;
