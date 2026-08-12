// Single source of truth for which backend the app runs against.
//   'supabase' — Supabase (DB + Auth + Realtime); set VITE_SUPABASE_URL/ANON_KEY
//   'demo'     — in-browser mock (static showcase); set VITE_DEMO=true
//   'server'   — the Express API (local full-stack dev)
import { DEMO } from './demo.js';
import { SUPABASE_READY } from './supabase.js';

export const MODE = SUPABASE_READY ? 'supabase' : DEMO ? 'demo' : 'server';
export const IS_SUPABASE = MODE === 'supabase';
export const IS_DEMO = MODE === 'demo';
export const IS_STATIC = MODE !== 'server'; // static host (Pages): HashRouter, no token hint
