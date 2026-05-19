import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/constants/Colors';

type DatePickerButtonProps = {
  label: string;
  value: Date;
  onPress: () => void;
};

export function DatePickerButton({
  label,
  value,
  onPress,
}: DatePickerButtonProps) {
  return (
    <View style={styles.dateField}>
      <Text style={styles.inputLabel}>{label}</Text>
      <Pressable style={styles.dateButton} onPress={onPress}>
        <Text style={styles.dateButtonText}>{formatDateTime(value)}</Text>
      </Pressable>
    </View>
  );
}

export function formatDateTime(date: Date) {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${day}.${month}.${year}. ${hours}:${minutes}`;
}

const styles = StyleSheet.create({
  dateField: {
    width: '100%',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 6,
  },
  dateButton: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    justifyContent: 'center',
    paddingHorizontal: 14,
    backgroundColor: '#FFF',
  },
  dateButtonText: {
    fontSize: 16,
    color: Colors.textPrimary,
  },
});
