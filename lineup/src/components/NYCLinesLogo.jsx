// NYC Lines wordmark — "L·nes" where the "i" is a vertical stack of three
// colored status dots (green / amber / red). Implemented as an inline SVG so it
// scales crisply at every size.
//
// Props:
//   variant: "light" (khaki/transparent bg, dark text)  [default]
//          | "dark"  (near-black tile, white text, glowing dots)
//          | "nav"   (just the dot stack, no text — for the bottom nav glyph)
//   height: number (px), default 40
//
// Note: the project is a Vite + JSX app (no TypeScript), so this lives at
// components/NYCLinesLogo.jsx rather than the .tsx path in the brief.

const SIGNAL = {
  green: '#4CAF50', // 0–10 min
  amber: '#F5A623', // 11–30 min
  red: '#E53935', // 30+ min
};

const INK = '#1A1A18';
const DARK_TILE = '#1A1A18';
const MUTED = '#8A8070';

// Shared dot-stack renderer. `cx` is the column center; dots fill the x-height.
function DotStack({ cx, centers, r, glow }) {
  const colors = [SIGNAL.green, SIGNAL.amber, SIGNAL.red];
  return (
    <g>
      {glow &&
        centers.map((cy, i) => (
          <circle key={`g${i}`} cx={cx} cy={cy} r={r * 1.7} fill={colors[i]} opacity="0.5" filter="url(#nl-glow)" />
        ))}
      {centers.map((cy, i) => (
        <g key={i}>
          {/* thin light halo ring so each dot reads on the khaki background */}
          <circle cx={cx} cy={cy} r={r + 1.5} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" />
          <circle cx={cx} cy={cy} r={r} fill={colors[i]} />
        </g>
      ))}
    </g>
  );
}

export default function NYCLinesLogo({ variant = 'light', height = 40, className = '', title = 'NYC Lines' }) {
  // --- nav variant: just the dot stack ---
  if (variant === 'nav') {
    const vbW = 26;
    const vbH = 70;
    const width = Math.round(height * (vbW / vbH));
    return (
      <svg
        role="img"
        aria-label={title}
        className={className}
        width={width}
        height={height}
        viewBox={`0 0 ${vbW} ${vbH}`}
      >
        <DotStack cx={13} centers={[13, 35, 57]} r={9} glow={false} />
      </svg>
    );
  }

  // --- full wordmark (light / dark) ---
  const dark = variant === 'dark';
  const vbW = 240; // generous right margin so the "s" never clips across fonts
  const vbH = 132;
  const width = Math.round(height * (vbW / vbH));
  const textColor = dark ? '#FFFFFF' : INK;
  const font = "'IBM Plex Sans', system-ui, sans-serif";

  return (
    <svg
      role="img"
      aria-label={title}
      className={className}
      width={width}
      height={height}
      viewBox={`0 0 ${vbW} ${vbH}`}
    >
      {dark && (
        <>
          <defs>
            <filter id="nl-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2.5" />
            </filter>
          </defs>
          <rect x="0" y="0" width={vbW} height={vbH} rx="22" fill={DARK_TILE} />
        </>
      )}

      {/* NYC eyebrow — small caps, tracked out, muted (~40% of "Lines") */}
      <text
        x="6"
        y="30"
        fontFamily={font}
        fontSize="28"
        fontWeight="600"
        letterSpacing="7"
        fill={dark ? MUTED : MUTED}
      >
        NYC
      </text>

      {/* Wordmark: "L" + dot-stack + "nes" sharing one baseline */}
      <text x="4" y="116" fontFamily={font} fontSize="76" fontWeight="700" fill={textColor}>
        L
      </text>
      <DotStack cx={56} centers={[72, 92, 112]} r={8.5} glow={dark} />
      <text x="70" y="116" fontFamily={font} fontSize="76" fontWeight="700" fill={textColor}>
        nes
      </text>
    </svg>
  );
}
