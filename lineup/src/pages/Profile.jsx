import { useEffect, useState } from 'react';
import { LogOut } from 'lucide-react';
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

      <button
        onClick={logout}
        className="mt-7 flex w-full items-center justify-center gap-2 rounded-2xl border border-black/10 bg-white py-3.5 text-sm font-semibold text-wait-red shadow-card"
      >
        <LogOut size={18} /> Log out
      </button>
    </div>
  );
}
