import { AppBar, Box, IconButton, Stack, Toolbar, Typography } from '@mui/material';
import { MenuRounded } from '@mui/icons-material';
import { useLocation } from 'react-router-dom';
import InitialsAvatar from './InitialsAvatar';
import { getRoleDisplayName } from './sidebar.config';

export const NAVBAR_HEIGHT = 64;

const PAGE_META = [
  { test: (path) => path === '/dashboard', title: 'Dashboard', breadcrumb: 'Workspace' },
  { test: (path) => path === '/hospital', title: 'Hospital', breadcrumb: 'Workspace' },
  { test: (path) => path === '/positions', title: 'Positions', breadcrumb: 'Workspace' },
  { test: (path) => path === '/employees', title: 'Employees', breadcrumb: 'Workspace' },
  { test: (path) => path === '/access-management', title: 'Access Management', breadcrumb: 'Workspace' },
  { test: (path) => path === '/structure', title: 'Hospital Structure', breadcrumb: 'Workspace' },
  { test: (path) => path.startsWith('/structure/'), title: 'Floor Details', breadcrumb: 'Workspace / Hospital Structure' },
  { test: (path) => path === '/profile', title: 'My Profile', breadcrumb: 'Account' },
  { test: (path) => path === '/super-admin/dashboard', title: 'Hospitals', breadcrumb: 'Platform' },
  { test: (path) => path.startsWith('/super-admin/hospitals/'), title: 'Hospital Details', breadcrumb: 'Platform / Hospitals' },
  { test: (path) => path === '/hr/dashboard', title: 'Dashboard', breadcrumb: 'My Workspace' },
  { test: (path) => path === '/hr/profile', title: 'My Profile', breadcrumb: 'My Workspace' },
  { test: (path) => path === '/hr/hospital', title: 'My Hospital', breadcrumb: 'My Workspace' },
];

const getPageMeta = (pathname) =>
  PAGE_META.find((meta) => meta.test(pathname)) || { title: 'Vardhan', breadcrumb: '' };

const Navbar = ({ userName = 'User', userRole, showMenu = false, onMenuClick }) => {
  const { pathname } = useLocation();
  const meta = getPageMeta(pathname);

  return (
    <AppBar
      position="static"
      color="transparent"
      elevation={0}
      sx={{
        height: NAVBAR_HEIGHT,
        flexShrink: 0,
        backgroundColor: '#FFFFFF',
        borderBottom: '1px solid #E5E5E5',
      }}
    >
      <Toolbar sx={{ minHeight: `${NAVBAR_HEIGHT}px !important`, px: { xs: 2, md: 4 } }}>
        <Stack direction="row" sx={{ flexGrow: 1, minWidth: 0, alignItems: 'center' }} spacing={1.5}>
          {showMenu && (
            <IconButton edge="start" onClick={onMenuClick} aria-label="Open navigation">
              <MenuRounded />
            </IconButton>
          )}

          <Box sx={{ minWidth: 0 }}>
            {meta.breadcrumb && (
              <Typography
                variant="caption"
                noWrap
                sx={{ display: 'block', color: 'text.secondary', lineHeight: 1.2, fontWeight: 500 }}
              >
                {meta.breadcrumb}
              </Typography>
            )}
            <Typography noWrap sx={{ fontWeight: 700, fontSize: 16, lineHeight: 1.3, letterSpacing: '-0.01em' }}>
              {meta.title}
            </Typography>
          </Box>
        </Stack>

        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', flexShrink: 0, minWidth: 0 }}>
          <Box sx={{ textAlign: 'right', minWidth: 0, display: { xs: 'none', sm: 'block' } }}>
            <Typography variant="body2" sx={{ fontWeight: 700, lineHeight: 1.3 }} noWrap>
              {userName}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap sx={{ lineHeight: 1.3, display: 'block' }}>
              {getRoleDisplayName(userRole)}
            </Typography>
          </Box>
          <InitialsAvatar name={userName} size={36} />
        </Stack>
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;