import { Grid, Skeleton, Stack } from '@mui/material';
import GlassCard from '../GlassCard';

const StatsCardSkeleton = ({ xs = 12, sm = 6, md = 4 }) => {
  return (
    <Grid item xs={xs} sm={sm} md={md}>
      <GlassCard sx={{ p: 2.5, height: '100%' }}>
        <Stack spacing={1.5}>
          <Skeleton variant="text" width="45%" height={20} animation="wave" />
          <Skeleton variant="text" width="55%" height={36} animation="wave" />
          <Skeleton variant="rounded" width={90} height={26} animation="wave" />
        </Stack>
      </GlassCard>
    </Grid>
  );
};

export default StatsCardSkeleton;
