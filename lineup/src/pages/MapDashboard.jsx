import { useCallback, useEffect, useMemo, useState } from 'react';
import MapView from '../components/MapView.jsx';
import BottomSheet from '../components/BottomSheet.jsx';
import BarCard from '../components/BarCard.jsx';
import FilterPills from '../components/FilterPills.jsx';
import CheckInSheet from '../components/CheckInSheet.jsx';
import { api } from '../lib/api.js';
import { useSocket } from '../context/SocketContext.jsx';

export default function MapDashboard() {
  const socket = useSocket();
  const [bars, setBars] = useState([]);
  const [friends, setFriends] = useState([]);
  const [filters, setFilters] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [b, f] = await Promise.all([api.bars(), api.friends().catch(() => ({ friends: [] }))]);
    setBars(b.bars);
    setFriends(f.friends || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Join the live map room and apply wait_updated events in place.
  useEffect(() => {
    if (!socket) return;
    socket.emit('join_map');
    const onWait = ({ barId, waitMin, reportCount, confidence }) => {
      setBars((prev) =>
        prev.map((b) =>
          b.id === barId
            ? { ...b, waitMin, reportCount: reportCount ?? b.reportCount, confidence: confidence ?? b.confidence }
            : b
        )
      );
    };
    socket.on('wait_updated', onWait);
    return () => {
      socket.emit('leave_map');
      socket.off('wait_updated', onWait);
    };
  }, [socket]);

  const toggleFilter = (key) =>
    setFilters((f) => (f.includes(key) ? f.filter((x) => x !== key) : [...f, key]));

  const visible = useMemo(() => {
    return bars.filter((b) => {
      if (filters.includes('under20') && !(b.waitMin != null && b.waitMin < 20)) return false;
      if (filters.includes('friends') && !(b.checkins && b.checkins.length > 0)) return false;
      // "Open now" is a soft filter — all seeded bars are treated as open.
      return true;
    });
  }, [bars, filters]);

  return (
    <div className="relative h-screen w-full overflow-hidden bg-canvas">
      {/* Map */}
      <div className="absolute inset-0">
        <MapView bars={bars} friends={friends} onSelectBar={setSelected} />
      </div>

      {/* Bottom sheet */}
      <BottomSheet peekHeight={340}>
        <div className="pt-3">
          <h1 className="text-xl font-bold text-ink">{visible.length} spots nearby</h1>
          <p className="text-sm text-gray-500">East Village · Lower East Side</p>
        </div>

        <div className="mt-3">
          <FilterPills active={filters} onToggle={toggleFilter} />
        </div>

        <div className="no-scrollbar mt-3 flex-1 space-y-2.5 overflow-y-auto pb-28">
          {loading ? (
            <p className="py-10 text-center text-sm text-gray-400">Loading bars…</p>
          ) : visible.length === 0 ? (
            <p className="py-10 text-center text-sm text-gray-400">No bars match your filters.</p>
          ) : (
            visible.map((bar) => (
              <BarCard key={bar.id} bar={bar} onClick={() => setSelected(bar)} />
            ))
          )}
        </div>
      </BottomSheet>

      {/* Check-in sheet */}
      {selected && (
        <CheckInSheet
          bar={selected}
          onClose={() => setSelected(null)}
          onSubmitted={load}
        />
      )}
    </div>
  );
}
