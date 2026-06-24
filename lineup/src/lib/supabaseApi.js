// Supabase implementation of the app's data API (mirrors src/lib/api.js).
// Reads/writes go directly to Postgres through supabase-js (protected by RLS);
// auth uses Supabase Auth; place submissions go through the submit-place Edge
// Function (Google verification). Column names are snake_case in the DB and
// mapped to the camelCase shapes the components expect.
import { supabase } from './supabase.js';
import { computeWait } from './waittime.js';

function apiErr(message, status = 400) {
  const e = new Error(message);
  e.status = status;
  return e;
}

const since90 = () => new Date(Date.now() - 90 * 60 * 1000).toISOString();

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
    googlePlaceId: b.google_place_id ?? null,
    waitMin: extra.waitMin ?? null,
    reportCount: extra.reportCount ?? 0,
    confidence: extra.confidence ?? 'low',
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
    .select('username, avatar_initial')
    .eq('id', s.user.id)
    .single();
  const email = s.user.email || '';
  return {
    id: s.user.id,
    email,
    username: prof?.username || email.split('@')[0],
    avatarInitial: prof?.avatar_initial || (email[0] || '?').toUpperCase(),
  };
}

export const supabaseApi = {
  // ── auth ──────────────────────────────────────────────────────────────────
  async signup({ email, username, password }) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username } },
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
  async me() {
    const user = await getSupabaseUser();
    if (!user) throw apiErr('Not authenticated', 401);
    return { user };
  },

  // ── bars ──────────────────────────────────────────────────────────────────
  async bars() {
    const since = since90();
    const [barsRes, repRes, noteRes] = await Promise.all([
      supabase.from('bars').select('*'),
      supabase.from('reports').select('bar_id, wait_min, created_at').gte('created_at', since),
      supabase
        .from('friend_notifications')
        .select('user_id, bar_id, created_at, profiles:user_id(username, avatar_initial)')
        .gte('created_at', since)
        .order('created_at', { ascending: false }),
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
    return {
      bars: (barsRes.data || []).map((b) =>
        mapBar(b, { ...computeWait(reportsByBar[b.id] || []), checkins: checkinsByBar[b.id] || [] })
      ),
    };
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

  async createBar({ name, address }) {
    const { data, error } = await supabase.functions.invoke('submit-place', { body: { name, address } });
    if (error) {
      let msg = error.message || 'Could not add this place';
      try {
        if (error.context && typeof error.context.json === 'function') {
          const j = await error.context.json();
          if (j?.error) msg = j.error;
        }
      } catch {
        // keep default message
      }
      throw new Error(msg);
    }
    return { bar: mapBar(data.bar) };
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
};
