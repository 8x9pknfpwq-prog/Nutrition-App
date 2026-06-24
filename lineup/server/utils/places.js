// Place helpers: distance from the NYC center, and Google Maps verification.

const NYC_CENTER = { lat: 40.7282, lng: -73.9942 };

// Great-circle distance in miles (rounded to 0.1) — used for the "X mi" label.
export function milesFromCenter(lat, lng) {
  const toRad = (d) => (d * Math.PI) / 180;
  const R = 3958.8; // earth radius in miles
  const dLat = toRad(lat - NYC_CENTER.lat);
  const dLng = toRad(lng - NYC_CENTER.lng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(NYC_CENTER.lat)) * Math.cos(toRad(lat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(a)) * 10) / 10;
}

// Place types we accept as a real "spot" (a bar/venue), per Google Places.
const ALLOWED_TYPES = new Set([
  'bar',
  'night_club',
  'restaurant',
  'cafe',
  'food',
  'liquor_store',
  'point_of_interest',
  'establishment',
]);

// Verify a submitted place against Google Maps (Places "Find Place From Text").
// Returns one of:
//   { status: 'ok', place: {...canonical Google data} }
//   { status: 'not_found' }       — no real matching establishment
//   { status: 'not_configured' }  — GOOGLE_MAPS_API_KEY is missing
//   { status: 'error' }           — Google request failed / denied
export async function verifyPlaceWithGoogle(name, address) {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) return { status: 'not_configured' };

  const input = `${name} ${address}`;
  const fields = 'place_id,name,formatted_address,geometry/location,rating,types,business_status';
  const url =
    `https://maps.googleapis.com/maps/api/place/findplacefromtext/json` +
    `?input=${encodeURIComponent(input)}&inputtype=textquery&fields=${encodeURIComponent(fields)}&key=${key}`;

  try {
    const res = await fetch(url);
    const data = await res.json();

    if (data.status === 'REQUEST_DENIED' || data.status === 'INVALID_REQUEST' || data.status === 'OVER_QUERY_LIMIT') {
      console.error('Google Places error:', data.status, data.error_message || '');
      return { status: 'error' };
    }

    const c = data.candidates?.[0];
    if (!c || !c.geometry?.location) return { status: 'not_found' };
    if (c.business_status === 'CLOSED_PERMANENTLY') return { status: 'not_found' };
    const types = c.types || [];
    if (!types.some((t) => ALLOWED_TYPES.has(t))) return { status: 'not_found' };

    return {
      status: 'ok',
      place: {
        googlePlaceId: c.place_id,
        name: c.name || name,
        address: c.formatted_address || address,
        latitude: c.geometry.location.lat,
        longitude: c.geometry.location.lng,
        rating: typeof c.rating === 'number' ? c.rating : 0,
      },
    };
  } catch (e) {
    console.error('Google Places fetch failed:', e);
    return { status: 'error' };
  }
}
