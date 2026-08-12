// send-push — sends an APNs push to a user's devices.
//
// Status: complete but UNTESTED until you add your APNs key (the .p8 you create
// in the Apple Developer portal once your license is active). Wire it last.
//
// Call it server-side only (a DB trigger / scheduled job / another function),
// passing a shared secret. Body:
//   { "userIds": ["<uuid>", ...], "title": "...", "body": "...", "data": {...} }
//
// Required function secrets (supabase secrets set ...):
//   APNS_KEY        contents of the AuthKey_XXXX.p8 (the PEM, newlines ok)
//   APNS_KEY_ID     the 10-char Key ID
//   APNS_TEAM_ID    your Apple Team ID
//   APNS_BUNDLE_ID  com.nyclines.app
//   APNS_HOST       api.push.apple.com  (use api.sandbox.push.apple.com for dev builds)
//   PUSH_SECRET     a random string the caller must send as x-push-secret
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const b64url = (buf: ArrayBuffer | Uint8Array) => {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

// Build the APNs provider JWT (ES256), cached ~50 min.
let cachedJwt: { token: string; iat: number } | null = null;
async function providerToken() {
  const now = Math.floor(Date.now() / 1000);
  if (cachedJwt && now - cachedJwt.iat < 3000) return cachedJwt.token;

  const keyId = Deno.env.get('APNS_KEY_ID')!;
  const teamId = Deno.env.get('APNS_TEAM_ID')!;
  const pem = Deno.env.get('APNS_KEY')!;

  const header = b64url(new TextEncoder().encode(JSON.stringify({ alg: 'ES256', kid: keyId })));
  const payload = b64url(new TextEncoder().encode(JSON.stringify({ iss: teamId, iat: now })));
  const unsigned = `${header}.${payload}`;

  const der = pem.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
  const keyBytes = Uint8Array.from(atob(der), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey(
    'pkcs8',
    keyBytes,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    key,
    new TextEncoder().encode(unsigned),
  );
  const token = `${unsigned}.${b64url(sig)}`;
  cachedJwt = { token, iat: now };
  return token;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);
  if (req.headers.get('x-push-secret') !== Deno.env.get('PUSH_SECRET')) {
    return json({ error: 'Forbidden' }, 403);
  }

  try {
    const { userIds = [], token, title, body, data = {} } = await req.json();

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } },
    );

    let tokens: string[] = [];
    if (token) {
      tokens = [token];
    } else if (userIds.length) {
      const { data: rows } = await admin
        .from('device_tokens')
        .select('token')
        .in('user_id', userIds);
      tokens = (rows || []).map((r: { token: string }) => r.token);
    }
    if (!tokens.length) return json({ ok: true, sent: 0 });

    const jwt = await providerToken();
    const host = Deno.env.get('APNS_HOST') || 'api.push.apple.com';
    const topic = Deno.env.get('APNS_BUNDLE_ID')!;
    const payload = JSON.stringify({ aps: { alert: { title, body }, sound: 'default' }, ...data });

    const results = await Promise.all(
      tokens.map(async (t) => {
        const res = await fetch(`https://${host}/3/device/${t}`, {
          method: 'POST',
          headers: {
            authorization: `bearer ${jwt}`,
            'apns-topic': topic,
            'apns-push-type': 'alert',
          },
          body: payload,
        });
        // 410 = token no longer valid; clean it up.
        if (res.status === 410) await admin.from('device_tokens').delete().eq('token', t);
        return { token: t.slice(0, 8), status: res.status };
      }),
    );

    return json({ ok: true, sent: results.filter((r) => r.status === 200).length, results });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
