import { forwardRef } from 'react';
import {
  Alert,
  Box,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Typography,
} from '@mui/material';
import CloseRounded from '@mui/icons-material/CloseRounded';
import { StyledDialog } from './styled';
import { AppButton } from './common';

const Modal = forwardRef(
  (
    {
      open,
      onClose,
      title,
      description,
      children,
      submitLabel = 'Submit',
      submittingLabel = 'Submitting...',
      onSubmit,
      submitting = false,
      startIcon: SubmitIcon = null,
      error = '',
      maxWidth = 'sm',
      fullWidth = true,
      cancelLabel = 'Cancel',
      closeLabel = 'Close',
      hideSubmit = false,
      hideCancel = false,
      disableSubmit = false,
      resetKey = 0,
      actions,
      ...rest
    },
    ref
  ) => {
    const modalKey = `form-modal-${resetKey}`;
    const titleId = `${modalKey}-title`;
    const descriptionId = `${modalKey}-description`;

    const handleSubmit = (event) => {
      event.preventDefault();

      if (!submitting && onSubmit) {
        onSubmit(event);
      }
    };

    const handleClose = (event, reason) => {
      if (submitting) return;
      if (onClose) {
        onClose(event, reason);
      }
    };

    const handleBackdropClick = (event) => {
      if (!submitting && onClose) {
        onClose(event, 'backdropClick');
      }
    };

    return (
      <StyledDialog
        open={open}
        onClose={handleClose}
        maxWidth={maxWidth}
        fullWidth={fullWidth}
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        slotProps={{
          backdrop: {
            onClick: handleBackdropClick,
          },
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget && !submitting && onClose) {
            onClose(e, 'backdropClick');
          }
        }}
        {...rest}
        ref={ref}
      >
        <Box component="form" onSubmit={handleSubmit} noValidate>
          <DialogTitle sx={{ pr: 6.5 }}>
            <Stack direction="row" sx={{ alignItems: 'center' }} spacing={1.5}>
              {SubmitIcon && (
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 42,
                    height: 42,
                    borderRadius: '10px',
                    backgroundColor: '#252525',
                    color: '#FFFFFF',
                    flexShrink: 0,
                  }}
                >
                  <SubmitIcon fontSize="small" />
                </Box>
              )}
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  {title}
                </Typography>
                {description && (
                  <Typography color="text.secondary" variant="body2" sx={{ mt: 0.25 }}>
                    {description}
                  </Typography>
                )}
              </Box>
            </Stack>
          </DialogTitle>

          <IconButton
            onClick={onClose}
            disabled={submitting}
            aria-label="Close"
            sx={{ position: 'absolute', top: 14, right: 14 }}
          >
            <CloseRounded />
          </IconButton>

          <DialogContent sx={{ overflowX: 'hidden' }}>
            <Box sx={{ pt: 0.5 }}>
              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error}
                </Alert>
              )}
              {children}
            </Box>
          </DialogContent>

          {actions !== null && actions !== false && (
            <DialogActions sx={{ px: 3, pb: 2.5, pt: 1 }}>
              {actions !== undefined ? (
                actions
              ) : hideSubmit ? (
                <AppButton onClick={onClose} disabled={submitting} variant="secondary">
                  {closeLabel || 'Close'}
                </AppButton>
              ) : (
                <>
                  {!hideCancel && (
                    <AppButton onClick={onClose} disabled={submitting} variant="secondary">
                      {cancelLabel}
                    </AppButton>
                  )}
                  <AppButton
                    type="submit"
                    variant="primary"
                    loading={submitting}
                    disabled={disableSubmit}
                    startIcon={SubmitIcon ? <SubmitIcon /> : null}
                  >
                    {submitting ? submittingLabel : submitLabel}
                  </AppButton>
                </>
              )}
            </DialogActions>
          )}
        </Box>
      </StyledDialog>
    );
  }
);

Modal.displayName = 'Modal';

export default Modal;
