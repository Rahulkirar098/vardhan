import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
} from '@mui/material';
import EditCalendarRounded from '@mui/icons-material/EditCalendarRounded';
import Modal from '../Modal';
import attendanceService from '../../services/attendance.service';

const REQUESTED_STATUS_OPTIONS = [
  { value: 'PRESENT', label: 'Present' },
  { value: 'HALF_DAY', label: 'Half Day' },
];

const RequestRegularizationModal = ({ open, onClose, onSuccess, initialDate }) => {
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [date, setDate] = useState('');
  const [requestedStatus, setRequestedStatus] = useState('PRESENT');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setDate(initialDate || todayStr);
      setRequestedStatus('PRESENT');
      setCheckIn('');
      setCheckOut('');
      setReason('');
      setError('');
      setSubmitting(false);
    }
  }, [open, initialDate, todayStr]);

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) {
      e.preventDefault();
    }

    if (!date) {
      setError('Attendance date is required.');
      return;
    }

    if (!requestedStatus) {
      setError('Attendance status is required.');
      return;
    }

    if (!reason.trim()) {
      setError('Please provide a reason for the regularization request.');
      return;
    }

    if (checkIn && checkOut && checkOut <= checkIn) {
      setError('Check-out time cannot be before or equal to check-in time.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      await attendanceService.createRegularization({
        date,
        requestedStatus,
        requestedCheckIn: checkIn ? `${date}T${checkIn}:00` : null,
        requestedCheckOut: checkOut ? `${date}T${checkOut}:00` : null,
        reason: reason.trim(),
      });

      onSuccess?.('Regularization request submitted successfully.');
      onClose();
    } catch (err) {
      const msg = err?.response?.data?.message || 'Failed to submit regularization request. Please try again.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Request Regularization"
      description="Request correction for attendance that was missing or incorrect."
      startIcon={EditCalendarRounded}
      submitLabel="Submit Request"
      cancelLabel="Cancel"
      submitting={submitting}
      onSubmit={handleSubmit}
      maxWidth="sm"
    >
      <Stack spacing={2.5} sx={{ mt: 1 }}>
        {error && (
          <Alert severity="error" onClose={() => setError('')} sx={{ borderRadius: '10px' }}>
            {error}
          </Alert>
        )}

        {/* Date & Status Grid */}
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Date"
              type="date"
              fullWidth
              required
              InputLabelProps={{ shrink: true }}
              inputProps={{ max: todayStr }}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControl fullWidth required>
              <InputLabel id="requested-status-select-label">Attendance Status</InputLabel>
              <Select
                labelId="requested-status-select-label"
                value={requestedStatus}
                label="Attendance Status"
                onChange={(e) => setRequestedStatus(e.target.value)}
              >
                {REQUESTED_STATUS_OPTIONS.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>

        {/* Check In & Check Out Times */}
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Check In"
              type="time"
              fullWidth
              InputLabelProps={{ shrink: true }}
              value={checkIn}
              onChange={(e) => setCheckIn(e.target.value)}
              helperText="Optional check-in timestamp"
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              label="Check Out"
              type="time"
              fullWidth
              InputLabelProps={{ shrink: true }}
              value={checkOut}
              onChange={(e) => setCheckOut(e.target.value)}
              helperText="Optional check-out timestamp"
            />
          </Grid>
        </Grid>

        {/* Reason */}
        <TextField
          label="Reason"
          multiline
          rows={3}
          fullWidth
          required
          placeholder="Explain why regularization is needed..."
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          helperText="Detailed explanation for review"
        />
      </Stack>
    </Modal>
  );
};

export default RequestRegularizationModal;
