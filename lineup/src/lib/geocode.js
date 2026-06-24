// Client-side address lookup via Mapbox geocoding. Used by the static demo
// (which has no server) to resolve a submitted address to coordinates. In the
// hosted app, the server resolves + verifies the place via Google instead.
export async function geocodePlace(query) {
  const token = import.meta.env.VITE_MAPBOX_TOKEN;
  if (!token) throw new Error('Address lookup is unavailable (no map token configured).');
  const q = /new york|,\s*ny|nyc/i.test(query) ? query : `${query}, New York, NY`;
  const url =
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json` +
    `?access_token=${token}&proximity=-73.9942,40.7282&country=US&limit=1`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Address lookup failed.');
  const data = await res.json();
  const f = data.features?.[0];
  if (!f) return null;
  return { latitude: f.center[1], longitude: f.center[0], placeName: f.place_name };
}
