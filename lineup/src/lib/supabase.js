import { createClient } from '@supabase/supabase-js';

// Supabase client for the frontend (auth + data + realtime). Configure via:
//   VITE_SUPABASE_URL       your project URL (https://xxxx.supabase.co)
//   VITE_SUPABASE_ANON_KEY  the project's anon/publishable key (safe in client)
const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const SUPABASE_READY = Boolean(url && anonKey);

// Null until configured, so the app can fall back to demo mode without crashing.
export const supabase = SUPABASE_READY ? createClient(url, anonKey) : null;
