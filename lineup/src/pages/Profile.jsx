import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { LogOut, ShieldCheck, ChevronRight, Trash2, Trophy } from 'lucide-react';
import Avatar from '../components/Avatar.jsx';
import TrustBadge from '../components/TrustBadge.jsx';
import { api } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

function formatBanUntil(ts) {
  try {
    return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return 'soon';
  }
}

export default function Profile() {
  const { user, logout, deleteAccount } = useAuth();
  const { showToast } = useToast();
  const [stats, setStats] = useState({ checkIns: 0, friends: 0 });
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function onDelete() {
    setDeleting(true);
    try {
      await deleteAccount();
      // AuthProvider clears the user → app returns to the auth screen.
    } catch (e) {
      showToast({ title: 'Could not delete account', body: e.message });
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  const [myRank, setMyRank] = useState(null);

  useEffect(() => {
    api.myStats().then(setStats).catch(() => {});
    // Score any settled reports, then find my all-time rank.
    (async () => {
      try {
        await api.runScoring().catch(() => {});
        const { rows } = await api.leaderboard({ scope: 'nyc', timeframe: 'all' });
        const me = rows.find((r) => r.isMe);
        if (me) setMyRank(me.rank);
      } catch { /* ignore */ }
    })();
  }, []);

  if (!user) return null;

  const banned = user.submitBannedUntil && new Date(user.submitBannedUntil) > new Date();

  return (
    <div className="mx-auto h-full max-w-md overflow-y-auto overscroll-contain bg-canvas px-4 pb-24 pt-8">
      <div className="flex flex-col items-center">
        <div className="rounded-full shadow-[0_4px_16px_rgba(0,0,0,0.10)] ring-4 ring-white">
          <Avatar initial={user.avatarInitial} seed={user.username} size={92} />
        </div>
        <h1 className="mt-4 text-[26px] font-extrabold tracking-tight text-ink">{user.username}</h1>
        <p className="text-[15px] text-gray-500">{user.email}</p>
        <div className="mt-3">
          <TrustBadge
            rating={user.accuracyRating}
            size="lg"
            pill
            meta={user.accuracyRating == null ? null : `${user.scoredReports} reports`}
          />
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)] ring-1 ring-black/[0.03]">
        <div className="grid grid-cols-3 divide-x divide-black/[0.06]">
          <div className="p-4 text-center">
            <p className="stat-number text-2xl font-bold text-ink">{stats.checkIns}</p>
            <p className="mt-1 text-[11px] font-medium uppercase tracking-wide text-gray-400">Check-ins</p>
          </div>
          <div className="p-4 text-center">
            <p className="stat-number text-2xl font-bold text-ink">{user.trustScore ?? 0}</p>
            <p className="mt-1 text-[11px] font-medium uppercase tracking-wide text-gray-400">Points</p>
          </div>
          <div className="p-4 text-center">
            <p className="stat-number text-2xl font-bold text-ink">{stats.friends}</p>
            <p className="mt-1 text-[11px] font-medium uppercase tracking-wide text-gray-400">Friends</p>
          </div>
        </div>
      </div>

      {banned && (
        <div className="mt-4 rounded-2xl bg-wait-red/10 p-4 text-sm text-wait-red">
          <p className="font-semibold">Reporting paused</p>
          <p className="mt-0.5 text-wait-red/80">
            Too many inaccurate reports. You can submit again on {formatBanUntil(user.submitBannedUntil)}.
            You can still browse and use everything else.
          </p>
        </div>
      )}

      <Link
        to="/leaderboard"
        className="mt-4 flex w-full items-center gap-3 rounded-2xl bg-white px-4 py-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.06)] ring-1 ring-black/[0.03]"
      >
        <span className="grid h-9 w-9 place-items-center rounded-full bg-wait-amber/15 text-wait-amber">
          <Trophy size={18} />
        </span>
        <span className="flex-1 text-[15px] font-semibold text-ink">
          Leaderboard{myRank ? ` · You're #${myRank} in NYC` : ''}
        </span>
        <ChevronRight size={18} className="text-gray-300" />
      </Link>

      {user.isAdmin && (
        <Link
          to="/admin"
          className="mt-3 flex w-full items-center gap-3 rounded-2xl bg-white px-4 py-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.06)] ring-1 ring-black/[0.03]"
        >
          <span className="grid h-9 w-9 place-items-center rounded-full bg-ink/5 text-ink">
            <ShieldCheck size={18} />
          </span>
          <span className="flex-1 text-[15px] font-semibold text-ink">Admin · Pending approvals</span>
          <ChevronRight size={18} className="text-gray-300" />
        </Link>
      )}

      <button
        onClick={logout}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl border border-black/10 bg-white py-3.5 text-sm font-semibold text-ink"
      >
        <LogOut size={18} /> Log out
      </button>

      <button
        onClick={() => setConfirmDelete(true)}
        className="mt-3 flex w-full items-center justify-center gap-2 py-2 text-sm font-medium text-gray-400"
      >
        <Trash2 size={16} /> Delete account
      </button>

      {confirmDelete && (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40"
          onClick={() => !deleting && setConfirmDelete(false)}
        >
          <div
            className="w-full max-w-md rounded-t-3xl bg-canvas p-5 pb-8 animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold text-ink">Delete your account?</h2>
            <p className="mt-2 text-sm text-gray-500">
              This permanently removes your account, your check-ins, and your friend connections. This
              can’t be undone.
            </p>
            <button
              onClick={onDelete}
              disabled={deleting}
              className="mt-5 w-full rounded-2xl bg-wait-red py-3.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              {deleting ? 'Deleting…' : 'Delete account permanently'}
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              disabled={deleting}
              className="mt-2 w-full rounded-2xl border border-black/10 bg-white py-3.5 text-sm font-semibold text-ink"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <p className="mt-6 text-center text-xs text-gray-400">
        <Link to="/privacy" className="font-medium text-gray-500">Privacy</Link>
        {' · '}
        <Link to="/terms" className="font-medium text-gray-500">Terms</Link>
      </p>
    </div>
  );
}
