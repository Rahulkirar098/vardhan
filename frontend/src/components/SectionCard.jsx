import { Box, Stack, Typography } from '@mui/material';
import GlassCard from './GlassCard';

const SectionCard = ({ title, subtitle, action, children, sx = {}, contentSx = {} }) => (
  <GlassCard sx={{ p: { xs: 2, sm: 2.5 }, ...sx }}>
    <Stack spacing={2}>
      {(title || action) && (
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1.5}
          sx={{
            alignItems: { xs: 'flex-start', sm: 'center' },
            justifyContent: 'space-between',
          }}
        >
          <Box sx={{ minWidth: 0 }}>
            {title && (
              <Typography variant="h6" sx={{ fontWeight: 700, fontSize: 18 }}>
                {title}
              </Typography>
            )}
            {subtitle && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                {subtitle}
              </Typography>
            )}
          </Box>
          {action}
        </Stack>
      )}
      <Box sx={contentSx}>{children}</Box>
    </Stack>
  </GlassCard>
);

export default SectionCard;
