import { createTheme } from '@mui/material/styles';

const INK = '#0A0A0A';
const MUTED = '#6B6B6B';
const BORDER = '#E5E5E5';
const BORDER_SOFT = '#F0F0F0';
const SURFACE = '#FFFFFF';
const CANVAS = '#FAFAFA';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: INK,
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#FFFFFF',
      contrastText: INK,
    },
    background: {
      default: CANVAS,
      paper: SURFACE,
    },
    text: {
      primary: INK,
      secondary: MUTED,
    },
    divider: BORDER,
    grey: {
      50: '#FAFAFA',
      100: '#F7F7F7',
      200: '#F0F0F0',
      300: '#E5E5E5',
      400: '#D4D4D4',
      500: '#A3A3A3',
      600: '#6B6B6B',
      700: '#404040',
      800: '#1F1F1F',
      900: '#0A0A0A',
    },
  },
  shape: {
    borderRadius: 8,
  },
  typography: {
    fontFamily: 'Roboto, Helvetica, Arial, sans-serif',
    h1: {
      fontWeight: 700,
      letterSpacing: '-0.06em',
    },
    h2: {
      fontWeight: 700,
      letterSpacing: '-0.05em',
    },
    h3: {
      fontWeight: 700,
      letterSpacing: '-0.04em',
    },
    h4: {
      fontWeight: 700,
      letterSpacing: '-0.03em',
    },
    h5: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 600,
    },
    subtitle1: {
      fontWeight: 600,
    },
    body1: {
      fontSize: '0.95rem',
    },
    body2: {
      fontSize: '0.875rem',
    },
    button: {
      textTransform: 'none',
      fontWeight: 600,
      letterSpacing: 0,
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: CANVAS,
          overflowWrap: 'break-word',
          wordBreak: 'break-word',
        },
      },
    },
    MuiTypography: {
      styleOverrides: {
        root: {
          overflowWrap: 'break-word',
          wordBreak: 'break-word',
        },
      },
    },
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          borderRadius: '8px',
          padding: '9px 16px',
          fontSize: '0.9rem',
          lineHeight: 1.4,
          boxShadow: 'none',
          transition: 'all 160ms ease',
          '&:hover': {
            boxShadow: 'none',
          },
        },
        sizeLarge: {
          padding: '12px 22px',
          fontSize: '0.95rem',
        },
        sizeSmall: {
          padding: '6px 12px',
          fontSize: '0.82rem',
        },
        containedPrimary: {
          backgroundColor: INK,
          color: '#FFFFFF',
          '&:hover': {
            backgroundColor: '#262626',
          },
        },
        containedError: {
          backgroundColor: '#FDECEC',
          color: '#B42318',
          border: '1px solid #F5D0D0',
          '&:hover': {
            backgroundColor: '#FBDCDC',
          },
        },
        outlined: {
          borderColor: BORDER,
          color: INK,
          backgroundColor: SURFACE,
          '&:hover': {
            borderColor: '#C4C4C4',
            backgroundColor: '#FAFAFA',
          },
        },
        outlinedPrimary: {
          borderColor: BORDER,
          color: INK,
          '&:hover': {
            borderColor: '#BDBDBD',
            backgroundColor: '#F7F7F7',
          },
        },
        text: {
          '&:hover': {
            backgroundColor: 'rgba(10, 10, 10, 0.04)',
          },
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: '8px',
          backgroundColor: SURFACE,
          '& fieldset': {
            borderColor: BORDER,
          },
          '&:hover fieldset': {
            borderColor: '#BDBDBD',
          },
          '&.Mui-focused fieldset': {
            borderColor: INK,
            borderWidth: '1.5px',
          },
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        fullWidth: true,
        size: 'small',
      },
    },
    MuiFormControl: {
      defaultProps: {
        size: 'small',
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          fontWeight: 500,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: '12px',
          border: `1px solid ${BORDER}`,
          backgroundColor: SURFACE,
          backgroundImage: 'none',
          boxShadow: '0px 1px 2px rgba(0, 0, 0, 0.04)',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: SURFACE,
          color: INK,
          borderBottom: `1px solid ${BORDER}`,
          boxShadow: 'none',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          borderRight: `1px solid ${BORDER}`,
          backgroundColor: SURFACE,
          backgroundImage: 'none',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: '12px',
          border: `1px solid ${BORDER}`,
          boxShadow: '0px 1px 2px rgba(0, 0, 0, 0.04)',
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: '14px',
          border: `1px solid ${BORDER}`,
          boxShadow: '0 24px 60px rgba(0,0,0,0.14)',
          backgroundImage: 'none',
        },
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: {
          fontWeight: 700,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 999,
          fontWeight: 600,
          fontSize: '0.75rem',
        },
      },
    },
    MuiAvatar: {
      styleOverrides: {
        root: {
          fontWeight: 600,
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: `1px solid ${BORDER_SOFT}`,
          padding: '11px 18px',
          fontSize: '0.9rem',
          overflowWrap: 'break-word',
          wordBreak: 'break-word',
        },
        head: {
          backgroundColor: '#FAFAFA',
          color: MUTED,
          fontSize: '0.72rem',
          fontWeight: 700,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          borderBottom: `1px solid ${BORDER}`,
          padding: '10px 18px',
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          transition: 'background-color 140ms ease',
          '&:last-of-type td': {
            borderBottom: 'none',
          },
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: '8px',
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: '8px',
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: INK,
          fontSize: '0.75rem',
          borderRadius: '6px',
        },
      },
    },
  },
});

export default theme;
