import { Colors as ThemeColors } from './theme';

export default {
  light: {
    text: ThemeColors.text,
    background: ThemeColors.background,
    tint: ThemeColors.primary,
    tabIconDefault: ThemeColors.secondaryText,
    tabIconSelected: ThemeColors.primary,
  },
  dark: {
    text: ThemeColors.white,
    background: '#0E1A19',
    tint: ThemeColors.secondary,
    tabIconDefault: '#899997',
    tabIconSelected: ThemeColors.secondary,
  },
};
