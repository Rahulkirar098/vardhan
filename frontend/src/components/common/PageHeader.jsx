import { Box, Stack, Typography } from '@mui/material';

/**
 * PageHeader standardizes page titles, descriptions/subtitles, and top page actions across the app.
 * Located at: frontend/src/components/common/PageHeader.jsx
 *
 * Props:
 * - title: string | ReactNode
 * - description | subtitle: string | ReactNode
 * - actions | action: ReactNode
 * - breadcrumb: ReactNode
 */
const PageHeader = ({
  title,
  description,
  subtitle,
  actions,
  action,
  breadcrumb,
  sx = {},
  ...props
}) => {
  const headerActions = actions || action;
  const descText = description || subtitle;

  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={2}
      sx={{
        alignItems: { xs: 'flex-start', sm: 'flex-start' },
        justifyContent: 'space-between',
        width: '100%',
        boxSizing: 'border-box',
        ...sx,
      }}
      {...props}
    >
      <Box sx={{ minWidth: 0, flex: 1 }}>
        {breadcrumb && (
          <Typography
            variant="caption"
            sx={{
              display: 'block',
              mb: 0.75,
              color: 'text.secondary',
              fontWeight: 600,
              letterSpacing: '0.04em',
            }}
          >
            {breadcrumb}
          </Typography>
        )}

        <Typography
          component="h1"
          sx={{
            fontSize: { xs: '1.5rem', md: '1.875rem' },
            fontWeight: 800,
            color: '#0F172A',
            letterSpacing: '-0.02em',
            lineHeight: 1.2,
          }}
        >
          {title}
        </Typography>

        {descText && (
          <Typography
            sx={{
              mt: 0.85, // ~6.8px spacing between title & description
              fontSize: { xs: '0.84rem', md: '0.875rem' },
              color: '#64748B',
              lineHeight: 1.5,
              fontWeight: 400,
            }}
          >
            {descText}
          </Typography>
        )}
      </Box>

      {headerActions && (
        <Stack
          direction="row"
          spacing={1.5}
          sx={{
            alignItems: 'center',
            flexWrap: 'wrap',
            flexShrink: 0,
            width: { xs: '100%', sm: 'auto' },
            pt: { xs: 0, sm: 0.25 },
          }}
        >
          {headerActions}
        </Stack>
      )}
    </Stack>
  );
};

export default PageHeader;
