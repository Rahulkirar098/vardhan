import { Grid, Skeleton, Stack } from '@mui/material';
import GlassCard from '../GlassCard';

const HospitalDetailsSkeleton = () => {
  return (
    <GlassCard sx={{ p: { xs: 2.5, md: 4 }, maxWidth: 1200, mx: 'auto' }}>
      <Stack spacing={3}>
        <Skeleton variant="text" width="30%" height={36} animation="wave" />
        <Skeleton variant="text" width="45%" height={42} animation="wave" />

        <Grid container spacing={3}>
          {[1, 2, 3, 4].map((item) => (
            <Grid item xs={12} md={6} key={item}>
              <GlassCard sx={{ p: 3, height: '100%' }}>
                <Stack spacing={2}>
                  <Skeleton variant="text" width="42%" height={28} animation="wave" />
                  <Skeleton variant="text" width="62%" height={20} animation="wave" />
                  <Skeleton variant="text" width="55%" height={20} animation="wave" />
                  <Skeleton variant="text" width="70%" height={20} animation="wave" />
                  <Skeleton variant="text" width="48%" height={20} animation="wave" />
                </Stack>
              </GlassCard>
            </Grid>
          ))}
        </Grid>
      </Stack>
    </GlassCard>
  );
};

export default HospitalDetailsSkeleton;
