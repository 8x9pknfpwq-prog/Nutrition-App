// Toggleable filter pills for the bottom sheet: Open now | < 20 min | Friends here
const PILLS = [
  { key: 'open', label: 'Open now' },
  { key: 'under20', label: '< 20 min' },
  { key: 'friends', label: 'Friends here' },
];

export default function FilterPills({ active, onToggle }) {
  return (
    <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
      {PILLS.map((p) => {
        const on = active.includes(p.key);
        return (
          <button
            key={p.key}
            onClick={() => onToggle(p.key)}
            className={`whitespace-nowrap rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
              on
                ? 'border-ink bg-ink text-white'
                : 'border-black/10 bg-white text-gray-600'
            }`}
          >
            {p.label}
          </button>
        );
      })}
    </div>
  );
}
