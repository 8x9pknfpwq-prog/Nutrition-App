import { MapPin } from 'lucide-react';

// A gentle, once-per-session nudge shown near app open: "you're near [Bar] —
// what's the vibe?" Dismissible; never blocks the app. "Add a quick report"
// opens that bar's check-in (pre-selected); "Not here" just closes it.
export default function NearbyCheckinPrompt({ bar, onReport, onDismiss }) {
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
          <MapPin size={22} />
        </span>
        <h2 className="mt-4 text-xl font-bold text-ink">You’re near {bar.name}</h2>
        <p className="mt-1.5 text-sm text-gray-500">
          What’s the vibe right now? A quick report helps everyone deciding where to go.
        </p>
        <button
          onClick={onReport}
          className="mt-5 w-full rounded-2xl bg-ink py-3.5 text-base font-semibold text-white active:scale-[.99] transition-transform"
        >
          Add a quick report
        </button>
        <button onClick={onDismiss} className="mt-2 w-full py-2 text-sm font-medium text-gray-500">
          Not here
        </button>
      </div>
    </div>
  );
}
