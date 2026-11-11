import React from 'react';
import {
  Image,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BorderRadius, Colors, Typography } from '@/constants/theme';

export interface AvatarProps {
  uri?: string;
  name?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  verified?: boolean;
  isOnline?: boolean;
  style?: StyleProp<ViewStyle>;
  backgroundColor?: string;
}

export function Avatar({
  uri,
  name,
  size = 'md',
  verified = false,
  isOnline = false,
  style,
  backgroundColor,
}: AvatarProps) {
  const getInitials = (text?: string): string => {
    if (!text) return 'SC';
    const clean = text.replace(/^(Dr\.?|Pr\.?)\s+/i, '').trim();
    const parts = clean.split(' ').filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return clean.slice(0, 2).toUpperCase();
  };

  const dimension = dimensionsMap[size];
  const fontSize = fontSizesMap[size];
  const badgeSize = badgeSizesMap[size];

  return (
    <View style={[styles.wrapper, { width: dimension, height: dimension }, style]}>
      {uri ? (
        <Image
          source={{ uri }}
          style={[
            styles.image,
            { width: dimension, height: dimension, borderRadius: dimension / 2 },
          ]}
        />
      ) : (
        <View
          style={[
            styles.fallback,
            {
              width: dimension,
              height: dimension,
              borderRadius: dimension / 2,
              backgroundColor: backgroundColor || Colors.secondaryLight,
            },
          ]}
        >
          <Text style={[styles.initials, { fontSize }]}>{getInitials(name)}</Text>
        </View>
      )}

      {verified && (
        <View
          style={[
            styles.verifiedBadge,
            {
              width: badgeSize,
              height: badgeSize,
              borderRadius: badgeSize / 2,
              bottom: 0,
              right: 0,
            },
          ]}
        >
          <MaterialCommunityIcons
            name="check"
            size={Math.max(10, Math.floor(badgeSize * 0.65))}
            color={Colors.white}
          />
        </View>
      )}

      {!verified && isOnline && (
        <View
          style={[
            styles.onlineIndicator,
            {
              width: badgeSize * 0.8,
              height: badgeSize * 0.8,
              borderRadius: badgeSize * 0.4,
              bottom: 0,
              right: 0,
            },
          ]}
        />
      )}
    </View>
  );
}

const dimensionsMap = {
  sm: 36,
  md: 48,
  lg: 64,
  xl: 88,
};

const fontSizesMap = {
  sm: Typography.fontSize.xs,
  md: Typography.fontSize.sm,
  lg: Typography.fontSize.lg,
  xl: Typography.fontSize.xxl,
};

const badgeSizesMap = {
  sm: 14,
  md: 18,
  lg: 22,
  xl: 26,
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
  },
  image: {
    resizeMode: 'cover',
  },
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(20, 125, 117, 0.15)',
  },
  initials: {
    fontWeight: Typography.fontWeight.bold,
    color: Colors.primary,
  },
  verifiedBadge: {
    position: 'absolute',
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: Colors.white,
  },
  onlineIndicator: {
    position: 'absolute',
    backgroundColor: Colors.success,
    borderWidth: 1.5,
    borderColor: Colors.white,
  },
});

export default Avatar;

