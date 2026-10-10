import { useState, useId } from 'react';
import {
  FormControl,
  FormHelperText,
  InputLabel,
  MenuItem,
  Select,
  Typography,
} from '@mui/material';
import { styled } from '@mui/material/styles';

const StyledFormControl = styled(FormControl)(({ theme }) => {
  const custom = theme.custom || {};
  const tokens = custom.tokens || {};
  const colors = tokens.colors || {};
  const primaryColor = colors.primary || '#252525';

  return {
    '& .MuiOutlinedInput-root': {
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

    '& .MuiSelect-select': {
      height: '50px',
      boxSizing: 'border-box',
      display: 'flex',
      alignItems: 'center',
      paddingTop: 0,
      paddingBottom: 0,
      paddingLeft: '14px',
      paddingRight: '32px !important',
      fontSize: '0.875rem',
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
  id,
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
  InputLabelProps,
  ...props
}) => {
  const [focused, setFocused] = useState(false);
  const reactId = useId();
  const selectId = id || (name ? `app-select-${name}` : `app-select-${reactId}`);
  const labelId = `${selectId}-label`;

  // Normalize options array
  const formattedOptions = options.map((opt) => {
    if (typeof opt === 'object' && opt !== null) {
      const val = opt.value !== undefined ? opt.value : (opt.id !== undefined ? opt.id : (opt._id !== undefined ? opt._id : opt.code));
      const lbl = opt.label !== undefined ? opt.label : (opt.name !== undefined ? opt.name : String(val ?? ''));
      return { value: val, label: lbl };
    }
    return { value: opt, label: String(opt) };
  });

  const hasEmptyOption = formattedOptions.some(
    (opt) => opt.value === '' || opt.value === null || opt.value === undefined
  );

  const hasValue = multiple
    ? Array.isArray(value) && value.length > 0
    : value !== '' && value !== null && value !== undefined;

  const shouldShrink =
    Boolean(InputLabelProps?.shrink) ||
    focused ||
    hasValue ||
    hasEmptyOption;

  const renderSelectValue = (selected) => {
    if (props.renderValue) {
      return props.renderValue(selected);
    }

    const isEmpty = multiple
      ? !Array.isArray(selected) || selected.length === 0
      : selected === '' || selected === null || selected === undefined;

    if (isEmpty) {
      if (hasEmptyOption) {
        const emptyOpt = formattedOptions.find(
          (opt) => opt.value === '' || opt.value === null || opt.value === undefined
        );
        if (emptyOpt) return emptyOpt.label;
      }
      if ((focused || shouldShrink) && placeholder) {
        return (
          <Typography
            component="span"
            sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
          >
            {placeholder}
          </Typography>
        );
      }
      return '';
    }

    if (multiple) {
      if (Array.isArray(selected)) {
        return selected
          .map((val) => {
            const opt = formattedOptions.find((o) => o.value === val);
            return opt ? opt.label : val;
          })
          .join(', ');
      }
      return String(selected);
    }

    const selectedOpt = formattedOptions.find((opt) => opt.value === selected);
    return selectedOpt ? selectedOpt.label : String(selected);
  };

  return (
    <StyledFormControl
      fullWidth={fullWidth}
      size={size}
      error={Boolean(error)}
      disabled={disabled}
      required={required}
      sx={sx}
    >
      {label && (
        <InputLabel
          id={labelId}
          htmlFor={selectId}
          shrink={shouldShrink}
          {...InputLabelProps}
        >
          {label}
        </InputLabel>
      )}
      <Select
        labelId={labelId}
        id={selectId}
        value={value ?? (multiple ? [] : '')}
        onChange={onChange}
        label={label}
        name={name}
        multiple={multiple}
        displayEmpty={Boolean(placeholder || hasEmptyOption)}
        notched={shouldShrink}
        onFocus={(e) => {
          setFocused(true);
          if (props.onFocus) props.onFocus(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          if (props.onBlur) props.onBlur(e);
        }}
        onOpen={(e) => {
          setFocused(true);
          if (props.onOpen) props.onOpen(e);
        }}
        onClose={(e) => {
          setFocused(false);
          if (props.onClose) props.onClose(e);
        }}
        renderValue={renderSelectValue}
        MenuProps={menuPropsStyle}
        {...props}
      >
        {placeholder && !hasEmptyOption && (
          <MenuItem
            value=""
            disabled
            sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
          >
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
