import { X } from 'lucide-react';
import Avatar from './Avatar.jsx';

// Small notification card (e.g. friend check-ins). Rendered by ToastProvider.
export default function Toast({ toast, onDismiss }) {
  return (
    <div className="pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-2xl bg-ink px-4 py-3 text-white shadow-sheet animate-toast-in">
      {toast.avatarInitial && (
        <Avatar initial={toast.avatarInitial} seed={toast.username} size={34} />
      )}
      <div className="min-w-0 flex-1">
        {toast.title && <p className="truncate text-sm font-semibold">{toast.title}</p>}
        {toast.body && <p className="truncate text-xs text-white/70">{toast.body}</p>}
      </div>
      <button onClick={onDismiss} className="shrink-0 text-white/60 hover:text-white">
        <X size={16} />
      </button>
    </div>
  );
}
