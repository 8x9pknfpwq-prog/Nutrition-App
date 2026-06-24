import { useCallback, useEffect, useMemo, useState } from 'react';
import MapView from '../components/MapView.jsx';
import BottomSheet from '../components/BottomSheet.jsx';
import BarCard from '../components/BarCard.jsx';
import FilterPills from '../components/FilterPills.jsx';
import CheckInSheet from '../components/CheckInSheet.jsx';
import AddPlaceSheet from '../components/AddPlaceSheet.jsx';
import NYCLinesLogo from '../components/NYCLinesLogo.jsx';
import { Plus, Search, X, LocateFixed } from 'lucide-react';
import { api } from '../lib/api.js';
import { displayWait } from '../lib/busyness.js';
import { getCurrentPosition } from '../lib/geo.js';
import { useSocket } from '../context/SocketContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

// Great-circle distance in miles between the user and a bar.
function milesBetween(a, b) {
  const toRad = (d) => (d * Math.PI) / 180;
  const R = 3958.8;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)) * 10) / 10;
}

export default function MapDashboard() {
  const socket = useSocket();
  const { showToast } = useToast();
  const [bars, setBars] = useState([]);
  const [friends, setFriends] = useState([]);
  const [filters, setFilters] = useState([]);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(null);
  const [adding, setAdding] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [loading, setLoading] = useState(true);

  // Center the map on the user. manual=true surfaces errors (button press);
  // the silent attempt on load won't nag if permission isn't granted.
  const locate = useCallback(
    async (manual = false) => {
      try {
        const loc = await getCurrentPosition();
        setUserLocation(loc);
      } catch {
        if (manual)
          showToast({ title: 'Location is off', body: 'Allow location access to center the map on you.' });
      }
    },
    [showToast]
  );

  // Try once on load (silent if the user hasn't granted permission yet).
  useEffect(() => { locate(false); }, [locate]);

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
    const onBarAdded = (bar) => {
      setBars((prev) => (prev.some((b) => b.id === bar.id) ? prev : [...prev, bar]));
    };
    socket.on('wait_updated', onWait);
    socket.on('bar_added', onBarAdded);
    return () => {
      socket.emit('leave_map');
      socket.off('wait_updated', onWait);
      socket.off('bar_added', onBarAdded);
    };
  }, [socket]);

  const toggleFilter = (key) =>
    setFilters((f) => (f.includes(key) ? f.filter((x) => x !== key) : [...f, key]));

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = bars.filter((b) => {
      if (q && !`${b.name} ${b.address}`.toLowerCase().includes(q)) return false;
      if (filters.includes('under20') && !(displayWait(b).waitMin < 20)) return false;
      if (filters.includes('friends') && !(b.checkins && b.checkins.length > 0)) return false;
      // "Open now" is a soft filter — all seeded bars are treated as open.
      return true;
    });
    // Once we know where the user is, show distance from them and sort nearest first.
    if (userLocation) {
      return list
        .map((b) => ({ ...b, distance: milesBetween(userLocation, b) }))
        .sort((a, b) => a.distance - b.distance);
    }
    return list;
  }, [bars, filters, query, userLocation]);

  return (
    <div className="relative h-screen w-full overflow-hidden bg-canvas">
      {/* Map */}
      <div className="absolute inset-0">
        <MapView bars={bars} friends={friends} onSelectBar={setSelected} userLocation={userLocation} />
      </div>

      {/* Brand header — left-aligned wordmark over the map */}
      <header className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-between px-4 pt-[calc(env(safe-area-inset-top)+12px)]">
        <div className="pointer-events-auto rounded-2xl bg-canvas/85 px-3 py-1.5 shadow-card backdrop-blur">
          <NYCLinesLogo variant="light" height={32} />
        </div>
        <div className="pointer-events-auto flex items-center gap-2">
          <button
            onClick={() => locate(true)}
            aria-label="Center on my location"
            className="grid h-10 w-10 place-items-center rounded-full bg-canvas/90 text-ink shadow-card backdrop-blur active:scale-95 transition-transform"
          >
            <LocateFixed size={18} />
          </button>
          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-1.5 rounded-full bg-ink px-3.5 py-2 text-sm font-semibold text-white shadow-card active:scale-95 transition-transform"
          >
            <Plus size={18} /> Suggest
          </button>
        </div>
      </header>

      {/* Bottom sheet */}
      <BottomSheet peekHeight={340}>
        <div className="pt-3">
          <h1 className="text-xl font-bold text-ink">
            <span className="stat-number">{visible.length}</span>{' '}
            {query.trim() ? `result${visible.length === 1 ? '' : 's'}` : 'spots nearby'}
          </h1>
          <p className="truncate text-sm text-gray-500">
            {query.trim()
              ? `for “${query.trim()}”`
              : userLocation
              ? 'Nearest to you'
              : 'East Village · Lower East Side'}
          </p>
        </div>

        {/* Search */}
        <div className="mt-3 flex items-center gap-2 rounded-xl border border-black/10 bg-white px-3">
          <Search size={16} className="shrink-0 text-gray-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search bars by name or address"
            className="flex-1 bg-transparent py-2.5 text-sm outline-none"
          />
          {query && (
            <button onClick={() => setQuery('')} className="shrink-0 text-gray-400" aria-label="Clear search">
              <X size={16} />
            </button>
          )}
        </div>

        <div className="mt-3">
          <FilterPills active={filters} onToggle={toggleFilter} />
        </div>

        <div className="no-scrollbar mt-3 flex-1 space-y-2.5 overflow-y-auto pb-28">
          {loading ? (
            <p className="py-10 text-center text-sm text-gray-400">Loading bars…</p>
          ) : visible.length === 0 ? (
            <p className="py-10 text-center text-sm text-gray-400">
              {query.trim() ? `No bars found for “${query.trim()}”.` : 'No bars match your filters.'}
            </p>
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

      {/* Add-a-place sheet */}
      {adding && <AddPlaceSheet onClose={() => setAdding(false)} onAdded={load} />}
    </div>
  );
}
