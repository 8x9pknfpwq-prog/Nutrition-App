import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useBars } from '@/hooks/useQueues';

const getCrowdColor = (level?: string) => {
  switch (level) {
    case 'empty': return '#4CAF50';
    case 'moderate': return '#FFC107';
    case 'busy': return '#FF9800';
    case 'packed': return '#F44336';
    default: return '#999';
  }
};

export default function HomeScreen() {
  const { bars, loading, error } = useBars();
  const router = useRouter();

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>NYC Lines</Text>
        <Text style={styles.subtitle}>See where the crowd is</Text>
      </View>

      {error && (
        <View style={styles.error}>
          <Text style={styles.errorText}>Error: {error}</Text>
        </View>
      )}

      {bars.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>No bars found</Text>
          <Text style={styles.emptySubtext}>Check back soon!</Text>
        </View>
      ) : (
        <FlatList
          data={bars}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => router.push(`/bar/${item.id}`)}
              activeOpacity={0.7}
            >
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardInfo}>
                    <Text style={styles.cardName}>{item.name}</Text>
                    <Text style={styles.cardType}>{item.type}</Text>
                  </View>
                  <View
                    style={[
                      styles.badge,
                      { backgroundColor: getCrowdColor() },
                    ]}
                  >
                    <Text style={styles.badgeText}>0m</Text>
                  </View>
                </View>
                <Text style={styles.cardAddress} numberOfLines={1}>
                  {item.address}
                </Text>
              </View>
            </TouchableOpacity>
          )}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: '600',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
  error: {
    backgroundColor: '#ffebee',
    padding: 12,
    margin: 16,
    borderRadius: 8,
  },
  errorText: {
    color: '#c62828',
    fontSize: 14,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
  },
  listContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  card: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  cardInfo: {
    flex: 1,
  },
  cardName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  cardType: {
    fontSize: 12,
    color: '#666',
    textTransform: 'capitalize',
  },
  cardAddress: {
    fontSize: 12,
    color: '#999',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    minWidth: 40,
    alignItems: 'center',
  },
  badgeText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 12,
  },
});
