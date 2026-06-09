import { ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { auth } from '@/config/firebase';
import { signOut } from 'firebase/auth';
import { useState } from 'react';

export default function SettingsScreen() {
  const [userId] = useState(auth.currentUser?.uid || 'Anonymous');

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      alert('Signed out successfully');
    } catch (error) {
      alert('Error signing out: ' + (error instanceof Error ? error.message : 'Unknown'));
    }
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView showsVerticalScrollIndicator={false} style={styles.content}>
          <ThemedView style={styles.header}>
            <ThemedText type="title">Settings</ThemedText>
          </ThemedView>

          <ThemedView style={styles.section}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              Account
            </ThemedText>
            <ThemedView style={styles.settingItem}>
              <ThemedText type="small">User ID</ThemedText>
              <ThemedText type="code" style={styles.userId}>
                {userId.substring(0, 12)}...
              </ThemedText>
            </ThemedView>
            <TouchableOpacity onPress={handleSignOut} style={styles.dangerButton}>
              <ThemedText style={styles.dangerButtonText}>Sign Out</ThemedText>
            </TouchableOpacity>
          </ThemedView>

          <ThemedView style={styles.section}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>About</ThemedText>
            <ThemedView style={styles.infoBox}>
              <ThemedText type="small" style={styles.infoText}>
                NYC Lines is a real-time crowd tracking app for bars and clubs in New York.
              </ThemedText>
              <ThemedText type="small" style={styles.infoText}>Version 1.0.0</ThemedText>
            </ThemedView>
          </ThemedView>

          <ThemedView style={styles.section}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>How to Use</ThemedText>
            <ThemedView style={styles.infoBox}>
              <ThemedText type="small" style={styles.stepText}>1. Browse bars and clubs</ThemedText>
              <ThemedText type="small" style={styles.stepText}>2. Tap a venue to see details</ThemedText>
              <ThemedText type="small" style={styles.stepText}>3. Submit your wait time estimate</ThemedText>
              <ThemedText type="small" style={styles.stepText}>4. Help others make informed decisions</ThemedText>
            </ThemedView>
          </ThemedView>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: {
    flex: 1,
    paddingHorizontal: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.two,
  },
  content: { flex: 1 },
  header: { marginBottom: Spacing.four, paddingTop: Spacing.three },
  section: { marginBottom: Spacing.four },
  sectionTitle: { marginBottom: Spacing.two },
  settingItem: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.two,
    marginBottom: Spacing.two,
    borderRadius: Spacing.one,
  },
  userId: { marginTop: Spacing.one, opacity: 0.7 },
  dangerButton: {
    paddingVertical: Spacing.three,
    borderRadius: Spacing.two,
    alignItems: 'center',
    backgroundColor: '#F44336',
    marginTop: Spacing.two,
  },
  dangerButtonText: { color: 'white', fontWeight: '600', fontSize: 16 },
  infoBox: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.one,
    gap: Spacing.one,
  },
  infoText: { lineHeight: 20 },
  stepText: { lineHeight: 20, marginBottom: Spacing.one },
});
