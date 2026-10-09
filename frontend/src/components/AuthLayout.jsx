import { Box, Stack, Typography } from '@mui/material';
import { CheckRounded } from '@mui/icons-material';

const highlights = [
  'Manage hospitals, structure and HR teams',
  'Invite and onboard HR staff in minutes',
  'One clean workspace for your entire workforce',
];

const BrandMark = () => (
  <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
    <Box
      sx={{
        width: 36,
        height: 36,
        borderRadius: '10px',
        backgroundColor: '#FFFFFF',
        color: '#0F172B',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 800,
        fontSize: 18,
        letterSpacing: '-0.02em',
      }}
    >
      N
    </Box>
    <Box>
      <Typography sx={{ fontWeight: 800, fontSize: 18, lineHeight: 1.1, letterSpacing: '-0.01em' }}>
        NUVINCE
      </Typography>
      <Typography
        variant="caption"
        sx={{ color: 'rgba(255,255,255,0.55)', fontWeight: 600, letterSpacing: 0.9, fontSize: 9.5, display: 'block' }}
      >
        HOSPITAL WORKFORCE PLATFORM
      </Typography>
    </Box>
  </Stack>
);

const BrandPanel = () => (
  <Box
    sx={{
      display: { xs: 'none', md: 'flex' },
      width: '44%',
      maxWidth: 540,
      flexDirection: 'column',
      justifyContent: 'space-between',
      backgroundColor: '#0F172B',
      color: '#FFFFFF',
      p: { md: 6, lg: 7 },
      flexShrink: 0,
    }}
  >
    <BrandMark />

    <Box>
      <Typography variant="h3" sx={{ fontWeight: 700, letterSpacing: '-0.04em', lineHeight: 1.15, fontSize: { md: 32, lg: 40 } }}>
        Hospital workforce management, simplified.
      </Typography>

      <Stack spacing={1.75} sx={{ mt: 4 }}>
        {highlights.map((item) => (
          <Stack key={item} direction="row" spacing={1.5} sx={{ alignItems: 'flex-start' }}>
            <Box
              sx={{
                width: 20,
                height: 20,
                mt: 0.25,
                borderRadius: '8px',
                backgroundColor: '#FFFFFF',
                color: '#0F172B',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <CheckRounded sx={{ fontSize: 14 }} />
            </Box>
            <Typography sx={{ color: 'rgba(255,255,255,0.82)', fontSize: '0.95rem', lineHeight: 1.5 }}>
              {item}
            </Typography>
          </Stack>
        ))}
      </Stack>
    </Box>

    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.45)' }}>
      Nuvince Platform · © {new Date().getFullYear()}
    </Typography>
  </Box>
);

const AuthLayout = ({ title, subtitle, children }) => (
  <Box sx={{ minHeight: '100vh', display: 'flex', backgroundColor: '#F8FAFC' }}>
    <BrandPanel />

    <Box
      sx={{
        flex: 1,
        minWidth: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: { xs: 3, sm: 4 },
      }}
    >
      <Box sx={{ width: '100%', maxWidth: 440 }}>
        <Box sx={{ display: { xs: 'block', md: 'none' }, mb: 4 }}>
          <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', justifyContent: 'center' }}>
            <Box
              sx={{
                width: 34,
                height: 34,
                borderRadius: '10px',
                backgroundColor: '#0F172B',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: 17,
              }}
            >
              N
            </Box>
            <Typography sx={{ fontWeight: 800, fontSize: 18, letterSpacing: '-0.01em', color: '#020618' }}>
              NUVINCE
            </Typography>
          </Stack>
        </Box>

        <Typography variant="h4" sx={{ fontWeight: 700, letterSpacing: '-0.03em', color: '#020618' }}>
          {title}
        </Typography>
        {subtitle && (
          <Typography color="text.secondary" sx={{ mt: 1, mb: 3 }}>
            {subtitle}
          </Typography>
        )}

        {children}
      </Box>
    </Box>
  </Box>
);

export default AuthLayout;