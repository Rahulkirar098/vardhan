import { isValidElement } from 'react';
import { Box, Stack, Typography } from '@mui/material';

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
    return <IconComponent sx={{ fontSize: 18, color: color || '#475569' }} />;
  };

  return (
    <Box
      sx={{
        p: 2.25,
        width: '100%',
        height: '100%',
        minHeight: 100,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        borderRadius: '12px',
        border: '1px solid #E5E7EB',
        backgroundColor: '#FFFFFF',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
        boxSizing: 'border-box',
        transition: 'all 160ms ease',
        '&:hover': {
          borderColor: '#CBD5E1',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
        },
        ...sx,
      }}
    >
      <Stack spacing={1.25} sx={{ height: '100%', justifyContent: 'space-between' }}>
        {/* Header: Title at TOP-LEFT, Icon Container at TOP-RIGHT */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Typography
            sx={{
              fontSize: '0.8125rem',
              fontWeight: 600,
              color: '#64748B',
              textTransform: 'none',
              lineHeight: 1.3,
              pr: 1,
            }}
          >
            {cardTitle}
          </Typography>
          {IconProp && (
            <Box
              sx={{
                width: 38,
                height: 38,
                borderRadius: '10px',
                backgroundColor: '#F1F5F9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {renderIcon()}
            </Box>
          )}
        </Box>

        {/* Body: Large Bold Value */}
        <Typography
          sx={{
            fontSize: '1.75rem',
            fontWeight: 800,
            color: '#0F172A',
            letterSpacing: '-0.02em',
            lineHeight: 1,
            my: 0.25,
          }}
        >
          {value !== undefined && value !== null ? value : '-'}
        </Typography>

        {/* Footer / Description */}
        <Box sx={{ pt: 0.25, mt: 'auto' }}>
          {cardFooter ? (
            typeof cardFooter === 'string' ? (
              <Typography
                variant="body2"
                sx={{ fontSize: '0.75rem', color: '#94A3B8', fontWeight: 500 }}
              >
                {cardFooter}
              </Typography>
            ) : (
              cardFooter
            )
          ) : (
            <Box sx={{ height: 18 }} />
          )}
        </Box>
      </Stack>
    </Box>
  );
};

export default KPICard;
