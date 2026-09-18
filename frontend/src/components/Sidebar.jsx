import { Box, Drawer, List, Typography, useMediaQuery, useTheme } from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import sidebarConfig from './Sidebar/sidebar.config';
import SidebarItem from './Sidebar/SidebarItem';
import SidebarSection from './Sidebar/SidebarSection';
import SidebarUser from './Sidebar/SidebarUser';
import Loading from './Loading';

export const SIDEBAR_WIDTH = 250;

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

const getCurrentUser = () => {
  const name = localStorage.getItem('userName') || 'User';
  const email = localStorage.getItem('userEmail') || '';

  return { name, email };
};

const Brand = () => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 1, pb: 0.5, pt: 0.25 }}>
    <Box
      sx={{
        width: 36,
        height: 36,
        borderRadius: '10px',
        backgroundColor: '#0A0A0A',
        color: '#FFFFFF',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 800,
        fontSize: 18,
        letterSpacing: '-0.02em',
        flexShrink: 0,
      }}
    >
      V
    </Box>
    <Box sx={{ minWidth: 0 }}>
      <Typography
        sx={{ fontWeight: 800, fontSize: 17, lineHeight: 1.1, letterSpacing: '-0.01em' }}
        noWrap
      >
        VARDHAN
      </Typography>
      <Typography
        variant="caption"
        sx={{ color: 'text.secondary', fontWeight: 600, letterSpacing: 0.9, fontSize: 9.5 }}
        noWrap
      >
        HOSPITAL WORKFORCE PLATFORM
      </Typography>
    </Box>
  </Box>
);

const Sidebar = ({ role: forcedRole, onLogout, mobileOpen = false, onMobileClose = () => {} }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const resolvedRole = forcedRole || getCurrentRole();
  const user = useMemo(() => getCurrentUser(), []);
  const config = sidebarConfig[resolvedRole];

  useEffect(() => {
    const token = localStorage.getItem('token');
    setLoading(!token);
  }, [resolvedRole]);

  const handleLogout = async () => {
    if (onLogout) {
      await onLogout();
    } else {
      localStorage.removeItem('token');
      localStorage.removeItem('role');
      localStorage.removeItem('userName');
      localStorage.removeItem('userEmail');
      navigate('/login');
    }

    onMobileClose();
  };

  const content = loading || !resolvedRole || !config ? (
    <Box
      sx={{
        width: SIDEBAR_WIDTH,
        height: '100%',
        backgroundColor: '#FFFFFF',
        borderRight: '1px solid #E5E5E5',
      }}
    >
      <Loading label="Loading…" height="100%" />
    </Box>
  ) : (
    <Box
      sx={{
        width: SIDEBAR_WIDTH,
        height: '100%',
        backgroundColor: '#FFFFFF',
        borderRight: '1px solid #E5E5E5',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <Box sx={{ px: 2.5, py: 2.25, flexShrink: 0 }}>
        <Brand />
      </Box>

      <Box sx={{ px: 1.5, pb: 1 }}>
        <Typography
          variant="caption"
          sx={{ color: 'text.secondary', fontWeight: 700, letterSpacing: 1, px: 1.25 }}
        >
          NAVIGATION
        </Typography>
      </Box>

      <Box sx={{ flexGrow: 1, minHeight: 0, overflowY: 'auto', px: 1.5, py: 0.5 }}>
        <List disablePadding>
          {config.sections.map((section) => (
            <SidebarSection key={section.title || 'section'} title={section.title}>
              {section.items.map((item) => (
                <SidebarItem
                  key={`${section.title}-${item.label}`}
                  item={item}
                  currentPath={location.pathname}
                  onClick={async () => {
                    navigate(item.path);
                    onMobileClose();
                  }}
                />
              ))}
            </SidebarSection>
          ))}
        </List>
      </Box>

      <Box sx={{ px: 2, py: 2, flexShrink: 0 }}>
        <SidebarUser user={user} role={resolvedRole} onLogout={handleLogout} />
      </Box>
    </Box>
  );

  if (isMobile) {
    return (
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onMobileClose}
        ModalProps={{ keepMounted: true }}
        sx={{
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: SIDEBAR_WIDTH,
            height: '100%',
            border: 'none',
            background: 'transparent',
          },
        }}
      >
        {content}
      </Drawer>
    );
  }

  return (
    <Box
      sx={{
        width: SIDEBAR_WIDTH,
        flexShrink: 0,
        height: '100%',
        alignSelf: 'stretch',
      }}
    >
      {content}
    </Box>
  );
};

export default Sidebar;