import { createTheme } from '@mui/material/styles';
import { colors, typography, sizing, transitions, designTokens } from './tokens';

export const createAppTheme = (mode = 'light') => {
  const isDark = mode === 'dark';

  return createTheme({
    palette: {
      mode,
      primary: {
        main: colors.primary,
        contrastText: colors.primaryForeground,
      },
      secondary: {
        main: colors.secondary,
        contrastText: colors.secondaryForeground,
      },
      background: {
        default: isDark ? '#0F172A' : colors.background,
        paper: isDark ? '#1E293B' : colors.card,
      },
      text: {
        primary: isDark ? '#F8FAFC' : colors.foreground,
        secondary: colors.mutedForeground,
      },
      divider: isDark ? '#334155' : colors.border,
      action: {
        hover: isDark ? 'rgba(241, 245, 249, 0.08)' : 'rgba(15, 23, 42, 0.04)',
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
            backgroundColor: isDark ? '#0F172A' : colors.background,
            color: isDark ? '#F8FAFC' : colors.foreground,
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
            '&:hover': {
              boxShadow: 'none',
            },
          },
          containedPrimary: {
            backgroundColor: colors.primary,
            color: colors.primaryForeground,
            '&:hover': {
              backgroundColor: '#1E293B',
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
              borderColor: colors.ring,
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: colors.ring,
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
            color: colors.mutedForeground,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            backgroundColor: colors.sidebar,
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
              backgroundColor: `${colors.secondary}80`,
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
            backgroundColor: colors.primary,
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
