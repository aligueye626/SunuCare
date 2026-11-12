import React from 'react';
import {
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useSegments } from 'expo-router';
import { Colors, Spacing, Typography } from '@/constants/theme';

export interface CustomHeaderProps {
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  onBackPress?: () => void;
  rightAction?: React.ReactNode;
  transparent?: boolean;
  style?: StyleProp<ViewStyle>;
  titleColor?: string;
}

export function CustomHeader({
  title,
  subtitle,
  showBack = false,
  onBackPress,
  rightAction,
  transparent = false,
  style,
  titleColor = Colors.text,
}: CustomHeaderProps) {
  const router = useRouter();
  const segments = useSegments();

  const handleBack = () => {
    if (onBackPress) {
      onBackPress();
      return;
    }

    if (router.canGoBack()) {
      router.back();
      return;
    }

    // Fallback when history stack is empty (e.g. after router.replace or Web refresh)
    const firstSegment = segments[0] as string | undefined;
    const secondSegment = segments[1] as string | undefined;

    if (firstSegment === '(auth)') {
      if (secondSegment === 'register' || secondSegment === 'forgot-password') {
        router.replace('/(auth)/login');
      } else {
        router.replace('/');
      }
    } else if (firstSegment === 'doctor-space') {
      router.replace('/doctor-space/dashboard');
    } else if (firstSegment === 'admin-space') {
      router.replace('/admin-space/dashboard' as any);
    } else if (firstSegment === 'appointments') {
      router.replace('/(tabs)/appointments');
    } else {
      router.replace('/(tabs)');
    }
  };

  return (
    <View style={[styles.container, transparent && styles.transparent, style]}>
      <View style={styles.left}>
        {showBack && (
          <Pressable
            onPress={handleBack}
            hitSlop={12}
            style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="Retour"
          >
            <MaterialCommunityIcons
              name="arrow-left"
              size={24}
              color={titleColor}
            />
          </Pressable>
        )}
      </View>

      <View style={styles.center}>
        {title && (
          <Text numberOfLines={1} style={[styles.title, { color: titleColor }]}>
            {title}
          </Text>
        )}
        {subtitle && (
          <Text numberOfLines={1} style={styles.subtitle}>
            {subtitle}
          </Text>
        )}
      </View>

      <View style={styles.right}>{rightAction}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    backgroundColor: Colors.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  transparent: {
    backgroundColor: 'transparent',
    borderBottomWidth: 0,
  },
  left: {
    width: 44,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xs,
  },
  right: {
    width: 44,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  backButton: {
    padding: Spacing.xs,
    borderRadius: 8,
  },
  pressed: {
    opacity: 0.6,
  },
  title: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
  },
  subtitle: {
    fontSize: Typography.fontSize.xs,
    color: Colors.secondaryText,
    marginTop: 2,
  },
});

export default CustomHeader;

