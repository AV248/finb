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

/**
 * Project credentials. Both values are publishable by design (they ship inside
 * the client bundle and are protected by Row Level Security), so the project
 * URL + publishable key are used as documented defaults and can be overridden
 * per environment with NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.
 * NEXT_PUBLIC_SUPABASE_ANON_KEY is accepted as a legacy alias.
 */
export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || 'https://dwlkiislhsqmcregbmlq.supabase.co';
export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
  'sb_publishable_NiovXqO7quI0xaUYFXkS9g_GfIQrmBG';
export const CLOUD_ENABLED = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
export const CLOUD_PROJECT_REF = SUPABASE_URL.replace(/^https?:\/\//, '').split('.')[0];

/** Social providers FINB can hand the login off to. */
export type SocialProvider = 'google' | 'discord';

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
        provider: player.provider,
        provider_subject: player.providerSubject,
        linked_at: player.linkedAt ? new Date(player.linkedAt).toISOString() : null,
        locked_credits: Math.round(player.lockedCredits ?? 0),
        bonus_credits: Math.round(player.bonusCredits ?? 0),
        welcome_grant_claimed: Boolean(player.welcomeGrantClaimed),
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

/* ------------------------------------------------------------------ *
 * Social providers (Google / Discord)
 * ------------------------------------------------------------------ */

/**
 * Ask Supabase to bounce the player through a real OAuth handshake. Returns
 * the URL to visit when the operator has the provider enabled; returns an
 * explanatory message instead of throwing when it is not, so the UI can fall
 * back to the handle-based link path.
 */
export async function startProviderOAuth(
  provider: SocialProvider,
  redirectTo?: string,
): Promise<{ ok: boolean; url?: string; message: string }> {
  if (!CLOUD_ENABLED) return { ok: false, message: 'Cloud auth is not configured in this build.' };
  try {
    const supabase = await getSupabase();
    if (!supabase) return { ok: false, message: 'Cloud auth is not configured in this build.' };
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: redirectTo ?? (typeof window !== 'undefined' ? window.location.href : undefined), skipBrowserRedirect: true },
    });
    if (error) throw error;
    if (!data?.url) return { ok: false, message: `${provider} sign-in is not enabled on this project yet.` };
    return { ok: true, url: data.url, message: `Handing off to ${provider}…` };
  } catch (error) {
    return { ok: false, message: `Could not reach ${provider} sign-in (${(error as Error).message}). Use the handle field below.` };
  }
}

/** Provider subject from the current Supabase session, when one exists. */
export async function sessionProviderSubject(): Promise<{ provider: SocialProvider; subject: string } | null> {
  if (!CLOUD_ENABLED) return null;
  try {
    const supabase = await getSupabase();
    if (!supabase) return null;
    const { data } = await supabase.auth.getSession();
    const identity = data.session?.user?.identities?.find(item => item.provider === 'google' || item.provider === 'discord');
    if (!identity) return null;
    const subject = (identity.identity_data?.sub ?? identity.identity_data?.id ?? identity.identity_data?.user_name) as string | undefined;
    if (!subject) return null;
    return { provider: identity.provider as SocialProvider, subject };
  } catch {
    return null;
  }
}

/**
 * Reserve a provider handle for the one-time welcome grant.
 *
 * `provider_claims` is keyed on (provider, subject_id) so the unique index — not
 * client logic — is what makes a second claim impossible, even across devices.
 * Returns 'claimed' when this handle already used its grant.
 */
export async function claimProviderSlot(
  provider: SocialProvider,
  subject: string,
): Promise<'reserved' | 'claimed' | 'unavailable'> {
  if (!CLOUD_ENABLED) return 'unavailable';
  try {
    const supabase = await getSupabase();
    if (!supabase) return 'unavailable';
    const identity = await cloudIdentity(supabase);
    if (!identity) return 'unavailable';
    const { error } = await supabase.from('provider_claims').insert({ provider, subject_id: subject, profile_id: identity });
    if (!error) return 'reserved';
    // 23505 = unique_violation → this provider account already banked its grant
    if (error.code === '23505' || /duplicate key/i.test(error.message)) return 'claimed';
    return 'unavailable';
  } catch {
    return 'unavailable';
  }
}

export const CLOUD_MODE_LABEL = CLOUD_ENABLED ? `Cloud linked · ${CLOUD_PROJECT_REF}` : 'Offline device build';
