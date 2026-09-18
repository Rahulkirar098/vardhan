import { AppBar, Box, IconButton, Stack, Toolbar, Typography } from '@mui/material';
import { MenuRounded } from '@mui/icons-material';

export const NAVBAR_HEIGHT = 64;

const Navbar = ({ title = 'Vardhan', userName, userEmail, showMenu = false, onMenuClick }) => {
  return (
    <AppBar
      position="static"
      color="transparent"
      elevation={0}
      sx={{
        height: NAVBAR_HEIGHT,
        flexShrink: 0,
        backgroundColor: 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(18px)',
      }}
    >
      <Toolbar sx={{ minHeight: `${NAVBAR_HEIGHT}px !important`, px: { xs: 2, md: 3 } }}>
        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ flexGrow: 1, minWidth: 0 }}>
          {showMenu && (
            <IconButton edge="start" onClick={onMenuClick} aria-label="Open navigation">
              <MenuRounded />
            </IconButton>
          )}
          <Typography variant="h6" sx={{ fontWeight: 800, letterSpacing: '-0.04em' }}>
            {title}
          </Typography>
        </Stack>

        <Box sx={{ textAlign: 'right', minWidth: 0 }}>
          <Typography variant="body2" sx={{ fontWeight: 700, lineHeight: 1.3 }} noWrap>
            {userName || 'User'}
          </Typography>
          {userEmail && (
            <Typography variant="caption" color="text.secondary" noWrap>
              {userEmail}
            </Typography>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;
