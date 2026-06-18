// Tiny fetch wrapper. All requests send cookies (httpOnly JWT) and parse JSON.
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

export const api = {
  // auth
  signup: (body) => request('/auth/signup', { method: 'POST', body }),
  login: (body) => request('/auth/login', { method: 'POST', body }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  me: () => request('/auth/me'),

  // bars
  bars: () => request('/bars'),
  bar: (id) => request(`/bars/${id}`),
  waittime: (id) => request(`/bars/${id}/waittime`),

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
  myStats: () => request('/users/me/stats'),
};
