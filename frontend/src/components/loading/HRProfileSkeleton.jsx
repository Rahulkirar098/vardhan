import { Divider, Skeleton, Stack } from '@mui/material';
import GlassCard from '../GlassCard';

const HRProfileSkeleton = () => {
  return (
    <GlassCard sx={{ p: { xs: 2.5, md: 3 }, maxWidth: 760, mx: 'auto' }}>
      <Stack spacing={3}>
        <Stack spacing={1}>
          <Skeleton variant="text" width="30%" height={18} animation="wave" />
          <Skeleton variant="text" width="52%" height={38} animation="wave" />
        </Stack>

        <Skeleton variant="rounded" width={110} height={30} animation="wave" />
        <Divider />

        <Stack spacing={2.5}>
          <Stack spacing={0.5}>
            <Skeleton variant="text" width="18%" height={16} animation="wave" />
            <Skeleton variant="text" width="72%" height={20} animation="wave" />
          </Stack>

          <Stack spacing={0.5}>
            <Skeleton variant="text" width="18%" height={16} animation="wave" />
            <Skeleton variant="text" width="58%" height={20} animation="wave" />
          </Stack>

          <Stack spacing={0.5}>
            <Skeleton variant="text" width="22%" height={16} animation="wave" />
            <Skeleton variant="text" width="68%" height={20} animation="wave" />
          </Stack>

          <Stack spacing={0.5}>
            <Skeleton variant="text" width="20%" height={16} animation="wave" />
            <Skeleton variant="text" width="32%" height={20} animation="wave" />
          </Stack>

          <Stack spacing={0.5}>
            <Skeleton variant="text" width="24%" height={16} animation="wave" />
            <Skeleton variant="text" width="52%" height={20} animation="wave" />
          </Stack>
        </Stack>
      </Stack>
    </GlassCard>
  );
};

export default HRProfileSkeleton;
