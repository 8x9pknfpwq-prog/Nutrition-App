// Supabase implementation of the app's data API (mirrors src/lib/api.js).
// Reads/writes go directly to Postgres through supabase-js (protected by RLS);
// auth uses Supabase Auth; place submissions go through the submit-place Edge
// Function (Google verification). Column names are snake_case in the DB and
// mapped to the camelCase shapes the components expect.
import { supabase } from './supabase.js';
import { computeWait } from './waittime.js';
import { geocodePlace } from './geocode.js';
import { nycParts } from './busyness.js';

function apiErr(message, status = 400) {
  const e = new Error(message);
  e.status = status;
  return e;
}

const since90 = () => new Date(Date.now() - 90 * 60 * 1000).toISOString();

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

async function myId() {
  const { data } = await supabase.auth.getSession();
  return data.session?.user?.id ?? null;
}

function mapBar(b, extra = {}) {
  return {
    id: b.id,
    name: b.name,
    address: b.address,
    latitude: b.latitude,
    longitude: b.longitude,
    rating: b.rating,
    distance: b.distance,
    verified: b.verified,
    venueType: b.venue_type ?? 'bar',
    hours: b.hours ?? null,
    imageUrl: b.image_url ?? null,
    approved: b.approved ?? true,
    googlePlaceId: b.google_place_id ?? null,
    waitMin: extra.waitMin ?? null,
    reportCount: extra.reportCount ?? 0,
    confidence: extra.confidence ?? 'low',
    forecastNow: extra.forecastNow ?? { avgWait: 0, n: 0 },
    checkins: extra.checkins ?? [],
  };
}

// Combine the auth session with the public profile into the app's user shape.
export async function getSupabaseUser() {
  const { data } = await supabase.auth.getSession();
  const s = data.session;
  if (!s) return null;
  const { data: prof } = await supabase
    .from('profiles')
    .select('username, avatar_initial, is_admin, first_name, last_name, phone')
    .eq('id', s.user.id)
    .single();
  const email = s.user.email || '';
  return {
    id: s.user.id,
    email,
    username: prof?.username || email.split('@')[0],
    avatarInitial: prof?.avatar_initial || (email[0] || '?').toUpperCase(),
    firstName: prof?.first_name || '',
    lastName: prof?.last_name || '',
    phone: prof?.phone || '',
    isAdmin: prof?.is_admin === true,
  };
}

