// Busyness forecast — wait times predicted from each bar's own past reports.
//
// The forecast for a given moment is the average of the bar's historical reports
// for that weekday + hour (in NYC time). Brand-new bars have little/no history,
// so we shrink the average toward a generic NYC-bar PRIOR: with few samples the
// forecast leans on the prior, and as real reports accumulate it converges to
// the bar's true averages. This keeps the map populated from day one while
// becoming a genuine data-driven forecast over time.
//
// Live reports (last 90 min) always win over the forecast.
//
// Everything here is pure and client-side; the data layer supplies the
// aggregated history (per-bar `forecastNow` for the map, full 7×24 histogram for
// the "best time to go" strip), so it behaves the same in demo and Supabase.

// --- generic prior (used only where a bar lacks its own history) -------------
// Relative busyness of a typical bar by hour of day (NYC local), 0..1.
const HOURLY = [
  0.45, 0.30, 0.18, 0.08, 0.04, 0.03, // 0–5
  0.03, 0.04, 0.05, 0.06, 0.08, 0.12, // 6–11
  0.16, 0.18, 0.18, 0.20, 0.26, 0.34, // 12–17
  0.46, 0.58, 0.70, 0.82, 0.80, 0.62, // 18–23
];
// Per-weekday multiplier. 0 = Sunday … 6 = Saturday.
const DAY_FACTOR = [0.70, 0.55, 0.60, 0.70, 0.85, 1.0, 1.0];

// How many "prior" pseudo-reports the shrinkage assumes. Higher = trust the
// generic curve longer before a bar's own data takes over.
const PRIOR_STRENGTH = 4;

// Stable 0..1 hash from a bar id, so equally-rated bars aren't identical.
function jitter(seed = '') {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return (h % 1000) / 1000;
}

// The busiest a bar tends to get (min of line) at its weekly peak — drives the
// prior. Proxied from rating plus a little per-bar variation.
function peakWaitMin(bar) {
  const rating = bar?.rating || 4.0;
  const ratingScore = Math.max(0, Math.min(1, (rating - 3.8) / (4.8 - 3.8)));
  const j = jitter(bar?.id || bar?.name || '');
  return 12 + ratingScore * 40 + (j - 0.5) * 10; // ~12–52 min
}

// Prior expected wait for a specific weekday+hour (rounded to 5).
export function priorWaitAt(bar, dow, hour) {
  const level = Math.max(0, Math.min(1, HOURLY[hour] * (DAY_FACTOR[dow] ?? 1)));
  return Math.max(0, Math.round((level * peakWaitMin(bar)) / 5) * 5);
}

// --- NYC time helpers (forecast cells are keyed by NYC weekday/hour) ---------
const DOW = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
export function nycParts(now = Date.now()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    weekday: 'short',
    hour: '2-digit',
    hour12: false,
  }).formatToParts(new Date(now));
  let dow = 0;
  let hour = 0;
  for (const p of parts) {
    if (p.type === 'weekday') dow = DOW[p.value] ?? 0;
    if (p.type === 'hour') hour = parseInt(p.value, 10) % 24;
  }
  return { dow, hour };
}

// --- forecast blending -------------------------------------------------------
// Shrink an observed average toward the prior by sample count.
export function blend(avgWait, n, priorWait) {
  if (!n) return priorWait;
  const w = (avgWait * n + priorWait * PRIOR_STRENGTH) / (n + PRIOR_STRENGTH);
  return Math.max(0, Math.round(w / 5) * 5);
}

// Map a concrete wait onto a 0..1 busyness scale (for coloring / bar heights).
function levelFromWait(waitMin) {
  if (waitMin == null) return 0;
  return Math.max(0, Math.min(1, waitMin / 45));
}

// What to actually show for a bar right now:
//   live      — a real number from the last 90 minutes (authoritative)
//   forecast  — blend of this bar's history for the current cell + the prior
//   prior     — generic curve, when the bar has no history at all yet
// `bar.forecastNow` is { avgWait, n } for the current NYC weekday/hour.
export function displayWait(bar, now = Date.now()) {
  if (bar && bar.waitMin != null) {
    return { waitMin: bar.waitMin, isLive: true, source: 'live', n: bar.reportCount ?? 0, level: levelFromWait(bar.waitMin) };
  }
  const { dow, hour } = nycParts(now);
  const prior = priorWaitAt(bar || {}, dow, hour);
  const f = bar && bar.forecastNow;
  if (f && f.n > 0) {
    const waitMin = blend(f.avgWait, f.n, prior);
    return { waitMin, isLive: false, source: 'forecast', n: f.n, level: levelFromWait(waitMin) };
  }
  return { waitMin: prior, isLive: false, source: 'prior', n: 0, level: levelFromWait(prior) };
}

// Words for a busyness level.
export function busynessLabel(level) {
  if (level < 0.12) return 'Quiet';
  if (level < 0.4) return 'Steady';
  if (level < 0.7) return 'Busy';
  return 'Packed';
}

// 24 forecast waits for one weekday, blending the bar's histogram with the prior.
// `histogram` is { [dow]: { [hour]: { avgWait, n } } } (may be undefined).
export function forecastDay(bar, dayIndex, histogram) {
  return Array.from({ length: 24 }, (_, h) => {
    const cell = histogram?.[dayIndex]?.[h];
    return blend(cell?.avgWait ?? 0, cell?.n ?? 0, priorWaitAt(bar, dayIndex, h));
  });
}

// Total number of historical reports backing a histogram (for confidence copy).
export function histogramCount(histogram) {
  let total = 0;
  if (!histogram) return 0;
  for (const day of Object.values(histogram)) for (const cell of Object.values(day)) total += cell.n || 0;
  return total;
}

// The quietest hour to go during tonight's window (4 PM–1 AM), by forecast wait.
export function bestTimeHour(dayWaits) {
  const window = [16, 17, 18, 19, 20, 21, 22, 23, 0, 1];
  let best = window[0];
  for (const h of window) if (dayWaits[h] < dayWaits[best]) best = h;
  return best;
}

// 14 → "2 PM", 0 → "12 AM".
export function formatHour(h) {
  const period = h < 12 ? 'AM' : 'PM';
  const hr = h % 12 === 0 ? 12 : h % 12;
  return `${hr} ${period}`;
}

export { levelFromWait };
