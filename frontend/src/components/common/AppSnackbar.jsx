import React from 'react';
import { Snackbar, Alert, IconButton } from '@mui/material';
import {
  CloseRounded as CloseIcon,
  CheckCircleOutlineRounded as CheckCircleOutlineIcon,
  ErrorOutlineRounded as ErrorOutlineIcon,
  WarningAmberRounded as WarningAmberIcon,
  InfoOutlined as InfoOutlinedIcon,
} from '@mui/icons-material';

const getSeverityIcon = (severity) => {
  switch (severity) {
    case 'success':
      return <CheckCircleOutlineIcon fontSize="small" />;
    case 'error':
      return <ErrorOutlineIcon fontSize="small" />;
    case 'warning':
      return <WarningAmberIcon fontSize="small" />;
    case 'info':
    default:
      return <InfoOutlinedIcon fontSize="small" />;
  }
};

const getSeverityColors = (severity) => {
  switch (severity) {
    case 'success':
      return {
        border: '#bbf7d0',
        icon: '#16a34a',
        accent: '#22c55e',
      };
    case 'error':
      return {
        border: '#fecaca',
        icon: '#dc2626',
        accent: '#ef4444',
      };
    case 'warning':
      return {
        border: '#fef08a',
        icon: '#d97706',
        accent: '#f59e0b',
      };
    case 'info':
    default:
      return {
        border: '#bfdbfe',
        icon: '#2563eb',
        accent: '#3b82f6',
      };
  }
};

/**
 * AppSnackbar Component
 * Nuvince design system top-right clean toast notification.
 */
const AppSnackbar = ({ open, message, severity = 'info', duration = 4000, onClose }) => {
  const colors = getSeverityColors(severity);

  return (
    <Snackbar
      open={open}
      autoHideDuration={duration}
      onClose={onClose}
      anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      sx={{
        top: { xs: 16, sm: 24 } + ' !important',
        right: { xs: 16, sm: 24 } + ' !important',
        zIndex: (theme) => theme.zIndex.modal + 2000,
        maxWidth: { xs: 'calc(100vw - 32px)', sm: 420 },
      }}
    >
      <Alert
        severity={severity}
        icon={getSeverityIcon(severity)}
        action={
          <IconButton
            size="small"
            aria-label="close notification"
            color="inherit"
            onClick={onClose}
            sx={{ p: 0.5, color: '#64748b', '&:hover': { color: '#1e293b', backgroundColor: 'rgba(0,0,0,0.04)' } }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        }
        sx={{
          width: '100%',
          backgroundColor: '#ffffff',
          color: '#1e293b',
          borderRadius: '12px',
          border: `1px solid ${colors.border}`,
          boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.08), 0 8px 10px -6px rgba(15, 23, 42, 0.04)',
          alignItems: 'center',
          py: 1,
          px: 2,
          '& .MuiAlert-icon': {
            color: colors.icon,
            fontSize: 22,
            mr: 1.5,
            py: 0,
          },
          '& .MuiAlert-message': {
            fontSize: '0.875rem',
            fontWeight: 500,
            color: '#334155',
            lineHeight: 1.4,
            py: 0.25,
          },
          '& .MuiAlert-action': {
            pt: 0,
            mr: -0.5,
            alignSelf: 'center',
          },
        }}
      >
        {message}
      </Alert>
    </Snackbar>
  );
};

export default AppSnackbar;
