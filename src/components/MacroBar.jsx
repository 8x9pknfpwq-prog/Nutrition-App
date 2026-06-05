export default function MacroBar({ label, value, max, color, unit = 'g' }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const over = value > max;

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="font-medium text-gray-700">{label}</span>
        <span className="text-gray-500">
          <span className={over ? 'text-red-500 font-semibold' : 'text-gray-800 font-semibold'}>
            {Math.round(value)}
          </span>
          {' / '}{Math.round(max)}{unit}
        </span>
      </div>
      <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${pct}%`,
            backgroundColor: over ? '#ef4444' : color,
          }}
        />
      </div>
    </div>
  );
}
