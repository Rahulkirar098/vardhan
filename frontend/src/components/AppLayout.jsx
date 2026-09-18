import { Box, useMediaQuery, useTheme } from '@mui/material';
import { useState } from 'react';
import AppNavbar, { NAVBAR_HEIGHT } from './Navbar';
import AppSidebar, { SIDEBAR_WIDTH } from './Sidebar';

const getCurrentRole = () => {
  const token = localStorage.getItem('token');

  if (!token) return null;

  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(base64));
    return payload.role || null;
  } catch (error) {
    return null;
  }
};

const AppLayout = ({ children, onLogout }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const role = getCurrentRole();
  const userName = localStorage.getItem('userName') || 'User';
  const userEmail = localStorage.getItem('userEmail') || '';
  const navbarTitle = role === 'super_admin' ? 'Vardhan Super Admin' : 'Vardhan';

  return (
    <Box
      sx={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        background: 'linear-gradient(180deg, #F7F7F7 0%, #F2F2F2 100%)',
      }}
    >
      <AppNavbar
        title={navbarTitle}
        userName={userName}
        userEmail={userEmail}
        showMenu={isMobile}
        onMenuClick={() => setMobileOpen(true)}
      />

      <Box
        sx={{
          display: 'flex',
          flex: 1,
          minHeight: 0,
          height: `calc(100vh - ${NAVBAR_HEIGHT}px)`,
        }}
      >
        <AppSidebar
          mobileOpen={mobileOpen}
          onMobileClose={() => setMobileOpen(false)}
          onLogout={onLogout}
        />

        <Box
          component="main"
          sx={{
            flex: 1,
            minWidth: 0,
            height: '100%',
            overflowY: 'auto',
            p: { xs: 2.5, md: 4 },
            ml: { md: 0 },
            width: { md: `calc(100% - ${SIDEBAR_WIDTH}px)` },
          }}
        >
          <Box sx={{ width: '100%', maxWidth: 1400, mx: 'auto' }}>
            {children}
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default AppLayout;
