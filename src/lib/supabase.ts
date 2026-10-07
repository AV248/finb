/**
 * Supabase adapter.
 *
 * FINB runs fully offline by default: profiles, cards, markets and match results live in
 * the browser. When NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY are present
 * (and supabase/schema.sql has been applied) this module mirrors the same state to a real
 * Postgres/Realtime backend so leaderboards, chat and friend feeds become shared.
 *
 * The SDK is imported lazily so the offline build never pays for it in bytes on first load.
 */
import type { Database, Player, Quote, SeasonEvent } from './types';

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || '';
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || '';
export const CLOUD_ENABLED = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

type SupabaseClient = import('@supabase/supabase-js').SupabaseClient;
let client: SupabaseClient | null = null;
let clientPromise: Promise<SupabaseClient | null> | null = null;

export async function getSupabase(): Promise<SupabaseClient | null> {
  if (!CLOUD_ENABLED) return null;
  if (client) return client;
  clientPromise =
    clientPromise ??
    (async () => {
      const { createClient } = await import('@supabase/supabase-js');
      client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
        realtime: { params: { eventsPerSecond: 6 } },
      });
      return client;
    })();
  return clientPromise;
}

export interface SyncPayload {
  player: Player;
  market: Database['market'];
  season: SeasonEvent | null;
}

/**
 * Resolve the identity used for cloud writes. Supabase Auth gives every device
 * its own session; anonymous sign-in is used when the operator has not wired a
 * social provider, so `auth.uid()` always exists and RLS can scope writes.
 */
async function cloudIdentity(supabase: SupabaseClient): Promise<string | null> {
  try {
    const { data } = await supabase.auth.getSession();
    if (data.session?.user?.id) return data.session.user.id;
    const { data: created, error } = await supabase.auth.signInAnonymously();
    if (error) throw error;
    return created.user?.id ?? null;
  } catch {
    return null;
  }
}

/** Mirror the local profile + market snapshot. Returns false when running offline. */
export async function syncToSupabase(payload: SyncPayload | null): Promise<boolean> {
  if (!payload || !CLOUD_ENABLED) return false;
  try {
    const supabase = await getSupabase();
    if (!supabase) return false;
    const identity = await cloudIdentity(supabase);
    if (!identity) return false;
    const { player, market, season } = payload;
    const { error } = await supabase.from('profiles').upsert(
      {
        id: identity,
        username: player.username.replace(/^Guest_/, '') || player.username,
        credits: Math.round(player.credits),
        liberals: player.liberals,
        card_tier: player.card.tier,
        streak: player.streak,
        level: Math.floor(player.liberals / 25) + 1,
        linked_play_games: player.linked,
        season_id: season?.id ?? null,
        stats: player.stats,
        combo: player.combo,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' },
    );
    if (error) throw error;
    await supabase.from('market_ticks').insert({ payload: market.quotes as unknown as Record<string, Quote> });
    return true;
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') console.warn('[FINB] Supabase sync skipped:', (error as Error).message);
    return false;
  }
}

/** Live global standings when the cloud is configured, else null (caller falls back to local). */
export async function fetchCloudStandings(): Promise<
  { id: string; username: string; credits: number; liberals: number; tier: string; linked: boolean }[] | null
> {
  if (!CLOUD_ENABLED) return null;
  try {
    const supabase = await getSupabase();
    if (!supabase) return null;
    const { data, error } = await supabase
      .from('profiles')
      .select('id,username,credits,liberals,card_tier,linked_play_games')
      .order('credits', { ascending: false })
      .limit(50);
    if (error) throw error;
    return ((data ?? []) as { id: string; username: string; credits: number; liberals: number; card_tier: string; linked_play_games: boolean }[]).map(row => ({
      id: row.id,
      username: row.username,
      credits: row.credits,
      liberals: row.liberals,
      tier: row.card_tier,
      linked: row.linked_play_games,
    }));
  } catch {
    return null;
  }
}

/** Broadcast a friend-feed event so other devices in the same room see it live. */
export async function broadcastFriendEvent(channelName: string, event: { kind: string; username: string; text: string }) {
  if (!CLOUD_ENABLED) return false;
  try {
    const supabase = await getSupabase();
    if (!supabase) return false;
    const channel = supabase.channel(channelName);
    await channel.subscribe();
    await channel.send({ type: 'broadcast', event: 'friend-feed', payload: event });
    await supabase.removeChannel(channel);
    return true;
  } catch {
    return false;
  }
}

export const CLOUD_MODE_LABEL = CLOUD_ENABLED ? 'Cloud linked' : 'Offline device build';
