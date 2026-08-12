// delete-account — permanently deletes the calling user's account and data.
//
// Apple requires in-app account deletion for apps with sign-up. The client
// (Profile → Delete account) invokes this with the user's JWT. Deleting the
// auth user cascades to profile → reports, friendships, notifications, device
// tokens (all FKs are ON DELETE CASCADE). We also null out any bars they
// suggested so a non-cascading FK can't block the delete.
//
// Deploy: supabase functions deploy delete-account
// (Service role + project URL are injected automatically.)
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Missing authorization' }, 401);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    // Resolve the caller from their JWT.
    const jwt = authHeader.replace('Bearer ', '');
    const { data: userData, error: userErr } = await admin.auth.getUser(jwt);
    if (userErr || !userData?.user) return json({ error: 'Invalid session' }, 401);
    const userId = userData.user.id;

    // Detach suggested bars (FK may not cascade), then delete the auth user —
    // which cascades the rest of their rows.
    await admin.from('bars').update({ submitted_by: null }).eq('submitted_by', userId);

    const { error: delErr } = await admin.auth.admin.deleteUser(userId);
    if (delErr) return json({ error: delErr.message }, 500);

    return json({ ok: true });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
