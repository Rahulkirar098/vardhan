import { Box, Stack, Typography } from '@mui/material';

const StatCard = ({ label, title, value, hint, description, icon: Icon, footer, sx = {} }) => {
  const displayLabel = label || title;
  const displayHint = hint || description;

  return (
    <Box
      sx={{
        p: { xs: 2, sm: 2.5 },
        height: '100%',
        borderRadius: '12px',
        border: '1px solid #E5E5E5',
        backgroundColor: '#FFFFFF',
        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
        transition: 'box-shadow 180ms ease',
        '&:hover': {
          boxShadow: '0 6px 18px rgba(0, 0, 0, 0.05)',
        },
        ...sx,
      }}
    >
      <Stack spacing={1.25} sx={{ height: '100%' }}>
        <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography
            variant="caption"
            sx={{
              color: 'text.secondary',
              fontWeight: 700,
              fontSize: 11,
              letterSpacing: 0.6,
              textTransform: 'uppercase',
            }}
          >
            {displayLabel}
          </Typography>
          {Icon && <Icon sx={{ fontSize: 18, color: 'text.secondary' }} />}
        </Stack>

        <Typography
          sx={{ fontSize: { xs: 24, md: 28 }, fontWeight: 700, lineHeight: 1.1, letterSpacing: '-0.03em' }}
        >
          {value}
        </Typography>

        {displayHint && (
          <Typography variant="caption" color="text.secondary">
            {displayHint}
          </Typography>
        )}

        {footer && <Box sx={{ pt: 0.5, mt: 'auto' }}>{footer}</Box>}
      </Stack>
    </Box>
  );
};

export default StatCard;

