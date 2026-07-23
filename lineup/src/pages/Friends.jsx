import { useCallback, useEffect, useState } from 'react';
import { Plus, X, Search, Check } from 'lucide-react';
import Avatar from '../components/Avatar.jsx';
import { api } from '../lib/api.js';
import { useToast } from '../context/ToastContext.jsx';
import { timeAgo } from '../lib/wait.js';

function AddFriendModal({ onClose, onChanged }) {
  const { showToast } = useToast();
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!q.trim()) { setResults([]); return; }
    setSearching(true);
    const t = setTimeout(() => {
      api
        .searchUsers(q)
        .then((d) => setResults(d.users))
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  async function sendRequest(u) {
    try {
      await api.requestFriend(u.id);
      setResults((r) => r.map((x) => (x.id === u.id ? { ...x, friendStatus: 'requested' } : x)));
      showToast({ title: 'Request sent', body: `to ${u.username}` });
      onChanged?.();
    } catch (e) {
      showToast({ title: 'Could not send request', body: e.message });
    }
  }

  return (
    <div className="fixed inset-0 z-[55] flex items-end justify-center bg-black/40" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-t-3xl bg-canvas p-5 pb-8 animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-ink">Add a friend</h2>
          <button onClick={onClose} className="rounded-full bg-black/5 p-2 text-gray-500">
            <X size={18} />
          </button>
        </div>

        <div className="mt-4 flex items-center gap-2 rounded-xl border border-black/10 bg-white px-3">
          <Search size={16} className="text-gray-400" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Username or phone number"
            className="flex-1 bg-transparent py-3 text-sm outline-none"
          />
        </div>

        <div className="no-scrollbar mt-3 max-h-72 space-y-2 overflow-y-auto">
          {searching && <p className="py-4 text-center text-sm text-gray-400">Searching…</p>}
          {!searching && q && results.length === 0 && (
            <p className="py-4 text-center text-sm text-gray-400">
              No one found. Enter a full username or 10-digit phone number.
            </p>
          )}
          {results.map((u) => (
            <div key={u.id} className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-card">
              <Avatar initial={u.avatarInitial} seed={u.username} size={38} />
              <span className="flex-1 truncate text-sm font-semibold text-ink">{u.username}</span>
              {u.friendStatus === 'friends' ? (
                <span className="text-xs font-medium text-gray-400">Friends</span>
              ) : u.friendStatus === 'requested' ? (
                <span className="text-xs font-medium text-gray-400">Requested</span>
              ) : u.friendStatus === 'incoming' ? (
                <span className="text-xs font-medium text-gray-400">Wants to add you</span>
              ) : (
                <button
                  onClick={() => sendRequest(u)}
                  className="rounded-full bg-ink px-3 py-1.5 text-xs font-semibold text-white"
                >
                  Send request
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Friends() {
  const { showToast } = useToast();
  const [friends, setFriends] = useState([]);
  const [pending, setPending] = useState([]);
  const [showAdd, setShowAdd] = useState(false);

  const load = useCallback(async () => {
    const [f, p] = await Promise.all([api.friends(), api.pending()]);
    setFriends(f.friends);
    setPending(p.pending);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function accept(id, username) {
    try {
      await api.acceptFriend(id);
      showToast({ title: 'Friend added', body: `You and ${username} are now friends` });
      load();
    } catch (e) {
      showToast({ title: 'Could not accept', body: e.message });
    }
  }

  return (
    <div className="mx-auto h-full max-w-md overflow-y-auto overscroll-contain bg-canvas px-4 pb-24 pt-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-ink">Friends</h1>
        <button
          onClick={() => setShowAdd(true)}
          className="grid h-10 w-10 place-items-center rounded-full bg-ink text-white"
        >
          <Plus size={20} />
        </button>
      </div>

      {/* Pending requests */}
      {pending.length > 0 && (
        <section className="mt-5">
          <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-400">Requests</h2>
          <div className="space-y-2">
            {pending.map((p) => (
              <div key={p.id} className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-card">
                <Avatar initial={p.from.avatarInitial} seed={p.from.username} size={40} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">{p.from.username}</p>
                  <p className="text-xs text-gray-400">wants to be friends</p>
                </div>
                <button
                  onClick={() => accept(p.id, p.from.username)}
                  className="flex items-center gap-1 rounded-full bg-ink px-3 py-1.5 text-xs font-semibold text-white"
                >
                  <Check size={14} /> Accept
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Accepted friends */}
      <section className="mt-6">
        <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-400">
          {friends.length} friend{friends.length === 1 ? '' : 's'}
        </h2>
        {friends.length === 0 ? (
          <p className="py-10 text-center text-sm text-gray-400">
            No friends yet — tap + to add someone.
          </p>
        ) : (
          <div className="space-y-2">
            {friends.map((f) => (
              <div key={f.id} className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-card">
                <Avatar initial={f.avatarInitial} seed={f.username} size={44} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">{f.username}</p>
                  <p className="truncate text-xs text-gray-500">
                    {f.lastBar
                      ? `at ${f.lastBar.name} · ${timeAgo(f.lastCheckinAt)}`
                      : 'No recent check-ins'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {showAdd && <AddFriendModal onClose={() => setShowAdd(false)} onChanged={load} />}
    </div>
  );
}
