import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import NYCLinesLogo from '../components/NYCLinesLogo.jsx';

export default function Auth() {
  const { login, signup } = useAuth();
  const [tab, setTab] = useState('login'); // 'login' | 'signup'
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (tab === 'signup') await signup(email, username, password);
      else await login(email, password);
      // AuthProvider state update triggers the router to show the app.
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-canvas px-6">
      <div className="mb-8 flex flex-col items-center text-center">
        <NYCLinesLogo variant="light" height={56} />
        <p className="mt-3 text-sm text-gray-500">Real-time bar wait times, by the crowd.</p>
      </div>

      <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-card">
        {/* Tabs */}
        <div className="mb-5 flex rounded-full bg-canvas p-1">
          {['signup', 'login'].map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setError(''); }}
              className={`flex-1 rounded-full py-2 text-sm font-semibold capitalize transition-colors ${
                tab === t ? 'bg-ink text-white' : 'text-gray-500'
              }`}
            >
              {t === 'signup' ? 'Sign Up' : 'Log In'}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="space-y-3">
          <input
            type="email"
            placeholder="Email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full rounded-xl border border-black/10 bg-canvas px-4 py-3 text-sm outline-none focus:border-ink"
          />
          {tab === 'signup' && (
            <input
              type="text"
              placeholder="Username"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="w-full rounded-xl border border-black/10 bg-canvas px-4 py-3 text-sm outline-none focus:border-ink"
            />
          )}
          <input
            type="password"
            placeholder="Password"
            autoComplete={tab === 'signup' ? 'new-password' : 'current-password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full rounded-xl border border-black/10 bg-canvas px-4 py-3 text-sm outline-none focus:border-ink"
          />

          {error && <p className="text-sm font-medium text-wait-red">{error}</p>}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl bg-ink py-3.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {busy ? 'Please wait…' : tab === 'signup' ? 'Create account' : 'Log in'}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-gray-400">
          Try the demo: <span className="font-medium text-gray-500">maya@lineup.app</span> / password123
        </p>
      </div>
    </div>
  );
}
