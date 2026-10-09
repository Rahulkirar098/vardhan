import { isValidElement } from 'react';
import { Box, Stack, Typography } from '@mui/material';
import { styled } from '@mui/material/styles';

const StyledKpiContainer = styled(Box)(({ theme }) => {
  const colors = theme.custom?.colors || {};
  const sizing = theme.custom?.sizing || {};
  return {
    padding: '16px 20px',
    width: '100%',
    height: '100%',
    minHeight: 90,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    borderRadius: theme.shape.borderRadius || 10,
    border: `1px solid ${colors.border || '#E2E8F0'}`,
    backgroundColor: colors.background || '#FFFFFF',
    boxShadow: sizing.shadows?.card || '0 1px 3px rgba(2, 6, 24, 0.04)',
    boxSizing: 'border-box',
    transition: 'all 180ms cubic-bezier(0.4, 0, 0.2, 1)',
    '&:hover': {
      borderColor: colors.ring || '#90A1B9',
      boxShadow: '0 4px 12px rgba(2, 6, 24, 0.06)',
    },
  };
});

const StyledKpiTitle = styled(Typography)(({ theme }) => ({
  fontSize: '0.8125rem', // 13px
  fontWeight: 600,
  color: theme.palette.text.secondary || '#62748E',
  lineHeight: 1.2,
}));

const StyledKpiValue = styled(Typography)(({ theme }) => ({
  fontSize: '1.5rem', // 24px
  fontWeight: 700,
  color: theme.palette.text.primary || '#020618',
  letterSpacing: '-0.02em',
  lineHeight: 1.1,
  margin: '4px 0',
}));

const StyledKpiIconContainer = styled(Box)(({ theme }) => {
  const colors = theme.custom?.colors || {};
  return {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: colors.secondary || '#F1F5F9',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  };
});

const KPICard = ({
  title,
  label,
  value,
  icon: IconProp,
  subtitle,
  description,
  hint,
  footer,
  color,
  sx = {},
}) => {
  const cardTitle = title || label;
  const cardFooter = footer || subtitle || description || hint;

  const renderIcon = () => {
    if (!IconProp) return null;
    if (isValidElement(IconProp)) {
      return IconProp;
    }
    const IconComponent = IconProp;
    return <IconComponent sx={{ fontSize: 18, color: color || 'primary.main' }} />;
  };

  return (
    <StyledKpiContainer sx={sx}>
      <Stack spacing={0.5} sx={{ height: '100%', justifyContent: 'space-between' }}>
        {/* Header: Title at TOP-LEFT, Icon Container at TOP-RIGHT */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <StyledKpiTitle>
            {cardTitle}
          </StyledKpiTitle>
          {IconProp && (
            <StyledKpiIconContainer>
              {renderIcon()}
            </StyledKpiIconContainer>
          )}
        </Box>

        {/* Body: Large Bold 24px Value */}
        <StyledKpiValue>
          {value !== undefined && value !== null ? value : '-'}
        </StyledKpiValue>

        {/* Footer / Description */}
        {cardFooter && (
          <Box sx={{ pt: 0.1, mt: 'auto' }}>
            {typeof cardFooter === 'string' ? (
              <Typography
                variant="body2"
                sx={{ fontSize: '0.75rem', color: 'text.secondary', fontWeight: 500 }}
              >
                {cardFooter}
              </Typography>
            ) : (
              cardFooter
            )}
          </Box>
        )}
      </Stack>
    </StyledKpiContainer>
  );
};

export default KPICard;
