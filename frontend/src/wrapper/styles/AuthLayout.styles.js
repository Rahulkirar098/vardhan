import { styled } from '@mui/material/styles';
import { Box, Typography } from '@mui/material';

// Main authentication page container
export const AuthPageContainer = styled(Box)(({ theme }) => ({
  minHeight: '100vh',
  display: 'flex',
  backgroundColor: theme.palette.background.default,
}));

// Desktop brand panel
export const BrandPanelContainer = styled(Box)(({ theme }) => ({
  display: 'none',
  width: '44%',
  maxWidth: 540,
  flexDirection: 'column',
  justifyContent: 'space-between',
  backgroundColor: theme.palette.primary.main,
  color: theme.palette.primary.contrastText,
  padding: theme.spacing(6),
  flexShrink: 0,

  [theme.breakpoints.up('md')]: {
    display: 'flex',
  },
  [theme.breakpoints.up('lg')]: {
    padding: theme.spacing(7),
  },
}));

// Desktop Brand Mark logo square
export const BrandMarkBox = styled(Box)(({ theme }) => ({
  width: 36,
  height: 36,
  borderRadius: theme.shape.borderRadius || 10,
  backgroundColor: theme.palette.primary.contrastText,
  color: theme.palette.primary.main,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontWeight: 800,
  fontSize: 18,
  letterSpacing: '-0.02em',
}));

// Desktop Brand Subtitle line
export const BrandSubtitleText = styled(Typography)(({ theme }) => ({
  color: 'rgba(255, 255, 255, 0.7)',
  fontWeight: 600,
  letterSpacing: 0.9,
  fontSize: 9.5,
  display: 'block',
}));

// Desktop Brand Heading
export const BrandHeading = styled(Typography)(({ theme }) => ({
  fontWeight: 700,
  letterSpacing: '-0.04em',
  lineHeight: 1.15,
  fontSize: 32,
  color: theme.palette.primary.contrastText,

  [theme.breakpoints.up('lg')]: {
    fontSize: 40,
  },
}));

// Checkmark icon box for highlight bullets
export const CheckIconBox = styled(Box)(({ theme }) => ({
  width: 20,
  height: 20,
  marginTop: theme.spacing(0.25),
  borderRadius: '8px',
  backgroundColor: theme.palette.primary.contrastText,
  color: theme.palette.primary.main,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
}));

// Highlight text bullet line
export const HighlightText = styled(Typography)(({ theme }) => ({
  color: 'rgba(255, 255, 255, 0.85)',
  fontSize: '0.95rem',
  lineHeight: 1.5,
}));

// Copyright text at bottom of brand panel
export const CopyrightText = styled(Typography)(({ theme }) => ({
  color: 'rgba(255, 255, 255, 0.5)',
  fontSize: '0.75rem',
}));

// Auth Content Panel Container (Right side form area)
export const AuthContentContainer = styled(Box)(({ theme }) => ({
  flex: 1,
  minWidth: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: theme.spacing(3),

  [theme.breakpoints.up('sm')]: {
    padding: theme.spacing(4),
  },
}));

// Form max-width container
export const AuthFormWrapper = styled(Box)(({ theme }) => ({
  width: '100%',
  maxWidth: 440,
}));

// Mobile Brand Header Container
export const MobileHeaderContainer = styled(Box)(({ theme }) => ({
  display: 'block',
  marginBottom: theme.spacing(4),

  [theme.breakpoints.up('md')]: {
    display: 'none',
  },
}));

// Mobile Brand Mark logo square
export const MobileLogoBox = styled(Box)(({ theme }) => ({
  width: 34,
  height: 34,
  borderRadius: theme.shape.borderRadius || 10,
  backgroundColor: theme.palette.primary.main,
  color: theme.palette.primary.contrastText,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontWeight: 800,
  fontSize: 17,
}));

// Mobile Brand Logo Title Text
export const MobileLogoTitle = styled(Typography)(({ theme }) => ({
  fontWeight: 800,
  fontSize: 18,
  letterSpacing: '-0.01em',
  color: theme.palette.text.primary,
}));

// Authentication Form Title
export const AuthTitle = styled(Typography)(({ theme }) => ({
  fontWeight: 700,
  letterSpacing: '-0.03em',
  color: theme.palette.text.primary,
}));

// Authentication Form Subtitle
export const AuthSubtitle = styled(Typography)(({ theme }) => ({
  color: theme.palette.text.secondary,
  marginTop: theme.spacing(1),
  marginBottom: theme.spacing(3),
}));
