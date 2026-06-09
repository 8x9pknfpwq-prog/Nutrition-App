import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useBars, useQueueStatus } from '@/hooks/useQueues';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useState } from 'react';
import { ref, set, serverTimestamp } from 'firebase/database';
import { db, auth } from '@/config/firebase';
import { signInAnonymously } from 'firebase/auth';

const getCrowdColor = (crowdLevel?: string) => {
  switch (crowdLevel) {
    case 'empty': return '#4CAF50';
    case 'moderate': return '#FFC107';
    case 'busy': return '#FF9800';
    case 'packed': return '#F44336';
    default: return '#999';
  }
};

export default function BarDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { bars, loading: barsLoading } = useBars();
  const { queueStatus, loading: statusLoading } = useQueueStatus(id || '');
  const [selectedCrowd, setSelectedCrowd] = useState<string | null>(null);
  const [waitTime, setWaitTime] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const bar = bars.find((b) => b.id === id);

  const handleSubmit = async () => {
    if (!selectedCrowd || !waitTime) {
      alert('Please fill in all fields');
      return;
    }

    try {
      setSubmitting(true);

      // Ensure user is authenticated
      if (!auth.currentUser) {
        await signInAnonymously(auth);
      }

      const minutes = parseInt(waitTime, 10);
      if (isNaN(minutes)) {
        alert('Please enter a valid wait time');
        return;
      }

      // Submit check-in
      const checkInRef = ref(db, `check_ins/${id}/${Date.now()}`);
      await set(checkInRef, {
        waitTimeMinutes: minutes,
        crowdLevel: selectedCrowd,
        userId: auth.currentUser?.uid,
        timestamp: serverTimestamp(),
      });

      // Update queue status
      const statusRef = ref(db, `queue_status/${id}`);
      await set(statusRef, {
        waitTimeMinutes: minutes,
        crowdLevel: selectedCrowd,
        userCount: (queueStatus?.userCount || 0) + 1,
        lastUpdated: serverTimestamp(),
        updatedBy: auth.currentUser?.uid,
      });

      alert('Check-in submitted!');
      setWaitTime('');
      setSelectedCrowd(null);
    } catch (error) {
      alert('Error submitting check-in: ' + (error instanceof Error ? error.message : 'Unknown'));
    } finally {
      setSubmitting(false);
    }
  };

  if (barsLoading || !bar) {
    return (
      <ThemedView style={styles.container}>
        <ActivityIndicator size="large" />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ThemedText>← Back</ThemedText>
        </TouchableOpacity>

        <ScrollView showsVerticalScrollIndicator={false} style={styles.content}>
          <ThemedView style={styles.header}>
            <ThemedText type="title">{bar.name}</ThemedText>
            <ThemedText type="small" style={styles.type}>{bar.type}</ThemedText>
          </ThemedView>

          <ThemedView style={styles.infoSection}>
            <ThemedText type="small" style={styles.label}>Location</ThemedText>
            <ThemedText style={styles.address}>{bar.address}</ThemedText>
          </ThemedView>

          {queueStatus && (
            <ThemedView
              style={[
                styles.statusCard,
                { borderLeftColor: getCrowdColor(queueStatus.crowdLevel) }
              ]}
            >
              <ThemedView style={styles.statusHeader}>
                <ThemedText type="subtitle">Current Status</ThemedText>
                <ThemedView style={styles.waitTimeBadge}>
                  <ThemedText style={styles.waitTimeText}>
                    {queueStatus.waitTimeMinutes}m
                  </ThemedText>
                </ThemedView>
              </ThemedView>
              <ThemedText style={styles.crowdLevel}>
                {queueStatus.crowdLevel} • {queueStatus.userCount} reports
              </ThemedText>
            </ThemedView>
          )}

          <ThemedView style={styles.formSection}>
            <ThemedText type="subtitle" style={styles.formTitle}>
              Report Current Wait Time
            </ThemedText>

            <ThemedView style={styles.crowdLevelSection}>
              <ThemedText type="small" style={styles.label}>Crowd Level</ThemedText>
              <ThemedView style={styles.crowdButtons}>
                {['empty', 'moderate', 'busy', 'packed'].map((level) => (
                  <TouchableOpacity
                    key={level}
                    onPress={() => setSelectedCrowd(level)}
                    style={[
                      styles.crowdButton,
                      {
                        backgroundColor:
                          selectedCrowd === level
                            ? getCrowdColor(level)
                            : getCrowdColor(level) + '40',
                      },
                    ]}
                  >
                    <ThemedText
                      style={[
                        styles.crowdButtonText,
                        {
                          color: selectedCrowd === level ? 'white' : getCrowdColor(level),
                        },
                      ]}
                    >
                      {level}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </ThemedView>
            </ThemedView>

            <ThemedView style={styles.waitTimeSection}>
              <ThemedText type="small" style={styles.label}>Wait Time (minutes)</ThemedText>
              <ThemedView style={styles.inputContainer}>
                <ThemedView style={styles.input}>
                  <ThemedText>{waitTime || '0'}</ThemedText>
                </ThemedView>
                <ThemedView style={styles.inputButtons}>
                  <TouchableOpacity
                    onPress={() => setWaitTime(String(Math.max(0, parseInt(waitTime || '0', 10) - 5)))}
                    style={styles.inputButton}
                  >
                    <ThemedText>−</ThemedText>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setWaitTime(String((parseInt(waitTime || '0', 10) + 5)))}
                    style={styles.inputButton}
                  >
                    <ThemedText>+</ThemedText>
                  </TouchableOpacity>
                </ThemedView>
              </ThemedView>
            </ThemedView>

            <TouchableOpacity
              onPress={handleSubmit}
              disabled={submitting || !selectedCrowd || !waitTime}
              style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
            >
              <ThemedText style={styles.submitButtonText}>
                {submitting ? 'Submitting...' : 'Submit Check-in'}
              </ThemedText>
            </TouchableOpacity>
          </ThemedView>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.two,
  },
  backButton: {
    paddingVertical: Spacing.two,
    marginBottom: Spacing.two,
  },
  content: {
    flex: 1,
  },
  header: {
    marginBottom: Spacing.four,
  },
  type: {
    marginTop: Spacing.one,
    opacity: 0.6,
    textTransform: 'capitalize',
  },
  infoSection: {
    marginBottom: Spacing.four,
  },
  label: {
    opacity: 0.6,
    marginBottom: Spacing.one,
  },
  address: {
    fontSize: 16,
  },
  statusCard: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    borderLeftWidth: 4,
    borderRadius: Spacing.two,
    marginBottom: Spacing.four,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.one,
  },
  waitTimeBadge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: Spacing.one,
    backgroundColor: '#F44336',
  },
  waitTimeText: {
    color: 'white',
    fontWeight: '600',
  },
  crowdLevel: {
    opacity: 0.7,
  },
  formSection: {
    marginBottom: Spacing.four,
  },
  formTitle: {
    marginBottom: Spacing.three,
  },
  crowdLevelSection: {
    marginBottom: Spacing.three,
  },
  crowdButtons: {
    flexDirection: 'row',
    gap: Spacing.one,
    flexWrap: 'wrap',
  },
  crowdButton: {
    flex: 1,
    minWidth: '45%',
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.one,
    alignItems: 'center',
  },
  crowdButtonText: {
    textTransform: 'capitalize',
    fontWeight: '500',
  },
  waitTimeSection: {
    marginBottom: Spacing.three,
  },
  inputContainer: {
    flexDirection: 'row',
    gap: Spacing.one,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.two,
    borderRadius: Spacing.one,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  inputButtons: {
    flexDirection: 'row',
    gap: Spacing.one,
  },
  inputButton: {
    width: 44,
    height: 44,
    borderRadius: Spacing.one,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
  },
  submitButton: {
    paddingVertical: Spacing.three,
    borderRadius: Spacing.two,
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    marginTop: Spacing.two,
  },
  submitButtonDisabled: {
    backgroundColor: '#999',
    opacity: 0.5,
  },
  submitButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
});
