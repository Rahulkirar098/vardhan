import {
  Checkbox,
  FormControl,
  FormControlLabel,
  FormHelperText,
} from '@mui/material';
import { styled } from '@mui/material/styles';

const StyledCheckbox = styled(Checkbox)(({ theme }) => {
  const custom = theme.custom || {};
  const tokens = custom.tokens || {};
  const colors = tokens.colors || {};

  return {
    color: theme.palette.text.secondary || '#6B7280',
    padding: '6px',
    borderRadius: '6px',
    transition: 'all 150ms ease',

    '&:hover': {
      backgroundColor: colors.lightBlueBg || '#E0F2FE',
    },

    '&.Mui-checked': {
      color: theme.palette.primary.main || '#252525',
    },

    '&.Mui-disabled': {
      color: theme.palette.divider || '#E5E7EB',
    },

    '&.Mui-focusVisible': {
      outline: `2px solid ${colors.strongBlue || '#0284C7'}`,
      outlineOffset: '2px',
    },
  };
});

/**
 * Reusable AppCheckbox Component for Nuvince SaaS Application.
 * Supports label, controlled checked state, disabled, required, error, helperText, and indeterminate states.
 */
const AppCheckbox = ({
  label,
  checked = false,
  onChange,
  name,
  disabled = false,
  required = false,
  indeterminate = false,
  error = false,
  helperText,
  sx = {},
  ...props
}) => {
  const checkboxElement = (
    <StyledCheckbox
      checked={checked}
      onChange={onChange}
      name={name}
      disabled={disabled}
      required={required}
      indeterminate={indeterminate}
      {...props}
    />
  );

  if (!label) {
    return checkboxElement;
  }

  return (
    <FormControl error={Boolean(error)} disabled={disabled} required={required} sx={sx}>
      <FormControlLabel
        control={checkboxElement}
        label={label}
        slotProps={{
          typography: {
            fontSize: '0.875rem',
            fontWeight: 500,
            color: error ? 'error.main' : disabled ? 'text.secondary' : 'text.primary',
          },
        }}
      />
      {helperText && <FormHelperText sx={{ mt: 0, ml: 3.5 }}>{helperText}</FormHelperText>}
    </FormControl>
  );
};

export default AppCheckbox;
