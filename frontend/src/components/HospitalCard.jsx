import { Button, Card, CardContent, Chip, Divider, Stack, Typography } from '@mui/material';

const HospitalCard = ({ hospital, onView }) => {
  const admin = hospital?.createdBy || {};
  const location = [hospital?.address?.city, hospital?.address?.state].filter(Boolean).join(', ') || 'Location not available';

  return (
    <Card
      sx={{
        height: '100%',
        borderRadius: 3,
        border: '1px solid #E5E5E5',
        backgroundColor: '#FFFFFF',
        boxShadow: 'none',
      }}
    >
      <CardContent sx={{ p: 3 }}>
        <Stack spacing={2}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              {hospital?.name || 'Hospital Name'}
            </Typography>
            <Chip
              label={hospital?.status || 'Active'}
              size="small"
              sx={{
                backgroundColor: '#000000',
                color: '#FFFFFF',
                borderRadius: 2,
              }}
            />
          </Stack>

          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
            {hospital?.code || 'CODE'}
          </Typography>

          <Divider />

          <Stack spacing={0.5}>
            <Typography variant="caption" color="text.secondary">
              Admin
            </Typography>
            <Typography variant="body1" sx={{ fontWeight: 600 }}>
              {admin?.name || 'Unknown Admin'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {admin?.email || 'No email available'}
            </Typography>
          </Stack>

          <Stack spacing={0.5}>
            <Typography variant="caption" color="text.secondary">
              Location
            </Typography>
            <Typography variant="body2">
              {location}
            </Typography>
          </Stack>

          <Button
            variant="contained"
            onClick={() => onView?.(hospital)}
            sx={{
              alignSelf: 'flex-start',
              backgroundColor: '#000000',
              color: '#FFFFFF',
              '&:hover': { backgroundColor: '#222222' },
            }}
          >
            View Hospital
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
};

export default HospitalCard;
