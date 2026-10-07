#!/usr/bin/env node
/**
 * DEV/CI ONLY — seeds a small fictional ladder into a Supabase project.
 *
 *   SUPABASE_URL=https://xxxx.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=… \
 *   node scripts/seed-supabase.mjs
 *
 * Why the service role key: Row Level Security deliberately blocks anonymous
 * writes to other members' rows, and seeding a ladder means writing rows no
 * signed-in user owns. This key must NEVER be shipped to the browser, put in
 * NEXT_PUBLIC_* variables, or committed. The app itself only ever uses the
 * public anon key (NEXT_PUBLIC_SUPABASE_ANON_KEY).
 *
 * Every seeded row is fictional. Credits and Liberals are game points.
 */
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
  console.error('This script is for development and CI only — never expose the service role key to clients.');
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

const FICTIONAL = [
  ['LedgerFox', 48210, 168, 'bass'],
  ['MicaMint', 39880, 142, 'bass'],
  ['OrbitOllie', 31240, 121, 'bass'],
  ['VaultVera', 26950, 214, 'platinum'],
  ['NovaKite', 18400, 96, 'bass'],
  ['PipPenny', 12250, 74, 'bass'],
  ['GlassGoblin', 9870, 63, 'bass'],
  ['TallyTiger', 6410, 51, 'bass'],
  ['SproutSage', 3120, 288, 'platinum'],
  ['CoinCactus', 1890, 33, 'bass'],
];

const { error: schemaError } = await supabase.from('profiles').select('id').limit(1);
if (schemaError) {
  console.error('profiles table is not reachable — run supabase/schema.sql first.');
  console.error(schemaError.message);
  process.exit(1);
}

// These rows are anonymous fixtures: they carry a deterministic UUID-shaped id
// in a reserved namespace so re-running the seed updates instead of duplicating.
const NAMESPACE = '00000000-0000-4000-8000-00000000';
const rows = FICTIONAL.map(([username, credits, liberals, card_tier], index) => ({
  id: `${NAMESPACE}${String(index + 1).padStart(4, '0')}`,
  username,
  credits,
  liberals,
  card_tier,
  streak: 1 + (index % 30),
  level: 1 + Math.floor(liberals / 25),
  games_played: 10 + index * 3,
  games_won: 4 + index,
  multiplayer_won: index % 5,
  perfect_strikes: index * 7,
  linked_play_games: true,
  season_id: 'seed-ladder',
}));

// Fixture rows are not real auth users; inserting them through the service role
// bypasses RLS by design. Remove them with scripts/test-supabase.mjs --clean.
const { error } = await supabase.from('profiles').upsert(rows, { onConflict: 'id' });
if (error) {
  console.error('Seed failed:', error.message);
  process.exit(1);
}

console.log(`✓ Seeded ${rows.length} fictional ladder rows into ${url}`);
console.log('  Reminder: these are game profiles for a simulation. No real money exists in this project.');
