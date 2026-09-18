import { Alert, Button } from '@mui/material';

const ErrorState = ({ message = 'Something went wrong.', onRetry, sx = {} }) => (
  <Alert
    severity="error"
    sx={{ borderRadius: '8px', ...sx }}
    action={
      onRetry ? (
        <Button color="inherit" size="small" onClick={onRetry}>
          Retry
        </Button>
      ) : undefined
    }
  >
    {message}
  </Alert>
);

export default ErrorState;
