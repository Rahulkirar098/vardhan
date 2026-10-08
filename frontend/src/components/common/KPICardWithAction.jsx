import { isValidElement } from 'react';
import { Box, Button, Stack, Typography } from '@mui/material';

const KPICardWithAction = ({
  title,
  label,
  value,
  icon: IconProp,
  subtitle,
  description,
  hint,
  footer,
  actionLabel,
  onAction,
  actionButton,
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
    return <IconComponent sx={{ fontSize: 20, color: color || '#0F172A' }} />;
  };

  return (
    <Box
      sx={{
        p: { xs: 2.5, md: 3 },
        width: '100%',
        height: '100%',
        minHeight: 165,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        borderRadius: '14px',
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
      <Stack spacing={1.5} sx={{ height: '100%', justifyContent: 'space-between' }}>
        {/* Header: Title + Icon */}
        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
          <Typography
            sx={{
              fontSize: '0.75rem',
              fontWeight: 700,
              color: '#64748B',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              lineHeight: 1.3,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {cardTitle}
          </Typography>
          {IconProp && (
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: '8px',
                backgroundColor: '#F8FAFC',
                border: '1px solid #F1F5F9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {renderIcon()}
            </Box>
          )}
        </Stack>

        {/* Body: Value */}
        <Typography
          sx={{
            fontSize: { xs: '1.75rem', md: '2rem' },
            fontWeight: 800,
            color: '#0F172A',
            letterSpacing: '-0.02em',
            lineHeight: 1.1,
            my: 0.5,
          }}
        >
          {value !== undefined && value !== null ? value : '-'}
        </Typography>

        {/* Bottom Container (Description + Action) */}
        <Stack spacing={1} sx={{ pt: 0.5, mt: 'auto' }}>
          {cardFooter && (
            typeof cardFooter === 'string' ? (
              <Typography
                variant="body2"
                sx={{ fontSize: '0.8125rem', color: '#64748B', fontWeight: 500 }}
              >
                {cardFooter}
              </Typography>
            ) : (
              cardFooter
            )
          )}

          {(actionButton || actionLabel || onAction) && (
            <Box>
              {actionButton ? (
                actionButton
              ) : (
                <Button
                  variant="outlined"
                  size="small"
                  fullWidth
                  onClick={onAction}
                  sx={{
                    borderRadius: '8px',
                    textTransform: 'none',
                    fontWeight: 600,
                    fontSize: '0.8125rem',
                    borderColor: '#E5E7EB',
                    color: '#0F172A',
                    py: 0.75,
                    '&:hover': {
                      borderColor: '#CBD5E1',
                      backgroundColor: '#F8FAFC',
                    },
                  }}
                >
                  {actionLabel || 'Action'}
                </Button>
              )}
            </Box>
          )}
        </Stack>
      </Stack>
    </Box>
  );
};

export default KPICardWithAction;
