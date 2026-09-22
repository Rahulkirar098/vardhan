import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from '@mui/material';
import WarningRounded from '@mui/icons-material/WarningRounded';

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

  return (
    <Dialog
      open={open}
      onClose={isSubmitting ? undefined : effectiveOnClose}
      maxWidth="xs"
      fullWidth
      aria-labelledby="confirm-dialog-title"
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
            backgroundColor: isDanger ? '#FDECEC' : '#F5F5F5',
            color: isDanger ? '#B42318' : '#0A0A0A',
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
        <Button
          onClick={effectiveOnClose}
          disabled={isSubmitting}
          variant="outlined"
          color="inherit"
        >
          {effectiveCancelLabel}
        </Button>
        <Button
          onClick={onConfirm}
          disabled={isSubmitting}
          variant="contained"
          color={isDanger ? 'error' : 'primary'}
          startIcon={isSubmitting ? <CircularProgress size={15} color="inherit" /> : undefined}
        >
          {isSubmitting ? 'Working…' : effectiveConfirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ConfirmDialog;