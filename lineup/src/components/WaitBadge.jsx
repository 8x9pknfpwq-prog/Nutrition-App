import { waitClasses, waitLabel } from '../lib/wait.js';

// Color-coded wait pill.
//   solid — filled map/CTA style
//   est   — a baseline estimate (no live reports yet): outlined + "~" prefix so
//           it reads as "typically about this" rather than a confirmed number.
export default function WaitBadge({ waitMin, solid = false, est = false, closed = false, className = '' }) {
  const c = waitClasses(waitMin);
  const label = est ? (waitMin <= 0 ? 'Quiet' : `~${waitMin}m`) : waitLabel(waitMin);

  if (closed) {
    return (
      <span
        className={`wait-time inline-flex items-center justify-center rounded-full bg-wait-red/10 px-2.5 py-1 text-xs font-bold text-wait-red ${className}`}
      >
        Closed
      </span>
    );
  }
  if (est) {
    return (
      <span
        className={`wait-time inline-flex items-center justify-center rounded-full border bg-white px-2.5 py-1 text-xs font-bold ${c.text} ${className}`}
        style={{ borderColor: 'currentColor' }}
        title="Typical wait for this time — no live reports yet"
      >
        {label}
      </span>
    );
  }
  if (solid) {
    return (
      <span
        className={`wait-time inline-flex items-center justify-center rounded-full px-2.5 py-1 text-xs font-bold text-white ${c.bg} ${className}`}
      >
        {label}
      </span>
    );
  }
  return (
    <span
      className={`wait-time inline-flex items-center justify-center rounded-full px-2.5 py-1 text-xs font-bold ${c.soft} ${c.text} ${className}`}
    >
      {label}
    </span>
  );
}
