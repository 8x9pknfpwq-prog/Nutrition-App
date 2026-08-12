import { Star } from 'lucide-react';

// Uber-style accuracy rating.
// - inline (default): a small star + number, for list rows.
// - pill: a soft white capsule, for the profile header.
// Shows "New" until the user has enough scored reports.
export default function TrustBadge({ rating, size = 'sm', pill = false, meta = null, className = '' }) {
  const px = size === 'lg' ? 15 : 12;
  const isNew = rating == null;

  const inner = isNew ? (
    <>
      <Star size={px} className="text-gray-300" strokeWidth={2.25} />
      <span className="font-medium text-gray-400">New</span>
    </>
  ) : (
    <>
      <Star size={px} className="fill-wait-amber text-wait-amber" strokeWidth={0} />
      <span className="font-semibold text-ink tabular-nums">{Number(rating).toFixed(1)}</span>
      {meta && <span className="font-medium text-gray-400">· {meta}</span>}
    </>
  );

  if (pill) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-sm shadow-[0_1px_3px_rgba(0,0,0,0.06)] ring-1 ring-black/[0.03] ${className}`}
      >
        {inner}
      </span>
    );
  }
  return (
    <span className={`inline-flex items-center gap-1 text-xs ${className}`}>{inner}</span>
  );
}
