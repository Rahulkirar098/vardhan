import { Box, Stack, Typography } from '@mui/material';

const PageHeader = ({ title, subtitle, breadcrumb, actions }) => (
  <Stack
    direction={{ xs: 'column', md: 'row' }}
    spacing={2}
    sx={{
      alignItems: { xs: 'flex-start', md: 'flex-end' },
      justifyContent: 'space-between',
      gap: 2,
    }}
  >
    <Box sx={{ minWidth: 0 }}>
      {breadcrumb && (
        <Typography
          variant="caption"
          sx={{
            display: 'block',
            mb: 0.75,
            color: 'text.secondary',
            fontWeight: 600,
            letterSpacing: 0.4,
          }}
        >
          {breadcrumb}
        </Typography>
      )}
      <Typography
        variant="h4"
        sx={{ fontSize: { xs: 25, md: 30 }, fontWeight: 700, letterSpacing: '-0.03em' }}
      >
        {title}
      </Typography>
      {subtitle && (
        <Typography variant="body1" color="text.secondary" sx={{ mt: 0.5 }}>
          {subtitle}
        </Typography>
      )}
    </Box>

    {actions && (
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1.25}
        sx={{ flexShrink: 0, width: { xs: '100%', sm: 'auto' } }}
      >
        {actions}
      </Stack>
    )}
  </Stack>
);

export default PageHeader;
