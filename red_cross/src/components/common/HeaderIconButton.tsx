import { Ionicons } from '@expo/vector-icons';
import { ComponentProps } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { Colors } from '@/constants/Colors';

type HeaderIconButtonProps = {
  iconName: ComponentProps<typeof Ionicons>['name'];
  onPress: () => void;
};

export function HeaderIconButton({
  iconName,
  onPress,
}: HeaderIconButtonProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.button,
        pressed ? styles.buttonPressed : null,
      ]}
      onPress={onPress}
    >
      <Ionicons name={iconName} size={22} color="#FFF" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPressed: {
    opacity: 0.85,
  },
});
