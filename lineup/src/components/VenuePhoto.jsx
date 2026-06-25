import { Wine, IceCream } from 'lucide-react';
import { avatarColor } from '../lib/wait.js';

// Venue thumbnail: the uploaded photo if there is one, otherwise a branded
// placeholder (a color seeded by the name + the venue's initial + a category
// icon) so every venue looks intentional even before a photo is added.
export default function VenuePhoto({ bar, size = 64, className = '', rounded = 'rounded-xl' }) {
  const dims = { width: size, height: size };

  if (bar?.imageUrl) {
    return (
      <img
        src={bar.imageUrl}
        alt={bar.name}
        loading="lazy"
        style={dims}
        className={`${rounded} shrink-0 object-cover ${className}`}
      />
    );
  }

  const Icon = bar?.venueType === 'froyo' ? IceCream : Wine;
  const color = avatarColor(bar?.name || '');
  const initial = (bar?.name || '?').trim()[0]?.toUpperCase() || '?';

  return (
    <div
      style={{ ...dims, background: color }}
      className={`${rounded} relative grid shrink-0 place-items-center overflow-hidden ${className}`}
    >
      {/* subtle depth */}
      <div
        className="absolute inset-0"
        style={{ background: 'linear-gradient(135deg, rgba(255,255,255,.18), rgba(0,0,0,.22))' }}
      />
      <span className="relative font-extrabold text-white" style={{ fontSize: size * 0.4 }}>
        {initial}
      </span>
      <Icon
        className="absolute bottom-1 right-1 text-white/75"
        size={Math.max(12, size * 0.22)}
      />
    </div>
  );
}
