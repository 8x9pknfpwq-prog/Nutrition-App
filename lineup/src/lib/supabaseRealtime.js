// Supabase Realtime adapter that mimics the small socket interface the app uses
// (on/off/emit), so MapDashboard and the friend-checkin toast work unchanged.
// Subscribes to Postgres row changes (RLS-filtered) and re-emits:
//   - 'wait_updated'   when a new report lands (recomputes that bar's wait)
//   - 'friend_checkin' when a friend checks in (skips your own)
import { supabase } from './supabase.js';
import { computeWait } from './waittime.js';

class SupabaseRealtime {
  constructor() {
    this.handlers = {};
    this.channel = null;
    this.userId = null;
    this.started = false;
  }

  on(event, cb) {
    (this.handlers[event] ||= []).push(cb);
  }
  off(event, cb) {
    this.handlers[event] = (this.handlers[event] || []).filter((h) => h !== cb);
  }
  _emit(event, payload) {
    (this.handlers[event] || []).forEach((h) => h(payload));
  }

  // The map calls emit('join_map') once mounted — that's our cue to subscribe.
  async emit(event) {
    if (event === 'join_map') await this._start();
  }

  async _start() {
    if (this.started) return;
    this.started = true;

    const { data } = await supabase.auth.getSession();
    this.userId = data.session?.user?.id ?? null;
    if (data.session?.access_token) {
      try {
        supabase.realtime.setAuth(data.session.access_token);
      } catch {
        // older clients set this automatically
      }
    }

    this.channel = supabase
      .channel('nyc-lines-map')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'reports' }, async (payload) => {
        const barId = payload.new.bar_id;
        const since = new Date(Date.now() - 90 * 60 * 1000).toISOString();
        const { data: rows } = await supabase
          .from('reports')
          .select('wait_min, created_at')
          .eq('bar_id', barId)
          .gte('created_at', since);
        const w = computeWait((rows || []).map((r) => ({ waitMin: r.wait_min, createdAt: r.created_at })));
        this._emit('wait_updated', { barId, waitMin: w.waitMin, reportCount: w.reportCount, confidence: w.confidence });
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'friend_notifications' }, async (payload) => {
        const n = payload.new;
        if (n.user_id === this.userId) return; // don't toast your own check-in
        const [{ data: prof }, { data: bar }] = await Promise.all([
          supabase.from('profiles').select('username, avatar_initial').eq('id', n.user_id).single(),
          supabase.from('bars').select('name').eq('id', n.bar_id).single(),
        ]);
        if (!prof || !bar) return;
        this._emit('friend_checkin', {
          userId: n.user_id,
          username: prof.username,
          avatarInitial: prof.avatar_initial,
          barId: n.bar_id,
          barName: bar.name,
        });
      })
      .subscribe();
  }

  disconnect() {
    if (this.channel) {
      supabase.removeChannel(this.channel);
      this.channel = null;
    }
    this.handlers = {};
    this.started = false;
  }
}

export const supabaseRealtime = new SupabaseRealtime();
