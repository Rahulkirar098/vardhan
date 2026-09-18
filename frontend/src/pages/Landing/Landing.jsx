import { Link as RouterLink } from 'react-router-dom';
import {
  AppBar,
  Box,
  Button,
  Container,
  Grid,
  Stack,
  Toolbar,
  Typography,
} from '@mui/material';
import {
  ApartmentRounded,
  ArrowForwardRounded,
  GroupRounded,
  LocalHospitalRounded,
  ShieldRounded,
} from '@mui/icons-material';

const features = [
  {
    icon: ApartmentRounded,
    title: 'Departments',
    text: 'Structure your hospital into clear departments with codes and statuses that keep teams organized.',
  },
  {
    icon: GroupRounded,
    title: 'HR Team',
    text: 'Invite, onboard and manage HR members with a simple and secure invitation workflow.',
  },
  {
    icon: LocalHospitalRounded,
    title: 'Hospital',
    text: 'A single source of truth for your hospital profile, structure and contact information.',
  },
  {
    icon: ShieldRounded,
    title: 'Secure Access',
    text: 'Role-based access keeps every workspace protected, scoped and auditable.',
  },
];

const heroPanelItems = ['Hospital Information', 'Departments', 'HR Team', 'Invitations'];

const Brand = () => (
  <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
    <Box
      sx={{
        width: 34,
        height: 34,
        borderRadius: '10px',
        backgroundColor: '#0A0A0A',
        color: '#FFFFFF',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 800,
        fontSize: 17,
      }}
    >
      V
    </Box>
    <Stack spacing={0}>
      <Typography sx={{ fontWeight: 800, fontSize: 17, letterSpacing: '-0.01em', lineHeight: 1.1 }}>
        VARDHAN
      </Typography>
      <Typography
        variant="caption"
        sx={{ color: 'text.secondary', fontWeight: 600, letterSpacing: 0.9, fontSize: 9.5, lineHeight: 1.4 }}
      >
        HOSPITAL WORKFORCE PLATFORM
      </Typography>
    </Stack>
  </Stack>
);