export const supabaseApi = {
  // ── auth ──────────────────────────────────────────────────────────────────
  async signup({ email, username, password, firstName, lastName, phone }) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
          first_name: (firstName || '').trim(),
          last_name: (lastName || '').trim(),
          phone: (phone || '').trim(),
        },
      },
    });
    if (error) throw new Error(error.message);
    if (!data.session) throw apiErr('Account created — check your email to confirm, then log in.', 400);
    return { user: await getSupabaseUser() };
  },
  async login({ email, password }) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw apiErr('Invalid email or password', 401);
    return { user: await getSupabaseUser() };
  },
  async logout() {
    await supabase.auth.signOut();
    return { ok: true };
  },
  // Email a password-reset link. The link returns to the app with a recovery
  // session in the URL; supabase-js fires PASSWORD_RECOVERY (handled in
  // AuthContext) and the app shows the "set a new password" screen.
  async requestPasswordReset(email, redirectTo) {
    const { error } = await supabase.auth.resetPasswordForEmail((email || '').trim(), { redirectTo });
    // Don't reveal whether an account exists — always report success.
    if (error && error.status && error.status >= 500) throw new Error(error.message);
    return { ok: true };
  },
  async updatePassword(password) {
    if (!password || password.length < 6) throw apiErr('Password must be at least 6 characters');
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw new Error(error.message);
    return { ok: true };
  },

  // Store this device's APNs/FCM token so the send-push function can reach it.
  async saveDeviceToken(token, devicePlatform) {
    const id = await myId();
    if (!id || !token) return { ok: false };
    const { error } = await supabase
      .from('device_tokens')
      .upsert({ user_id: id, token, platform: devicePlatform }, { onConflict: 'token' });
    if (error) throw new Error(error.message);
    return { ok: true };
  },

  // Permanently delete the signed-in user's account + data, then sign out.
  // Runs through the delete-account Edge Function (needs the service role to
  // remove the auth user; deleting it cascades to profile, reports, etc.).
  async deleteAccount() {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) throw apiErr('Not authenticated', 401);
    const { error } = await supabase.functions.invoke('delete-account');
    if (error) throw new Error(error.message || 'Could not delete account');
    await supabase.auth.signOut();
    return { ok: true };
  },
  async me() {
    const user = await getSupabaseUser();
    if (!user) throw apiErr('Not authenticated', 401);
    return { user };
  },

  // ── bars ──────────────────────────────────────────────────────────────────
  async bars() {
    const since = since90();
    const { dow, hour } = nycParts();
    const [barsRes, repRes, noteRes, fcRes] = await Promise.all([
      supabase.from('bars').select('*'),
      supabase.from('reports').select('bar_id, wait_min, created_at').gte('created_at', since),
      supabase
        .from('friend_notifications')
        .select('user_id, bar_id, created_at, profiles:user_id(username, avatar_initial)')
        .gte('created_at', since)
        .order('created_at', { ascending: false }),
      // Forecast for the current weekday/hour. Tolerate the view not existing yet
      // (migration 0006 not run) — bars just fall back to the generic prior.
      supabase.from('bar_forecast').select('bar_id, avg_wait, n').eq('dow', dow).eq('hour', hour),
    ]);
    if (barsRes.error) throw new Error(barsRes.error.message);

    const reportsByBar = {};
    for (const r of repRes.data || []) {
      (reportsByBar[r.bar_id] ||= []).push({ waitMin: r.wait_min, createdAt: r.created_at });
    }
    const checkinsByBar = {};
    for (const n of noteRes.data || []) {
      (checkinsByBar[n.bar_id] ||= []).push({
        userId: n.user_id,
        username: n.profiles?.username,
        avatarInitial: n.profiles?.avatar_initial,
        at: n.created_at,
      });
    }
    const forecastByBar = {};
    for (const f of fcRes.data || []) {
      forecastByBar[f.bar_id] = { avgWait: Number(f.avg_wait), n: f.n };
    }
    return {
      bars: (barsRes.data || []).map((b) =>
        mapBar(b, {
          ...computeWait(reportsByBar[b.id] || []),
          forecastNow: forecastByBar[b.id] || { avgWait: 0, n: 0 },
          checkins: checkinsByBar[b.id] || [],
        })
      ),
    };
  },

  // Full 7×24 forecast histogram for one bar (for the "best time to go" strip).
  async forecast(id) {
    const { data, error } = await supabase
      .from('bar_forecast')
      .select('dow, hour, avg_wait, n')
      .eq('bar_id', id);
    if (error) return { histogram: {} }; // view may not exist yet — prior covers it
    const histogram = {};
    for (const r of data || []) {
      (histogram[r.dow] ||= {})[r.hour] = { avgWait: Number(r.avg_wait), n: r.n };
    }
    return { histogram };
  },

  async bar(id) {
    const { data: b, error } = await supabase.from('bars').select('*').eq('id', id).single();
    if (error) throw new Error(error.message);
    const { data: reps } = await supabase
      .from('reports')
      .select('id, wait_min, created_at, profiles:user_id(username, avatar_initial)')
      .eq('bar_id', id)
      .order('created_at', { ascending: false })
      .limit(20);
    const reports = (reps || []).map((r) => ({
      id: r.id,
      waitMin: r.wait_min,
      createdAt: r.created_at,
      username: r.profiles?.username,
      avatarInitial: r.profiles?.avatar_initial,
    }));
    const w = computeWait(reports.map((r) => ({ waitMin: r.waitMin, createdAt: r.createdAt })));
    return { bar: { ...mapBar(b, w), reports } };
  },

  async waittime(id) {
    const { data } = await supabase
      .from('reports')
      .select('wait_min, created_at')
      .eq('bar_id', id)
      .gte('created_at', since90());
    return computeWait((data || []).map((r) => ({ waitMin: r.wait_min, createdAt: r.created_at })));
  },

  // Submit a PENDING suggestion. Geocoded via Mapbox for a map pin; an admin
  // approves it before it goes live. (No Google verification — admin verifies.)
  async createBar({ name, address, venueType = 'bar' }) {
    const id = await myId();
    if (!id) throw apiErr('Not authenticated', 401);
    name = (name || '').trim();
    address = (address || '').trim();
    if (!name || !address) throw apiErr('name and address are required');

    let geo;
    try {
      geo = await geocodePlace(`${name}, ${address}`);
    } catch (e) {
      throw apiErr(e.message || 'Address lookup failed');
    }
    if (!geo) throw apiErr("We couldn't find that address — double-check it.", 422);

    const row = {
      name,
      address,
      latitude: geo.latitude,
      longitude: geo.longitude,
      rating: 0,
      distance: milesFromCenter(geo.latitude, geo.longitude),
      verified: false,
      approved: false,
      venue_type: venueType === 'froyo' ? 'froyo' : 'bar',
      submitted_by: id,
    };
    // Don't .select() back — RLS hides unapproved rows, so reading it returns
    // nothing. Insert, then return a local object for the confirmation toast.
    const { error } = await supabase.from('bars').insert(row);
    if (error) {
      if (error.code === '23505') throw apiErr('That place is already on the map or pending review.', 409);
      throw new Error(error.message);
    }
    return { bar: mapBar({ id: 'pending', ...row }) };
  },

  // ── reports ───────────────────────────────────────────────────────────────
  async report({ barId, waitMin }) {
    const id = await myId();
    if (!id) throw apiErr('Not authenticated', 401);
    const { error } = await supabase.from('reports').insert({ bar_id: barId, user_id: id, wait_min: Math.round(Number(waitMin)) });
    if (error) throw new Error(error.message);
    return { ok: true };
  },

  // ── friends ───────────────────────────────────────────────────────────────
  async friends() {
    const id = await myId();
    if (!id) return { friends: [] };
    const { data: fs } = await supabase
      .from('friendships')
      .select('from_user, to_user')
      .eq('status', 'accepted')
      .or(`from_user.eq.${id},to_user.eq.${id}`);
    const ids = (fs || []).map((f) => (f.from_user === id ? f.to_user : f.from_user));
    if (!ids.length) return { friends: [] };
    const [{ data: profs }, { data: notes }] = await Promise.all([
      supabase.from('profiles').select('id, username, avatar_initial').in('id', ids),
      supabase
        .from('friend_notifications')
        .select('user_id, created_at, bars:bar_id(id, name, latitude, longitude)')
        .in('user_id', ids)
        .order('created_at', { ascending: false }),
    ]);
    const last = {};
    for (const n of notes || []) if (!last[n.user_id]) last[n.user_id] = n;
    return {
      friends: (profs || []).map((u) => {
        const n = last[u.id];
        return {
          id: u.id,
          username: u.username,
          avatarInitial: u.avatar_initial,
          lastBar: n?.bars ? { id: n.bars.id, name: n.bars.name, latitude: n.bars.latitude, longitude: n.bars.longitude } : null,
          lastCheckinAt: n ? n.created_at : null,
        };
      }),
    };
  },

  async pending() {
    const id = await myId();
    if (!id) return { pending: [] };
    const { data } = await supabase
      .from('friendships')
      .select('id, created_at, from:from_user(id, username, avatar_initial)')
      .eq('to_user', id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    return {
      pending: (data || []).map((p) => ({
        id: p.id,
        createdAt: p.created_at,
        from: { id: p.from?.id, username: p.from?.username, avatarInitial: p.from?.avatar_initial },
      })),
    };
  },

  async requestFriend(toUserId) {
    const id = await myId();
    if (!id) throw apiErr('Not authenticated', 401);
    if (toUserId === id) throw apiErr("You can't friend yourself");
    const { error } = await supabase.from('friendships').insert({ from_user: id, to_user: toUserId, status: 'pending' });
    if (error) {
      if (error.code === '23505') throw apiErr('A friend request already exists', 409);
      throw new Error(error.message);
    }
    return { ok: true };
  },

  async acceptFriend(friendshipId) {
    const { error } = await supabase.from('friendships').update({ status: 'accepted' }).eq('id', friendshipId);
    if (error) throw new Error(error.message);
    return { ok: true };
  },

  async notifyFriends(barId) {
    const id = await myId();
    if (!id) throw apiErr('Not authenticated', 401);
    const { error } = await supabase.from('friend_notifications').insert({ user_id: id, bar_id: barId });
    if (error) throw new Error(error.message);
    return { ok: true };
  },

  // ── users ─────────────────────────────────────────────────────────────────
  async searchUsers(q) {
    const id = await myId();
    const term = (q || '').trim();
    if (!term || !id) return { users: [] };
    const { data: users } = await supabase
      .from('profiles')
      .select('id, username, avatar_initial')
      .ilike('username', `%${term}%`)
      .neq('id', id)
      .limit(10);
    const { data: fs } = await supabase
      .from('friendships')
      .select('from_user, to_user, status')
      .or(`from_user.eq.${id},to_user.eq.${id}`);
    const statusFor = (other) => {
      const f = (fs || []).find(
        (x) => (x.from_user === id && x.to_user === other) || (x.to_user === id && x.from_user === other)
      );
      if (!f) return 'none';
      if (f.status === 'accepted') return 'friends';
      return f.from_user === id ? 'requested' : 'incoming';
    };
    return {
      users: (users || []).map((u) => ({
        id: u.id,
        username: u.username,
        avatarInitial: u.avatar_initial,
        friendStatus: statusFor(u.id),
      })),
    };
  },

  async myStats() {
    const id = await myId();
    if (!id) return { checkIns: 0, friends: 0 };
    const [{ count }, { data: fs }] = await Promise.all([
      supabase.from('reports').select('*', { count: 'exact', head: true }).eq('user_id', id),
      supabase.from('friendships').select('id').eq('status', 'accepted').or(`from_user.eq.${id},to_user.eq.${id}`),
    ]);
    return { checkIns: count || 0, friends: (fs || []).length };
  },

  // ── admin ─────────────────────────────────────────────────────────────────
  async pendingBars() {
    const { data, error } = await supabase
      .from('bars')
      .select('id, name, address, latitude, longitude, venue_type, hours, image_url, created_at, profiles:submitted_by(username)')
      .eq('approved', false)
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return {
      pending: (data || []).map((b) => ({
        id: b.id,
        name: b.name,
        address: b.address,
        venueType: b.venue_type ?? 'bar',
        hours: b.hours ?? null,
        imageUrl: b.image_url ?? null,
        createdAt: b.created_at,
        submittedBy: b.profiles?.username || null,
      })),
    };
  },
  async approveBar(id) {
    const { error } = await supabase.from('bars').update({ approved: true, verified: true }).eq('id', id);
    if (error) throw new Error(error.message);
    return { ok: true };
  },
  // Admin: set a venue's per-day opening hours (null = use type defaults).
  async setVenueHours(id, hours) {
    const { error } = await supabase.from('bars').update({ hours }).eq('id', id);
    if (error) throw new Error(error.message);
    return { ok: true };
  },
  // Admin: upload a photo to Storage and point the venue at it.
  async uploadVenuePhoto(id, file) {
    const ext = (file.name?.split('.').pop() || 'jpg').toLowerCase();
    const path = `${id}/${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from('venue-photos')
      .upload(path, file, { upsert: true, contentType: file.type || 'image/jpeg' });
    if (upErr) throw new Error(upErr.message);
    const { data } = supabase.storage.from('venue-photos').getPublicUrl(path);
    const imageUrl = data.publicUrl;
    const { error } = await supabase.from('bars').update({ image_url: imageUrl }).eq('id', id);
    if (error) throw new Error(error.message);
    return { imageUrl };
  },
  // Admin: point a venue at an already-hosted image URL.
  async setVenueImageUrl(id, imageUrl) {
    const { error } = await supabase.from('bars').update({ image_url: imageUrl || null }).eq('id', id);
    if (error) throw new Error(error.message);
    return { imageUrl: imageUrl || null };
  },
  // Admin: auto-fill photos + hours from Foursquare (via the enrich-venues
  // Edge Function). Pass {force:true} to overwrite existing values.
  async enrichVenues(opts = {}) {
    const { data, error } = await supabase.functions.invoke('enrich-venues', { body: opts });
    if (error) throw new Error(error.message || 'Enrichment failed');
    if (data?.error) throw new Error(data.error);
    return data; // { updated, results }
  },
  async rejectBar(id) {
    const { error } = await supabase.from('bars').delete().eq('id', id);
    if (error) throw new Error(error.message);
    return { ok: true };
  },
};
