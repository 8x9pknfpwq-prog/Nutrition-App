import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import Avatar from '../components/Avatar.jsx';
import TrustBadge from '../components/TrustBadge.jsx';
import Segmented from '../components/Segmented.jsx';
import { api } from '../lib/api.js';

const MEDAL = {
  1: 'linear-gradient(160deg,#F6C560,#E0A02A)',
  2: 'linear-gradient(160deg,#D7DBE0,#AEB4BD)',
  3: 'linear-gradient(160deg,#D19A63,#B0763C)',
};

function RankChip({ rank }) {
  if (rank <= 3) {
    return (
      <span
        className="grid h-7 w-7 place-items-center rounded-full text-[13px] font-extrabold text-white shadow-[0_1px_2px_rgba(0,0,0,0.2)]"
        style={{ background: MEDAL[rank] }}
      >
        {rank}
      </span>
    );
  }
  return <span className="grid h-7 w-7 place-items-center text-sm font-bold text-gray-400 tabular-nums">{rank}</span>;
}

export default function Leaderboard() {
  const [scope, setScope] = useState('friends');
  const [timeframe, setTimeframe] = useState('week');
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

  return (
    <div className="mx-auto h-full max-w-md overflow-y-auto overscroll-contain bg-canvas px-4 pb-24 pt-[calc(env(safe-area-inset-top)+20px)]">
      <Link to="/profile" className="mb-2 -ml-1 inline-flex items-center gap-0.5 text-sm font-medium text-gray-500">
        <ChevronLeft size={18} /> Profile
      </Link>
      <h1 className="text-[28px] font-extrabold leading-tight tracking-tight text-ink">Leaderboard</h1>
      <p className="mt-1 text-[15px] text-gray-500">The most accurate reporters in the city.</p>

      <div className="mt-5 space-y-2">
        <Segmented
          value={scope}
          onChange={setScope}
          options={[{ v: 'friends', label: 'Friends' }, { v: 'nyc', label: 'NYC' }]}
        />
        <Segmented
          value={timeframe}
          onChange={setTimeframe}
          options={[{ v: 'week', label: 'This week' }, { v: 'all', label: 'All-time' }]}
        />
      </div>

      <div className="mt-5 space-y-2.5">
        {loading ? (
          <p className="py-16 text-center text-sm text-gray-400">Loading…</p>
        ) : rows.length === 0 ? (
          <div className="rounded-2xl bg-white p-8 text-center shadow-[0_1px_3px_rgba(0,0,0,0.06)] ring-1 ring-black/[0.03]">
            <p className="text-sm font-semibold text-ink">No rankings yet</p>
            <p className="mx-auto mt-1 max-w-[16rem] text-sm text-gray-500">
              {scope === 'friends'
                ? 'Add friends and check in accurately to climb the board together.'
                : 'Be the first — check in accurately to start earning points.'}
            </p>
          </div>
        ) : (
          rows.map((u) => (
            <div
              key={u.id}
              className={`flex items-center gap-3 rounded-2xl px-3.5 py-3 ${
                u.isMe
                  ? 'bg-ink/[0.04] ring-1 ring-ink/10'
                  : 'bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)] ring-1 ring-black/[0.03]'
              }`}
            >
              <RankChip rank={u.rank} />
              <Avatar initial={u.avatarInitial} seed={u.username} size={40} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-semibold text-ink">
                  {u.username}
                  {u.isMe && <span className="ml-1 text-gray-400">· you</span>}
                </p>
                <TrustBadge rating={u.accuracyRating} className="mt-0.5" />
              </div>
              <div className="text-right">
                <p className="stat-number text-[15px] font-bold leading-none text-ink">{u.points.toLocaleString()}</p>
                <p className="mt-1 text-[11px] font-medium uppercase tracking-wide text-gray-400">pts</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