const Landing = () => {
  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: '#FAFAFA' }}>
      <AppBar position="sticky" color="transparent" elevation={0} sx={{ borderBottom: '1px solid #E5E5E5' }}>
        <Toolbar sx={{ maxWidth: 1200, width: '100%', mx: 'auto', px: { xs: 2, md: 4 }, minHeight: 64 }}>
          <Box sx={{ flexGrow: 1 }}>
            <Brand />
          </Box>

          <Stack direction="row" spacing={1.5}>
            <Button component={RouterLink} to="/login" variant="text">
              Sign In
            </Button>
            <Button component={RouterLink} to="/register" variant="contained">
              Get Started
            </Button>
          </Stack>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ py: { xs: 8, md: 12 } }}>
        <Grid container spacing={{ xs: 6, md: 8 }} sx={{ alignItems: 'center' }}>
          <Grid item xs={12} md={6}>
            <Stack spacing={3}>
              <Typography
                variant="caption"
                component="div"
                sx={{
                  width: 'fit-content',
                  px: 1.5,
                  py: 0.5,
                  borderRadius: 999,
                  border: '1px solid #E5E5E5',
                  backgroundColor: '#FFFFFF',
                  color: 'text.secondary',
                  fontWeight: 700,
                  letterSpacing: 1,
                  fontSize: 10.5,
                }}
              >
                VARDHAN · HOSPITAL WORKFORCE PLATFORM
              </Typography>

              <Typography
                variant="h2"
                sx={{
                  fontWeight: 700,
                  fontSize: { xs: 34, md: 48 },
                  lineHeight: 1.08,
                  letterSpacing: '-0.05em',
                }}
              >
                Hospital workforce management, simplified.
              </Typography>

              <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 400, lineHeight: 1.65, maxWidth: 540 }}>
                Manage hospitals, departments and HR teams from one clean, secure workspace.
              </Typography>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <Button
                  component={RouterLink}
                  to="/register"
                  variant="contained"
                  size="large"
                  endIcon={<ArrowForwardRounded fontSize="small" />}
                >
                  Get Started
                </Button>
                <Button component={RouterLink} to="/login" variant="outlined" size="large" color="inherit">
                  Sign In
                </Button>
              </Stack>
            </Stack>
          </Grid>

          <Grid item xs={12} md={6}>
            <Box
              sx={{
                borderRadius: '24px',
                backgroundColor: '#0A0A0A',
                color: '#FFFFFF',
                p: { xs: 3, md: 4.5 },
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <Stack
                direction="row"
                spacing={1.25}
                sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 4, flexWrap: 'wrap', gap: 1.5 }}
              >
                <Box>
                  <Typography sx={{ fontWeight: 800, fontSize: 17, letterSpacing: '-0.01em' }}>
                    VARDHAN
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{ color: 'rgba(255,255,255,0.55)', fontWeight: 600, letterSpacing: 0.9, fontSize: 9.5 }}
                  >
                    HOSPITAL WORKFORCE PLATFORM
                  </Typography>
                </Box>
                <Box
                  sx={{
                    borderRadius: 999,
                    px: 1.25,
                    py: 0.5,
                    border: '1px solid rgba(255,255,255,0.25)',
                    color: 'rgba(255,255,255,0.7)',
                    fontSize: 10.5,
                    fontWeight: 700,
                    letterSpacing: 0.8,
                  }}
                >
                  WORKSPACE
                </Box>
              </Stack>

              <Stack spacing={1.25}>
                {heroPanelItems.map((item) => (
                  <Box
                    key={item}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1.5,
                      border: '1px solid rgba(255,255,255,0.14)',
                      borderRadius: '12px',
                      px: 2,
                      py: 1.75,
                      backgroundColor: 'rgba(255,255,255,0.05)',
                    }}
                  >
                    <Box
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: 999,
                        backgroundColor: '#FFFFFF',
                        flexShrink: 0,
                      }}
                    />
                    <Typography sx={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.95rem', fontWeight: 600 }}>
                      {item}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            </Box>
          </Grid>
        </Grid>
      </Container>

      <Container maxWidth="lg" sx={{ pb: { xs: 8, md: 10 } }}>
        <Stack spacing={4}>
          <Box sx={{ textAlign: 'center', maxWidth: 560, mx: 'auto' }}>
            <Typography variant="h3" sx={{ fontWeight: 700, fontSize: { xs: 24, md: 30 }, letterSpacing: '-0.03em' }}>
              Everything your workforce needs
            </Typography>
            <Typography color="text.secondary" sx={{ mt: 1 }}>
              Built for hospital administrators and HR teams.
            </Typography>
          </Box>

          <Grid container spacing={2.5}>
            {features.map(({ icon: Icon, title, text }) => (
              <Grid item xs={12} sm={6} lg={3} key={title}>
                <Box
                  sx={{
                    height: '100%',
                    borderRadius: '12px',
                    border: '1px solid #E5E5E5',
                    backgroundColor: '#FFFFFF',
                    p: 2.5,
                    transition: 'box-shadow 180ms ease, transform 180ms ease',
                    '&:hover': {
                      boxShadow: '0 12px 30px rgba(0,0,0,0.06)',
                      transform: 'translateY(-2px)',
                    },
                  }}
                >
                  <Stack spacing={1.5}>
                    <Box
                      sx={{
                        width: 44,
                        height: 44,
                        borderRadius: '10px',
                        backgroundColor: '#0A0A0A',
                        color: '#FFFFFF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Icon sx={{ fontSize: 21 }} />
                    </Box>
                    <Typography variant="h6" sx={{ fontWeight: 700, fontSize: 17 }}>
                      {title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {text}
                    </Typography>
                  </Stack>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Stack>
      </Container>

      <Box sx={{ borderTop: '1px solid #E5E5E5', backgroundColor: '#FFFFFF' }}>
        <Container maxWidth="lg">
          <Toolbar
            sx={{
              minHeight: 64,
              px: { xs: 2, md: 4 },
              justifyContent: 'center',
              gap: 1,
            }}
          >
            <Typography variant="caption" color="text.secondary">
              Vardhan Hospital Workforce Platform
            </Typography>
            <Typography variant="caption" color="text.secondary">
              · © {new Date().getFullYear()}
            </Typography>
          </Toolbar>
        </Container>
      </Box>
    </Box>
  );
};

export default Landing;