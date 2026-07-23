// Static demo backend — runs entirely in the browser so the app can be
// published to GitHub Pages with no server or database.
//
// Enabled when the app is built with VITE_DEMO=true. It mirrors the shape of
// the real REST API (src/lib/api.js) and Socket.io events, seeded with the same
// NYC bars and demo users as prisma/seed.js. A lightweight "live simulator"
// periodically posts reports and friend check-ins so the real-time features are
// visible on a static host.
//
// Note: mutations (your reports / friend actions) live for the session and
// reset on a full page reload; your login persists via localStorage.

import { geocodePlace } from './geocode.js';
import { nycParts, priorWaitAt } from './busyness.js';

export const DEMO = import.meta.env.VITE_DEMO === 'true';

const SESSION_KEY = 'nyc_lines_demo_session';
const USER_BARS_KEY = 'nyc_lines_demo_bars';

// --- helpers -------------------------------------------------------------
const uid = () => Math.random().toString(36).slice(2, 10);
const minsAgo = (m) => new Date(Date.now() - m * 60 * 1000);
const NYC_CENTER = { lat: 40.7282, lng: -73.9942 };
function milesFromCenter(lat, lng) {
  const toRad = (d) => (d * Math.PI) / 180;
  const R = 3958.8;
  const dLat = toRad(lat - NYC_CENTER.lat);
  const dLng = toRad(lng - NYC_CENTER.lng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(NYC_CENTER.lat)) * Math.cos(toRad(lat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(a)) * 10) / 10;
}
function apiError(message, status = 400) {
  const e = new Error(message);
  e.status = status;
  return e;
}

