import { Box, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import { LogoutRounded } from '@mui/icons-material';
import InitialsAvatar from '../InitialsAvatar';
import { getRoleDisplayName } from './sidebar.config';

const SidebarUser = ({ user, role, onLogout }) => (
  <Box
    sx={{
      border: '1px solid #E5E5E5',
      borderRadius: '12px',
      backgroundColor: '#FAFAFA',
    }}
  >
    <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', p: 1.25 }}>
      <InitialsAvatar name={user?.name} size={34} />
      <Box sx={{ minWidth: 0, flexGrow: 1 }}>
        <Typography variant="body2" sx={{ fontWeight: 700, lineHeight: 1.3 }} noWrap>
          {user?.name || 'User'}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.3 }} noWrap>
          {getRoleDisplayName(role)}
        </Typography>
      </Box>
      <Tooltip title="Logout">
        <IconButton size="small" onClick={onLogout} aria-label="Logout" sx={{ color: 'text.secondary' }}>
          <LogoutRounded fontSize="small" />
        </IconButton>
      </Tooltip>
    </Stack>
  </Box>
);

export default SidebarUser;