import { useState } from 'react';
import NYCLinesLogo from '../components/NYCLinesLogo.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

// Shown when a Supabase recovery link is opened (AuthContext sets `recovering`).
// The recovery session is already active, so we just set the new password.
export default function ResetPassword() {
  const { updatePassword } = useAuth();
  const { showToast } = useToast();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (password.length < 6) return setError('Password must be at least 6 characters');
    if (password !== confirm) return setError('Passwords don’t match');
    setBusy(true);
    try {
      await updatePassword(password);
      showToast({ title: 'Password updated', body: 'You’re all set.' });
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
        <p className="mt-3 text-sm text-gray-500">Choose a new password</p>
      </div>
      <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-card">
        <form onSubmit={submit} className="space-y-3">
          <input
            type="password"
            placeholder="New password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full rounded-xl border border-black/10 bg-canvas px-4 py-3 text-sm outline-none focus:border-ink"
          />
          <input
            type="password"
            placeholder="Confirm new password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            className="w-full rounded-xl border border-black/10 bg-canvas px-4 py-3 text-sm outline-none focus:border-ink"
          />
          {error && <p className="text-sm font-medium text-wait-red">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl bg-ink py-3.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {busy ? 'Saving…' : 'Update password'}
          </button>
        </form>
      </div>
    </div>
  );
}
