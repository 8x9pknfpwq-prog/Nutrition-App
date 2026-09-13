import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import { api } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import NYCLinesLogo from '../components/NYCLinesLogo.jsx';
import { displayWait, openStatus } from '../lib/busyness.js';
import { waitColor, statusText } from '../lib/wait.js';

// Public landing page for a shared bar link (/#/bar/:id). This is where a
// non-user lands when a friend drops a "line is 45 min at X" card into a group
// chat: it shows the bar's live wait (readable without an account) and pulls
// them into the map. It's the receiving end of loop #1.
export default function SharedBar() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, guest, continueAsGuest } = useAuth();
  const [bar, setBar] = useState(undefined); // undefined = loading, null = not found

  useEffect(() => {
    let alive = true;
    api
      .bar(id)
      .then((d) => { if (alive) setBar(d.bar); })
      .catch(() => { if (alive) setBar(null); });
    return () => { alive = false; };
  }, [id]);

  // Enter the live map, landing on this bar. Guests are allowed to browse.
  function openMap() {
    if (!user && !guest) continueAsGuest();
    navigate('/', { state: { openBar: id } });
  }

  if (bar === undefined) {
    return (
      <div className="grid h-full place-items-center bg-canvas">
        <NYCLinesLogo variant="light" height={40} className="animate-pulse" />
      </div>
    );
  }

  if (bar === null) {
    return (
      <div className="mx-auto flex h-full max-w-md flex-col items-center justify-center gap-4 bg-canvas px-8 text-center">
        <NYCLinesLogo variant="light" height={40} />
        <p className="text-sm text-gray-500">We couldn’t find that place — it may have been removed.</p>
        <button onClick={openMap} className="rounded-xl bg-ink px-5 py-3 text-sm font-semibold text-white">
          Open the map
        </button>
      </div>
    );
  }

  const dw = displayWait(bar);
  const s = openStatus(bar);
  const color = dw.closed || dw.waitMin == null ? '#9A968D' : waitColor(dw.waitMin);
  const bigNum = dw.closed ? 'Closed' : dw.waitMin == null ? '—' : dw.waitMin >= 90 ? '90+' : String(dw.waitMin);

  return (
    <div className="h-full overflow-y-auto overscroll-contain bg-canvas">
      <div className="mx-auto flex min-h-full max-w-md flex-col px-6 pb-10 pt-[calc(env(safe-area-inset-top)+20px)]">
        <div className="flex justify-center py-2">
          <NYCLinesLogo variant="light" height={30} />
        </div>

        <div className="mt-6 flex flex-1 flex-col items-center justify-center text-center">
          {/* The wait, front and center */}
          {!dw.closed && dw.waitMin != null ? (
            <>
              <div className="flex items-end justify-center gap-3">
                <span className="stat-number text-[104px] font-bold leading-none" style={{ color }}>{bigNum}</span>
                <span className="mb-3 text-left font-mono text-sm font-semibold uppercase tracking-wide text-gray-400">
                  min<br />line
                </span>
              </div>
              <span className="mt-3 text-sm font-bold tracking-wide" style={{ color }}>{statusText(dw.waitMin)}</span>
              <p className="mt-1 text-xs font-medium text-gray-400">
                {dw.isLive ? 'Live · reported by the crowd' : 'Typical wait around now'}
              </p>
            </>
          ) : (
            <>
              <span className="text-[64px] font-bold leading-none text-gray-400">{bigNum}</span>
              <p className="mt-3 text-xs font-medium text-gray-400">
                {dw.closed ? 'Closed right now' : 'No line reports yet'}
              </p>
            </>
          )}

          {/* Venue */}
          <h1 className="mt-8 font-serif text-3xl font-bold tracking-tight text-ink">{bar.name}</h1>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-500">
            <MapPin size={14} className="shrink-0" /> {bar.address}
          </p>
          {s?.text && (
            <p className={`mt-1 text-xs font-semibold ${s.open ? 'text-wait-green' : 'text-gray-400'}`}>{s.text}</p>
          )}
        </div>

        {/* CTAs */}
        <div className="mt-8 space-y-3">
          <button
            onClick={openMap}
            className="w-full rounded-2xl bg-ink py-4 text-base font-semibold text-white active:scale-[.99] transition-transform"
          >
            See it live on the map →
          </button>
          {!user && (
            <button
              onClick={() => navigate('/')}
              className="w-full rounded-2xl border border-black/10 bg-white py-3.5 text-sm font-semibold text-ink"
            >
              Sign up to report waits &amp; add friends
            </button>
          )}
          <p className="pt-1 text-center text-xs text-gray-400">
            Real-time bar wait times, by the crowd ·{' '}
            <Link to="/privacy" className="font-medium text-gray-500">Privacy</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
