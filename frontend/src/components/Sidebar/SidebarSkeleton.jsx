import { Box, Skeleton, Stack } from '@mui/material';

const SidebarSkeleton = () => (
  <Box sx={{ width: 260, height: '100%', minHeight: '100%', background: 'rgba(255,255,255,0.8)', borderRight: '1px solid rgba(15, 23, 42, 0.08)', p: 2 }}>
    <Stack spacing={2}>
      <Skeleton variant="text" width="60%" height={28} />
      <Skeleton variant="text" width="45%" height={18} />
      {[1, 2, 3, 4].map((item) => (
        <Skeleton key={item} variant="rounded" height={42} sx={{ borderRadius: 2 }} />
      ))}
      <Box sx={{ mt: 'auto' }}>
        <Skeleton variant="rounded" height={48} sx={{ borderRadius: 2 }} />
        <Skeleton variant="text" width="70%" height={20} sx={{ mt: 1.5 }} />
      </Box>
    </Stack>
  </Box>
);

export default SidebarSkeleton;
