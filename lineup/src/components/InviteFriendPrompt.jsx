import { useState } from 'react';
import { UserPlus, Star, Users } from 'lucide-react';
import { shareInvite } from '../lib/invite.js';
import { useToast } from '../context/ToastContext.jsx';

// Incentivized (never forced) invite nudge. Primary action opens the native
// share sheet; "Maybe later" dismisses. Shown at most once/day and never gates
// anything — the whole app stays usable if the user skips it.
export default function InviteFriendPrompt({ onDismiss }) {
  const { showToast } = useToast();
  const [busy, setBusy] = useState(false);

  async function invite() {
    setBusy(true);
    try {
      const how = await shareInvite();
      if (how === 'copied') showToast({ title: 'Invite link copied', body: 'Paste it to a friend 🍸' });
    } catch (e) {
      showToast({ title: 'Could not share', body: e.message });
    } finally {
      setBusy(false);
      onDismiss();
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-6 animate-fade-in"
      onClick={onDismiss}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-sm rounded-3xl bg-canvas p-6 text-center shadow-card animate-pop-in"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-ink/5 text-ink">
          <UserPlus size={22} />
        </span>
        <h2 className="mt-4 text-xl font-bold leading-snug text-ink">
          Invite a friend to see where they’re going out tonight 🍸
        </h2>

        <div className="mt-4 space-y-2.5 rounded-2xl bg-white p-4 text-left shadow-card">
          <p className="flex items-center gap-2.5 text-sm font-medium text-ink">
            <Star size={16} className="shrink-0 fill-wait-amber text-wait-amber" />
            Unlock Trusted Reporter status
          </p>
          <p className="flex items-center gap-2.5 text-sm font-medium text-ink">
            <Users size={16} className="shrink-0 text-ink" />
            See friends’ live check-ins on the map
          </p>
        </div>

        <button
          onClick={invite}
          disabled={busy}
          className="mt-5 w-full rounded-2xl bg-ink py-3.5 text-base font-semibold text-white disabled:opacity-60 active:scale-[.99] transition-transform"
        >
          {busy ? 'Opening…' : 'Invite a friend'}
        </button>
        <button onClick={onDismiss} className="mt-2 w-full py-2 text-sm font-medium text-gray-500">
          Maybe later
        </button>
      </div>
    </div>
  );
}
