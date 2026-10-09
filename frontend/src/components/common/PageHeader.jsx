import { Box, Stack, Typography } from '@mui/material';
import { styled } from '@mui/material/styles';

const StyledHeaderTitle = styled(Typography)(({ theme }) => ({
  fontSize: '1.875rem', // 30px
  fontWeight: 700,
  color: theme.palette.text.primary,
  letterSpacing: '-0.03em',
  lineHeight: 1.2,
  [theme.breakpoints.down('sm')]: {
    fontSize: '1.5rem', // 24px on mobile
  },
}));

const StyledHeaderDescription = styled(Typography)(({ theme }) => ({
  marginTop: theme.spacing(1),
  fontSize: '0.875rem', // 14px
  color: theme.palette.text.secondary,
  lineHeight: 1.5,
  fontWeight: 400,
}));

/**
 * PageHeader standardizes page titles, descriptions/subtitles, and top page actions across the app.
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
        mb: 3,
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

        <StyledHeaderTitle component="h1">
          {title}
        </StyledHeaderTitle>

        {descText && (
          <StyledHeaderDescription>
            {descText}
          </StyledHeaderDescription>
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
