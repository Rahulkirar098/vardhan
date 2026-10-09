import {
  FormControl,
  FormHelperText,
  InputLabel,
  MenuItem,
  Select,
} from '@mui/material';
import { styled } from '@mui/material/styles';

const StyledFormControl = styled(FormControl)(({ theme }) => {
  const custom = theme.custom || {};
  const tokens = custom.tokens || {};
  const colors = tokens.colors || {};

  return {
    '& .MuiOutlinedInput-root': {
      borderRadius: theme.shape.borderRadius || 10,
      backgroundColor: theme.palette.background.paper || '#FFFFFF',
      fontSize: '0.875rem',
      transition: 'all 180ms ease',

      '& fieldset': {
        borderColor: theme.palette.divider || '#E5E7EB',
      },

      '&:hover fieldset': {
        borderColor: colors.strongBlue || '#0284C7',
      },

      '&.Mui-focused fieldset': {
        borderColor: colors.strongBlue || '#0284C7',
        borderWidth: '1.5px',
      },

      '&.Mui-error fieldset': {
        borderColor: theme.palette.error?.main || '#DF2225',
      },

      '&.Mui-disabled fieldset': {
        borderColor: theme.palette.divider || '#E5E7EB',
      },
    },

    '& .MuiInputLabel-root': {
      fontSize: '0.875rem',
      fontWeight: 500,
      color: theme.palette.text.secondary || '#6B7280',

      '&.Mui-focused': {
        color: colors.strongBlue || '#0284C7',
      },

      '&.Mui-error': {
        color: theme.palette.error?.main || '#DF2225',
      },
    },

    '& .MuiFormHelperText-root': {
      fontSize: '0.75rem',
      marginTop: '4px',
    },
  };
});

const menuPropsStyle = {
  PaperProps: {
    style: {
      maxHeight: 280,
      borderRadius: 10,
      border: '1px solid #E5E7EB',
      boxShadow: '0 10px 15px -3px rgba(37, 37, 37, 0.08)',
    },
  },
};

/**
 * Reusable AppSelect Component for Nuvince SaaS Application.
 * Supports options array `[{ value, label }]`, single/multiple selection, placeholder,
 * required, disabled, error, and helperText states.
 */
const AppSelect = ({
  label,
  value,
  onChange,
  options = [],
  name,
  placeholder,
  error = false,
  helperText,
  required = false,
  disabled = false,
  fullWidth = true,
  size = 'medium',
  multiple = false,
  children,
  sx = {},
  ...props
}) => {
  const labelId = name ? `${name}-select-label` : 'app-select-label';

  // Normalize options array
  const formattedOptions = options.map((opt) => {
    if (typeof opt === 'object' && opt !== null) {
      return {
        value: opt.value !== undefined ? opt.value : (opt.id !== undefined ? opt.id : opt.code),
        label: opt.label !== undefined ? opt.label : (opt.name !== undefined ? opt.name : String(opt.value)),
      };
    }
    return { value: opt, label: String(opt) };
  });

  return (
    <StyledFormControl
      fullWidth={fullWidth}
      size={size}
      error={Boolean(error)}
      disabled={disabled}
      required={required}
      sx={sx}
    >
      {label && <InputLabel id={labelId}>{label}</InputLabel>}
      <Select
        labelId={labelId}
        id={name || labelId}
        value={value ?? (multiple ? [] : '')}
        onChange={onChange}
        label={label}
        name={name}
        multiple={multiple}
        displayEmpty={Boolean(placeholder)}
        MenuProps={menuPropsStyle}
        {...props}
      >
        {placeholder && (
          <MenuItem value="" disabled sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
            {placeholder}
          </MenuItem>
        )}
        {formattedOptions.length > 0
          ? formattedOptions.map((opt, idx) => (
              <MenuItem
                key={opt.value ?? idx}
                value={opt.value}
                sx={{
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  borderRadius: '6px',
                  mx: 0.5,
                  my: 0.25,
                  '&.Mui-selected': {
                    backgroundColor: '#E0F2FE',
                    color: '#252525',
                    fontWeight: 700,
                    '&:hover': {
                      backgroundColor: '#BAE6FD',
                    },
                  },
                  '&:hover': {
                    backgroundColor: '#F3F4F6',
                  },
                }}
              >
                {opt.label}
              </MenuItem>
            ))
          : children}
      </Select>
      {helperText && <FormHelperText>{helperText}</FormHelperText>}
    </StyledFormControl>
  );
};

export default AppSelect;
