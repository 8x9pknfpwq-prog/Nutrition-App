import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import { waitColor, waitLabel, avatarColor } from '../lib/wait.js';
import { displayWait } from '../lib/busyness.js';
import { IS_STATIC } from '../lib/mode.js';

const NYC = { lng: -73.9942, lat: 40.7282, zoom: 14 };
const TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

// Build the DOM node for a colored wait bubble pin.
//   live data    → solid colored bubble with the number
//   baseline est → outlined (white fill, colored text) "~N" so it reads as typical
function barPinEl(bar) {
  const { waitMin, isLive } = displayWait(bar);
  const color = waitColor(waitMin);
  const el = document.createElement('div');
  el.className = 'lineup-pin';
  const base = `
    display:flex;align-items:center;justify-content:center;
    min-width:34px;height:34px;padding:0 8px;border-radius:9999px;
    font-weight:600;font-size:12px;font-family:'IBM Plex Mono',ui-monospace,monospace;
    box-shadow:0 4px 10px rgba(0,0,0,.25);`;
  if (isLive) {
    el.style.cssText = `${base}background:${color};color:#fff;border:2px solid #fff;`;
    el.textContent = waitLabel(waitMin);
  } else {
    el.style.cssText = `${base}background:#fff;color:${color};border:2px solid ${color};`;
    el.textContent = waitMin <= 0 ? '~0' : `~${waitMin}`;
  }
  return el;
}

// Friend avatar marker (initial circle) floated near their last check-in bar.
function friendEl(friend) {
  const el = document.createElement('div');
  const letter = (friend.avatarInitial || friend.username || '?')[0].toUpperCase();
  el.style.cssText = `
    display:flex;align-items:center;justify-content:center;
    width:28px;height:28px;border-radius:9999px;
    background:${avatarColor(friend.username)};color:#fff;font-weight:700;font-size:12px;
    border:2px solid #fff;box-shadow:0 3px 8px rgba(0,0,0,.3);transform:translateY(-22px);`;
  el.textContent = letter;
  return el;
}

// --- Fallback (no Mapbox token): schematic positioning by lat/lng ---
function FallbackMap({ bars, friends, onSelectBar }) {
  const lats = bars.map((b) => b.latitude);
  const lngs = bars.map((b) => b.longitude);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
  const pos = (b) => ({
    left: `${6 + ((b.longitude - minLng) / (maxLng - minLng || 1)) * 88}%`,
    top: `${88 - ((b.latitude - minLat) / (maxLat - minLat || 1)) * 78}%`,
  });

  return (
    <div className="absolute inset-0 overflow-hidden bg-[#E9E7E1]">
      {/* faux street grid */}
      <div
        className="absolute inset-0 opacity-60"
        style={{
          backgroundImage:
            'linear-gradient(#dad7cf 1px, transparent 1px), linear-gradient(90deg, #dad7cf 1px, transparent 1px)',
          backgroundSize: '46px 46px',
        }}
      />
      {!IS_STATIC && (
        <div className="absolute left-3 top-3 rounded-lg bg-white/80 px-2 py-1 text-[10px] font-semibold text-gray-500">
          Set VITE_MAPBOX_TOKEN for a live map
        </div>
      )}
      {bars.map((b) => {
        const friend = b.checkins?.[0];
        const { waitMin, isLive } = displayWait(b);
        const color = waitColor(waitMin);
        return (
          <button
            key={b.id}
            onClick={() => onSelectBar(b)}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={pos(b)}
          >
            {friend && (
              <span
                className="absolute -top-5 left-1/2 grid h-6 w-6 -translate-x-1/2 place-items-center rounded-full border-2 border-white text-[11px] font-bold text-white shadow"
                style={{ background: avatarColor(friend.username) }}
              >
                {(friend.avatarInitial || '?')[0]}
              </span>
            )}
            <span
              className="wait-time grid min-w-[34px] place-items-center rounded-full border-2 px-2 py-1 text-xs font-semibold shadow-pin"
              style={
                isLive
                  ? { background: color, color: '#fff', borderColor: '#fff' }
                  : { background: '#fff', color, borderColor: color }
              }
            >
              {isLive ? waitLabel(waitMin) : waitMin <= 0 ? '~0' : `~${waitMin}`}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export default function MapView({ bars, friends = [], onSelectBar, userLocation }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const userMarkerRef = useRef(null);

  // Init Mapbox once.
  useEffect(() => {
    if (!TOKEN || mapRef.current || !containerRef.current) return;
    mapboxgl.accessToken = TOKEN;
    mapRef.current = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [NYC.lng, NYC.lat],
      zoom: NYC.zoom,
      attributionControl: false,
    });
    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  // Sync markers whenever data changes.
  useEffect(() => {
    const map = mapRef.current;
    if (!TOKEN || !map) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    bars.forEach((bar) => {
      const el = barPinEl(bar);
      el.addEventListener('click', () => onSelectBar(bar));
      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([bar.longitude, bar.latitude])
        .addTo(map);
      markersRef.current.push(marker);
    });

    friends
      .filter((f) => f.lastBar)
      .forEach((f) => {
        const marker = new mapboxgl.Marker({ element: friendEl(f) })
          .setLngLat([f.lastBar.longitude, f.lastBar.latitude])
          .addTo(map);
        markersRef.current.push(marker);
      });
  }, [bars, friends, onSelectBar]);

  // Center on the user's location and drop a "you are here" blue dot.
  useEffect(() => {
    const map = mapRef.current;
    if (!TOKEN || !map || !userLocation) return;
    const apply = () => {
      const lngLat = [userLocation.longitude, userLocation.latitude];
      if (!userMarkerRef.current) {
        const el = document.createElement('div');
        el.style.cssText =
          'width:18px;height:18px;border-radius:9999px;background:#2D7FF9;border:3px solid #fff;box-shadow:0 0 0 6px rgba(45,127,249,0.25);';
        userMarkerRef.current = new mapboxgl.Marker({ element: el }).setLngLat(lngLat).addTo(map);
      } else {
        userMarkerRef.current.setLngLat(lngLat);
      }
      map.flyTo({ center: lngLat, zoom: 14, essential: true });
    };
    if (map.isStyleLoaded()) apply();
    else map.once('load', apply);
  }, [userLocation]);

  if (!TOKEN) {
    return <FallbackMap bars={bars} friends={friends} onSelectBar={onSelectBar} />;
  }
  return <div ref={containerRef} className="absolute inset-0" />;
}
