import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors } from '@/constants/Colors';
import { Spacing } from '@/constants/Spacing';
import { useAuth } from '@/hooks/useAuth';

type NoticeType = 'info' | 'success' | 'error';

export default function VerifyEmailScreen() {
  const {
    firebaseUser,
    refreshEmailVerificationStatus,
    resendVerificationEmail,
    signOut,
  } = useAuth();
  const [checking, setChecking] = useState(false);
  const [resending, setResending] = useState(false);
  const [notice, setNotice] = useState<{
    type: NoticeType;
    text: string;
  }>({
    type: 'success',
    text: 'Uspešno ste kreirali nalog. Ostao je još samo jedan korak: potvrdite email adresu klikom na link koji smo vam poslali.',
  });

  const handleCheckStatus = async () => {
    try {
      setChecking(true);
      const isVerified = await refreshEmailVerificationStatus();

      if (!isVerified) {
        setNotice({
          type: 'info',
          text: 'Email još nije potvrđen. Otvorite poruku iz inbox-a i kliknite na link, pa se zatim vratite ovde.',
        });
      }
    } catch (error: any) {
      setNotice({
        type: 'error',
        text: error.message ?? 'Provera statusa nije uspela.',
      });
    } finally {
      setChecking(false);
    }
  };

  const handleResendEmail = async () => {
    try {
      setResending(true);
      await resendVerificationEmail();
      setNotice({
        type: 'success',
        text: 'Poslali smo novi link za verifikaciju. Ako ga ne vidite odmah, proverite i spam folder.',
      });
    } catch (error: any) {
      setNotice({
        type: 'error',
        text: error.message ?? 'Slanje verifikacionog emaila nije uspelo.',
      });
    } finally {
      setResending(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.screen}>
        <View style={styles.topRow}>
          <Pressable
            style={({ pressed }) => [
              styles.signOutButton,
              pressed ? styles.signOutButtonPressed : null,
            ]}
            onPress={async () => {
              await signOut();
              router.replace('/login');
            }}
          >
            <Ionicons name="log-out-outline" size={18} color={Colors.textSecondary} />
            <Text style={styles.signOutText}>Odjavi se</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <Ionicons name="mail-open-outline" size={34} color={Colors.primary} />
          </View>

          <Text style={styles.eyebrow}>Skoro gotovo</Text>
          <Text style={styles.title}>Potvrdite email adresu</Text>

          <Text style={styles.description}>
            Link za potvrdu poslat je na{' '}
            <Text style={styles.email}>
              {firebaseUser?.email ?? 'vašu email adresu'}
            </Text>
            . Kada otvorite poruku i kliknete na link, nalog će biti spreman za korišćenje.
          </Text>

          <View
            style={[
              styles.notice,
              notice.type === 'success'
                ? styles.noticeSuccess
                : notice.type === 'error'
                  ? styles.noticeError
                  : styles.noticeInfo,
            ]}
          >
            <Text
              style={[
                styles.noticeText,
                notice.type === 'success'
                  ? styles.noticeTextSuccess
                  : notice.type === 'error'
                    ? styles.noticeTextError
                    : styles.noticeTextInfo,
              ]}
            >
              {notice.text}
            </Text>
          </View>

          <View style={styles.actions}>
            <Pressable
              style={({ pressed }) => [
                styles.primaryButton,
                pressed ? styles.primaryButtonPressed : null,
                checking ? styles.buttonDisabled : null,
              ]}
              onPress={handleCheckStatus}
              disabled={checking}
            >
              <Text style={styles.primaryButtonText}>
                {checking ? 'Proveravam...' : 'Već sam potvrdio/la email'}
              </Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.secondaryButton,
                pressed ? styles.secondaryButtonPressed : null,
                resending ? styles.buttonDisabled : null,
              ]}
              onPress={handleResendEmail}
              disabled={resending}
            >
              <Ionicons name="refresh-outline" size={16} color={Colors.primary} />
              <Text style={styles.secondaryButtonText}>
                {resending ? 'Šaljemo...' : 'Pošalji link ponovo'}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8F4F1',
  },
  screen: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xl,
    justifyContent: 'center',
  },
  topRow: {
    position: 'absolute',
    top: Spacing.lg,
    right: Spacing.lg,
    zIndex: 1,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#FFFFFFCC',
    borderWidth: 1,
    borderColor: '#E7DDD4',
  },
  signOutButtonPressed: {
    opacity: 0.75,
  },
  signOutText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  card: {
    backgroundColor: Colors.background,
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingVertical: 28,
    borderWidth: 1,
    borderColor: '#EFE3DA',
    shadowColor: '#2D1B10',
    shadowOpacity: 0.06,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  iconWrap: {
    width: 68,
    height: 68,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FDECEC',
    marginBottom: Spacing.md,
  },
  eyebrow: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: Colors.primary,
    marginBottom: 6,
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  description: {
    fontSize: 15,
    lineHeight: 24,
    color: Colors.textSecondary,
  },
  email: {
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  notice: {
    marginTop: Spacing.lg,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 1,
  },
  noticeSuccess: {
    backgroundColor: '#F3FAF6',
    borderColor: '#CFE9D7',
  },
  noticeInfo: {
    backgroundColor: '#F7F7FB',
    borderColor: '#DFE3EA',
  },
  noticeError: {
    backgroundColor: '#FEF3F2',
    borderColor: '#F3C7C2',
  },
  noticeText: {
    fontSize: 14,
    lineHeight: 21,
  },
  noticeTextSuccess: {
    color: '#166534',
  },
  noticeTextInfo: {
    color: '#344054',
  },
  noticeTextError: {
    color: '#B42318',
  },
  actions: {
    marginTop: Spacing.xl,
    gap: Spacing.sm,
  },
  primaryButton: {
    minHeight: 44,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  primaryButtonPressed: {
    opacity: 0.88,
  },
  primaryButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryButton: {
    minHeight: 42,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E7DDD4',
    backgroundColor: '#FFF9F5',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
  },
  secondaryButtonPressed: {
    opacity: 0.8,
  },
  secondaryButtonText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
