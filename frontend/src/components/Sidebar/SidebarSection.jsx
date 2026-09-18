import { Box, Typography } from '@mui/material';

const SidebarSection = ({ title, children }) => {
  if (!title && !children) return null;

  return (
    <Box sx={{ mb: 2.5 }}>
      {title && (
        <Typography
          variant="caption"
          sx={{
            display: 'block',
            px: 1.5,
            pb: 1,
            color: '#6B7280',
            letterSpacing: 1.2,
            fontWeight: 700,
          }}
        >
          {title}
        </Typography>
      )}
      {children}
    </Box>
  );
};

export default SidebarSection;
