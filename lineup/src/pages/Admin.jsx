import { useCallback, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Check, X, MapPin, Clock } from 'lucide-react';
import { api } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { timeAgo } from '../lib/wait.js';
import { openStatus, hasRealHours } from '../lib/busyness.js';
import HoursEditor from '../components/HoursEditor.jsx';

// Admin-only review queue: approve a suggestion to make it live, or reject it.
export default function Admin() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [pending, setPending] = useState([]);
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [editing, setEditing] = useState(null); // venue being given hours

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [{ pending }, { bars }] = await Promise.all([api.pendingBars(), api.bars()]);
      setPending(pending);
      setVenues((bars || []).filter((b) => b.approved !== false));
    } catch (e) {
      showToast({ title: 'Could not load suggestions', body: e.message });
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (user?.isAdmin) load();
  }, [user, load]);

  if (user && !user.isAdmin) return <Navigate to="/" replace />;

  async function act(id, kind) {
    setBusyId(id);
    try {
      if (kind === 'approve') {
        await api.approveBar(id);
        showToast({ title: 'Approved', body: "It's now live on the map" });
      } else {
        await api.rejectBar(id);
        showToast({ title: 'Rejected', body: 'Suggestion removed' });
      }
      setPending((p) => p.filter((b) => b.id !== id));
    } catch (e) {
      showToast({ title: 'Action failed', body: e.message });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mx-auto min-h-screen max-w-md bg-canvas px-4 pb-24 pt-5">
      <h1 className="text-2xl font-extrabold text-ink">Pending approvals</h1>
      <p className="mt-0.5 text-sm text-gray-500">
        {loading ? 'Loading…' : `${pending.length} suggestion${pending.length === 1 ? '' : 's'} to review`}
      </p>

      {!loading && pending.length === 0 && (
        <p className="py-16 text-center text-sm text-gray-400">All caught up — no pending suggestions.</p>
      )}

      <div className="mt-4 space-y-2.5">
        {pending.map((b) => (
          <div key={b.id} className="rounded-2xl bg-white p-3.5 shadow-card">
            <div className="flex items-start gap-3">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-stone-200 to-stone-300">
                <MapPin size={18} className="text-stone-400" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-[15px] font-semibold text-ink">{b.name}</h3>
                <p className="truncate text-xs text-gray-500">{b.address}</p>
                <p className="mt-0.5 text-xs text-gray-400">
                  {b.submittedBy ? `by ${b.submittedBy} · ` : ''}
                  {timeAgo(b.createdAt)}
                </p>
              </div>
            </div>
            <button
              onClick={() => setEditing(b)}
              className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-black/10 bg-white py-2 text-xs font-semibold text-ink"
            >
              <Clock size={14} /> {b.hours ? 'Edit hours' : 'Set hours'}
            </button>
            <div className="mt-2 flex gap-2">
              <button
                onClick={() => act(b.id, 'approve')}
                disabled={busyId === b.id}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-ink py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              >
                <Check size={16} /> Approve
              </button>
              <button
                onClick={() => act(b.id, 'reject')}
                disabled={busyId === b.id}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-black/10 bg-white py-2.5 text-sm font-semibold text-wait-red disabled:opacity-50"
              >
                <X size={16} /> Reject
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Live venues — set/adjust opening hours */}
      <h2 className="mt-8 text-lg font-bold text-ink">Venue hours</h2>
      <p className="mt-0.5 text-sm text-gray-500">
        {loading ? 'Loading…' : 'Tap a venue to set its real opening hours'}
      </p>
      <div className="mt-3 space-y-2">
        {venues.map((v) => {
          const status = openStatus(v);
          return (
            <button
              key={v.id}
              onClick={() => setEditing(v)}
              className="flex w-full items-center gap-3 rounded-2xl bg-white p-3 text-left shadow-card"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ink/5 text-ink">
                <Clock size={16} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-ink">{v.name}</span>
                <span className={`block truncate text-xs ${status.open ? 'text-wait-green' : 'text-gray-400'}`}>
                  {status.text}
                  {!hasRealHours(v) && ' · default hours'}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {editing && (
        <HoursEditor
          venue={editing}
          onClose={() => setEditing(null)}
          onSaved={(hours) => {
            setPending((p) => p.map((b) => (b.id === editing.id ? { ...b, hours } : b)));
            setVenues((vs) => vs.map((b) => (b.id === editing.id ? { ...b, hours } : b)));
          }}
        />
      )}
    </div>
  );
}
