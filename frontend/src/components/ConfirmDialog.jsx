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
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onClose,
  submitting = false,
  danger = false,
}) => (
  <Dialog
    open={open}
    onClose={submitting ? undefined : onClose}
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
          width: 30,
          height: 30,
          borderRadius: '8px',
          backgroundColor: '#FDECEC',
          color: '#B42318',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <WarningRounded fontSize="small" />
      </Box>
      {title}
    </DialogTitle>
    <DialogContent>
      {message && <Typography color="text.secondary">{message}</Typography>}
    </DialogContent>
    <DialogActions sx={{ px: 3, pb: 2.5, pt: 1 }}>
      <Button onClick={onClose} disabled={submitting} variant="outlined" color="inherit">
        {cancelLabel}
      </Button>
      <Button
        onClick={onConfirm}
        disabled={submitting}
        variant="contained"
        color={danger ? 'error' : 'primary'}
        startIcon={submitting ? <CircularProgress size={15} color="inherit" /> : undefined}
      >
        {submitting ? 'Working…' : confirmLabel}
      </Button>
    </DialogActions>
  </Dialog>
);

export default ConfirmDialog;