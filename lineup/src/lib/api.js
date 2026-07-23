// Tiny fetch wrapper. All requests send cookies (httpOnly JWT) and parse JSON.
import { DEMO, demoApi } from './demo.js';
import { SUPABASE_READY } from './supabase.js';
import { supabaseApi } from './supabaseApi.js';

async function request(path, { method = 'GET', body } = {}) {
  const res = await fetch(`/api${path}`, {
    method,
    credentials: 'include',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });

  let data = null;
  try {
    data = await res.json();
  } catch {
    // no JSON body
  }

  if (!res.ok) {
    const err = new Error(data?.error || `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data;
}

// In demo builds (VITE_DEMO=true) the entire API is served in-browser.
const realApi = {
  // auth
  signup: (body) => request('/auth/signup', { method: 'POST', body }),
  login: (body) => request('/auth/login', { method: 'POST', body }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  me: () => request('/auth/me'),
  requestPasswordReset: (email) => request('/auth/reset', { method: 'POST', body: { email } }),
  updatePassword: (password) => request('/auth/password', { method: 'POST', body: { password } }),
  saveDeviceToken: (token, platform) => request('/devices', { method: 'POST', body: { token, platform } }),
  deleteAccount: () => request('/auth/account', { method: 'DELETE' }),

  // bars
  bars: () => request('/bars'),
  bar: (id) => request(`/bars/${id}`),
  waittime: (id) => request(`/bars/${id}/waittime`),
  forecast: (id) => request(`/bars/${id}/forecast`),
  setVenueHours: (id, hours) => request(`/bars/${id}/hours`, { method: 'PUT', body: { hours } }),
  setVenueImageUrl: (id, imageUrl) => request(`/bars/${id}/image`, { method: 'PUT', body: { imageUrl } }),
  enrichVenues: (opts) => request('/admin/enrich', { method: 'POST', body: opts || {} }),
  async uploadVenuePhoto(id, file) {
    const form = new FormData();
    form.append('photo', file);
    const res = await fetch(`/api/bars/${id}/photo`, { method: 'POST', credentials: 'include', body: form });
    if (!res.ok) throw new Error('Upload failed');
    return res.json();
  },
  createBar: (body) => request('/bars', { method: 'POST', body }),

  // reports
  report: (body) => request('/reports', { method: 'POST', body }),

  // friends
  friends: () => request('/friends'),
  pending: () => request('/friends/pending'),
  requestFriend: (toUserId) => request('/friends/request', { method: 'POST', body: { toUserId } }),
  acceptFriend: (id) => request(`/friends/accept/${id}`, { method: 'POST' }),
  notifyFriends: (barId) => request('/friends/notify', { method: 'POST', body: { barId } }),

  // users
  searchUsers: (q) => request(`/users/search?q=${encodeURIComponent(q)}`),
  matchContacts: (phones) => request('/users/match-contacts', { method: 'POST', body: { phones } }),
  myStats: () => request('/users/me/stats'),
};

// Supabase (real shared backend) wins when configured; else demo; else server.
export const api = SUPABASE_READY ? supabaseApi : DEMO ? demoApi : realApi;
