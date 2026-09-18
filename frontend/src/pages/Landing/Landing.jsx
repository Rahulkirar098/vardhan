import { Link as RouterLink } from 'react-router-dom';
import {
  AppBar,
  Box,
  Button,
  Card,
  Chip,
  Container,
  Grid,
  Stack,
  Toolbar,
  Typography,
} from '@mui/material';
import {
  Assessment,
  CalendarMonth,
  Group,
  LocalHospital,
  MeetingRoom,
  Shield,
} from '@mui/icons-material';

const navItems = ['Login', 'Get Started'];

const featureCards = [
  { icon: Group, title: 'Staff', text: 'Track clinical teams and support roles across the hospital.' },
  { icon: CalendarMonth, title: 'Roster', text: 'Plan rotations and shifts with clear coverage visibility.' },
  { icon: LocalHospital, title: 'Hospital', text: 'Keep departments aligned, organized, and operational.' },
  { icon: Shield, title: 'Compliance', text: 'Monitor workforce access and accountability with confidence.' },
];

const dashboardPreviewItems = [
  { label: 'On duty', value: '126' },
  { label: 'Open shifts', value: '08' },
  { label: 'Leave requests', value: '14' },
];

const Landing = () => {
  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: '#FAFAFA' }}>
      <AppBar position="sticky" color="transparent" elevation={0} sx={{ borderBottom: '1px solid #E5E5E5' }}>
        <Toolbar sx={{ maxWidth: 1280, width: '100%', mx: 'auto', px: { xs: 2, md: 4 } }}>
          <Typography variant="h6" component="div" sx={{ fontWeight: 700, letterSpacing: '-0.04em', flexGrow: 1 }}>
            Hospital HR
          </Typography>

          <Stack direction="row" spacing={1.5} alignItems="center">
            {navItems.map((item) => {
              const isLogin = item === 'Login';

              return (
                <Button
                  key={item}
                  component={RouterLink}
                  to={isLogin ? '/login' : '/register'}
                  variant={isLogin ? 'text' : 'contained'}
                  color={isLogin ? 'secondary' : 'primary'}
                  sx={{
                    color: isLogin ? '#000000' : '#FFFFFF',
                    border: isLogin ? '1px solid transparent' : '1px solid #000000',
                    px: 2,
                  }}
                >
                  {item}
                </Button>
              );
            })}
          </Stack>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ py: { xs: 8, md: 10 } }}>
        <Grid container spacing={5} alignItems="center">
          <Grid item xs={12} md={7}>
            <Stack spacing={3}>
              <Chip
                label="HOSPITAL HR MANAGEMENT"
                sx={{
                  width: 'fit-content',
                  backgroundColor: '#F7F7F7',
                  color: '#000000',
                  border: '1px solid #E5E5E5',
                  borderRadius: 2,
                  fontWeight: 700,
                  letterSpacing: 1.5,
                }}
              />

              <Typography variant="h2" sx={{ fontWeight: 700, lineHeight: 1.05, letterSpacing: '-0.06em' }}>
                Manage Your Hospital Workforce With Confidence
              </Typography>

              <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 600, fontWeight: 400, lineHeight: 1.6 }}>
                Manage nurses, staff, shifts and rosters from one simple platform.
              </Typography>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <Button
                  component={RouterLink}
                  to="/register"
                  variant="contained"
                  size="large"
                  sx={{ px: 3, py: 1.5 }}
                >
                  Get Started
                </Button>
                <Button
                  component={RouterLink}
                  to="/login"
                  variant="outlined"
                  size="large"
                  sx={{ px: 3, py: 1.5, borderColor: '#000000', color: '#000000' }}
                >
                  Login
                </Button>
              </Stack>
            </Stack>
          </Grid>

          <Grid item xs={12} md={5}>
            <Card sx={{ p: 2, borderRadius: 3 }}>
              <Box sx={{ border: '1px solid #E5E5E5', borderRadius: 2, p: 2, backgroundColor: '#FFFFFF' }}>
                <Stack spacing={2}>
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                      Workforce Overview
                    </Typography>
                    <Assessment sx={{ color: '#000000' }} />
                  </Box>

                  <Grid container spacing={1.5}>
                    {dashboardPreviewItems.map((item) => (
                      <Grid item xs={12} sm={4} key={item.label}>
                        <Box sx={{ p: 1.5, border: '1px solid #E5E5E5', borderRadius: 2, backgroundColor: '#FAFAFA' }}>
                          <Typography variant="caption" color="text.secondary">{item.label}</Typography>
                          <Typography variant="h6" sx={{ fontWeight: 700 }}>{item.value}</Typography>
                        </Box>
                      </Grid>
                    ))}
                  </Grid>

                  <Box sx={{ border: '1px solid #E5E5E5', borderRadius: 2, p: 1.5, backgroundColor: '#F7F7F7' }}>
                    <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Shift Coverage</Typography>
                      <Typography variant="caption" color="text.secondary">Today</Typography>
                    </Stack>

                    {[60, 80, 100].map((value, index) => (
                      <Box key={value} sx={{ mb: index === 2 ? 0 : 1.2 }}>
                        <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                          <Typography variant="caption" color="text.secondary">{['ICU', 'Ward', 'ER'][index]}</Typography>
                          <Typography variant="caption" sx={{ fontWeight: 600 }}>{value}%</Typography>
                        </Stack>
                        <Box sx={{ width: '100%', height: 8, backgroundColor: '#E5E5E5', borderRadius: 999 }}>
                          <Box sx={{ width: `${value}%`, height: '100%', backgroundColor: '#000000', borderRadius: 999 }} />
                        </Box>
                      </Box>
                    ))}
                  </Box>
                </Stack>
              </Box>
            </Card>
          </Grid>
        </Grid>
      </Container>

      <Container maxWidth="lg" sx={{ pb: 8 }}>
        <Grid container spacing={3}>
          {featureCards.map(({ icon: Icon, title, text }) => (
            <Grid item xs={12} sm={6} md={3} key={title}>
              <Card sx={{ p: 2.5, height: '100%' }}>
                <Stack spacing={2}>
                  <Box sx={{ width: 46, height: 46, borderRadius: 2, backgroundColor: '#000000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon sx={{ color: '#FFFFFF', fontSize: 22 }} />
                  </Box>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>{title}</Typography>
                  <Typography variant="body2" color="text.secondary">{text}</Typography>
                </Stack>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
};

export default Landing;
