import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text } from 'react-native';

import { Colors } from '@/constants/Colors';

type BackButtonProps = {
  onPress: () => void;
};

export function BackButton({ onPress }: BackButtonProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.button,
        pressed ? styles.buttonPressed : null,
      ]}
      onPress={onPress}
    >
      <Ionicons name="chevron-back" size={22} color={Colors.primary} />
      <Text style={styles.text}>Nazad</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonPressed: {
    opacity: 0.75,
  },
  text: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.primary,
  },
});