// --- seed data (stable ids so sessions survive reloads) ------------------
const BARS = [
  // Example of real per-day hours: open 5 PM–2 AM, later Fri/Sat, closed Mondays.
  { id: 'bar_wren', name: 'The Wren', address: '64 E 1st St', latitude: 40.72335, longitude: -73.99056, rating: 4.5, distance: 0.2,
    hours: [ { open: 1020, close: 1560 }, null, { open: 1020, close: 1560 }, { open: 1020, close: 1560 }, { open: 1020, close: 1560 }, { open: 1020, close: 1620 }, { open: 1020, close: 1620 } ] },
  { id: 'bar_pouring', name: 'Pouring Ribbons', address: '225 Avenue B', latitude: 40.72705, longitude: -73.97874, rating: 4.6, distance: 0.6 },
  { id: 'bar_deathco', name: 'Death & Co', address: '433 E 6th St', latitude: 40.72627, longitude: -73.98372, rating: 4.7, distance: 0.4 },
  { id: 'bar_amor', name: 'Amor y Amargo', address: '443 E 6th St', latitude: 40.72637, longitude: -73.98347, rating: 4.4, distance: 0.4 },
  { id: 'bar_rueb', name: 'Rue B', address: '188 Avenue B', latitude: 40.72563, longitude: -73.97897, rating: 4.3, distance: 0.6 },
  { id: 'bar_pdt', name: "Please Don't Tell", address: '113 St Marks Pl', latitude: 40.72732, longitude: -73.98463, rating: 4.6, distance: 0.5 },
  { id: 'bar_angels', name: "Angel's Share", address: '8 Stuyvesant St', latitude: 40.72967, longitude: -73.98893, rating: 4.5, distance: 0.6 },
  { id: 'bar_attaboy', name: 'Attaboy', address: '134 Eldridge St', latitude: 40.71903, longitude: -73.99124, rating: 4.7, distance: 0.7 },
  { id: 'bar_purple', name: 'Mr. Purple', address: '180 Orchard St', latitude: 40.72122, longitude: -73.98825, rating: 4.2, distance: 0.5 },
  { id: 'bar_wayland', name: 'The Wayland', address: '700 E 9th St', latitude: 40.72595, longitude: -73.97763, rating: 4.4, distance: 0.7 },
  { id: 'bar_niagara', name: 'Niagara', address: '112 Avenue A', latitude: 40.72588, longitude: -73.98392, rating: 4.1, distance: 0.4 },
  { id: 'bar_berlin', name: 'Berlin', address: '25 Avenue A', latitude: 40.72268, longitude: -73.98742, rating: 4.2, distance: 0.3 },
  { id: 'bar_boiler', name: 'Boilermaker', address: '13 First Ave', latitude: 40.72402, longitude: -73.98826, rating: 4.0, distance: 0.3 },
  { id: 'bar_goto', name: 'Bar Goto', address: '245 Eldridge St', latitude: 40.72236, longitude: -73.98968, rating: 4.5, distance: 0.4 },
  { id: 'bar_tenbells', name: 'Ten Bells', address: '247 Broome St', latitude: 40.71803, longitude: -73.99069, rating: 4.4, distance: 0.8 },
  // West Village / Greenwich Village
  { id: 'bar_eo', name: 'Employees Only', address: '510 Hudson St', latitude: 40.7339, longitude: -74.0058, rating: 4.6, distance: 0.7 },
  { id: 'bar_spaniard', name: 'The Spaniard', address: '190 W 4th St', latitude: 40.7331, longitude: -74.0021, rating: 4.4, distance: 0.5 },
  { id: 'bar_hatch', name: 'Down the Hatch', address: '179 W 4th St', latitude: 40.7325, longitude: -74.0008, rating: 4.1, distance: 0.5 },
  { id: 'bar_duewest', name: 'Due West', address: '189 W 10th St', latitude: 40.7344, longitude: -74.0021, rating: 4.0, distance: 0.6 },
  { id: 'bar_angels_grove', name: "Angel's Share (Grove St)", address: '45 Grove St', latitude: 40.7331, longitude: -74.003, rating: 4.5, distance: 0.6 },
  { id: 'bar_dnd', name: 'Do Not Disturb', address: '285 W 12th St', latitude: 40.7382, longitude: -74.0048, rating: 4.3, distance: 0.9 },
  { id: 'bar_bleecker', name: 'Bleecker Street Bar', address: '648 Broadway', latitude: 40.7268, longitude: -73.9947, rating: 4.2, distance: 0.1 },
  { id: 'bar_roccos', name: "Rocco's Sports & Rec", address: '1 W 3rd St', latitude: 40.7288, longitude: -73.9942, rating: 4.1, distance: 0.1 },
  // Tribeca / FiDi
  { id: 'bar_brickyard', name: 'Brickyard', address: '23 Park Pl', latitude: 40.7136, longitude: -74.008, rating: 4.7, distance: 1.2 },
  { id: 'bar_gst', name: 'Greenwich Street Tavern', address: '399 Greenwich St', latitude: 40.7203, longitude: -74.0095, rating: 4.3, distance: 1.0 },
  { id: 'bar_deadrabbit', name: 'The Dead Rabbit', address: '30 Water St', latitude: 40.7033, longitude: -74.0114, rating: 4.7, distance: 1.9 },
  { id: 'bar_holywater', name: 'Holywater', address: '112 Reade St', latitude: 40.716, longitude: -74.009, rating: 4.4, distance: 1.1 },
];

// Froyo venues — all NYC locations of Go Greek Yogurt, Culture, Myka, Madison
// Fare. Coordinates are best-effort from each street address (nudge in the
// Supabase Table Editor if a pin is slightly off).
const FROYO = [
  { id: 'froyo_gogreek', name: 'Go Greek Yogurt', address: '683 Broadway', latitude: 40.7276, longitude: -73.9937, rating: 4.5, distance: 0.1,
    hours: Array.from({ length: 7 }, () => ({ open: 660, close: 1380 })) }, // 11 AM–11 PM daily
  { id: 'froyo_culture_8th', name: 'Culture: An American Yogurt Co.', address: '60 W 8th St', latitude: 40.7330, longitude: -73.9980, rating: 4.4, distance: 0.4 },
  { id: 'froyo_culture_bk', name: 'Culture (Park Slope)', address: '331 5th Ave, Brooklyn', latitude: 40.6718, longitude: -73.9875, rating: 4.4, distance: 4.0 },
  { id: 'froyo_myka', name: 'Myka', address: '159 7th Ave S', latitude: 40.7360, longitude: -74.0028, rating: 4.5, distance: 0.6 },
  { id: 'froyo_madison_ues', name: 'Madison Fare (Upper East Side)', address: '1225 Madison Ave', latitude: 40.7825, longitude: -73.9558, rating: 4.3, distance: 3.8 },
  { id: 'froyo_madison_8th', name: 'Madison Fare (Greenwich Village)', address: '1 W 8th St', latitude: 40.7323, longitude: -73.9968, rating: 4.3, distance: 0.4 },
];

