// Lightweight client-side gating for engagement prompts, so they nudge without
// nagging. Session-scoped flags use sessionStorage; once/day and lifetime flags
// use localStorage. Every access is wrapped so a storage failure (private mode,
// blocked cookies) never breaks the app.
const sget = (k) => { try { return sessionStorage.getItem(k); } catch { return null; } };
const sset = (k, v) => { try { sessionStorage.setItem(k, v); } catch { /* ignore */ } };
const lget = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const lset = (k, v) => { try { localStorage.setItem(k, v); } catch { /* ignore */ } };

const todayStr = () => new Date().toISOString().slice(0, 10);

// App opens — counts page loads / sessions (used for the "2nd open" invite nudge).
export function bumpAppOpens() {
  const n = (parseInt(lget('nyc_open_count') || '0', 10) || 0) + 1;
  lset('nyc_open_count', String(n));
  return n;
}

// Whether the user has ever completed a report.
export function hasReported() { return lget('nyc_has_reported') === '1'; }
export function markReported() { lset('nyc_has_reported', '1'); }

// Nearby check-in prompt — at most once per session.
export function nearbyShownThisSession() { return sget('nyc_nearby_shown') === '1'; }
export function markNearbyShown() { sset('nyc_nearby_shown', '1'); }

// Invite prompt — at most once per day.
export function inviteShownToday() { return lget('nyc_invite_shown_on') === todayStr(); }
export function markInviteShown() { lset('nyc_invite_shown_on', todayStr()); }
