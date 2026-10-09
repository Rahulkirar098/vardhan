import { createTheme } from '@mui/material/styles';
import { colors, typography, sizing, transitions, designTokens } from './tokens';

export const createAppTheme = (mode = 'light') => {
  const isDark = mode === 'dark';

  return createTheme({
    palette: {
      mode,
      primary: {
        main: colors.primary, // #252525
        contrastText: colors.primaryForeground, // #FFFFFF
      },
      secondary: {
        main: colors.lightGrayBg, // #F3F4F6
        contrastText: colors.primary, // #252525
      },
      background: {
        default: isDark ? '#121212' : colors.background, // #F9FAFB
        paper: isDark ? '#1E1E1E' : colors.card, // #FFFFFF
      },
      text: {
        primary: isDark ? '#F9FAFB' : colors.foreground, // #252525
        secondary: colors.secondaryText, // #6B7280
      },
      divider: colors.border, // #E5E7EB
      action: {
        hover: isDark ? 'rgba(255, 255, 255, 0.08)' : colors.lightGrayBg, // #F3F4F6
        disabledOpacity: 0.55,
      },
      status: colors.status,
      chart: colors.charts,
    },
    typography: {
      fontFamily: typography.fontFamily,
      fontSize: 14,
    },
    shape: {
      borderRadius: 10, // base 0.625rem
    },
    breakpoints: {
      values: {
        xs: 0,
        sm: 768, // mobile breakpoint threshold at 767px
        md: 1024,
        lg: 1280,
        xl: 1536,
      },
    },
    custom: {
      tokens: designTokens,
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            fontFamily: typography.fontFamily,
            backgroundColor: isDark ? '#121212' : colors.background,
            color: isDark ? '#F9FAFB' : colors.foreground,
            margin: 0,
            padding: 0,
            boxSizing: 'border-box',
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            fontWeight: 600,
            borderRadius: '10px',
            height: '40px',
            paddingLeft: '18px',
            paddingRight: '18px',
            boxShadow: 'none',
            transition: transitions.normal,
            '&:hover': {
              boxShadow: 'none',
            },
            '&:focus-visible': {
              outline: `2px solid ${colors.strongBlue}`,
              outlineOffset: '2px',
            },
            '&.Mui-disabled': {
              opacity: 0.55,
              cursor: 'not-allowed',
            },
          },
          containedPrimary: {
            backgroundColor: colors.primary, // #252525
            color: colors.primaryForeground, // #FFFFFF
            '&:hover': {
              backgroundColor: colors.primaryHover, // #374151
            },
          },
          outlinedSecondary: {
            backgroundColor: colors.card, // #FFFFFF
            color: colors.primary, // #252525
            borderColor: colors.border, // #E5E7EB
            '&:hover': {
              backgroundColor: colors.lightBlueBg, // #E0F2FE
              borderColor: colors.strongBlue, // #0284C7
            },
          },
          outlined: {
            backgroundColor: colors.card,
            color: colors.primary,
            borderColor: colors.border,
            '&:hover': {
              backgroundColor: colors.lightBlueBg,
              borderColor: colors.strongBlue,
            },
          },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: '10px',
            height: '40px',
            fontSize: typography.fontSize.body,
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: colors.border,
            },
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: colors.strongBlue,
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: colors.strongBlue,
              borderWidth: '1.5px',
            },
          },
          input: {
            padding: '8px 12px',
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            borderRadius: '10px',
            boxShadow: sizing.shadows.card,
            backgroundImage: 'none',
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: '10px',
            border: `1px solid ${colors.border}`,
            boxShadow: sizing.shadows.card,
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: {
            fontSize: typography.fontSize.body,
            padding: '10px 16px',
            borderBottom: `1px solid ${colors.border}`,
          },
          head: {
            fontSize: typography.fontSize.tableHeader,
            fontWeight: typography.fontWeight.bold,
            color: colors.secondaryText,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            backgroundColor: colors.lightGrayBg,
            height: '40px',
            padding: '10px 16px',
          },
        },
      },
      MuiTableRow: {
        styleOverrides: {
          root: {
            height: '44px',
            '&:hover': {
              backgroundColor: colors.lightGrayBg,
            },
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: '6px',
            fontWeight: 500,
            fontSize: '0.75rem',
            height: '24px',
          },
        },
      },
      MuiTabs: {
        styleOverrides: {
          indicator: {
            backgroundColor: colors.strongBlue,
            height: 3,
            borderRadius: '3px 3px 0 0',
          },
        },
      },
      MuiTab: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            fontWeight: 600,
            fontSize: '0.875rem',
            minHeight: '40px',
            padding: '6px 16px',
            color: colors.secondaryText,
            '&.Mui-selected': {
              color: colors.primary,
            },
          },
        },
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            backgroundColor: colors.primary,
            color: colors.primaryForeground,
            fontSize: '0.75rem',
            borderRadius: '6px',
            padding: '6px 10px',
          },
        },
      },
    },
  });
};

const defaultTheme = createAppTheme('light');
export default defaultTheme;
