import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { globalStyles } from '@/constants/globalStyles';

export default function EditProfileScreen() {
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View style={globalStyles.screen}>
        <Text style={globalStyles.title}>Izmena profila</Text>
      </View>
    </SafeAreaView>
  );
}