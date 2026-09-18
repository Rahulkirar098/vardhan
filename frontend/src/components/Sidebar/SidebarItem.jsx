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

export default SidebarItem;