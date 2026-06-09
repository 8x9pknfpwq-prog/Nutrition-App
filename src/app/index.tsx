import { useBars } from '@/hooks/useQueues';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { FlatList, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

const getCrowdColor = (crowdLevel?: string) => {
  switch (crowdLevel) {
    case 'empty': return '#4CAF50';
    case 'moderate': return '#FFC107';
    case 'busy': return '#FF9800';
    case 'packed': return '#F44336';
    default: return '#999';
  }
};

function BarCard({ bar, queueStatus }: any) {
  const router = useRouter();

  return (
    <TouchableOpacity
      onPress={() => router.push(`/bar/${bar.id}`)}
      activeOpacity={0.7}
    >
      <ThemedView style={styles.barCard}>
        <ThemedView style={styles.barHeader}>
          <ThemedView>
            <ThemedText type="subtitle" style={styles.barName}>{bar.name}</ThemedText>
            <ThemedText type="small" style={styles.barType}>{bar.type}</ThemedText>
          </ThemedView>
          <ThemedView
            style={[
              styles.crowdBadge,
              { backgroundColor: getCrowdColor(queueStatus?.crowdLevel) }
            ]}
          >
            <ThemedText style={styles.crowdText}>
              {queueStatus?.waitTimeMinutes || 0}m
            </ThemedText>
          </ThemedView>
        </ThemedView>

        <ThemedText type="small" style={styles.barAddress} numberOfLines={1}>
          {bar.address}
        </ThemedText>

        {queueStatus && (
          <ThemedView style={styles.crowdInfo}>
            <ThemedText type="small">
              {queueStatus.crowdLevel || 'no data'} • {queueStatus.userCount || 0} reports
            </ThemedText>
          </ThemedView>
        )}
      </ThemedView>
    </TouchableOpacity>
  );
}

export default function HomeScreen() {
  const { bars, loading, error } = useBars();
  const router = useRouter();

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <ActivityIndicator size="large" />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={styles.header}>
          <ThemedText type="title">NYC Lines</ThemedText>
          <ThemedText type="small" style={styles.subtitle}>
            See where the crowd is
          </ThemedText>
        </ThemedView>

        {error && (
          <ThemedView style={styles.errorContainer}>
            <ThemedText style={styles.errorText}>Error: {error}</ThemedText>
          </ThemedView>
        )}

        {bars.length === 0 && !loading ? (
          <ThemedView style={styles.emptyContainer}>
            <ThemedText type="subtitle">No bars found</ThemedText>
            <ThemedText type="small">Check back soon!</ThemedText>
          </ThemedView>
        ) : (
          <FlatList
            data={bars}
            renderItem={({ item }) => <BarCard bar={item} queueStatus={null} />}
            keyExtractor={(item) => item.id}
            scrollEnabled={true}
            style={styles.list}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )}
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
    paddingTop: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.two,
  },
  header: {
    marginBottom: Spacing.four,
  },
  subtitle: {
    marginTop: Spacing.one,
    opacity: 0.7,
  },
  list: {
    flex: 1,
  },
  listContent: {
    gap: Spacing.two,
  },
  barCard: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    borderRadius: Spacing.two,
    marginBottom: Spacing.two,
  },
  barHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.two,
  },
  barName: {
    marginBottom: Spacing.one,
  },
  barType: {
    opacity: 0.6,
    textTransform: 'capitalize',
  },
  barAddress: {
    opacity: 0.7,
    marginBottom: Spacing.two,
  },
  crowdBadge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: Spacing.one,
    minWidth: 50,
    alignItems: 'center',
  },
  crowdText: {
    color: 'white',
    fontWeight: '600',
  },
  crowdInfo: {
    opacity: 0.6,
  },
  errorContainer: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.two,
    backgroundColor: 'rgba(244, 67, 54, 0.1)',
    borderRadius: Spacing.two,
    marginBottom: Spacing.three,
  },
  errorText: {
    color: '#F44336',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.two,
  },
});
