import { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Plus, X, Search, Check, Contact, Share2, Ban } from 'lucide-react';
import Avatar from '../components/Avatar.jsx';
import { api } from '../lib/api.js';
import { useToast } from '../context/ToastContext.jsx';
import { timeAgo } from '../lib/wait.js';
import { contactsAvailable, readContactPhones } from '../lib/contacts.js';
import { shareInvite } from '../lib/invite.js';
import TrustBadge from '../components/TrustBadge.jsx';

function FriendRow({ u, onAdd, onBlock }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-card">
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
          onClick={() => onAdd(u)}
          className="rounded-full bg-ink px-3 py-1.5 text-xs font-semibold text-white"
        >
          Add
        </button>
      )}
      {onBlock && (
        <button
          onClick={() => onBlock(u)}
          className="rounded-full p-1.5 text-gray-300 hover:text-wait-red"
          aria-label={`Block ${u.username}`}
          title="Block"
        >
          <Ban size={16} />
        </button>
      )}
    </div>
  );
}

function AddFriendModal({ onClose, onChanged }) {
  const { showToast } = useToast();
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [contactMatches, setContactMatches] = useState(null); // null = not run yet
  const [contactsBusy, setContactsBusy] = useState(false);

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
      const mark = (r) => r.map((x) => (x.id === u.id ? { ...x, friendStatus: 'requested' } : x));
      setResults(mark);
      setContactMatches((m) => (m ? mark(m) : m));
      showToast({ title: 'Request sent', body: `to ${u.username}` });
      onChanged?.();
    } catch (e) {
      showToast({ title: 'Could not send request', body: e.message });
    }
  }

  async function findFromContacts() {
    setContactsBusy(true);
    try {
      const phones = await readContactPhones();
      if (phones.length === 0) {
        setContactMatches([]);
        showToast({ title: 'No phone numbers found in your contacts' });
        return;
      }
      const { users } = await api.matchContacts(phones);
      setContactMatches(users);
      if (users.length === 0) {
        showToast({ title: 'None of your contacts are on NYC Lines yet', body: 'Invite a few below!' });
      }
    } catch (e) {
      showToast({ title: 'Could not read contacts', body: e.message });
    } finally {
      setContactsBusy(false);
    }
  }

  async function invite() {
    try {
      const how = await shareInvite();
      if (how === 'copied') showToast({ title: 'Invite link copied' });
    } catch (e) {
      showToast({ title: 'Could not share', body: e.message });
    }
  }

  async function blockUser(u) {
    if (!window.confirm(`Block ${u.username}? You won't see each other on NYC Lines.`)) return;
    try {
      await api.blockUser(u.id);
      setResults((r) => r.filter((x) => x.id !== u.id));
      setContactMatches((m) => (m ? m.filter((x) => x.id !== u.id) : m));
      showToast({ title: `Blocked ${u.username}` });
      onChanged?.();
    } catch (e) {
      showToast({ title: 'Could not block', body: e.message });
    }
  }

  return (
    <div className="fixed inset-0 z-[55] flex items-end justify-center bg-black/40" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-t-3xl bg-canvas p-5 pb-8 animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-ink">Add friends</h2>
          <button onClick={onClose} className="rounded-full bg-black/5 p-2 text-gray-500">
            <X size={18} />
          </button>
        </div>

        {/* Contacts + invite */}
        <div className="mt-4 flex gap-2">
          {contactsAvailable() && (
            <button
              onClick={findFromContacts}
              disabled={contactsBusy}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-ink px-3 py-3 text-sm font-semibold text-white disabled:opacity-60"
            >
              <Contact size={16} /> {contactsBusy ? 'Checking…' : 'Find from contacts'}
            </button>
          )}
          <button
            onClick={invite}
            className={`flex items-center justify-center gap-2 rounded-xl border border-black/10 bg-white px-3 py-3 text-sm font-semibold text-ink ${
              contactsAvailable() ? '' : 'flex-1'
            }`}
          >
            <Share2 size={16} /> Invite friends
          </button>
        </div>

        {/* Contacts matches */}
        {contactMatches && contactMatches.length > 0 && (
          <div className="mt-4">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-400">
              On NYC Lines from your contacts
            </p>
            <div className="no-scrollbar max-h-56 space-y-2 overflow-y-auto">
              {contactMatches.map((u) => (
                <FriendRow key={u.id} u={u} onAdd={sendRequest} onBlock={blockUser} />
              ))}
            </div>
          </div>
        )}

        <div className="mt-4 flex items-center gap-2 rounded-xl border border-black/10 bg-white px-3">
          <Search size={16} className="text-gray-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Username or phone number"
            className="flex-1 bg-transparent py-3 text-sm outline-none"
          />
        </div>

        <div className="no-scrollbar mt-3 max-h-60 space-y-2 overflow-y-auto">
          {searching && <p className="py-4 text-center text-sm text-gray-400">Searching…</p>}
          {!searching && q && results.length === 0 && (
            <p className="py-4 text-center text-sm text-gray-400">
              No one found. Enter a full username or 10-digit phone number.
            </p>
          )}
          {results.map((u) => (
            <FriendRow key={u.id} u={u} onAdd={sendRequest} onBlock={blockUser} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Friends() {
  const { showToast } = useToast();
  const location = useLocation();
  const [friends, setFriends] = useState([]);
  const [pending, setPending] = useState([]);
  // Auto-open the add-friends flow when routed here from the map nudge.
  const [showAdd, setShowAdd] = useState(() => !!location.state?.addFriends);

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

  async function blockFriend(f) {
    if (!window.confirm(`Block ${f.username}? You won't see each other on NYC Lines.`)) return;
    try {
      await api.blockUser(f.id);
      showToast({ title: `Blocked ${f.username}` });
      load();
    } catch (e) {
      showToast({ title: 'Could not block', body: e.message });
    }
  }

  return (
    <div className="mx-auto h-full max-w-md overflow-y-auto overscroll-contain bg-canvas px-4 pb-24 pt-5">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-[28px] font-bold tracking-tight text-ink">Friends</h1>
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
          <div className="rounded-2xl bg-white p-5 text-center shadow-card">
            <p className="text-sm font-semibold text-ink">See where your friends are out tonight</p>
            <p className="mt-1 text-sm text-gray-500">
              Find the ones already on NYC Lines from your contacts, or invite a few.
            </p>
            <button
              onClick={() => setShowAdd(true)}
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-sm font-semibold text-white"
            >
              <Contact size={16} /> Find friends
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {friends.map((f) => (
              <div key={f.id} className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-card">
                <Avatar initial={f.avatarInitial} seed={f.username} size={44} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-semibold text-ink">{f.username}</p>
                    <TrustBadge rating={f.accuracyRating} />
                  </div>
                  <p className="truncate text-xs text-gray-500">
                    {f.lastBar
                      ? `at ${f.lastBar.name} · ${timeAgo(f.lastCheckinAt)}`
                      : 'No recent check-ins'}
                  </p>
                </div>
                <button
                  onClick={() => blockFriend(f)}
                  className="rounded-full p-1.5 text-gray-300 hover:text-wait-red"
                  aria-label={`Block ${f.username}`}
                  title="Block"
                >
                  <Ban size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {showAdd && <AddFriendModal onClose={() => setShowAdd(false)} onChanged={load} />}
    </div>
  );
}
