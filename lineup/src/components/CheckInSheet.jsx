import { useEffect, useMemo, useState } from 'react';
import { X, Check } from 'lucide-react';
import Avatar from './Avatar.jsx';
import { api } from '../lib/api.js';
import VenuePhoto from './VenuePhoto.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { waitColor, statusText } from '../lib/wait.js';
import {
  displayWait, busynessLabel, bestTimeHour, formatHour,
  forecastDay, levelFromWait, histogramCount, nycParts, openStatus,
} from '../lib/busyness.js';

const MAX = 90; // slider tops out at "90+"

// "Best time to go" — tonight's forecast wait by hour, built from this bar's
// own past reports (shrunk toward the generic prior where history is thin).
function BestTime({ bar }) {
  const [hist, setHist] = useState(undefined);

  useEffect(() => {
    let live = true;
    api.forecast(bar.id).then((d) => { if (live) setHist(d.histogram || {}); }).catch(() => {});
    return () => { live = false; };
  }, [bar.id]);

  const { dow, hour } = nycParts();
  const dayWaits = forecastDay(bar, dow, hist);
  const best = bestTimeHour(dayWaits);
  const nowLevel = levelFromWait(dayWaits[hour]);
  const samples = histogramCount(hist);

  return (
    <div className="mt-5 rounded-2xl bg-white p-3.5 shadow-card">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-ink">Best time to go</p>
        <span className="text-xs font-medium text-gray-500">
          Usually {busynessLabel(nowLevel).toLowerCase()} now
        </span>
      </div>
      <div className="mt-3 flex h-12 items-end gap-[2px]">
        {dayWaits.map((w, h) => (
          <div
            key={h}
            className="flex-1 rounded-sm"
            style={{
              height: `${Math.max(8, levelFromWait(w) * 100)}%`,
              background: h === hour ? '#1A1814' : h === best ? '#4CAF50' : '#E2DFD8',
            }}
            title={`${formatHour(h)} · ~${w}m`}
          />
        ))}
      </div>
      <div className="mt-1.5 flex justify-between text-[10px] font-semibold text-gray-400">
        <span>12a</span>
        <span>6a</span>
        <span>12p</span>
        <span>6p</span>
        <span>11p</span>
      </div>
      <p className="mt-2 text-xs text-gray-500">
        Calmest around <span className="font-semibold text-wait-green">{formatHour(best)}</span>
        {samples > 0
          ? <> · from {samples} past report{samples === 1 ? '' : 's'}</>
          : <> · estimated until we have reports</>}
      </p>
    </div>
  );
}

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
  const [value, setValue] = useState(bar.waitMin ?? displayWait(bar).waitMin ?? 15);
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
        className="flex max-h-[90dvh] w-full max-w-md flex-col rounded-t-3xl bg-canvas animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="no-scrollbar flex-1 overflow-y-auto px-5 pt-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <VenuePhoto bar={bar} size={48} />
            <div className="min-w-0">
            <h2 className="truncate text-xl font-bold text-ink">{bar.name}</h2>
            <p className="truncate text-sm text-gray-500">{bar.address}</p>
            {(() => {
              const s = openStatus(bar);
              return (
                <p className={`mt-0.5 text-xs font-semibold ${s.open ? 'text-wait-green' : 'text-gray-400'}`}>
                  {s.text}
                </p>
              );
            })()}
            </div>
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

        {/* Best time to go */}
        <BestTime bar={bar} />

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

          <div className="h-3" />
        </div>

        {/* Pinned CTA — always visible, clears the home indicator */}
        <div className="shrink-0 border-t border-black/5 px-5 pt-3 pb-[calc(env(safe-area-inset-bottom)+16px)]">
          <button
            onClick={submit}
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-ink py-4 text-base font-semibold text-white disabled:opacity-60"
          >
            {submitting ? 'Checking in…' : (<><Check size={18} /> Check in here</>)}
          </button>
        </div>
      </div>
    </div>
  );
}
