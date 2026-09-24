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

const getInitialUser = () => {
  let permissions = [];
  let modules = ['core'];

  try {
    const p = localStorage.getItem('permissions');
    if (p) permissions = JSON.parse(p);
  } catch {
    permissions = [];
  }

  try {
    const m = localStorage.getItem('modules');
    if (m) modules = JSON.parse(m);
  } catch {
    modules = ['core'];
  }

  return {
    id: localStorage.getItem('userId') || '',
    name: localStorage.getItem('userName') || 'User',
    email: localStorage.getItem('userEmail') || '',
    role: getCurrentRole(),
    positionName: localStorage.getItem('positionName') || '',
    permissions,
    modules,
    hospitalId: localStorage.getItem('hospitalId') || '',
    hospitalName: localStorage.getItem('hospitalName') || '',
    hospitalLocation: localStorage.getItem('hospitalLocation') || '',
    employeeId: localStorage.getItem('employeeId') || '',
  };
};

const AppLayout = ({ children, onLogout }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userProfile, setUserProfile] = useState(getInitialUser);

  useEffect(() => {
    auth.me().then((res) => {
      const u = res?.data?.data;
      if (u) {
        const uid = u.id || u._id || '';
        const name = u.name || 'User';
        const email = u.email || '';
        const role = u.role || 'employee';
        const positionName = u.positionName || '';
        const permissions = Array.isArray(u.permissions) ? u.permissions : [];
        const modules = Array.isArray(u.modules) ? u.modules : ['core'];
        const hospitalId = u.hospitalId || '';
        const hospitalName = u.hospitalName || '';
        const hospitalLocation = u.hospitalLocation || '';
        const employeeId = u.employeeId || '';

        // Synchronize all access keys into localStorage
        if (uid) localStorage.setItem('userId', uid);
        localStorage.setItem('userName', name);
        if (email) localStorage.setItem('userEmail', email);
        localStorage.setItem('role', role);
        localStorage.setItem('permissions', JSON.stringify(permissions));
        localStorage.setItem('modules', JSON.stringify(modules));

        if (positionName) {
          localStorage.setItem('positionName', positionName);
        } else {
          localStorage.removeItem('positionName');
        }

        if (hospitalId) {
          localStorage.setItem('hospitalId', hospitalId);
        } else {
          localStorage.removeItem('hospitalId');
        }

        if (hospitalName) {
          localStorage.setItem('hospitalName', hospitalName);
        } else {
          localStorage.removeItem('hospitalName');
        }

        if (hospitalLocation) {
          localStorage.setItem('hospitalLocation', hospitalLocation);
        } else {
          localStorage.removeItem('hospitalLocation');
        }

        if (employeeId) {
          localStorage.setItem('employeeId', employeeId);
        } else {
          localStorage.removeItem('employeeId');
        }

        setUserProfile({
          id: uid,
          name,
          email,
          role,
          positionName,
          permissions,
          modules,
          hospitalId,
          hospitalName,
          hospitalLocation,
          employeeId,
        });
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
        userName={userProfile.name}
        userRole={userProfile.role}
        userPosition={userProfile.positionName}
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
          user={userProfile}
          role={userProfile.role}
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