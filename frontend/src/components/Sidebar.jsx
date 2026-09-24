import { Box, Drawer, IconButton, List, Tooltip, Typography, useMediaQuery, useTheme } from '@mui/material';
import { ListItemButton, ListItemIcon, ListItemText } from '@mui/material';
import { LogoutRounded } from '@mui/icons-material';
import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getRoleDisplayName, getSidebarSectionsForRole } from './sidebar.config';
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
  const positionName = localStorage.getItem('positionName') || null;
  const hospitalName = localStorage.getItem('hospitalName') || '';

  return { name, email, positionName, hospitalName };
};

const isActivePath = (currentPath, targetPath) => {
  if (!targetPath) return false;

  if (currentPath === targetPath) return true;

  if (targetPath === '/structure') {
    return currentPath.startsWith('/structure');
  }

  if (targetPath === '/super-admin/hospitals') {
    return currentPath.startsWith('/super-admin/hospitals');
  }

  if (targetPath === '/employees') {
    return currentPath.startsWith('/employees');
  }

  if (targetPath === '/leaves') {
    return currentPath.startsWith('/leaves');
  }

  if (targetPath === '/access-management') {
    return currentPath.startsWith('/access-management');
  }

  if (targetPath === '/profile') {
    return currentPath.startsWith('/profile');
  }

  return false;
};

const Section = ({ title, isFirst, children }) => {
  if (!title && !children) return null;

  return (
    <Box sx={{ mb: 1.5 }}>
      {title && (
        <Typography
          variant="caption"
          sx={{
            display: 'block',
            px: 1.5,
            pt: isFirst ? 0.5 : 2,
            pb: 0.75,
            color: '#94A3B8',
            letterSpacing: '0.08em',
            fontWeight: 700,
            fontSize: '0.7rem',
            textTransform: 'uppercase',
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
        minHeight: 44,
        px: 1.5,
        py: 0.85,
        mb: 0.4,
        borderRadius: '10px',
        backgroundColor: active ? '#0F172A' : 'transparent',
        color: active ? '#FFFFFF' : '#334155',
        transition: 'all 120ms ease',
        '&:hover': {
          backgroundColor: active ? '#0F172A' : '#F1F5F9',
          color: active ? '#FFFFFF' : '#0F172A',
          '& .MuiListItemIcon-root': {
            color: active ? '#FFFFFF' : '#0F172A',
          },
        },
      }}
    >
      <ListItemIcon
        sx={{
          minWidth: 32,
          color: active ? '#FFFFFF' : '#64748B',
          transition: 'color 120ms ease',
          '& .MuiSvgIcon-root': {
            fontSize: 20,
          },
        }}
      >
        <Icon />
      </ListItemIcon>
      <ListItemText
        primary={item.label}
        primaryTypographyProps={{
          fontSize: '0.885rem',
          fontWeight: active ? 700 : 500,
          color: active ? '#FFFFFF' : 'inherit',
          noWrap: true,
        }}
      />
    </ListItemButton>
  );
};

const UserCard = ({ user, role, onLogout }) => (
  <Box
    sx={{
      border: '1px solid #E2E8F0',
      borderRadius: '12px',
      backgroundColor: '#FAFAFA',
      p: 1.25,
      transition: 'all 120ms ease',
      '&:hover': {
        borderColor: '#CBD5E1',
      },
    }}
  >
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
      <InitialsAvatar
        name={user?.name}
        size={36}
        sx={{
          backgroundColor: '#0F172A',
          color: '#FFFFFF',
          fontWeight: 700,
        }}
      />
      <Box sx={{ minWidth: 0, flexGrow: 1 }}>
        <Typography
          variant="body2"
          sx={{
            fontWeight: 700,
            fontSize: '0.85rem',
            color: '#0F172A',
            lineHeight: 1.25,
          }}
          noWrap
        >
          {user?.name || 'User'}
        </Typography>
        <Typography
          variant="caption"
          sx={{
            color: '#64748B',
            fontSize: '0.75rem',
            fontWeight: 500,
            lineHeight: 1.25,
            display: 'block',
          }}
          noWrap
        >
          {user?.positionName || getRoleDisplayName(role)}
        </Typography>
      </Box>
      <Tooltip title="Logout">
        <IconButton
          size="small"
          onClick={onLogout}
          aria-label="Logout"
          sx={{
            color: '#64748B',
            borderRadius: '8px',
            p: 0.75,
            '&:hover': {
              color: '#0F172A',
              backgroundColor: '#F1F5F9',
            },
          }}
        >
          <LogoutRounded fontSize="small" />
        </IconButton>
      </Tooltip>
    </Box>
  </Box>
);

const Brand = ({ hospitalName, role }) => {
  const isSuperAdmin = role === 'super_admin';
  const displayName = hospitalName || (isSuperAdmin ? 'Super Admin' : 'Hospital Workspace');

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 0.5 }}>
      <InitialsAvatar
        name={displayName}
        size={36}
        sx={{
          borderRadius: '9px',
          backgroundColor: '#0F172A',
          color: '#FFFFFF',
          fontWeight: 800,
          fontSize: '0.85rem',
          letterSpacing: '-0.02em',
          flexShrink: 0,
          boxShadow: '0 2px 6px rgba(15,23,42,0.15)',
        }}
      />
      <Box sx={{ minWidth: 0, flexGrow: 1 }}>
        <Typography
          sx={{
            fontWeight: 800,
            fontSize: '0.975rem',
            lineHeight: 1.25,
            letterSpacing: '-0.01em',
            color: '#0F172A',
          }}
          noWrap
          title={displayName}
        >
          {displayName}
        </Typography>
      </Box>
    </Box>
  );
};

