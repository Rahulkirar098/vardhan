import { useState } from 'react';
import {
  IconButton,
  InputAdornment,
  TextField,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Search,
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';

const StyledAppInput = styled(TextField)(({ theme }) => {
  const custom = theme.custom || {};
  const tokens = custom.tokens || {};
  const colors = tokens.colors || {};
  const primaryColor = colors.primary || '#252525';

  return {
    '& .MuiOutlinedInput-root:not(.MuiInputBase-multiline)': {
      height: '50px',
      borderRadius: theme.shape.borderRadius || 10,
      backgroundColor: theme.palette.background.paper || '#FFFFFF',
      fontSize: '0.875rem',
      transition: 'all 180ms ease',

      '& fieldset': {
        borderColor: theme.palette.divider || '#E5E7EB',
      },

      '&:hover fieldset': {
        borderColor: primaryColor,
      },

      '&.Mui-focused fieldset': {
        borderColor: primaryColor,
        borderWidth: '1.5px',
      },

      '&.Mui-error fieldset': {
        borderColor: theme.palette.error?.main || '#DF2225',
      },

      '&.Mui-disabled fieldset': {
        borderColor: theme.palette.divider || '#E5E7EB',
      },
    },

    '& .MuiOutlinedInput-root.MuiInputBase-multiline': {
      height: '150px !important',
      maxHeight: '150px !important',
      minHeight: '150px !important',
      borderRadius: theme.shape.borderRadius || 10,
      backgroundColor: theme.palette.background.paper || '#FFFFFF',
      fontSize: '0.875rem',
      padding: '12px 14px',
      alignItems: 'flex-start',
      boxSizing: 'border-box !important',
      overflow: 'hidden !important',
      transition: 'all 180ms ease',

      '& fieldset': {
        borderColor: theme.palette.divider || '#E5E7EB',
      },

      '&:hover fieldset': {
        borderColor: primaryColor,
      },

      '&.Mui-focused fieldset': {
        borderColor: primaryColor,
        borderWidth: '1.5px',
      },

      '&.Mui-error fieldset': {
        borderColor: theme.palette.error?.main || '#DF2225',
      },

      '&.Mui-disabled fieldset': {
        borderColor: theme.palette.divider || '#E5E7EB',
      },

      '& .MuiInputBase-inputMultiline': {
        height: '100% !important',
        maxHeight: '100% !important',
        minHeight: '100% !important',
        padding: '0 !important',
        margin: '0 !important',
        boxSizing: 'border-box !important',
        fontSize: '0.875rem',
        lineHeight: '1.5',
        overflowY: 'auto !important',
        overflowX: 'hidden !important',
        resize: 'none !important',
      },
    },

    '& .MuiInputLabel-root': {
      fontSize: '0.875rem',
      fontWeight: 500,
      color: theme.palette.text.secondary || '#6B7280',

      '&.Mui-focused': {
        color: primaryColor,
      },

      '&.Mui-error': {
        color: theme.palette.error?.main || '#DF2225',
      },

      '&:not(.MuiInputLabel-shrink)': {
        transform: 'translate(14px, 15px) scale(1)',
      },

      '&.MuiInputLabel-shrink': {
        transform: 'translate(14px, -9px) scale(0.75)',
      },
    },

    '& .MuiFormHelperText-root': {
      fontSize: '0.75rem',
      marginTop: '4px',
    },
  };
});

/**
 * Reusable AppInput component for Nuvince.
 * Supports text, password (with toggle visibility), email, number, search,
 * multiline, start/end icons, custom adornments, and error/helper text states.
 */
const AppInput = ({
  label,
  type = 'text',
  value,
  onChange,
  name,
  placeholder,
  error = false,
  helperText,
  required = false,
  disabled = false,
  readOnly = false,
  fullWidth = true,
  size = 'medium',
  startIcon: StartIcon,
  endIcon: EndIcon,
  startAdornment,
  endAdornment,
  showPasswordToggle = true,
  multiline = false,
  rows,
  minRows,
  maxRows,
  sx = {},
  inputProps,
  InputProps,
  ...props
}) => {
  const [showPassword, setShowPassword] = useState(false);

  const isPassword = type === 'password';
  const effectiveType = isPassword
    ? showPassword
      ? 'text'
      : 'password'
    : type;

  const handleTogglePassword = () => {
    setShowPassword((prev) => !prev);
  };

  // Determine start adornment
  let computedStartAdornment = startAdornment;
  if (!computedStartAdornment && StartIcon) {
    computedStartAdornment = (
      <InputAdornment position="start">
        <StartIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
      </InputAdornment>
    );
  } else if (!computedStartAdornment && type === 'search') {
    computedStartAdornment = (
      <InputAdornment position="start">
        <Search sx={{ fontSize: 20, color: 'text.secondary' }} />
      </InputAdornment>
    );
  }

  // Determine end adornment
  let computedEndAdornment = endAdornment;
  if (isPassword && showPasswordToggle && !disabled) {
    computedEndAdornment = (
      <InputAdornment position="end">
        <IconButton
          aria-label="toggle password visibility"
          onClick={handleTogglePassword}
          edge="end"
          size="small"
          tabIndex={-1}
          sx={{ color: 'text.secondary' }}
        >
          {showPassword ? (
            <VisibilityOff fontSize="small" />
          ) : (
            <Visibility fontSize="small" />
          )}
        </IconButton>
      </InputAdornment>
    );
  } else if (!computedEndAdornment && EndIcon) {
    computedEndAdornment = (
      <InputAdornment position="end">
        <EndIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
      </InputAdornment>
    );
  }

  return (
    <StyledAppInput
      label={label}
      type={effectiveType}
      value={value}
      onChange={onChange}
      name={name}
      placeholder={placeholder}
      error={Boolean(error)}
      helperText={helperText}
      required={required}
      disabled={disabled}
      fullWidth={fullWidth}
      size={size}
      multiline={multiline}
      rows={rows || (multiline ? 4 : undefined)}
      minRows={rows ? undefined : minRows}
      maxRows={rows ? undefined : maxRows}
      variant="outlined"
      inputProps={{
        readOnly,
        ...inputProps,
      }}
      InputProps={{
        startAdornment: computedStartAdornment,
        endAdornment: computedEndAdornment,
        ...InputProps,
      }}
      sx={sx}
      {...props}
    />
  );
};

export default AppInput;