const USERS = [
  { id: 'u_maya', email: 'maya@lineup.app', username: 'maya', password: 'password123', avatarInitial: 'M' },
  { id: 'u_leo', email: 'leo@lineup.app', username: 'leo', password: 'password123', avatarInitial: 'L' },
  { id: 'u_sara', email: 'sara@lineup.app', username: 'sara', password: 'password123', avatarInitial: 'S' },
  { id: 'u_devin', email: 'devin@lineup.app', username: 'devin', password: 'password123', avatarInitial: 'D' },
];

// [barId, [[waitMin, minutesAgo], ...]]
const REPORT_PLAN = [
  ['bar_wren', [[5, 4], [8, 20], [6, 55]]],
  ['bar_deathco', [[40, 6], [45, 18], [35, 50], [50, 80]]],
  ['bar_pouring', [[18, 10], [22, 35]]],
  ['bar_pdt', [[60, 8], [55, 25]]],
  ['bar_attaboy', [[30, 12], [25, 40], [35, 70]]],
  ['bar_niagara', [[3, 9]]],
  ['bar_purple', [[12, 15], [9, 45]]],
  ['bar_berlin', [[0, 7], [5, 33]]],
];

// Synthesize ~3 weeks of past reports so the busyness *forecast* has real data
// to average. Reports are placed in the evening window on past days, with waits
// drawn around each bar's typical level for that weekday/hour (+ noise). All are
// older than the 90-min live window, so they only feed the forecast, never the
// live wait.
const LIVE_WINDOW_MS = 90 * 60 * 1000;
function synthesizeHistory(bars) {
  const out = [];
  const now = Date.now();
  for (const bar of bars) {
    for (let d = 1; d <= 21; d++) {
      const base = new Date(now - d * 24 * 60 * 60 * 1000);
      for (const hour of [12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 0, 1]) {
        const dt = new Date(base);
        dt.setHours(hour, 10 + Math.floor(Math.random() * 45), 0, 0);
        if (dt.getTime() > now - LIVE_WINDOW_MS) continue;
        const { dow, hour: nh } = nycParts(dt.getTime());
        const baseWait = priorWaitAt(bar, dow, nh);
        const count = baseWait <= 0 ? (Math.random() < 0.15 ? 1 : 0) : 1 + (Math.random() < 0.5 ? 1 : 0);
        for (let k = 0; k < count; k++) {
          const noise = Math.round((Math.random() - 0.5) * 14);
          out.push({
            id: uid(),
            barId: bar.id,
            userId: USERS[Math.floor(Math.random() * USERS.length)].id,
            waitMin: Math.max(0, baseWait + noise),
            createdAt: dt,
          });
        }
      }
    }
  }
  return out;
}

