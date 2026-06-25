import { useState } from 'react';
import { X, Copy } from 'lucide-react';
import { api } from '../lib/api.js';
import { useToast } from '../context/ToastContext.jsx';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const pad = (n) => String(n).padStart(2, '0');
const minToHHMM = (min) => `${pad(Math.floor((min % 1440) / 60))}:${pad((min % 1440) % 60)}`;
const hhmmToMin = (s) => {
  const [h, m] = s.split(':').map(Number);
  return h * 60 + m;
};

// Sensible default window for a fresh "open" day, by venue type.
const defaultDay = (venueType) =>
  venueType === 'froyo'
    ? { closed: false, open: '11:00', close: '23:00' }
    : { closed: false, open: '16:00', close: '02:00' };

// Build the editor's initial 7 rows from a stored hours array (or type defaults).
function initRows(venue) {
  const stored = Array.isArray(venue.hours) && venue.hours.length === 7 ? venue.hours : null;
  return DAYS.map((_, i) => {
    const e = stored?.[i];
    if (stored && !e) return { ...defaultDay(venue.venueType), closed: true };
    if (e && typeof e.open === 'number') {
      return { closed: false, open: minToHHMM(e.open), close: minToHHMM(e.close) };
    }
    return defaultDay(venue.venueType);
  });
}

// Admin editor for a venue's per-day opening hours.
export default function HoursEditor({ venue, onClose, onSaved }) {
  const { showToast } = useToast();
  const [rows, setRows] = useState(() => initRows(venue));
  const [saving, setSaving] = useState(false);

  const update = (i, patch) => setRows((r) => r.map((row, j) => (j === i ? { ...row, ...patch } : row)));
  const copyToAll = () => setRows((r) => r.map(() => ({ ...r[0] })));

  async function save() {
    setSaving(true);
    // null for closed days; {open, close} minutes otherwise (close stored as the
    // clock minute — the app treats close<=open as running past midnight).
    const hours = rows.map((row) =>
      row.closed ? null : { open: hhmmToMin(row.open), close: hhmmToMin(row.close) }
    );
    try {
      await api.setVenueHours(venue.id, hours);
      showToast({ title: 'Hours saved', body: venue.name });
      onSaved?.(hours);
      onClose();
    } catch (e) {
      showToast({ title: 'Could not save hours', body: e.message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40" onClick={onClose}>
      <div
        className="flex max-h-[92vh] w-full max-w-md flex-col rounded-t-3xl bg-canvas p-5 pb-8 animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div className="min-w-0">
            <h2 className="truncate text-xl font-bold text-ink">Hours</h2>
            <p className="truncate text-sm text-gray-500">{venue.name}</p>
          </div>
          <button onClick={onClose} className="rounded-full bg-black/5 p-2 text-gray-500">
            <X size={18} />
          </button>
        </div>

        <button
          onClick={copyToAll}
          className="mt-3 inline-flex items-center gap-1.5 self-start rounded-full bg-ink/5 px-3 py-1.5 text-xs font-semibold text-ink"
        >
          <Copy size={13} /> Copy Sunday to every day
        </button>

        <div className="no-scrollbar mt-3 flex-1 space-y-2 overflow-y-auto">
          {rows.map((row, i) => (
            <div key={i} className="rounded-xl bg-white px-3 py-2.5 shadow-card">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-ink">{DAYS[i]}</span>
                <button
                  onClick={() => update(i, { closed: !row.closed })}
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                    row.closed ? 'bg-gray-100 text-gray-400' : 'bg-wait-green/10 text-wait-green'
                  }`}
                >
                  {row.closed ? 'Closed' : 'Open'}
                </button>
              </div>
              {!row.closed && (
                <div className="mt-2 flex items-center gap-2">
                  <input
                    type="time"
                    value={row.open}
                    onChange={(e) => update(i, { open: e.target.value })}
                    className="min-w-0 flex-1 rounded-lg border border-black/10 bg-canvas px-2 py-1.5 text-sm outline-none"
                  />
                  <span className="shrink-0 text-gray-400">to</span>
                  <input
                    type="time"
                    value={row.close}
                    onChange={(e) => update(i, { close: e.target.value })}
                    className="min-w-0 flex-1 rounded-lg border border-black/10 bg-canvas px-2 py-1.5 text-sm outline-none"
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        <p className="mt-2 text-[11px] text-gray-400">
          For spots open past midnight, set the closing time to the early-morning hour (e.g. 2:00 AM).
        </p>

        <button
          onClick={save}
          disabled={saving}
          className="mt-3 w-full rounded-2xl bg-ink py-3.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save hours'}
        </button>
      </div>
    </div>
  );
}
