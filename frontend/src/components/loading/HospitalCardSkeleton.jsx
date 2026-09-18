import { Divider, Skeleton, Stack } from '@mui/material';
import GlassCard from '../GlassCard';

const HospitalCardSkeleton = () => {
  return (
    <GlassCard sx={{ p: 3, height: 300 }}>
      <Stack spacing={2}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
          <Skeleton variant="text" width="68%" height={32} animation="wave" />
          <Skeleton variant="rounded" width={72} height={26} animation="wave" />
        </Stack>

        <Skeleton variant="text" width="32%" height={22} animation="wave" />
        <Divider />
        <Skeleton variant="text" width="46%" height={18} animation="wave" />
        <Skeleton variant="text" width="80%" height={22} animation="wave" />
        <Skeleton variant="text" width="90%" height={18} animation="wave" />

        <Skeleton variant="text" width="42%" height={18} animation="wave" />
        <Skeleton variant="text" width="70%" height={18} animation="wave" />

        <Skeleton variant="rounded" width={120} height={36} animation="wave" />
      </Stack>
    </GlassCard>
  );
};

export default HospitalCardSkeleton;
