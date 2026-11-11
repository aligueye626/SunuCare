/**
 * SunuCare Theme Constants
 * Modern, clean, professional healthcare theme with a subtle Senegalese identity
 * Dakar, Senegal
 */

export const Colors = {
  // Required Brand Palette
  primary: '#147D75',         // Deep African Teal / Medical confidence
  primaryDark: '#0D5B55',
  primaryLight: '#1C968D',
  secondary: '#20B8A5',       // Mint Turquoise / Vitality
  secondaryLight: '#E8F8F5',
  background: '#F7FAFA',      // Soft clean clinical tint
  white: '#FFFFFF',
  text: '#172B2A',            // Deep slate black
  secondaryText: '#71817F',   // Muted slate gray
  textSecondary: '#71817F',   // Alias for consistency
  error: '#E05252',           // Coral red
  errorLight: '#FDECEC',      // Soft red background

  // Semantic & Auxiliary Colors
  surface: '#FFFFFF',
  surfaceMuted: '#F0F6F5',
  card: '#FFFFFF',
  border: '#E1ECEB',
  borderLight: '#EDF4F3',
  divider: '#EAF0EF',

  // African identity warmth (Teranga / Dakar Sun)
  accentGold: '#E8A838',
  accentGoldLight: '#FEF7EC',

  // Status Colors
  success: '#1B9A68',
  successLight: '#E8F7F0',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  info: '#2563EB',
  infoLight: '#EFF6FF',

  // Verification Badges (Doctor status requirement)
  verifiedBadge: '#147D75',
  pendingBadge: '#F59E0B',
  rejectedBadge: '#E05252',

  // Shadow / Overlay
  shadow: '#172B2A',
  overlay: 'rgba(23, 43, 42, 0.45)',
} as const;

export const Typography = {
  fontSize: {
    xs: 12,
    sm: 14,
    base: 16,
    md: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    display: 30,
    hero: 36,
  },
  lineHeight: {
    xs: 16,
    sm: 20,
    md: 24,
    lg: 26,
    xl: 28,
    xxl: 32,
    display: 38,
    hero: 44,
  },
  fontWeight: {
    regular: '400' as const,
    medium: '500' as const,
    semiBold: '600' as const,
    bold: '700' as const,
    heavy: '800' as const,
  },
} as const;

export const Spacing = {
  none: 0,
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
  huge: 48,
} as const;

export const BorderRadius = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  pill: 9999,
  full: 9999,
  circle: 9999,
} as const;

export const Shadows = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  sm: {
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  md: {
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  lg: {
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
} as const;

export const Theme = {
  colors: Colors,
  typography: Typography,
  spacing: Spacing,
  borderRadius: BorderRadius,
  shadows: Shadows,
} as const;

export default Theme;

