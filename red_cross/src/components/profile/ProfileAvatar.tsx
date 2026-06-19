import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Image, StyleSheet, View } from 'react-native';

import { Colors } from '@/constants/Colors';

type ProfileAvatarProps = {
  imageUrl?: string;
  size?: number;
};

export function ProfileAvatar({
  imageUrl,
  size = 104,
}: ProfileAvatarProps) {
  const borderRadius = size / 2;
  const iconSize = Math.round(size * 0.46);

  return (
    <View
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderRadius,
        },
      ]}
    >
      {imageUrl ? (
        <Image
          source={{ uri: imageUrl }}
          style={{ width: size, height: size, borderRadius }}
        />
      ) : (
        <Ionicons
          name="person-outline"
          size={iconSize}
          color={Colors.textSecondary}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
