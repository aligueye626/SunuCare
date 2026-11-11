import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors, Spacing, Typography } from '@/constants/theme';

export interface HeaderProps {
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  onBackPress?: () => void;
  rightAction?: React.ReactNode;
  transparent?: boolean;
}

export function Header({
  title,
  subtitle,
  showBack = false,
  onBackPress,
  rightAction,
  transparent = false,
}: HeaderProps) {
  const router = useRouter();

  const handleBack = () => {
    if (onBackPress) {
      onBackPress();
    } else if (router.canGoBack()) {
      router.back();
    }
  };

  return (
    <View style={[styles.container, transparent && styles.transparent]}>
      <View style={styles.left}>
        {showBack && (
          <Pressable
            onPress={handleBack}
            hitSlop={12}
            style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
          >
            <MaterialCommunityIcons
              name="arrow-left"
              size={24}
              color={Colors.text}
            />
          </Pressable>
        )}
      </View>

      <View style={styles.center}>
        {title && (
          <Text numberOfLines={1} style={styles.title}>
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
    backgroundColor: Colors.surface,
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
    color: Colors.text,
  },
  subtitle: {
    fontSize: Typography.fontSize.xs,
    color: Colors.secondaryText,
    marginTop: 2,
  },
});

export default Header;

