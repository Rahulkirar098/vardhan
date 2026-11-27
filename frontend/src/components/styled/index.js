import { styled } from '@mui/material/styles';
import {
  Dialog,
  Paper,
} from '@mui/material';

/**
 * Reusable StyledPanel component
 */
export const StyledPanel = styled(Paper)(({ theme }) => {
  const sizing = theme.custom?.tokens?.sizing || {};
  return {
    borderRadius: theme.shape.borderRadius || 10,
    backgroundColor: theme.palette.background.paper || '#FFFFFF',
    border: `1px solid ${theme.palette.divider || '#E5E7EB'}`,
    boxShadow: sizing.shadows?.card || '0 1px 3px rgba(37, 37, 37, 0.04)',
    padding: theme.spacing(3),
    boxSizing: 'border-box',
  };
});

/**
 * Reusable StyledDialog component wrapper
 */
export const StyledDialog = styled(Dialog)(({ theme }) => {
  const sizing = theme.custom?.tokens?.sizing || {};
  return {
    '& .MuiDialog-paper': {
      borderRadius: '14px',
      border: `1px solid ${theme.palette.divider || '#E5E7EB'}`,
      boxShadow: sizing.shadows?.modal || '0 20px 25px -5px rgba(37, 37, 37, 0.12)',
      backgroundColor: theme.palette.background.paper || '#FFFFFF',
      backgroundImage: 'none',
      padding: '8px',
      maxHeight: 'calc(100vh - 48px)',
      display: 'flex',
      flexDirection: 'column',
      margin: '16px',
    },
    '& .MuiDialogContent-root': {
      overflowY: 'auto',
      flex: 1,
    },
  };
});

export default {
  StyledPanel,
  StyledDialog,
};
