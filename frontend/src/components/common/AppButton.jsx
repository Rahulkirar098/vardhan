import { Button, CircularProgress } from '@mui/material';
import { styled } from '@mui/material/styles';

const StyledMuiButton = styled(Button, {
  shouldForwardProp: (prop) => prop !== 'variantType' && prop !== 'loading',
})(({ theme, variantType = 'primary' }) => {
  const custom = theme.custom || {};
  const tokens = custom.tokens || {};
  const colors = tokens.colors || {};

  const getVariantStyles = () => {
    switch (variantType) {
      case 'danger':
        return {
          backgroundColor: colors.destructive || '#E7000B',
          color: '#FFFFFF',
          border: 'none',
          '&:hover': {
            backgroundColor: '#C50009',
            boxShadow: 'none',
          },
        };
      case 'secondary':
        return {
          backgroundColor: colors.card || '#FFFFFF',
          color: theme.palette.text.primary || '#252525',
          border: `1px solid ${theme.palette.divider || '#E5E7EB'}`,
          '&:hover': {
            backgroundColor: colors.lightBlueBg || '#E0F2FE',
            borderColor: colors.strongBlue || '#0284C7',
            color: theme.palette.text.primary || '#252525',
            boxShadow: 'none',
          },
        };
      case 'outlined':
        return {
          backgroundColor: colors.card || '#FFFFFF',
          color: theme.palette.text.primary || '#252525',
          border: `1px solid ${theme.palette.divider || '#E5E7EB'}`,
          '&:hover': {
            backgroundColor: colors.lightBlueBg || '#E0F2FE',
            borderColor: colors.strongBlue || '#0284C7',
            color: theme.palette.text.primary || '#252525',
            boxShadow: 'none',
          },
        };
      case 'text':
        return {
          backgroundColor: 'transparent',
          color: theme.palette.text.primary || '#252525',
          border: 'none',
          '&:hover': {
            backgroundColor: colors.lightBlueBg || '#E0F2FE',
            color: colors.strongBlue || '#0284C7',
          },
        };
      case 'primary':
      default:
        return {
          backgroundColor: theme.palette.primary.main || '#252525',
          color: theme.palette.primary.contrastText || '#FFFFFF',
          border: 'none',
          '&:hover': {
            backgroundColor: colors.primaryHover || '#374151',
            boxShadow: 'none',
          },
        };
    }
  };

  return {
    borderRadius: theme.shape.borderRadius || 10,
    textTransform: 'none',
    fontWeight: 600,
    fontSize: '0.875rem',
    lineHeight: 1.4,
    padding: '9px 18px',
    boxShadow: 'none',
    transition: 'all 180ms cubic-bezier(0.4, 0, 0.2, 1)',
    ...getVariantStyles(),
    '&:focus-visible': {
      outline: `2px solid ${colors.strongBlue || '#0284C7'}`,
      outlineOffset: '2px',
    },
    '&.Mui-disabled': {
      opacity: 0.55,
      cursor: 'not-allowed',
    },
  };
});

/**
 * Reusable AppButton Component for Nuvince SaaS Application.
 * Supports primary, secondary, outlined, text, and danger variants.
 * Supports loading spinner (prevents duplicate submission), start/end icons, size, fullWidth.
 */
const AppButton = ({
  children,
  variant = 'primary',
  type = 'button',
  loading = false,
  disabled = false,
  fullWidth = false,
  size = 'medium',
  startIcon,
  endIcon,
  onClick,
  sx = {},
  ...props
}) => {
  const isButtonDisabled = disabled || loading;

  const renderStartIcon = loading ? (
    <CircularProgress size={16} color="inherit" />
  ) : (
    startIcon
  );

  return (
    <StyledMuiButton
      variantType={variant}
      type={type}
      disabled={isButtonDisabled}
      fullWidth={fullWidth}
      size={size}
      startIcon={renderStartIcon}
      endIcon={endIcon}
      onClick={isButtonDisabled ? undefined : onClick}
      sx={sx}
      {...props}
    >
      {children}
    </StyledMuiButton>
  );
};

export default AppButton;
