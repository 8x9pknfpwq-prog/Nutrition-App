import { Wine, IceCream } from 'lucide-react';

// Segmented switcher between the two venue modes. The active segment is filled
// with that mode's accent color (ink for bars, berry pink for froyo).
export const MODES = {
  bar: { label: 'Bars', icon: Wine, active: 'bg-ink' },
  froyo: { label: 'Froyo', icon: IceCream, active: 'bg-froyo' },
};

export default function VenueToggle({ mode, onChange }) {
  return (
    <div className="pointer-events-auto inline-flex rounded-full bg-canvas/90 p-1 shadow-card backdrop-blur">
      {Object.entries(MODES).map(([key, { label, icon: Icon, active }]) => {
        const on = mode === key;
        return (
          <button
            key={key}
            onClick={() => onChange(key)}
            aria-pressed={on}
            className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
              on ? `${active} text-white` : 'text-ink/60'
            }`}
          >
            <Icon size={16} />
            {label}
          </button>
        );
      })}
    </div>
  );
}
