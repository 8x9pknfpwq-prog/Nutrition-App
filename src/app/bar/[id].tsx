import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useBars, useQueueStatus } from '@/hooks/useQueues';
import { useState } from 'react';
import { ref, set, serverTimestamp } from 'firebase/database';
import { db, auth } from '@/config/firebase';
import { signInAnonymously } from 'firebase/auth';

const getCrowdColor = (level?: string) => {
  switch (level) {
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
  const { queueStatus } = useQueueStatus(id || '');
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
      if (!auth.currentUser) {
        await signInAnonymously(auth);
      }

      const minutes = parseInt(waitTime, 10);
      if (isNaN(minutes)) {
        alert('Please enter a valid wait time');
        return;
      }

      const checkInRef = ref(db, `check_ins/${id}/${Date.now()}`);
      await set(checkInRef, {
        waitTimeMinutes: minutes,
        crowdLevel: selectedCrowd,
        userId: auth.currentUser?.uid,
        timestamp: serverTimestamp(),
      });

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
      alert('Error: ' + (error instanceof Error ? error.message : 'Unknown'));
    } finally {
      setSubmitting(false);
    }
  };

  if (barsLoading || !bar) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={styles.title}>{bar.name}</Text>
          <Text style={styles.type}>{bar.type}</Text>
        </View>

        <View style={styles.infoSection}>
          <Text style={styles.label}>Location</Text>
          <Text style={styles.address}>{bar.address}</Text>
        </View>

        {queueStatus && (
          <View
            style={[
              styles.statusCard,
              { borderLeftColor: getCrowdColor(queueStatus.crowdLevel) },
            ]}
          >
            <View style={styles.statusHeader}>
              <Text style={styles.statusTitle}>Current Status</Text>
              <View style={styles.waitBadge}>
                <Text style={styles.waitText}>{queueStatus.waitTimeMinutes}m</Text>
              </View>
            </View>
            <Text style={styles.crowdText}>
              {queueStatus.crowdLevel} • {queueStatus.userCount} reports
            </Text>
          </View>
        )}

        <View style={styles.formSection}>
          <Text style={styles.formTitle}>Report Wait Time</Text>

          <View style={styles.crowdSection}>
            <Text style={styles.label}>Crowd Level</Text>
            <View style={styles.crowdButtons}>
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
                          : getCrowdColor(level) + '20',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.crowdButtonText,
                      {
                        color: selectedCrowd === level ? 'white' : getCrowdColor(level),
                      },
                    ]}
                  >
                    {level}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.waitSection}>
            <Text style={styles.label}>Wait Time (minutes)</Text>
            <View style={styles.inputRow}>
              <View style={styles.timeInput}>
                <Text style={styles.timeText}>{waitTime || '0'}</Text>
              </View>
              <TouchableOpacity
                onPress={() =>
                  setWaitTime(String(Math.max(0, parseInt(waitTime || '0', 10) - 5)))
                }
                style={styles.btn}
              >
                <Text style={styles.btnText}>−</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setWaitTime(String(parseInt(waitTime || '0', 10) + 5))}
                style={styles.btn}
              >
                <Text style={styles.btnText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            onPress={handleSubmit}
            disabled={submitting || !selectedCrowd || !waitTime}
            style={[
              styles.submitButton,
              (submitting || !selectedCrowd || !waitTime) && styles.submitButtonDisabled,
            ]}
          >
            <Text style={styles.submitText}>
              {submitting ? 'Submitting...' : 'Submit Check-in'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  backButton: { paddingHorizontal: 16, paddingVertical: 12 },
  backText: { fontSize: 16, color: '#007AFF' },
  header: { paddingHorizontal: 16, paddingBottom: 16 },
  title: { fontSize: 28, fontWeight: '600', marginBottom: 4 },
  type: { fontSize: 14, color: '#666', textTransform: 'capitalize' },
  infoSection: { paddingHorizontal: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#eee' },
  label: { fontSize: 12, color: '#999', fontWeight: '600', marginBottom: 4 },
  address: { fontSize: 16, color: '#000' },
  statusCard: { marginHorizontal: 16, marginVertical: 16, paddingHorizontal: 12, paddingVertical: 12, borderLeftWidth: 4, borderRadius: 8, backgroundColor: '#f5f5f5' },
  statusHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  statusTitle: { fontSize: 16, fontWeight: '600' },
  waitBadge: { backgroundColor: '#F44336', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  waitText: { color: 'white', fontWeight: '600', fontSize: 12 },
  crowdText: { fontSize: 12, color: '#666' },
  formSection: { paddingHorizontal: 16, paddingVertical: 16 },
  formTitle: { fontSize: 18, fontWeight: '600', marginBottom: 16 },
  crowdSection: { marginBottom: 16 },
  crowdButtons: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  crowdButton: { flex: 1, minWidth: '48%', paddingVertical: 8, borderRadius: 6, alignItems: 'center' },
  crowdButtonText: { fontWeight: '500', textTransform: 'capitalize' },
  waitSection: { marginBottom: 16 },
  inputRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  timeInput: { flex: 1, paddingVertical: 12, paddingHorizontal: 12, backgroundColor: '#f5f5f5', borderRadius: 6, alignItems: 'center' },
  timeText: { fontSize: 16, fontWeight: '600' },
  btn: { width: 44, height: 44, backgroundColor: '#007AFF', borderRadius: 6, justifyContent: 'center', alignItems: 'center' },
  btnText: { color: 'white', fontSize: 18, fontWeight: '600' },
  submitButton: { paddingVertical: 14, backgroundColor: '#4CAF50', borderRadius: 8, alignItems: 'center', marginTop: 8, marginBottom: 32 },
  submitButtonDisabled: { backgroundColor: '#ccc' },
  submitText: { color: 'white', fontWeight: '600', fontSize: 16 },
});