// Fresh in-memory state, re-anchored to "now" on every load.
function buildState() {
  const reports = [...synthesizeHistory([...BARS, ...FROYO])];
  let i = 0;
  for (const [barId, entries] of REPORT_PLAN) {
    for (const [waitMin, ago] of entries) {
      reports.push({ id: uid(), barId, userId: USERS[i % USERS.length].id, waitMin, createdAt: minsAgo(ago) });
      i++;
    }
  }
  return {
    bars: [
      ...BARS.map((b) => ({ ...b, verified: true, approved: true, venueType: 'bar' })),
      ...FROYO.map((b) => ({ ...b, verified: true, approved: true, venueType: 'froyo' })),
      // A sample pending suggestion so the demo's Admin screen isn't empty.
      { id: 'bar_pending_demo', name: 'Bleecker Street Bar', address: '58 Bleecker St, New York', latitude: 40.7259, longitude: -73.9956, rating: 0, distance: 0.9, verified: false, approved: false, venueType: 'bar' },
    ],
    users: USERS.map((u) => ({ ...u })),
    reports,
    friendships: [
      { id: uid(), fromUserId: 'u_maya', toUserId: 'u_leo', status: 'accepted' },
      { id: uid(), fromUserId: 'u_maya', toUserId: 'u_sara', status: 'accepted' },
      { id: uid(), fromUserId: 'u_devin', toUserId: 'u_maya', status: 'pending' },
    ],
    notifications: [
      { id: uid(), userId: 'u_leo', barId: 'bar_wren', createdAt: minsAgo(4) },
      { id: uid(), userId: 'u_sara', barId: 'bar_deathco', createdAt: minsAgo(12) },
    ],
  };
}

const db = buildState();
let sessionUserId = localStorage.getItem(SESSION_KEY) || null;

// User-submitted places persist in the browser for the static demo (per-device).
function persistUserBars() {
  const seedIds = new Set(BARS.map((b) => b.id));
  localStorage.setItem(USER_BARS_KEY, JSON.stringify(db.bars.filter((b) => !seedIds.has(b.id))));
}
try {
  const saved = JSON.parse(localStorage.getItem(USER_BARS_KEY)) || [];
  for (const b of saved) if (!db.bars.some((x) => x.id === b.id)) db.bars.push(b);
} catch {
  // ignore malformed storage
}

// --- wait-time algorithm (mirrors server/utils/waittime.js) --------------
function computeWait(reports, now = Date.now()) {
  const weighted = [];
  for (const r of reports) {
    const ageMin = (now - new Date(r.createdAt).getTime()) / 60000;
    if (ageMin < 0 || ageMin > 90) continue;
    weighted.push({ waitMin: r.waitMin, weight: ageMin < 30 ? 2 : 1 });
  }
  const reportCount = weighted.length;
  if (reportCount === 0) return { waitMin: null, reportCount: 0, confidence: 'low' };
  weighted.sort((a, b) => a.waitMin - b.waitMin);
  const total = weighted.reduce((s, x) => s + x.weight, 0);
  const half = total / 2;
  let cum = 0;
  let waitMin = weighted[weighted.length - 1].waitMin;
  for (let i = 0; i < weighted.length; i++) {
    cum += weighted[i].weight;
    if (cum > half) { waitMin = weighted[i].waitMin; break; }
    if (cum === half) {
      const next = weighted[i + 1] ?? weighted[i];
      waitMin = Math.round((weighted[i].waitMin + next.waitMin) / 2);
      break;
    }
  }
  const confidence = reportCount >= 4 ? 'high' : reportCount >= 2 ? 'medium' : 'low';
  return { waitMin, reportCount, confidence };
}

const reportsForBar = (barId) => db.reports.filter((r) => r.barId === barId);

// Aggregate a bar's full history into a 7×24 { dow: { hour: { avgWait, n } } } map.
function forecastHistogram(barId) {
  const acc = {};
  for (const r of db.reports) {
    if (r.barId !== barId) continue;
    const { dow, hour } = nycParts(new Date(r.createdAt).getTime());
    const day = (acc[dow] ||= {});
    const cell = (day[hour] ||= { sum: 0, n: 0 });
    cell.sum += r.waitMin;
    cell.n += 1;
  }
  const hist = {};
  for (const [dow, day] of Object.entries(acc)) {
    hist[dow] = {};
    for (const [hour, c] of Object.entries(day)) hist[dow][hour] = { avgWait: c.sum / c.n, n: c.n };
  }
  return hist;
}

