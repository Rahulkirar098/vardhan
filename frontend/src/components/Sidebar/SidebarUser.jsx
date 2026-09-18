import { Avatar, Box, Stack, Typography } from '@mui/material';
import { getRoleDisplayName } from './sidebar.config';

const SidebarUser = ({ user, role }) => (
  <Box sx={{ px: 2, pb: 2 }}>
    <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 1.5 }}>
      <Avatar sx={{ width: 32, height: 32, backgroundColor: '#111827', color: '#FFFFFF', fontSize: 12 }}>
        {user?.name?.charAt(0)?.toUpperCase() || 'U'}
      </Avatar>
      <Box>
        <Typography variant="body2" sx={{ fontWeight: 700, lineHeight: 1.3 }}>
          {user?.name || 'User'}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.3 }}>
          {user?.email || 'user@example.com'}
        </Typography>
      </Box>
    </Stack>
    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600 }}>
      {getRoleDisplayName(role)}
    </Typography>
  </Box>
);

export default SidebarUser;
