// Supabase Edge Function: submit-place
// Verifies a user-submitted place against Google Maps (Places API) and, only if
// it's a real venue, inserts it into public.bars using the service role.
//
// Secrets required (set with `supabase secrets set ...`):
//   GOOGLE_MAPS_API_KEY   — Google Cloud key with the Places API enabled
// Auto-provided by Supabase: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY

import { createClient } from 'jsr:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

const ALLOWED_TYPES = new Set([
  'bar', 'night_club', 'restaurant', 'cafe', 'food', 'liquor_store', 'point_of_interest', 'establishment',
]);

const NYC = { lat: 40.7282, lng: -73.9942 };
function milesFromCenter(lat: number, lng: number) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 3958.8;
  const dLat = toRad(lat - NYC.lat);
  const dLng = toRad(lng - NYC.lng);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(NYC.lat)) * Math.cos(toRad(lat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(a)) * 10) / 10;
}

async function verifyWithGoogle(name: string, address: string) {
  const key = Deno.env.get('GOOGLE_MAPS_API_KEY');
  if (!key) return { status: 'not_configured' as const };
  const fields = 'place_id,name,formatted_address,geometry/location,rating,types,business_status';
  const url =
    `https://maps.googleapis.com/maps/api/place/findplacefromtext/json` +
    `?input=${encodeURIComponent(`${name} ${address}`)}&inputtype=textquery&fields=${encodeURIComponent(fields)}&key=${key}`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    if (['REQUEST_DENIED', 'INVALID_REQUEST', 'OVER_QUERY_LIMIT'].includes(data.status)) {
      console.error('Google Places error:', data.status, data.error_message);
      return { status: 'error' as const };
    }
    const c = data.candidates?.[0];
    if (!c?.geometry?.location || c.business_status === 'CLOSED_PERMANENTLY') return { status: 'not_found' as const };
    if (!(c.types ?? []).some((t: string) => ALLOWED_TYPES.has(t))) return { status: 'not_found' as const };
    return {
      status: 'ok' as const,
      place: {
        google_place_id: c.place_id,
        name: c.name ?? name,
        address: c.formatted_address ?? address,
        latitude: c.geometry.location.lat,
        longitude: c.geometry.location.lng,
        rating: typeof c.rating === 'number' ? c.rating : 0,
      },
    };
  } catch (e) {
    console.error('Google Places fetch failed:', e);
    return { status: 'error' as const };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const authHeader = req.headers.get('Authorization') ?? '';
  const url = Deno.env.get('SUPABASE_URL')!;
  const anon = Deno.env.get('SUPABASE_ANON_KEY')!;

  // Identify the caller from their JWT.
  const userClient = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return json({ error: 'Not authenticated' }, 401);

  let body: { name?: string; address?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }
  const name = (body.name ?? '').trim();
  const address = (body.address ?? '').trim();
  if (!name || !address) return json({ error: 'name and address are required' }, 400);

  const v = await verifyWithGoogle(name, address);
  if (v.status === 'not_configured') return json({ error: 'Place verification is not configured.' }, 503);
  if (v.status === 'not_found') return json({ error: "We couldn't verify that place on Google Maps — check the name and address." }, 422);
  if (v.status === 'error') return json({ error: 'Place verification is temporarily unavailable, please try again.' }, 502);

  const p = v.place;
  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  // Dedupe on Google place id.
  const { data: existing } = await admin.from('bars').select('id').eq('google_place_id', p.google_place_id).maybeSingle();
  if (existing) return json({ error: 'That place is already on the map or pending review.' }, 409);

  // Stored as a Google-VERIFIED but UNAPPROVED suggestion. It only appears on
  // the map once an admin sets approved = true.
  const { data: bar, error } = await admin
    .from('bars')
    .insert({
      ...p,
      distance: milesFromCenter(p.latitude, p.longitude),
      verified: true,
      approved: false,
      submitted_by: user.id,
    })
    .select()
    .single();
  if (error) return json({ error: error.message }, 500);

  return json({ bar, pending: true }, 201);
});
