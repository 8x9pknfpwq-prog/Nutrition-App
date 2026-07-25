// iOS-style segmented control: a soft track with a white selected pill.
export default function Segmented({ value, onChange, options }) {
  return (
    <div className="flex rounded-xl bg-black/[0.06] p-0.5">
      {options.map((o) => {
        const on = value === o.v;
        return (
          <button
            key={o.v}
            onClick={() => onChange(o.v)}
            className={`flex-1 rounded-[10px] py-1.5 text-[13px] font-semibold transition-all ${
              on ? 'bg-white text-ink shadow-[0_1px_2px_rgba(0,0,0,0.10)]' : 'text-gray-500'
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
