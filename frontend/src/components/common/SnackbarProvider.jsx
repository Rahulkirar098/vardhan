import React, { createContext, useContext, useState, useCallback } from 'react';
import AppSnackbar from './AppSnackbar';

const SnackbarContext = createContext(null);

export const SnackbarProvider = ({ children }) => {
  const [snackbarState, setSnackbarState] = useState({
    open: false,
    message: '',
    severity: 'info',
    duration: 4000,
    key: 0,
  });

  const showSnackbar = useCallback((message, severity = 'info', duration = 4000) => {
    let msg = message;
    let sev = severity;
    let dur = duration;

    if (typeof message === 'object' && message !== null) {
      msg = message.message || '';
      sev = message.severity || 'info';
      dur = message.duration || 4000;
    }

    setSnackbarState((prev) => ({
      open: true,
      message: msg,
      severity: sev,
      duration: dur,
      key: prev.key + 1,
    }));
  }, []);

  const hideSnackbar = useCallback((event, reason) => {
    if (reason === 'clickaway') return;
    setSnackbarState((prev) => ({ ...prev, open: false }));
  }, []);

  return (
    <SnackbarContext.Provider value={{ showSnackbar, hideSnackbar, showToast: showSnackbar, showSnack: showSnackbar }}>
      {children}
      <AppSnackbar
        key={snackbarState.key}
        open={snackbarState.open}
        message={snackbarState.message}
        severity={snackbarState.severity}
        duration={snackbarState.duration}
        onClose={hideSnackbar}
      />
    </SnackbarContext.Provider>
  );
};

export const useSnackbar = () => {
  const context = useContext(SnackbarContext);
  if (!context) {
    throw new Error('useSnackbar must be used within a SnackbarProvider');
  }
  return context;
};

export default SnackbarProvider;
