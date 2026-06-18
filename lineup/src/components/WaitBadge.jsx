import { waitClasses, waitLabel } from '../lib/wait.js';

// Color-coded wait pill. `solid` for the filled map/CTA style, otherwise soft.
export default function WaitBadge({ waitMin, solid = false, className = '' }) {
  const c = waitClasses(waitMin);
  if (solid) {
    return (
      <span
        className={`inline-flex items-center justify-center rounded-full px-2.5 py-1 text-xs font-bold text-white ${c.bg} ${className}`}
      >
        {waitLabel(waitMin)}
      </span>
    );
  }
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full px-2.5 py-1 text-xs font-bold ${c.soft} ${c.text} ${className}`}
    >
      {waitLabel(waitMin)}
    </span>
  );
}
