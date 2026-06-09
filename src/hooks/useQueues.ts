import { useEffect, useState } from 'react';
import { ref, onValue, query, limitToLast } from 'firebase/database';
import { db } from '@/config/firebase';
import { Bar, QueueStatus } from '@/types';

export function useBars() {
  const [bars, setBars] = useState<Bar[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const barsRef = ref(db, 'bars');
      const unsubscribe = onValue(
        barsRef,
        (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.val();
            const barsArray = Object.entries(data).map(([id, bar]: [string, any]) => ({
              id,
              ...bar,
            }));
            setBars(barsArray);
          }
          setLoading(false);
        },
        (error) => {
          setError(error.message);
          setLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setLoading(false);
    }
  }, []);

  return { bars, loading, error };
}

export function useQueueStatus(barId: string) {
  const [queueStatus, setQueueStatus] = useState<QueueStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!barId) return;

    try {
      const statusRef = ref(db, `queue_status/${barId}`);
      const unsubscribe = onValue(
        statusRef,
        (snapshot) => {
          if (snapshot.exists()) {
            setQueueStatus({
              barId,
              ...snapshot.val(),
            });
          }
          setLoading(false);
        },
        (error) => {
          setError(error.message);
          setLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setLoading(false);
    }
  }, [barId]);

  return { queueStatus, loading, error };
}
