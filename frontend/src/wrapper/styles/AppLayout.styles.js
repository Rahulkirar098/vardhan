import { styled } from '@mui/material/styles';
import { Box } from '@mui/material';

export const AppLayoutRoot = styled(Box)(({ theme }) => ({
  height: '100vh',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  backgroundColor: theme.palette.background.default,
}));

export const AppLayoutBody = styled(Box)(({ navbarHeight }) => ({
  display: 'flex',
  flex: 1,
  minHeight: 0,
  height: `calc(100vh - ${navbarHeight || 64}px)`,
}));

export const AppLayoutMain = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'sidebarWidth',
})(({ theme, sidebarWidth }) => ({
  flex: 1,
  minWidth: 0,
  height: '100%',
  overflowY: 'auto',
  padding: theme.spacing(2.5),

  [theme.breakpoints.up('md')]: {
    padding: theme.spacing(4),
    width: `calc(100% - ${sidebarWidth || 260}px)`,
  },
}));

export const AppLayoutContentWrapper = styled(Box)(({ theme }) => ({
  width: '100%',
  maxWidth: theme.custom?.sizing?.components?.pageMaxWidth || 1440,
  marginLeft: 'auto',
  marginRight: 'auto',
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(3),

  [theme.breakpoints.up('md')]: {
    gap: theme.spacing(3.5),
  },
}));
