import { useEffect, useState } from 'react';
import { Bookmark, Star } from 'lucide-react';
import WaitBadge from '../components/WaitBadge.jsx';
import { api } from '../lib/api.js';

const KEY = 'lineup_saved';
const readSaved = () => {
  try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; }
};

// Saved/bookmarked bars are stored client-side in localStorage.
export default function Saved() {
  const [bars, setBars] = useState([]);
  const [saved, setSaved] = useState(readSaved());

  useEffect(() => {
    api.bars().then((d) => setBars(d.bars)).catch(() => {});
  }, []);

  const toggle = (id) => {
    setSaved((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      localStorage.setItem(KEY, JSON.stringify(next));
      return next;
    });
  };

  const savedBars = bars.filter((b) => saved.includes(b.id));

  return (
    <div className="mx-auto min-h-screen max-w-md bg-canvas px-4 pb-24 pt-5">
      <h1 className="text-2xl font-extrabold text-ink">Saved</h1>
      <p className="mt-0.5 text-sm text-gray-500">Your bookmarked spots</p>

      {savedBars.length > 0 && (
        <div className="mt-5 space-y-2.5">
          {savedBars.map((b) => (
            <Row key={b.id} bar={b} saved onToggle={() => toggle(b.id)} />
          ))}
        </div>
      )}

      <h2 className="mb-2 mt-7 text-xs font-bold uppercase tracking-wide text-gray-400">
        All bars
      </h2>
      <div className="space-y-2.5">
        {bars.map((b) => (
          <Row key={b.id} bar={b} saved={saved.includes(b.id)} onToggle={() => toggle(b.id)} />
        ))}
      </div>
    </div>
  );
}

function Row({ bar, saved, onToggle }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-card">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="truncate text-[15px] font-semibold text-ink">{bar.name}</h3>
          <WaitBadge waitMin={bar.waitMin} />
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-xs text-gray-500">
          <span className="flex items-center gap-0.5">
            <Star size={12} className="fill-amber-400 text-amber-400" />
            {bar.rating?.toFixed(1)}
          </span>
          <span>·</span>
          <span>{bar.distance} mi</span>
          <span>·</span>
          <span className="truncate">{bar.address}</span>
        </div>
      </div>
      <button
        onClick={onToggle}
        className={`shrink-0 rounded-full p-2 ${saved ? 'text-ink' : 'text-gray-300'}`}
      >
        <Bookmark size={20} className={saved ? 'fill-ink' : ''} />
      </button>
    </div>
  );
}
