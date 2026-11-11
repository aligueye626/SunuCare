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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Shadows, Spacing, Typography } from '@/constants/theme';

export interface TabItem {
  id: string;
  label: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  activeIcon?: keyof typeof MaterialCommunityIcons.glyphMap;
  badgeCount?: number;
}

export interface BottomNavigationProps {
  tabs: TabItem[];
  activeTab: string;
  onTabPress: (tabId: string) => void;
  style?: StyleProp<ViewStyle>;
}

export function BottomNavigation({
  tabs,
  activeTab,
  onTabPress,
  style,
}: BottomNavigationProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        { paddingBottom: Math.max(insets.bottom, 8) },
        style,
      ]}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const iconName = isActive && tab.activeIcon ? tab.activeIcon : tab.icon;

        return (
          <Pressable
            key={tab.id}
            onPress={() => onTabPress(tab.id)}
            style={({ pressed }) => [styles.tabButton, pressed && styles.tabPressed]}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
          >
            <View style={styles.iconWrapper}>
              <MaterialCommunityIcons
                name={iconName}
                size={24}
                color={isActive ? Colors.primary : Colors.secondaryText}
              />
              {Boolean(tab.badgeCount && tab.badgeCount > 0) && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {tab.badgeCount! > 9 ? '9+' : tab.badgeCount}
                  </Text>
                </View>
              )}
            </View>

            <Text
              style={[
                styles.label,
                isActive ? styles.labelActive : styles.labelInactive,
              ]}
              numberOfLines={1}
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 8,
    ...Shadows.md,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    minHeight: 48,
  },
  tabPressed: {
    opacity: 0.7,
  },
  iconWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -10,
    backgroundColor: Colors.error,
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: Colors.white,
    fontSize: 10,
    fontWeight: Typography.fontWeight.bold,
  },
  label: {
    fontSize: Typography.fontSize.xs - 1,
    marginTop: 2,
  },
  labelActive: {
    color: Colors.primary,
    fontWeight: Typography.fontWeight.bold,
  },
  labelInactive: {
    color: Colors.secondaryText,
    fontWeight: Typography.fontWeight.medium,
  },
});

export default BottomNavigation;

