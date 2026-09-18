import { Box, Drawer, IconButton, List, Tooltip, Typography, useMediaQuery, useTheme } from '@mui/material';
import { ListItemButton, ListItemIcon, ListItemText } from '@mui/material';
import { LogoutRounded } from '@mui/icons-material';
import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import sidebarConfig, { getRoleDisplayName } from './sidebar.config';
import InitialsAvatar from './InitialsAvatar';
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

const isActivePath = (currentPath, targetPath) => {
  if (!targetPath) return false;

  if (currentPath === targetPath) return true;

  if (targetPath === '/departments') {
    return currentPath.startsWith('/departments');
  }

  if (targetPath === '/super-admin/hospitals') {
    return currentPath.startsWith('/super-admin/hospitals');
  }

  if (targetPath === '/hr/profile') {
    return currentPath.startsWith('/hr/profile');
  }

  if (targetPath === '/hr/hospital') {
    return currentPath.startsWith('/hr/hospital');
  }

  if (targetPath === '/hr/department') {
    return currentPath.startsWith('/hr/department');
  }

  return false;
};

const Section = ({ title, children }) => {
  if (!title && !children) return null;

  return (
    <Box sx={{ mb: 2 }}>
      {title && (
        <Typography
          variant="caption"
          sx={{
            display: 'block',
            px: 1.5,
            pb: 0.75,
            color: '#6B7280',
            letterSpacing: 1.1,
            fontWeight: 700,
          }}
        >
          {title}
        </Typography>
      )}
      {children}
    </Box>
  );
};

const NavItem = ({ item, currentPath, onClick }) => {
  const Icon = item.icon;
  const active = isActivePath(currentPath, item.path);

  return (
    <ListItemButton
      onClick={onClick}
      sx={{
        minHeight: 40,
        px: 1.5,
        py: 0.75,
        borderRadius: '9px',
        backgroundColor: active ? '#0A0A0A' : 'transparent',
        color: active ? '#FFFFFF' : '#3F3F3F',
        transition: 'background-color 150ms ease, color 150ms ease',
        '&:hover': {
          backgroundColor: active ? '#0A0A0A' : '#F5F5F5',
          color: active ? '#FFFFFF' : '#0A0A0A',
        },
      }}
    >
      <ListItemIcon sx={{ minWidth: 30, color: 'inherit' }}>
        <Icon fontSize="small" />
      </ListItemIcon>
      <ListItemText
        primary={item.label}
        slotProps={{
          primary: {
            fontSize: 14,
            fontWeight: active ? 700 : 500,
          },
        }}
      />
    </ListItemButton>
  );
};

const UserCard = ({ user, role, onLogout }) => (
  <Box
    sx={{
      border: '1px solid #E5E5E5',
      borderRadius: '12px',
      backgroundColor: '#FAFAFA',
    }}
  >
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, p: 1.25 }}>
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
    </Box>
  </Box>
);

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
            <Section key={section.title || 'section'} title={section.title}>
              {section.items.map((item) => (
                <NavItem
                  key={`${section.title}-${item.label}`}
                  item={item}
                  currentPath={location.pathname}
                  onClick={async () => {
                    navigate(item.path);
                    onMobileClose();
                  }}
                />
              ))}
            </Section>
          ))}
        </List>
      </Box>

      <Box sx={{ px: 2, py: 2, flexShrink: 0 }}>
        <UserCard user={user} role={resolvedRole} onLogout={handleLogout} />
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