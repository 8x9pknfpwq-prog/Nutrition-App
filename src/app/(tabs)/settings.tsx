import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth } from '@/config/firebase';
import { signOut } from 'firebase/auth';
import { useState } from 'react';

export default function SettingsScreen() {
  const [userId] = useState(auth.currentUser?.uid || 'Anonymous');

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      alert('Signed out');
    } catch (error) {
      alert('Error: ' + (error instanceof Error ? error.message : 'Unknown'));
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Settings</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Account</Text>
          <View style={styles.item}>
            <Text style={styles.itemLabel}>User ID</Text>
            <Text style={styles.itemValue}>{userId.substring(0, 12)}...</Text>
          </View>
          <TouchableOpacity onPress={handleSignOut} style={styles.button}>
            <Text style={styles.buttonText}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>About</Text>
          <Text style={styles.description}>
            NYC Lines is a real-time crowd tracking app for bars and clubs in New York.
          </Text>
          <Text style={styles.version}>Version 1.0.0</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  sectionTitle: {
    fontSize: 32,
    fontWeight: '600',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  item: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  itemLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  itemValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  button: {
    backgroundColor: '#F44336',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
  },
  description: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 8,
  },
  version: {
    fontSize: 12,
    color: '#999',
  },
});
