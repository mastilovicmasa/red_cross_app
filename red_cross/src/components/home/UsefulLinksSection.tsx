import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/constants/Colors';
import { Spacing } from '@/constants/Spacing';

type UsefulLinkItem = {
  id: string;
  label: string;
  description: string;
  iconName: keyof typeof Ionicons.glyphMap;
  url: string;
};

type UsefulLinksSectionProps = {
  title?: string;
  subtitle?: string;
  links?: UsefulLinkItem[];
};

const defaultLinks: UsefulLinkItem[] = [
  {
    id: 'website',
    label: 'Sajt',
    description: 'Zvanični sajt Gradskog odbora Crvenog krsta Novi Sad.',
    iconName: 'globe-outline',
    url: 'https://www.gockns.org.rs/',
  },
  {
    id: 'facebook',
    label: 'Facebook',
    description: 'Vesti, objave i aktuelnosti na Facebook stranici.',
    iconName: 'logo-facebook',
    url: 'https://www.facebook.com/GOCKNS/',
  },
  {
    id: 'instagram-main',
    label: 'Instagram',
    description: 'Glavni Instagram profil organizacije.',
    iconName: 'logo-instagram',
    url: 'https://www.instagram.com/crvenikrstnovisad/',
  },
  {
    id: 'instagram-field-unit',
    label: 'Instagram TJ',
    description: 'Instagram profil terenske jedinice.',
    iconName: 'images-outline',
    url: 'https://www.instagram.com/otjjjzgockns?igsh=OXRjaWdocG9kcnBu',
  },
];

export function UsefulLinksSection({
  title = 'Korisni linkovi',
  subtitle = 'Brz pristup zvaničnim kanalima i društvenim mrežama.',
  links = defaultLinks,
}: UsefulLinksSectionProps) {
  const handleOpenLink = async (url: string) => {
    try {
      const canOpen = await Linking.canOpenURL(url);

      if (!canOpen) {
        Alert.alert('Link nije dostupan', 'Nije moguće otvoriti izabrani link.');
        return;
      }

      await Linking.openURL(url);
    } catch (error) {
      console.error('Error opening useful link:', error);
      Alert.alert('Greška', 'Došlo je do greške prilikom otvaranja linka.');
    }
  };

  return (
    <View style={styles.section}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>

      <View style={styles.list}>
        {links.map(link => (
          <Pressable
            key={link.id}
            style={({ pressed }) => [
              styles.card,
              pressed ? styles.cardPressed : null,
            ]}
            onPress={() => handleOpenLink(link.url)}
          >
            <View style={styles.iconContainer}>
              <Ionicons name={link.iconName} size={22} color={Colors.primary} />
            </View>

            <View style={styles.content}>
              <Text style={styles.label}>{link.label}</Text>
              <Text style={styles.description}>{link.description}</Text>
            </View>

            <Ionicons
              name="open-outline"
              size={18}
              color={Colors.textSecondary}
            />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
    marginBottom: Spacing.md,
  },
  list: {
    gap: Spacing.sm,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: '#FFF',
    padding: Spacing.md,
  },
  cardPressed: {
    opacity: 0.82,
  },
  iconContainer: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primaryLight,
  },
  content: {
    flex: 1,
  },
  label: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
    color: Colors.textSecondary,
    marginTop: 2,
  },
});
