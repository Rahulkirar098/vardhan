import { forwardRef } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Typography,
} from '@mui/material';
import CloseRounded from '@mui/icons-material/CloseRounded';

const FormModal = forwardRef(
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

    return (
      <Dialog
        open={open}
        onClose={submitting ? undefined : onClose}
        maxWidth={maxWidth}
        fullWidth={fullWidth}
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        disableEscapeKeyDown={submitting}
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
                    backgroundColor: '#000000',
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

          <DialogActions sx={{ px: 3, pb: 2.5, pt: 1 }}>
            {actions ? (
              actions
            ) : (
              <>
                <Button onClick={onClose} disabled={submitting} variant="outlined" color="inherit">
                  {cancelLabel}
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={submitting || disableSubmit}
                  startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : SubmitIcon ? <SubmitIcon /> : null}
                >
                  {submitting ? submittingLabel : submitLabel}
                </Button>
              </>
            )}
          </DialogActions>
        </Box>
      </Dialog>
    );
  }
);

FormModal.displayName = 'FormModal';

export default FormModal;
