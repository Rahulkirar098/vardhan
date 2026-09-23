import { Box, useMediaQuery, useTheme } from '@mui/material';
import { useState, useEffect } from 'react';
import AppNavbar, { NAVBAR_HEIGHT } from './Navbar';
import AppSidebar, { SIDEBAR_WIDTH } from './Sidebar';
import auth from '../services/auth.service';

const getCurrentRole = () => {
  const token = localStorage.getItem('token');

  if (!token) return null;

  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(base64));
    return payload.role || null;
  } catch {
    return null;
  }
};

const AppLayout = ({ children, onLogout }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const role = getCurrentRole();
  const [userName, setUserName] = useState(localStorage.getItem('userName') || 'User');
  const [positionName, setPositionName] = useState(localStorage.getItem('positionName') || '');

  useEffect(() => {
    auth.me().then((res) => {
      const u = res?.data?.data;
      if (u) {
        if (u.name) {
          localStorage.setItem('userName', u.name);
          setUserName(u.name);
        }
        if (u.positionName) {
          localStorage.setItem('positionName', u.positionName);
          setPositionName(u.positionName);
        } else if (u.role !== 'employee') {
          localStorage.removeItem('positionName');
          setPositionName('');
        }
      }
    }).catch(() => {});
  }, []);

  return (
    <Box
      sx={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        backgroundColor: '#FAFAFA',
      }}
    >
      <AppNavbar
        userName={userName}
        userRole={role}
        userPosition={positionName}
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
            p: { xs: 2, md: 4 },
            width: { md: `calc(100% - ${SIDEBAR_WIDTH}px)` },
          }}
        >
          <Box sx={{ width: '100%', maxWidth: 1280, mx: 'auto' }}>{children}</Box>
        </Box>
      </Box>
    </Box>
  );
};

export default AppLayout;