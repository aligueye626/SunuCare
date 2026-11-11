import { useColorScheme as useRNColorScheme } from 'react-native';
import Theme, { Colors, Spacing, Typography, BorderRadius, Shadows } from '@/constants/theme';

export function useTheme() {
  const scheme = useRNColorScheme() ?? 'light';
  const isDark = scheme === 'dark';

  return {
    theme: Theme,
    colors: Colors,
    spacing: Spacing,
    typography: Typography,
    borderRadius: BorderRadius,
    shadows: Shadows,
    isDark,
    scheme,
  };
}

export default useTheme;

