import { avatarColor } from '../lib/wait.js';

// Colored initial circle used for users/friends throughout the app.
export default function Avatar({ initial, seed, size = 36, ring = false, className = '' }) {
  const letter = (initial || seed || '?').toString().charAt(0).toUpperCase();
  const bg = avatarColor(seed || letter);
  return (
    <div
      className={`flex items-center justify-center rounded-full font-semibold text-white ${
        ring ? 'ring-2 ring-white' : ''
      } ${className}`}
      style={{ width: size, height: size, background: bg, fontSize: size * 0.42 }}
    >
      {letter}
    </div>
  );
}
