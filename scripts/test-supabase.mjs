#!/usr/bin/env node
/**
 * DEV/CI ONLY — checks that the Supabase layer is wired correctly:
 *
 *   NEXT_PUBLIC_SUPABASE_URL=… NEXT_PUBLIC_SUPABASE_ANON_KEY=… node scripts/test-supabase.mjs
 *   node scripts/test-supabase.mjs --clean      # removes seeded fixture rows (needs the service key)
 *
 * With only the public anon key this script verifies the read path and proves
 * that anonymous writes are refused by Row Level Security — the two things that
 * actually matter for a browser-only deployment. The service role key is only
 * read when --clean is used, and never required by the app.
 */
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const clean = process.argv.includes('--clean');

if (!url || !anonKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY.');
  console.error('The app reads these at build time; without them FINB stays fully offline on-device.');
  process.exit(1);
}

const publicClient = createClient(url, anonKey, { auth: { persistSession: false } });
const checks = [];
const record = (name, ok, detail = '') => {
  checks.push({ name, ok });
  console.log(`${ok ? '✓' : '✗'} ${name}${detail ? ` — ${detail}` : ''}`);
};

if (clean) {
  if (!serviceKey) {
    console.error('--clean needs SUPABASE_SERVICE_ROLE_KEY (dev/CI only).');
    process.exit(1);
  }
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { error } = await admin.from('profiles').delete().eq('season_id', 'seed-ladder');
  record('fixture ladder rows removed', !error, error?.message);
  process.exit(checks.every(check => check.ok) ? 0 : 1);
}

// 1. the ladder is publicly readable
const ladder = await publicClient.from('profiles').select('username, credits, liberals, card_tier').order('credits', { ascending: false }).limit(10);
record('public leaderboard read works', !ladder.error && Array.isArray(ladder.data), ladder.error?.message ?? `${ladder.data?.length ?? 0} rows`);
if (ladder.data?.length) {
  const sorted = [...ladder.data].every((row, index, list) => index === 0 || list[index - 1].credits >= row.credits);
  record('ladder is ordered by Credits', sorted);
  record('only game fields are exposed', !('email' in ladder.data[0]) && !('payment' in ladder.data[0]));
}

// 2. anonymous writes must be refused by RLS
const anonWrite = await publicClient.from('profiles').insert({ username: 'ShouldNeverLand', credits: 1 }).select();
record('anonymous profile insert is blocked by RLS', Boolean(anonWrite.error), anonWrite.error?.message ?? 'write succeeded — check your policies');

// 3. the leaderboard view exists and ranks correctly
const view = await publicClient.from('leaderboard').select('username, credit_rank, liberal_rank').limit(5);
record('leaderboard view is queryable', !view.error, view.error?.message);

// 4. realtime is optional: confirm the channel can be created
const channel = publicClient.channel('finb:test');
const subscribed = await new Promise(resolve => {
  const timer = setTimeout(() => resolve(false), 6000);
  channel.subscribe(status => {
    if (status === 'SUBSCRIBED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
      clearTimeout(timer);
      resolve(status === 'SUBSCRIBED');
    }
  });
});
await publicClient.removeChannel(channel);
record('realtime channel subscribes', subscribed);

const failed = checks.filter(check => !check.ok);
console.log(`\n${checks.length - failed.length}/${checks.length} Supabase checks passed.`);
if (failed.length) {
  console.log('If RLS checks failed, re-apply supabase/schema.sql — every table must have policies enabled.');
}
process.exit(failed.length ? 1 : 0);
