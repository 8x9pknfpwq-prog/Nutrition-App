import { Star } from 'lucide-react';

// Uber-style accuracy rating. Shows a star + rating, or "New" until the user
// has enough scored reports for a meaningful number.
export default function TrustBadge({ rating, size = 'sm', className = '' }) {
  const px = size === 'lg' ? 16 : 12;
  const text = size === 'lg' ? 'text-sm' : 'text-xs';
  if (rating == null) {
    return (
      <span className={`inline-flex items-center gap-1 font-medium text-gray-400 ${text} ${className}`}>
        <Star size={px} className="text-gray-300" /> New
      </span>
    );
  }
  return (
    <span className={`inline-flex items-center gap-1 font-semibold text-ink ${text} ${className}`}>
      <Star size={px} className="fill-wait-amber text-wait-amber" /> {Number(rating).toFixed(1)}
    </span>
  );
}
