import React from 'react';
import {
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BorderRadius, Colors, Spacing, Typography } from '@/constants/theme';

export interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  onFilterPress?: () => void;
  onClear?: () => void;
}

export function SearchBar({
  value,
  onChangeText,
  placeholder = 'Rechercher un médecin, spécialité, quartier...',
  onFilterPress,
  onClear,
}: SearchBarProps) {
  return (
    <View style={styles.container}>
      <View style={styles.inputWrapper}>
        <MaterialCommunityIcons
          name="magnify"
          size={20}
          color={Colors.secondaryText}
          style={styles.searchIcon}
        />
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={Colors.secondaryText}
          selectionColor={Colors.primary}
          returnKeyType="search"
        />
        {value.length > 0 && (
          <Pressable onPress={onClear || (() => onChangeText(''))} hitSlop={8}>
            <MaterialCommunityIcons
              name="close-circle"
              size={18}
              color={Colors.secondaryText}
            />
          </Pressable>
        )}
      </View>

      {onFilterPress && (
        <Pressable
          onPress={onFilterPress}
          style={({ pressed }) => [styles.filterButton, pressed && styles.pressed]}
        >
          <MaterialCommunityIcons
            name="tune-variant"
            size={20}
            color={Colors.primary}
          />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    height: 48,
  },
  searchIcon: {
    marginRight: Spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: Typography.fontSize.sm,
    color: Colors.text,
  },
  filterButton: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.secondaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(20, 125, 117, 0.15)',
  },
  pressed: {
    opacity: 0.7,
  },
});

export default SearchBar;