const Sidebar = ({ role: forcedRole, user: userProp, onLogout, mobileOpen = false, onMobileClose = () => {} }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const resolvedRole = forcedRole || userProp?.role || getCurrentRole();
  const currentUser = userProp || getCurrentUser();
  const sections = useMemo(
    () => getSidebarSectionsForRole(resolvedRole, userProp?.permissions, userProp?.modules),
    [resolvedRole, userProp?.permissions, userProp?.modules]
  );

  useEffect(() => {
    const token = localStorage.getItem('token');
    setLoading(!token);
  }, [resolvedRole]);

  const handleLogout = async () => {
    if (onLogout) {
      await onLogout();
    } else {
      localStorage.removeItem('token');
      localStorage.removeItem('userId');
      localStorage.removeItem('role');
      localStorage.removeItem('userName');
      localStorage.removeItem('userEmail');
      localStorage.removeItem('positionName');
      localStorage.removeItem('permissions');
      localStorage.removeItem('modules');
      localStorage.removeItem('hospitalId');
      localStorage.removeItem('hospitalName');
      localStorage.removeItem('hospitalLocation');
      localStorage.removeItem('employeeId');
      navigate('/login');
    }

    onMobileClose();
  };

  const content = loading || !resolvedRole || !sections ? (
    <Box
      sx={{
        width: SIDEBAR_WIDTH,
        height: '100%',
        backgroundColor: '#FFFFFF',
        borderRight: '1px solid #E5E7EB',
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
        borderRight: '1px solid #E5E7EB',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Top Brand Header */}
      <Box sx={{ px: 2.5, pt: 2.75, pb: 2.25, flexShrink: 0 }}>
        <Brand hospitalName={currentUser?.hospitalName} role={resolvedRole} />
      </Box>

      {/* Navigation Groups */}
      <Box sx={{ flexGrow: 1, minHeight: 0, overflowY: 'auto', px: 1.75, py: 0.5 }}>
        <List disablePadding>
          {sections.map((section, idx) => (
            <Section key={section.title || `section-${idx}`} title={section.title} isFirst={idx === 0}>
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

      {/* Fixed Bottom User Card */}
      <Box sx={{ px: 2, py: 2, borderTop: '1px solid #F1F5F9', flexShrink: 0 }}>
        <UserCard user={currentUser} role={resolvedRole} onLogout={handleLogout} />
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