// Aggregate just the current NYC weekday/hour cell across all bars at once.
function forecastNowByBar(dow, hour) {
  const acc = {};
  for (const r of db.reports) {
    const p = nycParts(new Date(r.createdAt).getTime());
    if (p.dow !== dow || p.hour !== hour) continue;
    const cell = (acc[r.barId] ||= { sum: 0, n: 0 });
    cell.sum += r.waitMin;
    cell.n += 1;
  }
  const out = {};
  for (const [barId, c] of Object.entries(acc)) out[barId] = { avgWait: c.sum / c.n, n: c.n };
  return out;
}
const userById = (id) => db.users.find((u) => u.id === id);
const publicUser = (u) => ({ id: u.id, email: u.email, username: u.username, avatarInitial: u.avatarInitial, firstName: u.firstName || '', lastName: u.lastName || '', phone: u.phone || '', createdAt: u.createdAt || new Date(), isAdmin: true });

function acceptedFriendIds(userId) {
  return db.friendships
    .filter((f) => f.status === 'accepted' && (f.fromUserId === userId || f.toUserId === userId))
    .map((f) => (f.fromUserId === userId ? f.toUserId : f.fromUserId));
}

function recentCheckins(sinceMin = 90) {
  const cutoff = Date.now() - sinceMin * 60 * 1000;
  return db.notifications
    .filter((n) => new Date(n.createdAt).getTime() >= cutoff)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

// --- demo socket (tiny event emitter + live simulator) -------------------
class DemoSocket {
  constructor() {
    this.handlers = {};
    this.timer = null;
  }
  on(event, cb) {
    (this.handlers[event] ||= []).push(cb);
  }
  off(event, cb) {
    this.handlers[event] = (this.handlers[event] || []).filter((h) => h !== cb);
  }
  emit(event) {
    // join_map / leave_map etc. — no-op for the client→server direction.
    if (event === 'join_map') this.startSimulator();
  }
  _dispatch(event, payload) {
    (this.handlers[event] || []).forEach((h) => h(payload));
  }
  startSimulator() {
    if (this.timer) return;
    let tick = 0;
    this.timer = setInterval(() => {
      tick++;
      // Add a fresh report to a random bar and broadcast the new wait.
      const bar = db.bars[Math.floor(Math.random() * db.bars.length)];
      const reporter = db.users[Math.floor(Math.random() * db.users.length)];
      const waitMin = [0, 5, 10, 15, 20, 30, 40, 55][Math.floor(Math.random() * 8)];
      db.reports.push({ id: uid(), barId: bar.id, userId: reporter.id, waitMin, createdAt: new Date() });
      const w = computeWait(reportsForBar(bar.id));
      this._dispatch('wait_updated', { barId: bar.id, waitMin: w.waitMin, reportCount: w.reportCount, confidence: w.confidence });

      // Every ~3rd tick, a friend of the current user "checks in" (toast).
      if (tick % 3 === 0 && sessionUserId) {
        const friendIds = acceptedFriendIds(sessionUserId);
        if (friendIds.length) {
          const friend = userById(friendIds[Math.floor(Math.random() * friendIds.length)]);
          const cbar = db.bars[Math.floor(Math.random() * db.bars.length)];
          db.notifications.unshift({ id: uid(), userId: friend.id, barId: cbar.id, createdAt: new Date() });
          this._dispatch('friend_checkin', {
            userId: friend.id, username: friend.username, avatarInitial: friend.avatarInitial,
            barId: cbar.id, barName: cbar.name,
          });
        }
      }
    }, 9000);
  }
  disconnect() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.handlers = {};
  }
}

export const demoSocket = new DemoSocket();

