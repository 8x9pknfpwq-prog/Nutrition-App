import { useEffect, useMemo, useState } from 'react';
import { X, Check } from 'lucide-react';
import Avatar from './Avatar.jsx';
import { api } from '../lib/api.js';
import { useToast } from '../context/ToastContext.jsx';
import { waitColor, statusText } from '../lib/wait.js';

const MAX = 90; // slider tops out at "90+"

// Circular wait dial. Fills proportionally to the chosen wait, colored by band.
function Dial({ value }) {
  const size = 200;
  const stroke = 14;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(value / MAX, 1);
  const color = waitColor(value);
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#E8E6E0" strokeWidth={stroke} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={circ * (1 - pct)}
        style={{ transition: 'stroke-dashoffset 0.15s ease, stroke 0.15s ease' }}
      />
      <g className="rotate-90" style={{ transformOrigin: 'center' }}>
        <text x="50%" y="46%" textAnchor="middle" className="wait-time fill-ink font-bold" style={{ fontSize: 46 }}>
          {value >= MAX ? '90+' : value}
        </text>
        <text x="50%" y="60%" textAnchor="middle" className="fill-gray-400 font-semibold" style={{ fontSize: 12, letterSpacing: 1 }}>
          MIN LINE
        </text>
      </g>
    </svg>
  );
}

export default function CheckInSheet({ bar, onClose, onSubmitted }) {
  const { showToast } = useToast();
  const [value, setValue] = useState(bar.waitMin ?? 15);
  const [share, setShare] = useState(true);
  const [friends, setFriends] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.friends().then((d) => setFriends(d.friends || [])).catch(() => {});
  }, []);

  const status = statusText(value);
  const statusColor = useMemo(() => waitColor(value), [value]);

  async function submit() {
    setSubmitting(true);
    try {
      await api.report({ barId: bar.id, waitMin: value });
      if (share && friends.length > 0) {
        await api.notifyFriends(bar.id);
      }
      showToast({ title: 'Checked in', body: `${bar.name} · ${value >= MAX ? '90+' : value} min line` });
      onSubmitted?.();
      onClose();
    } catch (e) {
      showToast({ title: 'Could not check in', body: e.message });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[55] flex items-end justify-center bg-black/40" onClick={onClose}>
      <div
        className="flex max-h-[94vh] w-full max-w-md flex-col rounded-t-3xl bg-canvas p-5 pb-8 animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="min-w-0">
            <h2 className="truncate text-xl font-bold text-ink">{bar.name}</h2>
            <p className="truncate text-sm text-gray-500">{bar.address}</p>
          </div>
          <button onClick={onClose} className="rounded-full bg-black/5 p-2 text-gray-500">
            <X size={18} />
          </button>
        </div>

        {/* Dial */}
        <div className="mt-4 flex flex-col items-center">
          <Dial value={value} />
          <span className="mt-2 text-sm font-bold tracking-wide" style={{ color: statusColor }}>
            {status}
          </span>
        </div>

        {/* Slider */}
        <div className="mt-5">
          <input
            type="range"
            min={0}
            max={MAX}
            step={5}
            value={value}
            onChange={(e) => setValue(Number(e.target.value))}
            className="lineup-slider w-full"
          />
          <div className="mt-1.5 flex justify-between text-[11px] font-semibold text-gray-400">
            <span>NONE</span>
            <span>45</span>
            <span>90+</span>
          </div>
        </div>

        {/* Share with friends */}
        <div className="mt-5 flex items-center justify-between rounded-2xl bg-white p-3.5 shadow-card">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-ink">Share with friends</p>
            <div className="mt-1 flex items-center gap-2">
              <div className="flex -space-x-2">
                {friends.slice(0, 4).map((f) => (
                  <Avatar key={f.id} initial={f.avatarInitial} seed={f.username} size={22} ring />
                ))}
              </div>
              <span className="text-xs text-gray-500">
                {friends.length === 0
                  ? 'No friends yet'
                  : `${friends.length} friend${friends.length === 1 ? '' : 's'} will be notified`}
              </span>
            </div>
          </div>
          <button
            onClick={() => setShare((s) => !s)}
            className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
              share ? 'bg-ink' : 'bg-gray-300'
            }`}
            aria-pressed={share}
          >
            <span
              className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${
                share ? 'left-[22px]' : 'left-0.5'
              }`}
            />
          </button>
        </div>

        {/* CTA */}
        <button
          onClick={submit}
          disabled={submitting}
          className="mt-5 flex items-center justify-center gap-2 rounded-2xl bg-ink py-4 text-base font-semibold text-white disabled:opacity-60"
        >
          {submitting ? 'Checking in…' : (<><Check size={18} /> Check in here</>)}
        </button>
      </div>
    </div>
  );
}
