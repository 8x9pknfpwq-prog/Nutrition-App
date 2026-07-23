import { useCallback, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Check, X, Clock, Sparkles } from 'lucide-react';
import { api } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { timeAgo } from '../lib/wait.js';
import { openStatus, hasRealHours } from '../lib/busyness.js';
import HoursEditor from '../components/HoursEditor.jsx';
import VenuePhoto from '../components/VenuePhoto.jsx';
import PhotoUpload from '../components/PhotoUpload.jsx';

// Admin-only review queue: approve a suggestion to make it live, or reject it.
export default function Admin() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [pending, setPending] = useState([]);
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [editing, setEditing] = useState(null); // venue being given hours
  const [enriching, setEnriching] = useState(false);

  async function enrich() {
    setEnriching(true);
    try {
      const { updated } = await api.enrichVenues();
      showToast({ title: 'Auto-fill complete', body: `${updated} venue${updated === 1 ? '' : 's'} updated` });
      load();
    } catch (e) {
      showToast({ title: 'Auto-fill failed', body: e.message });
    } finally {
      setEnriching(false);
    }
  }

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

  // Reflect a new photo in both the pending and live-venue lists.
  const setImage = (id, imageUrl) => {
    setPending((p) => p.map((b) => (b.id === id ? { ...b, imageUrl } : b)));
    setVenues((vs) => vs.map((b) => (b.id === id ? { ...b, imageUrl } : b)));
  };

  return (
    <div className="mx-auto h-full max-w-md overflow-y-auto overscroll-contain bg-canvas px-4 pb-24 pt-5">
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
              <VenuePhoto bar={b} size={48} />
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-[15px] font-semibold text-ink">{b.name}</h3>
                <p className="truncate text-xs text-gray-500">{b.address}</p>
                <p className="mt-0.5 text-xs text-gray-400">
                  {b.submittedBy ? `by ${b.submittedBy} · ` : ''}
                  {timeAgo(b.createdAt)}
                </p>
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => setEditing(b)}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-black/10 bg-white py-2 text-xs font-semibold text-ink"
              >
                <Clock size={14} /> {b.hours ? 'Edit hours' : 'Set hours'}
              </button>
              <PhotoUpload venue={b} onUploaded={(url) => setImage(b.id, url)} label={b.imageUrl ? 'Change photo' : 'Add photo'} />
            </div>
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

      {/* Live venues — photos + hours */}
      <div className="mt-8 flex items-center justify-between gap-2">
        <h2 className="text-lg font-bold text-ink">Venues</h2>
        <button
          onClick={enrich}
          disabled={enriching || loading}
          className="flex shrink-0 items-center gap-1.5 rounded-full bg-ink px-3.5 py-2 text-xs font-semibold text-white disabled:opacity-50"
        >
          <Sparkles size={14} /> {enriching ? 'Filling…' : 'Auto-fill photos & hours'}
        </button>
      </div>
      <p className="mt-0.5 text-sm text-gray-500">
        {loading ? 'Loading…' : 'Tap a venue to edit hours, or add a photo. Auto-fill pulls both from Foursquare.'}
      </p>
      <div className="mt-3 space-y-2">
        {venues.map((v) => {
          const status = openStatus(v);
          return (
            <div key={v.id} className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-card">
              <VenuePhoto bar={v} size={44} />
              <button onClick={() => setEditing(v)} className="min-w-0 flex-1 text-left">
                <span className="block truncate text-sm font-semibold text-ink">{v.name}</span>
                <span className={`block truncate text-xs ${status.open ? 'text-wait-green' : 'text-gray-400'}`}>
                  {status.text}
                  {!hasRealHours(v) && ' · default hours'}
                </span>
              </button>
              <PhotoUpload venue={v} onUploaded={(url) => setImage(v.id, url)} label={v.imageUrl ? 'Change' : 'Photo'} />
            </div>
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
