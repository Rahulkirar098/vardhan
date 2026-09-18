import { Box, Button, Divider, Drawer, List, Typography, useMediaQuery, useTheme } from '@mui/material';
import { LogoutRounded } from '@mui/icons-material';
import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import sidebarConfig from './Sidebar/sidebar.config';
import SidebarItem from './Sidebar/SidebarItem';
import SidebarSection from './Sidebar/SidebarSection';
import SidebarUser from './Sidebar/SidebarUser';
import SidebarSkeleton from './Sidebar/SidebarSkeleton';

export const SIDEBAR_WIDTH = 260;

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

const getCurrentUser = () => {
  const name = localStorage.getItem('userName') || 'User';
  const email = localStorage.getItem('userEmail') || 'user@example.com';

  return { name, email };
};

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
    <SidebarSkeleton />
  ) : (
    <Box
      sx={{
        width: SIDEBAR_WIDTH,
        height: '100%',
        background: 'rgba(255,255,255,0.88)',
        backdropFilter: 'blur(18px)',
        borderRight: '1px solid rgba(15, 23, 42, 0.08)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <Box sx={{ px: 2.5, py: 2.5, flexShrink: 0 }}>
        <Typography variant="h6" sx={{ fontWeight: 800, letterSpacing: '-0.02em' }}>
          Krince
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, letterSpacing: 0.8 }}>
          Hospital Management
        </Typography>
      </Box>

      <Divider />

      <Box sx={{ flexGrow: 1, minHeight: 0, overflowY: 'auto', px: 1.5, py: 1.5 }}>
        <List disablePadding>
          {config.sections.map((section) => (
            <SidebarSection key={section.title || 'section'} title={section.title}>
              {section.items.map((item) => (
                <SidebarItem
                  key={`${section.title}-${item.label}`}
                  item={item}
                  currentPath={location.pathname}
                  onClick={async () => {
                    if (item.isLogout) {
                      await handleLogout();
                      return;
                    }

                    navigate(item.path);
                    onMobileClose();
                  }}
                />
              ))}
            </SidebarSection>
          ))}
        </List>
      </Box>

      <Box sx={{ px: 2, pb: 2, pt: 1, flexShrink: 0 }}>
        <SidebarUser user={user} role={resolvedRole} />
        <Button
          fullWidth
          variant="outlined"
          color="inherit"
          startIcon={<LogoutRounded />}
          onClick={handleLogout}
          sx={{
            borderRadius: 2,
            borderColor: 'rgba(15, 23, 42, 0.12)',
            backgroundColor: 'rgba(15, 23, 42, 0.02)',
            color: '#111827',
            justifyContent: 'flex-start',
            textTransform: 'none',
            fontWeight: 600,
          }}
        >
          Logout
        </Button>
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
