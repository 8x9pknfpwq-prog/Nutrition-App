import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Trophy } from 'lucide-react';
import Avatar from '../components/Avatar.jsx';
import TrustBadge from '../components/TrustBadge.jsx';
import { api } from '../lib/api.js';

const rankColor = (r) =>
  r === 1 ? 'text-wait-amber' : r === 2 ? 'text-gray-400' : r === 3 ? 'text-[#b08046]' : 'text-gray-400';

export default function Leaderboard() {
  const [scope, setScope] = useState('friends'); // 'friends' | 'nyc'
  const [timeframe, setTimeframe] = useState('week'); // 'week' | 'all'
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      await api.runScoring().catch(() => {});
      const { rows } = await api.leaderboard({ scope, timeframe });
      setRows(rows);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [scope, timeframe]);

  useEffect(() => { load(); }, [load]);

  const Toggle = ({ value, set, options }) => (
    <div className="flex rounded-full bg-white p-1 shadow-card">
      {options.map((o) => (
        <button
          key={o.v}
          onClick={() => set(o.v)}
          className={`flex-1 rounded-full py-1.5 text-xs font-semibold transition-colors ${
            value === o.v ? 'bg-ink text-white' : 'text-gray-500'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );

  return (
    <div className="mx-auto h-full max-w-md overflow-y-auto overscroll-contain bg-canvas px-4 pb-24 pt-8">
      <div className="flex items-center gap-2">
        <Link to="/profile" className="text-gray-500"><ArrowLeft size={20} /></Link>
        <h1 className="flex items-center gap-2 text-2xl font-extrabold text-ink">
          <Trophy size={22} className="text-wait-amber" /> Leaderboard
        </h1>
      </div>
      <p className="mt-1 text-sm text-gray-500">Most accurate reporters earn the top spots.</p>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <Toggle value={scope} set={setScope} options={[{ v: 'friends', label: 'Friends' }, { v: 'nyc', label: 'NYC' }]} />
        <Toggle value={timeframe} set={setTimeframe} options={[{ v: 'week', label: 'This week' }, { v: 'all', label: 'All-time' }]} />
      </div>

      <div className="mt-4 space-y-2">
        {loading ? (
          <p className="py-12 text-center text-sm text-gray-400">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="py-12 text-center text-sm text-gray-400">
            {scope === 'friends'
              ? 'No ranked friends yet — add friends and start checking in.'
              : 'No one’s ranked yet. Be the first — check in accurately to earn points.'}
          </p>
        ) : (
          rows.map((u) => (
            <div
              key={u.id}
              className={`flex items-center gap-3 rounded-2xl p-3 shadow-card ${u.isMe ? 'bg-ink/5 ring-1 ring-ink/15' : 'bg-white'}`}
            >
              <span className={`w-6 text-center text-sm font-extrabold ${rankColor(u.rank)}`}>{u.rank}</span>
              <Avatar initial={u.avatarInitial} seed={u.username} size={38} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink">
                  {u.username}{u.isMe ? ' (you)' : ''}
                </p>
                <TrustBadge rating={u.accuracyRating} />
              </div>
              <span className="stat-number text-sm font-bold text-ink">
                {u.points.toLocaleString()}<span className="ml-0.5 text-xs font-medium text-gray-400">pts</span>
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
