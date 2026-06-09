import { StyleSheet, View } from 'react-native';
import { ThemedText } from './themed-text';

export function AnimatedIcon() {
  return (
    <View style={styles.container}>
      <ThemedText style={styles.title}>NYC</ThemedText>
      <ThemedText style={styles.subtitle}>Lines</ThemedText>
    </View>
  );
}

export function AnimatedSplashOverlay() {
  return null;
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.6,
  },
});
