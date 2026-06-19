import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/constants/Colors';
import { Spacing } from '@/constants/Spacing';

type SegmentedTabsProps<T extends string> = {
  options: Array<{
    label: string;
    value: T;
  }>;
  selectedValue: T;
  onChange: (value: T) => void;
};

export function SegmentedTabs<T extends string>({
  options,
  selectedValue,
  onChange,
}: SegmentedTabsProps<T>) {
  return (
    <View style={styles.container}>
      {options.map(option => {
        const isSelected = selectedValue === option.value;

        return (
          <Pressable
            key={option.value}
            style={[styles.tab, isSelected ? styles.activeTab : null]}
            onPress={() => onChange(option.value)}
          >
            <Text style={[styles.tabText, isSelected ? styles.activeTabText : null]}>
              {option.label}
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
    backgroundColor: Colors.primaryLight,
    borderRadius: 12,
    padding: Spacing.xs,
    marginBottom: Spacing.md,
  },
  tab: {
    flex: 1,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: '#FFF',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  activeTabText: {
    color: Colors.primary,
  },
});
