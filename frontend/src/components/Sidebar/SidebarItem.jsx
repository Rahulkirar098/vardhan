import { ListItemButton, ListItemIcon, ListItemText } from '@mui/material';

const isActivePath = (currentPath, targetPath) => {
  if (!targetPath) return false;

  if (currentPath === targetPath) return true;

  if (targetPath === '/departments') {
    return currentPath.startsWith('/departments');
  }

  if (targetPath === '/super-admin/dashboard') {
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

const SidebarItem = ({ item, currentPath, onClick }) => {
  const Icon = item.icon;
  const active = isActivePath(currentPath, item.path);

  return (
    <ListItemButton
      onClick={onClick}
      sx={{
        borderRadius: 2,
        minHeight: 42,
        px: 1.5,
        py: 0.75,
        backgroundColor: active ? 'rgba(0, 0, 0, 0.92)' : 'transparent',
        color: active ? '#FFFFFF' : '#111827',
        transition: 'all 180ms ease',
        '&:hover': {
          backgroundColor: active ? 'rgba(0, 0, 0, 0.96)' : 'rgba(17, 24, 39, 0.04)',
        },
      }}
    >
      <ListItemIcon sx={{ minWidth: 32, color: active ? '#FFFFFF' : '#111827' }}>
        <Icon fontSize="small" />
      </ListItemIcon>
      <ListItemText
        primary={item.label}
        primaryTypographyProps={{
          fontSize: 14,
          fontWeight: active ? 700 : 500,
        }}
      />
    </ListItemButton>
  );
};

export default SidebarItem;
