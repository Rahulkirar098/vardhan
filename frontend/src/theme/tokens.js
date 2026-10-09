/**
 * Nuvince Centralized Design Tokens
 * Finalized Brand Color System: Charcoal (#252525), Light Gray (#F3F4F6), Light Blue (#E0F2FE), Strong Blue (#0284C7)
 */

export const colors = {
  // Base Brand Palette
  primary: '#252525',
  primaryHover: '#374151',
  primaryForeground: '#FFFFFF',
  
  background: '#F9FAFB',
  card: '#FFFFFF',
  lightGrayBg: '#F3F4F6',
  
  border: '#E5E7EB',
  borderSoft: '#F3F4F6',
  input: '#E5E7EB',
  ring: '#0284C7',
  
  foreground: '#252525',
  secondaryText: '#6B7280',
  mutedForeground: '#9CA3AF',
  
  // Interactive & Accent Colors
  lightBlueBg: '#E0F2FE',
  lightBlueAccent: '#38BDF8',
  strongBlue: '#0284C7',
  
  sidebar: '#FFFFFF',
  sidebarActiveBg: '#E0F2FE',
  sidebarActiveText: '#252525',
  
  destructive: '#E7000B',
  destructiveForeground: '#FFFFFF',

  // Status Colors
  status: {
    success: {
      main: '#1C985A',
      light: '#F0FDF4',
      border: '#BBF7D0',
      text: '#166534',
    },
    warning: {
      main: '#DA950B',
      light: '#FEF3C7',
      border: '#FDE68A',
      text: '#92400E',
    },
    danger: {
      main: '#DF2225',
      light: '#FEF2F2',
      border: '#FECACA',
      text: '#991B1B',
    },
    info: {
      main: '#0080CC',
      light: '#F0F9FF',
      border: '#BAE6FD',
      text: '#075985',
    },
    neutral: {
      main: '#6B7280',
      light: '#F3F4F6',
      border: '#E5E7EB',
      text: '#374151',
    },
  },

  // Chart Colors
  charts: [
    '#F54900',
    '#009689',
    '#104E64',
    '#FFB900',
    '#FE9A00',
  ],

  // Overlay
  overlay: 'rgba(37, 37, 37, 0.45)',
};

export const typography = {
  fontFamily: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  fontSize: {
    sectionLabel: '0.625rem', // 10px
    tableHeader: '0.6875rem', // 11px
    caption: '0.75rem',      // 12px
    body: '0.875rem',        // 14px
    bodyLarge: '0.9375rem',  // 15px
    subheading: '1rem',      // 16px
    title: '1.125rem',       // 18px
    heading: '1.25rem',      // 20px
    kpi: '1.5rem',          // 24px
    largeTitle: '1.875rem',  // 30px
  },
  fontWeight: {
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
};

export const sizing = {
  borderRadius: {
    xs: '4px',
    sm: '6px',
    base: '10px',  // 0.625rem
    md: '12px',
    lg: '16px',
    xl: '20px',
    full: '9999px',
  },
  components: {
    button: {
      heightSmall: '32px',
      heightMedium: '40px',
      heightLarge: '48px',
      paddingSmall: '6px 14px',
      paddingMedium: '9px 18px',
      paddingLarge: '12px 24px',
    },
    input: {
      heightSmall: '36px',
      heightMedium: '40px',
      heightLarge: '48px',
    },
    tableCell: {
      paddingDense: '8px 12px',
      paddingNormal: '12px 18px',
    },
    sidebar: {
      width: '260px',
      collapsedWidth: '72px',
    },
    pageMaxWidth: '1440px',
  },
  shadows: {
    card: '0 1px 3px rgba(37, 37, 37, 0.04), 0 1px 2px rgba(37, 37, 37, 0.02)',
    dropdown: '0 10px 15px -3px rgba(37, 37, 37, 0.08), 0 4px 6px -4px rgba(37, 37, 37, 0.03)',
    modal: '0 20px 25px -5px rgba(37, 37, 37, 0.12), 0 8px 10px -6px rgba(37, 37, 37, 0.04)',
  },
};

export const transitions = {
  fast: 'all 120ms cubic-bezier(0.4, 0, 0.2, 1)',
  normal: 'all 180ms cubic-bezier(0.4, 0, 0.2, 1)',
  smooth: 'all 250ms cubic-bezier(0.4, 0, 0.2, 1)',
};

export const designTokens = {
  colors,
  typography,
  sizing,
  transitions,
};

export default designTokens;
