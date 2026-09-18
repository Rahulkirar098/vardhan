import { Box, Grid, Skeleton, Stack } from '@mui/material';
import GlassCard from '../GlassCard';
import StatsCardSkeleton from './StatsCardSkeleton';

const DashboardSkeleton = ({ role = 'admin' }) => {
  const statsCount = role === 'hr' ? 2 : 3;

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', width: '100%' }}>
      <Stack spacing={3}>
        <GlassCard sx={{ p: { xs: 2.5, md: 4 } }}>
          <Stack spacing={1.5}>
            <Skeleton variant="text" width="58%" height={42} animation="wave" />
            <Skeleton variant="text" width="34%" height={22} animation="wave" />
            <Skeleton variant="text" width="26%" height={18} animation="wave" />
          </Stack>
        </GlassCard>

        <Grid container spacing={2.5}>
          {Array.from({ length: statsCount }).map((_, index) => (
            <StatsCardSkeleton key={index} xs={12} sm={6} md={role === 'hr' ? 6 : 4} />
          ))}
        </Grid>

        <GlassCard sx={{ p: { xs: 2.5, md: 3 } }}>
          <Stack spacing={2.5}>
            <Skeleton variant="text" width="28%" height={28} animation="wave" />
            <Skeleton variant="rectangular" height={140} animation="wave" sx={{ borderRadius: 2 }} />
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <Skeleton variant="rectangular" height={110} animation="wave" sx={{ borderRadius: 2, flex: 1 }} />
              <Skeleton variant="rectangular" height={110} animation="wave" sx={{ borderRadius: 2, flex: 1 }} />
            </Stack>
          </Stack>
        </GlassCard>
      </Stack>
    </Box>
  );
};

export default DashboardSkeleton;
