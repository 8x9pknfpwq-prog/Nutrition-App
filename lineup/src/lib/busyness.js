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
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date(now));
  let dow = 0;
  let hour = 0;
  let minute = 0;
  for (const p of parts) {
    if (p.type === 'weekday') dow = DOW[p.value] ?? 0;
    if (p.type === 'hour') hour = parseInt(p.value, 10) % 24;
    if (p.type === 'minute') minute = parseInt(p.value, 10);
  }
  return { dow, hour, minute };
}

const WEEKDAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// --- opening hours -----------------------------------------------------------
// Default open windows by venue type, in NYC local hours, used when a venue has
// no explicit `hours` set yet.
const HOURS = {
  bar: { open: 16, close: 4 }, // 4 PM – 4 AM
  froyo: { open: 11, close: 23 }, // 11 AM – 11 PM
};

// Normalize a stored `hours` value (array of 7: null | {open, close} in minutes)
// into a clean array, or null if it isn't usable (→ caller falls back to defaults).
function normalizeHours(hours) {
  if (!Array.isArray(hours) || hours.length !== 7) return null;
  let any = false;
  const out = hours.map((e) => {
    if (!e || typeof e.open !== 'number' || typeof e.close !== 'number') return null;
    any = true;
    let close = e.close;
    if (close <= e.open) close += 1440; // close past midnight
    return { open: e.open, close };
  });
  return any ? out : out; // keep all-null (a venue marked closed every day)
}

// Whether the venue has real, admin-entered hours (vs. relying on type defaults).
export function hasRealHours(bar) {
  return normalizeHours(bar?.hours) != null && bar.hours.some((e) => e);
}

// The 7-day windows actually used: explicit hours if set, else the type default
// applied to every day.
function effectiveHours(bar) {
  const h = normalizeHours(bar?.hours);
  if (h && bar.hours.some((e) => e)) return h;
  const vt = bar?.venueType === 'froyo' ? 'froyo' : 'bar';
  const open = (bar?.openHour ?? HOURS[vt].open) * 60;
  let close = (bar?.closeHour ?? HOURS[vt].close) * 60;
  if (close <= open) close += 1440;
  return Array.from({ length: 7 }, () => ({ open, close }));
}

export function isOpen(bar, now = Date.now()) {
  const eh = effectiveHours(bar);
  const { dow, hour, minute } = nycParts(now);
  const m = hour * 60 + minute;
  const today = eh[dow];
  if (today && m >= today.open && m < Math.min(today.close, 1440)) return true;
  // A window that ran past midnight belongs to the previous day's entry.
  const y = eh[(dow + 6) % 7];
  if (y && y.close > 1440 && m + 1440 < y.close) return true;
  return false;
}

// Human-readable status: { open, text } e.g. "Open until 2 AM",
// "Closed · opens 4 PM", "Closed · opens Sat 11 AM".
export function openStatus(bar, now = Date.now()) {
  const eh = effectiveHours(bar);
  const { dow, hour, minute } = nycParts(now);
  const m = hour * 60 + minute;

  if (isOpen(bar, now)) {
    const today = eh[dow];
    let close;
    if (today && m >= today.open && m < Math.min(today.close, 1440)) close = today.close;
    else close = eh[(dow + 6) % 7].close;
    return { open: true, text: `Open until ${formatMin(close)}` };
  }

  for (let i = 0; i < 7; i++) {
    const d = (dow + i) % 7;
    const e = eh[d];
    if (!e) continue;
    if (i === 0 && m >= e.open) continue; // today's window already passed
    const when = i === 0 ? '' : i === 1 ? 'tomorrow ' : `${WEEKDAY[d]} `;
    return { open: false, text: `Closed · opens ${when}${formatMin(e.open)}` };
  }
  return { open: false, text: 'Closed' };
}

// Minutes-from-midnight → "2 AM" / "11:30 PM".
export function formatMin(min) {
  min = (((min % 1440) + 1440) % 1440);
  const h = Math.floor(min / 60);
  const mm = min % 60;
  const period = h < 12 ? 'AM' : 'PM';
  const hr = h % 12 === 0 ? 12 : h % 12;
  return mm === 0 ? `${hr} ${period}` : `${hr}:${String(mm).padStart(2, '0')} ${period}`;
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
  // A live report means it's open regardless of our default hours — the crowd
  // knows better, so show the real number.
  if (bar && bar.waitMin != null) {
    return { waitMin: bar.waitMin, isLive: true, source: 'live', n: bar.reportCount ?? 0, level: levelFromWait(bar.waitMin) };
  }
  // Otherwise, a closed venue shows no wait — not a forecast.
  if (bar && !isOpen(bar, now)) {
    return { waitMin: null, isLive: false, closed: true, source: 'closed', n: 0, level: 0 };
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
