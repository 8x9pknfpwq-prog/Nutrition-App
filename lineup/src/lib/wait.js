// Shared wait-time presentation helpers used across map pins, badges and the
// check-in dial. Color thresholds match the design reference:
//   green  0–10 min
//   amber  11–30 min
//   red    30+ min

export const COLORS = {
  green: '#1FA463',
  amber: '#E8902B',
  red: '#E03B3B',
  gray: '#9A968D',
};

export function waitColor(waitMin) {
  if (waitMin == null) return COLORS.gray;
  if (waitMin <= 10) return COLORS.green;
  if (waitMin <= 30) return COLORS.amber;
  return COLORS.red;
}

// Tailwind class trio (bg / text / soft bg) for a given wait, for badges.
export function waitClasses(waitMin) {
  if (waitMin == null) return { bg: 'bg-gray-400', soft: 'bg-gray-100', text: 'text-gray-500' };
  if (waitMin <= 10) return { bg: 'bg-wait-green', soft: 'bg-emerald-50', text: 'text-wait-green' };
  if (waitMin <= 30) return { bg: 'bg-wait-amber', soft: 'bg-amber-50', text: 'text-wait-amber' };
  return { bg: 'bg-wait-red', soft: 'bg-red-50', text: 'text-wait-red' };
}

export function waitLabel(waitMin) {
  if (waitMin == null) return 'No data';
  if (waitMin === 0) return 'No line';
  return `${waitMin}m`;
}

export function statusText(waitMin) {
  if (waitMin == null) return 'NO DATA';
  if (waitMin <= 10) return 'SHORT WAIT';
  if (waitMin <= 30) return 'MODERATE';
  return 'LONG WAIT';
}

// A stable, pleasant color for a user's avatar initial.
const AVATAR_COLORS = [
  '#E03B3B', '#E8902B', '#1FA463', '#2D7FF9', '#8B5CF6', '#EC4899', '#0EA5A4', '#D97706',
];
export function avatarColor(seed = '') {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

// "4m ago", "2h ago", "just now"
export function timeAgo(date) {
  if (!date) return '';
  const secs = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (secs < 45) return 'just now';
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}
