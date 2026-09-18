import { Box, Button, Stack, Typography } from '@mui/material';
import InboxRounded from '@mui/icons-material/InboxRounded';

const EmptyState = ({
  icon: Icon = InboxRounded,
  title = 'Nothing here yet',
  description,
  actionLabel,
  onAction,
  sx = {},
}) => (
  <Stack
    spacing={1.25}
    sx={{ alignItems: 'center', textAlign: 'center', py: 5, px: 2, ...sx }}
  >
    <Box
      sx={{
        width: 44,
        height: 44,
        borderRadius: '12px',
        border: '1px solid #E5E5E5',
        backgroundColor: '#FAFAFA',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'text.secondary',
      }}
    >
      <Icon />
    </Box>

    <Typography variant="h6" sx={{ fontWeight: 700, fontSize: 17 }}>
      {title}
    </Typography>

    {description && (
      <Typography color="text.secondary" sx={{ maxWidth: 420 }}>
        {description}
      </Typography>
    )}

    {actionLabel && onAction && (
      <Button variant="contained" onClick={onAction} sx={{ mt: 0.5 }}>
        {actionLabel}
      </Button>
    )}
  </Stack>
);

export default EmptyState;