// --- demo API (mirrors src/lib/api.js) -----------------------------------
export const demoApi = {
  async signup({ email, username, password, firstName, lastName, phone }) {
    if (!email || !username || !password) throw apiError('email, username and password are required');
    if (password.length < 6) throw apiError('Password must be at least 6 characters');
    const e = email.toLowerCase();
    if (db.users.some((u) => u.email === e)) throw apiError('That email is already taken', 409);
    if (db.users.some((u) => u.username === username)) throw apiError('That username is already taken', 409);
    const user = {
      id: uid(), email: e, username, password, avatarInitial: username[0].toUpperCase(),
      firstName: (firstName || '').trim(), lastName: (lastName || '').trim(), phone: (phone || '').trim(),
      createdAt: new Date(),
    };
    db.users.push(user);
    sessionUserId = user.id;
    localStorage.setItem(SESSION_KEY, user.id);
    return { user: publicUser(user) };
  },
  async login({ email, password }) {
    const u = db.users.find((x) => x.email === (email || '').toLowerCase());
    if (!u || u.password !== password) throw apiError('Invalid email or password', 401);
    sessionUserId = u.id;
    localStorage.setItem(SESSION_KEY, u.id);
    return { user: publicUser(u) };
  },
  async logout() {
    sessionUserId = null;
    localStorage.removeItem(SESSION_KEY);
    demoSocket.disconnect();
    return { ok: true };
  },
  // Auth emails can't be sent from a static demo — acknowledge politely.
  async requestPasswordReset() {
    return { ok: true };
  },
  async updatePassword(password) {
    if (!password || password.length < 6) throw apiError('Password must be at least 6 characters');
    return { ok: true };
  },
  async saveDeviceToken() {
    return { ok: true };
  },
  async deleteAccount() {
    sessionUserId = null;
    localStorage.removeItem(SESSION_KEY);
    demoSocket.disconnect();
    return { ok: true };
  },
  async me() {
    const u = sessionUserId && userById(sessionUserId);
    if (!u) throw apiError('Not authenticated', 401);
    return { user: publicUser(u) };
  },
  async bars() {
    const checkins = recentCheckins();
    const byBar = new Map();
    for (const c of checkins) {
      const u = userById(c.userId);
      if (!byBar.has(c.barId)) byBar.set(c.barId, []);
      byBar.get(c.barId).push({ userId: u.id, username: u.username, avatarInitial: u.avatarInitial, at: c.createdAt });
    }
    // Only approved places appear on the map (suggestions stay pending).
    const { dow, hour } = nycParts();
    const forecastNow = forecastNowByBar(dow, hour);
    const bars = db.bars
      .filter((b) => b.approved)
      .map((b) => ({
        ...b,
        ...computeWait(reportsForBar(b.id)),
        forecastNow: forecastNow[b.id] || { avgWait: 0, n: 0 },
        checkins: byBar.get(b.id) || [],
      }));
    return { bars };
  },

  async forecast(id) {
    return { histogram: forecastHistogram(id) };
  },
  async bar(id) {
    const b = db.bars.find((x) => x.id === id);
    if (!b) throw apiError('Bar not found', 404);
    const reports = reportsForBar(id)
      .sort((a, b2) => new Date(b2.createdAt) - new Date(a.createdAt))
      .slice(0, 20)
      .map((r) => { const u = userById(r.userId); return { id: r.id, waitMin: r.waitMin, createdAt: r.createdAt, username: u.username, avatarInitial: u.avatarInitial }; });
    return { bar: { ...b, ...computeWait(reportsForBar(id)), reports } };
  },
  async waittime(id) {
    return computeWait(reportsForBar(id));
  },
  async createBar({ name, address, venueType = 'bar' }) {
    if (!sessionUserId) throw apiError('Not authenticated', 401);
    name = (name || '').trim();
    address = (address || '').trim();
    if (!name || !address) throw apiError('name and address are required');
    let geo;
    try {
      geo = await geocodePlace(`${name}, ${address}`);
    } catch (e) {
      throw apiError(e.message || 'Address lookup failed');
    }
    if (!geo) throw apiError("We couldn't find that place — check the name and address.", 422);
    if (db.bars.some((b) => b.name.toLowerCase() === name.toLowerCase() && b.address.toLowerCase() === address.toLowerCase())) {
      throw apiError('That place is already on the map.', 409);
    }
    const bar = {
      id: 'bar_' + uid(),
      name,
      address,
      latitude: geo.latitude,
      longitude: geo.longitude,
      rating: 0,
      distance: milesFromCenter(geo.latitude, geo.longitude),
      verified: false, // the static demo can't run the server-side Google check
      approved: false, // suggestions stay pending until an admin approves
      venueType: venueType === 'froyo' ? 'froyo' : 'bar',
    };
    db.bars.push(bar);
    persistUserBars();
    const payload = { ...bar, waitMin: null, reportCount: 0, confidence: 'low', checkins: [] };
    demoSocket._dispatch('bar_added', payload);
    return { bar: payload };
  },
  async report({ barId, waitMin }) {
    if (!sessionUserId) throw apiError('Not authenticated', 401);
    const b = db.bars.find((x) => x.id === barId);
    if (!b) throw apiError('Bar not found', 404);
    const report = { id: uid(), barId, userId: sessionUserId, waitMin: Math.round(Number(waitMin)), createdAt: new Date() };
    db.reports.push(report);
    const wait = computeWait(reportsForBar(barId));
    demoSocket._dispatch('wait_updated', { barId, waitMin: wait.waitMin, reportCount: wait.reportCount, confidence: wait.confidence });
    return { report: { id: report.id, barId, waitMin: report.waitMin }, wait };
  },
  async friends() {
    if (!sessionUserId) throw apiError('Not authenticated', 401);
    const ids = acceptedFriendIds(sessionUserId);
    const friends = ids.map((id) => {
      const u = userById(id);
      const last = recentCheckins(24 * 60).find((n) => n.userId === id);
      const bar = last ? db.bars.find((b) => b.id === last.barId) : null;
      return {
        id: u.id, username: u.username, avatarInitial: u.avatarInitial,
        lastBar: bar ? { id: bar.id, name: bar.name, latitude: bar.latitude, longitude: bar.longitude } : null,
        lastCheckinAt: last ? last.createdAt : null,
      };
    });
    return { friends };
  },
  async pending() {
    if (!sessionUserId) throw apiError('Not authenticated', 401);
    const pending = db.friendships
      .filter((f) => f.toUserId === sessionUserId && f.status === 'pending')
      .map((f) => { const u = userById(f.fromUserId); return { id: f.id, createdAt: f.createdAt || new Date(), from: { id: u.id, username: u.username, avatarInitial: u.avatarInitial } }; });
    return { pending };
  },
  async requestFriend(toUserId) {
    if (!sessionUserId) throw apiError('Not authenticated', 401);
    if (toUserId === sessionUserId) throw apiError("You can't friend yourself");
    const exists = db.friendships.some(
      (f) => (f.fromUserId === sessionUserId && f.toUserId === toUserId) || (f.fromUserId === toUserId && f.toUserId === sessionUserId)
    );
    if (exists) throw apiError('A friend request already exists', 409);
    const friendship = { id: uid(), fromUserId: sessionUserId, toUserId, status: 'pending', createdAt: new Date() };
    db.friendships.push(friendship);
    return { friendship };
  },
  async acceptFriend(id) {
    const f = db.friendships.find((x) => x.id === id);
    if (!f) throw apiError('Request not found', 404);
    if (f.toUserId !== sessionUserId) throw apiError('Only the recipient can accept this request', 403);
    f.status = 'accepted';
    return { friendship: f };
  },
  async notifyFriends(barId) {
    if (!sessionUserId) throw apiError('Not authenticated', 401);
    const bar = db.bars.find((b) => b.id === barId);
    if (!bar) throw apiError('Bar not found', 404);
    db.notifications.unshift({ id: uid(), userId: sessionUserId, barId, createdAt: new Date() });
    const ids = acceptedFriendIds(sessionUserId);
    return { ok: true, notified: ids.length };
  },
  async searchUsers(q) {
    if (!sessionUserId) throw apiError('Not authenticated', 401);
    const term = (q || '').toLowerCase().trim();
    if (!term) return { users: [] };
    const digits = term.replace(/\D/g, '');
    const byPhone = digits.length >= 10;
    const matches = db.users
      .filter((u) => {
        if (u.id === sessionUserId) return false;
        if (byPhone) {
          const uDigits = (u.phone || '').replace(/\D/g, '');
          return uDigits.length >= 10 && uDigits.slice(-10) === digits.slice(-10);
        }
        return u.username.toLowerCase().includes(term);
      })
      .slice(0, 10);
    const statusFor = (otherId) => {
      const f = db.friendships.find(
        (x) => (x.fromUserId === sessionUserId && x.toUserId === otherId) || (x.fromUserId === otherId && x.toUserId === sessionUserId)
      );
      if (!f) return 'none';
      if (f.status === 'accepted') return 'friends';
      return f.fromUserId === sessionUserId ? 'requested' : 'incoming';
    };
    return { users: matches.map((u) => ({ id: u.id, username: u.username, avatarInitial: u.avatarInitial, friendStatus: statusFor(u.id) })) };
  },
  async matchContacts(phones) {
    if (!sessionUserId) throw apiError('Not authenticated', 401);
    const wanted = (phones || [])
      .map((p) => (p || '').replace(/\D/g, ''))
      .filter((d) => d.length >= 10)
      .map((d) => d.slice(-10));
    const set = new Set(wanted);
    const statusFor = (otherId) => {
      const f = db.friendships.find(
        (x) => (x.fromUserId === sessionUserId && x.toUserId === otherId) || (x.fromUserId === otherId && x.toUserId === sessionUserId)
      );
      if (!f) return 'none';
      if (f.status === 'accepted') return 'friends';
      return f.fromUserId === sessionUserId ? 'requested' : 'incoming';
    };
    const matches = db.users.filter((u) => {
      if (u.id === sessionUserId) return false;
      const d = (u.phone || '').replace(/\D/g, '');
      return d.length >= 10 && set.has(d.slice(-10));
    });
    return { users: matches.map((u) => ({ id: u.id, username: u.username, avatarInitial: u.avatarInitial, friendStatus: statusFor(u.id) })) };
  },
  async myStats() {
    if (!sessionUserId) throw apiError('Not authenticated', 401);
    const checkIns = db.reports.filter((r) => r.userId === sessionUserId).length;
    return { checkIns, friends: acceptedFriendIds(sessionUserId).length };
  },
  async pendingBars() {
    return {
      pending: db.bars
        .filter((b) => !b.approved)
        .map((b) => ({ id: b.id, name: b.name, address: b.address, venueType: b.venueType || 'bar', hours: b.hours || null, imageUrl: b.imageUrl || null, createdAt: b.createdAt || new Date(), submittedBy: null })),
    };
  },
  async approveBar(id) {
    const b = db.bars.find((x) => x.id === id);
    if (b) b.approved = true;
    persistUserBars();
    return { ok: true };
  },
  async setVenueHours(id, hours) {
    const b = db.bars.find((x) => x.id === id);
    if (b) b.hours = hours;
    persistUserBars();
    return { ok: true };
  },
  async uploadVenuePhoto(id, file) {
    const b = db.bars.find((x) => x.id === id);
    const imageUrl = URL.createObjectURL(file); // session-only object URL in the demo
    if (b) b.imageUrl = imageUrl;
    return { imageUrl };
  },
  async setVenueImageUrl(id, imageUrl) {
    const b = db.bars.find((x) => x.id === id);
    if (b) b.imageUrl = imageUrl || null;
    persistUserBars();
    return { imageUrl: imageUrl || null };
  },
  async enrichVenues() {
    throw apiError('Auto-fill from Foursquare runs on the live app (needs the Foursquare key).');
  },
  async rejectBar(id) {
    const i = db.bars.findIndex((x) => x.id === id);
    if (i >= 0) db.bars.splice(i, 1);
    persistUserBars();
    return { ok: true };
  },
};
