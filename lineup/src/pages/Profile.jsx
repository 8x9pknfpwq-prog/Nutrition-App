import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { LogOut, ShieldCheck, ChevronRight, Trash2 } from 'lucide-react';
import Avatar from '../components/Avatar.jsx';
import { api } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

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

  useEffect(() => {
    api.myStats().then(setStats).catch(() => {});
  }, []);

  if (!user) return null;

  return (
    <div className="mx-auto h-full max-w-md overflow-y-auto overscroll-contain bg-canvas px-4 pb-24 pt-8">
      <div className="flex flex-col items-center">
        <Avatar initial={user.avatarInitial} seed={user.username} size={88} />
        <h1 className="mt-4 text-2xl font-extrabold text-ink">{user.username}</h1>
        <p className="text-sm text-gray-500">{user.email}</p>
      </div>

      <div className="mt-7 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-white p-5 text-center shadow-card">
          <p className="stat-number text-3xl font-bold text-ink">{stats.checkIns}</p>
          <p className="mt-1 text-xs font-medium uppercase tracking-wide text-gray-400">Check-ins</p>
        </div>
        <div className="rounded-2xl bg-white p-5 text-center shadow-card">
          <p className="stat-number text-3xl font-bold text-ink">{stats.friends}</p>
          <p className="mt-1 text-xs font-medium uppercase tracking-wide text-gray-400">Friends</p>
        </div>
      </div>

      {user.isAdmin && (
        <Link
          to="/admin"
          className="mt-7 flex w-full items-center gap-3 rounded-2xl bg-white px-4 py-3.5 shadow-card"
        >
          <span className="grid h-9 w-9 place-items-center rounded-full bg-ink/5 text-ink">
            <ShieldCheck size={18} />
          </span>
          <span className="flex-1 text-sm font-semibold text-ink">Admin · Pending approvals</span>
          <ChevronRight size={18} className="text-gray-400" />
        </Link>
      )}

      <button
        onClick={logout}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-black/10 bg-white py-3.5 text-sm font-semibold text-ink shadow-card"
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
