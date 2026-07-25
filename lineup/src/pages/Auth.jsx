import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import NYCLinesLogo from '../components/NYCLinesLogo.jsx';

const inputCls =
  'w-full rounded-xl border border-black/10 bg-canvas px-4 py-3 text-sm outline-none focus:border-ink';

export default function Auth() {
  const { login, signup, requestPasswordReset } = useAuth();
  const [tab, setTab] = useState('login'); // 'login' | 'signup'
  const [forgot, setForgot] = useState(false);
  const [sent, setSent] = useState(false);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (forgot) {
        await requestPasswordReset(email);
        setSent(true);
      } else if (tab === 'signup') {
        await signup({ email, username, password, firstName, lastName, phone });
      } else {
        await login(email, password);
      }
      // AuthProvider state update triggers the router to show the app.
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function switchTo(t) {
    setTab(t);
    setForgot(false);
    setSent(false);
    setError('');
  }

  return (
    <div className="h-full overflow-y-auto overscroll-contain bg-canvas font-sans">
      <div className="flex min-h-full flex-col items-center justify-center px-6 py-10">
      <div className="mb-8 flex flex-col items-center text-center">
        <NYCLinesLogo variant="light" height={56} />
        <p className="mt-3 text-sm text-gray-500">Real-time bar wait times, by the crowd.</p>
      </div>

      <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-card">
        {forgot ? (
          sent ? (
            <div className="text-center">
              <h2 className="text-base font-bold text-ink">Check your email</h2>
              <p className="mt-2 text-sm text-gray-500">
                If an account exists for <span className="font-medium text-ink">{email}</span>, we’ve sent
                a link to reset your password.
              </p>
              <button
                onClick={() => switchTo('login')}
                className="mt-5 w-full rounded-xl bg-ink py-3.5 text-sm font-semibold text-white"
              >
                Back to log in
              </button>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-3">
              <h2 className="text-base font-bold text-ink">Reset your password</h2>
              <p className="text-sm text-gray-500">We’ll email you a link to set a new one.</p>
              <input
                type="email"
                placeholder="Email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className={inputCls}
              />
              {error && <p className="text-sm font-medium text-wait-red">{error}</p>}
              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-xl bg-ink py-3.5 text-sm font-semibold text-white disabled:opacity-60"
              >
                {busy ? 'Sending…' : 'Send reset link'}
              </button>
              <button
                type="button"
                onClick={() => switchTo('login')}
                className="w-full py-1 text-center text-sm font-medium text-gray-500"
              >
                Back to log in
              </button>
            </form>
          )
        ) : (
          <>
            {/* Tabs */}
            <div className="mb-5 flex rounded-full bg-canvas p-1">
              {['signup', 'login'].map((t) => (
                <button
                  key={t}
                  onClick={() => switchTo(t)}
                  className={`flex-1 rounded-full py-2 text-sm font-semibold capitalize transition-colors ${
                    tab === t ? 'bg-ink text-white' : 'text-gray-500'
                  }`}
                >
                  {t === 'signup' ? 'Sign Up' : 'Log In'}
                </button>
              ))}
            </div>

            <form onSubmit={submit} className="space-y-3">
              {tab === 'signup' && (
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="First name"
                    autoComplete="given-name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    className={inputCls}
                  />
                  <input
                    type="text"
                    placeholder="Last name"
                    autoComplete="family-name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                    className={inputCls}
                  />
                </div>
              )}

              <input
                type="email"
                placeholder="Email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className={inputCls}
              />

              {tab === 'signup' && (
                <>
                  <input
                    type="tel"
                    placeholder="Phone (optional)"
                    autoComplete="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className={inputCls}
                  />
                  <input
                    type="text"
                    placeholder="Username"
                    autoComplete="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    className={inputCls}
                  />
                </>
              )}

              <input
                type="password"
                placeholder="Password"
                autoComplete={tab === 'signup' ? 'new-password' : 'current-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className={inputCls}
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

            {tab === 'login' && (
              <button
                onClick={() => {
                  setForgot(true);
                  setError('');
                }}
                className="mt-3 w-full text-center text-sm font-medium text-gray-500"
              >
                Forgot password?
              </button>
            )}
          </>
        )}
      </div>

      <p className="mt-6 text-center text-xs text-gray-400">
        <Link to="/privacy" className="font-medium text-gray-500">Privacy</Link>
        {' · '}
        <Link to="/terms" className="font-medium text-gray-500">Terms</Link>
      </p>
      </div>
    </div>
  );
}
