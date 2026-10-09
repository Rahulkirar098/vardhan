import { styled } from '@mui/material/styles';
import {
  Box,
  Button,
  Card,
  Chip,
  Dialog,
  IconButton,
  Paper,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';

/**
 * Reusable StyledButton component using MUI styled() API
 */
export const StyledButton = styled(Button, {
  shouldForwardProp: (prop) => prop !== 'variantType',
})(({ theme, variantType = 'primary' }) => {
  const custom = theme.custom || {};
  const tokens = custom.tokens || {};
  const colors = tokens.colors || {};

  const getVariantStyles = () => {
    switch (variantType) {
      case 'destructive':
        return {
          backgroundColor: colors.destructive || '#E7000B',
          color: '#FFFFFF',
          '&:hover': {
            backgroundColor: '#C50009',
          },
        };
      case 'secondary':
        return {
          backgroundColor: colors.secondary || '#F1F5F9',
          color: colors.foreground || '#020618',
          '&:hover': {
            backgroundColor: '#E2E8F0',
          },
        };
      case 'outline':
        return {
          backgroundColor: colors.background || '#FFFFFF',
          color: colors.foreground || '#020618',
          border: `1px solid ${colors.border || '#E2E8F0'}`,
          '&:hover': {
            borderColor: colors.ring || '#90A1B9',
            backgroundColor: colors.secondary || '#F1F5F9',
          },
        };
      case 'ghost':
        return {
          backgroundColor: 'transparent',
          color: colors.foreground || '#020618',
          '&:hover': {
            backgroundColor: colors.secondary || '#F1F5F9',
          },
        };
      case 'primary':
      default:
        return {
          backgroundColor: colors.primary || '#0F172B',
          color: colors.primaryForeground || '#F8FAFC',
          '&:hover': {
            backgroundColor: '#1E293B',
          },
        };
    }
  };

  return {
    borderRadius: theme.shape.borderRadius || 10,
    textTransform: 'none',
    fontWeight: 600,
    fontSize: '0.875rem',
    lineHeight: 1.4,
    padding: '9px 18px',
    boxShadow: 'none',
    transition: 'all 180ms cubic-bezier(0.4, 0, 0.2, 1)',
    ...getVariantStyles(),
    '&.Mui-disabled': {
      opacity: 0.55,
      cursor: 'not-allowed',
    },
  };
});

/**
 * Reusable StyledTextField component
 */
export const StyledTextField = styled(TextField)(({ theme }) => {
  const colors = theme.custom?.colors || {};
  return {
    '& .MuiOutlinedInput-root': {
      borderRadius: theme.shape.borderRadius || 10,
      backgroundColor: colors.background || '#FFFFFF',
      fontSize: '0.875rem',
      transition: 'all 180ms ease',
      '& fieldset': {
        borderColor: colors.border || '#E2E8F0',
      },
      '&:hover fieldset': {
        borderColor: colors.ring || '#90A1B9',
      },
      '&.Mui-focused fieldset': {
        borderColor: colors.primary || '#0F172B',
        borderWidth: '1.5px',
      },
    },
    '& .MuiInputLabel-root': {
      fontSize: '0.875rem',
      fontWeight: 500,
      color: colors.mutedForeground || '#62748E',
    },
  };
});

/**
 * Reusable StyledPanel / StyledCard component
 */
export const StyledPanel = styled(Paper)(({ theme }) => {
  const colors = theme.custom?.colors || {};
  const sizing = theme.custom?.sizing || {};
  return {
    borderRadius: theme.shape.borderRadius || 10,
    backgroundColor: colors.background || '#FFFFFF',
    border: `1px solid ${colors.border || '#E2E8F0'}`,
    boxShadow: sizing.shadows?.card || '0 1px 3px rgba(2, 6, 24, 0.04)',
    padding: theme.spacing(3),
    boxSizing: 'border-box',
  };
});

export const StyledCard = StyledPanel;

/**
 * Reusable StyledBadge / Status Badge component
 */
export const StyledBadge = styled(Chip, {
  shouldForwardProp: (prop) => prop !== 'statusType',
})(({ theme, statusType = 'neutral' }) => {
  const statusColors = theme.custom?.colors?.status || {};
  const conf = statusColors[statusType] || statusColors.neutral || {
    main: '#62748E',
    light: '#F8FAFC',
    border: '#E2E8F0',
    text: '#334155',
  };

  return {
    backgroundColor: conf.light,
    color: conf.text,
    border: `1px solid ${conf.border}`,
    borderRadius: 9999,
    fontWeight: 600,
    fontSize: '0.75rem',
    height: '24px',
    padding: '0 8px',
    '& .MuiChip-label': {
      padding: 0,
    },
  };
});

/**
 * Reusable StyledIconButton component
 */
export const StyledIconButton = styled(IconButton)(({ theme }) => {
  const colors = theme.custom?.colors || {};
  return {
    width: 36,
    height: 36,
    borderRadius: 8,
    border: `1px solid ${colors.border || '#E2E8F0'}`,
    backgroundColor: colors.background || '#FFFFFF',
    color: colors.foreground || '#020618',
    transition: 'all 120ms ease',
    '&:hover': {
      borderColor: colors.ring || '#90A1B9',
      backgroundColor: colors.secondary || '#F1F5F9',
    },
  };
});

/**
 * Reusable StyledDialog component wrapper
 */
export const StyledDialog = styled(Dialog)(({ theme }) => {
  const colors = theme.custom?.colors || {};
  const sizing = theme.custom?.sizing || {};
  return {
    '& .MuiDialog-paper': {
      borderRadius: '14px',
      border: `1px solid ${colors.border || '#E2E8F0'}`,
      boxShadow: sizing.shadows?.modal || '0 20px 25px -5px rgba(2, 6, 24, 0.12)',
      backgroundColor: colors.background || '#FFFFFF',
      backgroundImage: 'none',
      padding: '8px',
    },
  };
});

/**
 * Reusable StyledSegmentedTabs & StyledTab
 */
export const StyledSegmentedTabs = styled(Tabs)(({ theme }) => {
  const colors = theme.custom?.colors || {};
  return {
    backgroundColor: colors.secondary || '#F1F5F9',
    borderRadius: '10px',
    padding: '3px',
    minHeight: '36px',
    '& .MuiTabs-indicator': {
      display: 'none',
    },
  };
});

export const StyledSegmentedTab = styled(Tab)(({ theme }) => {
  const colors = theme.custom?.colors || {};
  return {
    textTransform: 'none',
    fontWeight: 600,
    fontSize: '0.8125rem',
    minHeight: '32px',
    padding: '6px 14px',
    borderRadius: '7px',
    color: colors.mutedForeground || '#62748E',
    transition: 'all 120ms ease',
    '&.Mui-selected': {
      backgroundColor: colors.primary || '#0F172B',
      color: '#FFFFFF',
      fontWeight: 700,
      boxShadow: '0 1px 3px rgba(15,23,42,0.15)',
    },
  };
});

export default {
  StyledButton,
  StyledTextField,
  StyledPanel,
  StyledCard,
  StyledBadge,
  StyledIconButton,
  StyledDialog,
  StyledSegmentedTabs,
  StyledSegmentedTab,
};
