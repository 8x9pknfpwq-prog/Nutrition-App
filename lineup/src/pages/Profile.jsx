import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { LogOut, ShieldCheck, ChevronRight } from 'lucide-react';
import Avatar from '../components/Avatar.jsx';
import { api } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function Profile() {
  const { user, logout } = useAuth();
  const [stats, setStats] = useState({ checkIns: 0, friends: 0 });

  useEffect(() => {
    api.myStats().then(setStats).catch(() => {});
  }, []);

  if (!user) return null;

  return (
    <div className="mx-auto min-h-screen max-w-md bg-canvas px-4 pb-24 pt-8">
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
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-black/10 bg-white py-3.5 text-sm font-semibold text-wait-red shadow-card"
      >
        <LogOut size={18} /> Log out
      </button>

      <p className="mt-6 text-center text-xs text-gray-400">
        <Link to="/privacy" className="font-medium text-gray-500">Privacy</Link>
        {' · '}
        <Link to="/terms" className="font-medium text-gray-500">Terms</Link>
      </p>
    </div>
  );
}
