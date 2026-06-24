import { useCallback, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Check, X, MapPin } from 'lucide-react';
import { api } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { timeAgo } from '../lib/wait.js';

// Admin-only review queue: approve a suggestion to make it live, or reject it.
export default function Admin() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { pending } = await api.pendingBars();
      setPending(pending);
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
            <div className="mt-3 flex gap-2">
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
    </div>
  );
}
