import { Box, Stack, Typography } from '@mui/material';
import { CheckRounded } from '@mui/icons-material';
import {
  AuthPageContainer,
  BrandPanelContainer,
  BrandMarkBox,
  BrandSubtitleText,
  BrandHeading,
  CheckIconBox,
  HighlightText,
  CopyrightText,
  AuthContentContainer,
  AuthFormWrapper,
  MobileHeaderContainer,
  MobileLogoBox,
  MobileLogoTitle,
  AuthTitle,
  AuthSubtitle,
} from './styles/AuthLayout.styles';

const highlights = [
  'Manage hospitals, structure and HR teams',
  'Invite and onboard HR staff in minutes',
  'One clean workspace for your entire workforce',
];

const BrandMark = () => (
  <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
    <BrandMarkBox>N</BrandMarkBox>
    <Box>
      <Typography sx={{ fontWeight: 800, fontSize: 18, lineHeight: 1.1, letterSpacing: '-0.01em' }}>
        NUVINCE
      </Typography>
      <BrandSubtitleText variant="caption">
        HOSPITAL WORKFORCE PLATFORM
      </BrandSubtitleText>
    </Box>
  </Stack>
);

const BrandPanel = () => (
  <BrandPanelContainer>
    <BrandMark />

    <Box>
      <BrandHeading variant="h3">
        Hospital workforce management, simplified.
      </BrandHeading>

      <Stack spacing={1.75} sx={{ mt: 4 }}>
        {highlights.map((item) => (
          <Stack key={item} direction="row" spacing={1.5} sx={{ alignItems: 'flex-start' }}>
            <CheckIconBox>
              <CheckRounded sx={{ fontSize: 14 }} />
            </CheckIconBox>
            <HighlightText>{item}</HighlightText>
          </Stack>
        ))}
      </Stack>
    </Box>

    <CopyrightText variant="caption">
      Nuvince Platform · © {new Date().getFullYear()}
    </CopyrightText>
  </BrandPanelContainer>
);

const AuthLayout = ({ title, subtitle, children }) => (
  <AuthPageContainer>
    <BrandPanel />

    <AuthContentContainer>
      <AuthFormWrapper>
        <MobileHeaderContainer>
          <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', justifyContent: 'center' }}>
            <MobileLogoBox>N</MobileLogoBox>
            <MobileLogoTitle>NUVINCE</MobileLogoTitle>
          </Stack>
        </MobileHeaderContainer>

        <AuthTitle variant="h4">{title}</AuthTitle>
        {subtitle && <AuthSubtitle>{subtitle}</AuthSubtitle>}

        {children}
      </AuthFormWrapper>
    </AuthContentContainer>
  </AuthPageContainer>
);

export default AuthLayout;
