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
 * Brand specs: Primary (#252525, hover #374151, text #FFFFFF)
 * Secondary (#FFFFFF bg, #252525 text, #E5E7EB border, hover #E0F2FE bg with #0284C7 border)
 * Focus (#0284C7 visible outline)
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
      case 'outline':
        return {
          backgroundColor: colors.card || '#FFFFFF',
          color: theme.palette.text.primary || '#252525',
          border: `1px solid ${theme.palette.divider || '#E5E7EB'}`,
          '&:hover': {
            borderColor: colors.strongBlue || '#0284C7',
            backgroundColor: colors.lightBlueBg || '#E0F2FE',
            color: theme.palette.text.primary || '#252525',
          },
        };
      case 'ghost':
        return {
          backgroundColor: 'transparent',
          color: theme.palette.text.primary || '#252525',
          '&:hover': {
            backgroundColor: colors.lightBlueBg || '#E0F2FE',
            color: colors.strongBlue || '#0284C7',
          },
        };
      case 'primary':
      default:
        return {
          backgroundColor: theme.palette.primary.main || '#252525',
          color: theme.palette.primary.contrastText || '#FFFFFF',
          '&:hover': {
            backgroundColor: colors.primaryHover || '#374151',
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
    '&:focus-visible': {
      outline: `2px solid ${colors.strongBlue || '#0284C7'}`,
      outlineOffset: '2px',
    },
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
  const colors = theme.custom?.tokens?.colors || {};
  return {
    '& .MuiOutlinedInput-root': {
      borderRadius: theme.shape.borderRadius || 10,
      backgroundColor: theme.palette.background.paper || '#FFFFFF',
      fontSize: '0.875rem',
      transition: 'all 180ms ease',
      '& fieldset': {
        borderColor: theme.palette.divider || '#E5E7EB',
      },
      '&:hover fieldset': {
        borderColor: colors.strongBlue || '#0284C7',
      },
      '&.Mui-focused fieldset': {
        borderColor: colors.strongBlue || '#0284C7',
        borderWidth: '1.5px',
      },
    },
    '& .MuiInputLabel-root': {
      fontSize: '0.875rem',
      fontWeight: 500,
      color: theme.palette.text.secondary || '#6B7280',
    },
  };
});

/**
 * Reusable StyledPanel / StyledCard component
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

export const StyledCard = StyledPanel;

/**
 * Reusable StyledBadge / Status Badge component
 */
export const StyledBadge = styled(Chip, {
  shouldForwardProp: (prop) => prop !== 'statusType',
})(({ theme, statusType = 'neutral' }) => {
  const statusColors = theme.custom?.tokens?.colors?.status || {};
  const conf = statusColors[statusType] || statusColors.neutral || {
    main: '#6B7280',
    light: '#F3F4F6',
    border: '#E5E7EB',
    text: '#374151',
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
  const colors = theme.custom?.tokens?.colors || {};
  return {
    width: 36,
    height: 36,
    borderRadius: 8,
    border: `1px solid ${theme.palette.divider || '#E5E7EB'}`,
    backgroundColor: theme.palette.background.paper || '#FFFFFF',
    color: theme.palette.text.primary || '#252525',
    transition: 'all 120ms ease',
    '&:hover': {
      borderColor: colors.strongBlue || '#0284C7',
      backgroundColor: colors.lightBlueBg || '#E0F2FE',
      color: colors.strongBlue || '#0284C7',
    },
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

/**
 * Reusable StyledSegmentedTabs & StyledTab
 */
export const StyledSegmentedTabs = styled(Tabs)(({ theme }) => {
  const colors = theme.custom?.tokens?.colors || {};
  return {
    backgroundColor: colors.lightGrayBg || '#F3F4F6',
    borderRadius: '10px',
    padding: '3px',
    minHeight: '36px',
    '& .MuiTabs-indicator': {
      display: 'none',
    },
  };
});

export const StyledSegmentedTab = styled(Tab)(({ theme }) => {
  const colors = theme.custom?.tokens?.colors || {};
  return {
    textTransform: 'none',
    fontWeight: 600,
    fontSize: '0.8125rem',
    minHeight: '32px',
    padding: '6px 14px',
    borderRadius: '7px',
    color: theme.palette.text.secondary || '#6B7280',
    transition: 'all 120ms ease',
    '&.Mui-selected': {
      backgroundColor: theme.palette.primary.main || '#252525',
      color: '#FFFFFF',
      fontWeight: 700,
      boxShadow: '0 1px 3px rgba(37, 37, 37, 0.15)',
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
