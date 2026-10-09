import {
  Box,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from '@mui/material';
import WarningRounded from '@mui/icons-material/WarningRounded';
import { StyledDialog } from './styled';
import { AppButton } from './common';

const ConfirmDialog = ({
  open,
  title = 'Are you sure?',
  message,
  description,
  confirmLabel,
  confirmText = 'Confirm',
  cancelLabel,
  cancelText = 'Cancel',
  onConfirm,
  onClose,
  onCancel,
  submitting = false,
  loading = false,
  danger = false,
  destructive = false,
  confirmColor,
}) => {
  const effectiveMessage = message || description;
  const effectiveConfirmLabel = confirmLabel || confirmText;
  const effectiveCancelLabel = cancelLabel || cancelText;
  const effectiveOnClose = onCancel || onClose;
  const isSubmitting = submitting || loading;
  const isDanger = danger || destructive || confirmColor === 'error';

  const handleClose = (event, reason) => {
    if (isSubmitting) return;
    if (effectiveOnClose) {
      effectiveOnClose(event, reason);
    }
  };

  const handleBackdropClick = (event) => {
    if (!isSubmitting && effectiveOnClose) {
      effectiveOnClose(event, 'backdropClick');
    }
  };

  return (
    <StyledDialog
      open={open}
      onClose={handleClose}
      maxWidth="xs"
      fullWidth
      aria-labelledby="confirm-dialog-title"
      slotProps={{
        backdrop: {
          onClick: handleBackdropClick,
        },
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting && effectiveOnClose) {
          effectiveOnClose(e, 'backdropClick');
        }
      }}
    >
      <DialogTitle
        id="confirm-dialog-title"
        sx={{ pb: 1, display: 'flex', alignItems: 'center', gap: 1.5 }}
      >
        <Box
          sx={{
            width: 32,
            height: 32,
            borderRadius: '8px',
            backgroundColor: isDanger ? '#FEF2F2' : '#F3F4F6',
            color: isDanger ? '#DF2225' : '#252525',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <WarningRounded fontSize="small" />
        </Box>
        <Typography variant="h6" fontWeight={700} component="span">
          {title}
        </Typography>
      </DialogTitle>
      <DialogContent>
        {effectiveMessage && (
          <Typography color="text.secondary" variant="body2" sx={{ whiteSpace: 'pre-line' }}>
            {effectiveMessage}
          </Typography>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5, pt: 1 }}>
        <AppButton
          onClick={effectiveOnClose}
          disabled={isSubmitting}
          variant="secondary"
        >
          {effectiveCancelLabel}
        </AppButton>
        <AppButton
          onClick={onConfirm}
          loading={isSubmitting}
          variant={isDanger ? 'danger' : 'primary'}
        >
          {effectiveConfirmLabel}
        </AppButton>
      </DialogActions>
    </StyledDialog>
  );
};

export default ConfirmDialog;