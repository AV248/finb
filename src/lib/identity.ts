/**
 * FINB Platinum — identity, providers and the three Credit buckets.
 *
 * FINB keeps every balance in three explicit buckets so the published account
 * rules can be enforced mechanically instead of being "just copy":
 *
 *   `credits`        usable Credits (earned + welcome). Spendable everywhere.
 *   `bonusCredits`   the slice of `credits` that arrived as a one-time welcome
 *                    grant. Spendable in games, markets and businesses, but
 *                    never transferable to another account.
 *   `lockedCredits`  guest reserve. Invisible to every spend path until the
 *                    profile is linked, then converted into the welcome grant.
 *
 * Nothing in this module touches the network or React so it can be unit tested
 * directly, and it is the single source of truth for the numbers below.
 */
import type { Player } from './types';

export type AuthProvider = 'guest' | 'google' | 'discord';

export interface ProviderSpec {
  id: AuthProvider;
  label: string;
  /** provider shown inside the link button */
  action: string;
  glyph: string;
  /** one-time welcome Credits the provider mints (guest value is a reserve) */
  welcome: number;
  /** extra Credits this provider adds on top of the guest reserve */
  topUp: number;
  permanent: boolean;
  /** whether the provider hands us a unique subject id we must dedupe on */
  uniqueSubject: boolean;
  blurb: string;
  tint: string;
}

export const PROVIDERS: Record<AuthProvider, ProviderSpec> = {
  guest: {
    id: 'guest',
    label: 'Guest',
    action: 'Play as guest',
    glyph: '👤',
    welcome: 100,
    topUp: 0,
    permanent: false,
    uniqueSubject: false,
    blurb: '100 Credits are reserved for you. They unlock the moment you link Google or Discord.',
    tint: 'from-white/12',
  },
  google: {
    id: 'google',
    label: 'Google',
    action: 'Continue with Google',
    glyph: '🔗',
    welcome: 100,
    topUp: 0,
    permanent: true,
    uniqueSubject: true,
    blurb: 'Linking Google converts your reserved 100 Credits into 100 usable Credits. Permanent account.',
    tint: 'from-cyanx-400/25',
  },
  discord: {
    id: 'discord',
    label: 'Discord',
    action: 'Continue with Discord',
    glyph: '🎮',
    welcome: 300,
    topUp: 200,
    permanent: true,
    uniqueSubject: true,
    blurb: 'Linking Discord converts your 100 reserved Credits into 300 usable Credits. One grant per Discord account.',
    tint: 'from-flame-500/30',
  },
};

export const PROVIDER_ORDER: AuthProvider[] = ['guest', 'google', 'discord'];

export function providerSpec(provider: AuthProvider): ProviderSpec {
  return PROVIDERS[provider] ?? PROVIDERS.guest;
}

/** The published rules, in one place, for UI copy and documentation. */
export const ACCOUNT_RULES = {
  guestReserve: PROVIDERS.guest.welcome,
  googleWelcome: PROVIDERS.google.welcome,
  discordWelcome: PROVIDERS.discord.welcome,
  discordTopUp: PROVIDERS.discord.topUp,
  guestTtlDays: 90,
  guestPrefix: 'Guest_',
} as const;

/* ------------------------------------------------------------------ *
 * Provider subject handling
 * ------------------------------------------------------------------ */

/**
 * Provider handle → stable dedupe subject. Real OAuth hands us an opaque
 * subject id; the manual fallback path accepts the handle a player types, so
 * normalise both into one canonical key.
 */
export function normaliseSubject(raw: string): string {
  return raw
    .trim()
    .replace(/^@+/, '')
    .replace(/\s+/g, '')
    .toLowerCase();
}

export function subjectProblem(provider: AuthProvider, raw: string): string | null {
  const clean = normaliseSubject(raw);
  if (provider === 'guest') return null;
  if (clean.length < 3) return `Enter the ${providerSpec(provider).label} handle you want to link (at least 3 characters).`;
  if (clean.length > 64) return 'That handle is too long.';
  if (!/^[a-z0-9._:#-]+$/.test(clean)) return 'Handles can use letters, numbers and . _ : # - only.';
  return null;
}

/** Canonical key used to guarantee one welcome grant per provider account. */
export function claimKey(provider: AuthProvider, subject: string): string {
  return `${provider}:${normaliseSubject(subject)}`;
}

/* ------------------------------------------------------------------ *
 * Credit buckets
 * ------------------------------------------------------------------ */

/** Credits the player can actually use right now (earned + welcome grant). */
export function usableCredits(player: Pick<Player, 'credits'>): number {
  return Math.max(0, Math.round(player.credits));
}

/** Credits sitting in the guest reserve — visible, spendable by nothing. */
export function reservedCredits(player: Pick<Player, 'lockedCredits'> | null | undefined): number {
  return Math.max(0, Math.round(player?.lockedCredits ?? 0));
}

/** Everything the profile holds, including the frozen reserve. */
export function totalCredits(player: Pick<Player, 'credits' | 'lockedCredits'>): number {
  return usableCredits(player) + reservedCredits(player);
}

/**
 * Credits that may leave the profile (transfers, tips). Welcome grants are
 * spendable but never transferable, so they are subtracted here.
 */
export function transferableCredits(player: Pick<Player, 'credits' | 'bonusCredits'>): number {
  return Math.max(0, usableCredits(player) - Math.max(0, Math.round(player.bonusCredits ?? 0)));
}

export function isLinked(player: Pick<Player, 'provider'> | null | undefined): boolean {
  return Boolean(player && player.provider && player.provider !== 'guest');
}

/**
 * Spend Credits: earned balance first, welcome grant last. Returns the amount
 * actually debited so callers can refuse partial spends.
 */
export function debitCredits(player: Player, amount: number): number {
  const value = Math.max(0, Math.round(amount));
  if (value <= 0) return 0;
  const available = usableCredits(player);
  const debited = Math.min(value, available);
  if (debited <= 0) return 0;
  const earned = Math.max(0, usableCredits(player) - Math.max(0, player.bonusCredits ?? 0));
  const fromEarned = Math.min(earned, debited);
  const fromBonus = debited - fromEarned;
  player.credits = available - debited;
  player.bonusCredits = Math.max(0, Math.round((player.bonusCredits ?? 0) - fromBonus));
  normaliseCreditBuckets(player);
  return debited;
}

/** Credit an earned amount (game payout, daily login, mission, transfer in). */
export function creditEarned(player: Player, amount: number): number {
  const value = Math.max(0, Math.round(amount));
  if (value <= 0) return 0;
  player.credits = usableCredits(player) + value;
  normaliseCreditBuckets(player);
  return value;
}

/** Credit a welcome grant (one-time provider bonus). Never transferable. */
export function creditGrant(player: Player, amount: number): number {
  const value = Math.max(0, Math.round(amount));
  if (value <= 0) return 0;
  player.credits = usableCredits(player) + value;
  player.bonusCredits = Math.max(0, Math.round(player.bonusCredits ?? 0)) + value;
  normaliseCreditBuckets(player);
  return value;
}

/** Move the guest reserve into the usable welcome bucket. */
export function releaseReserve(player: Player): number {
  const reserve = reservedCredits(player);
  if (reserve <= 0) return 0;
  player.lockedCredits = 0;
  creditGrant(player, reserve);
  return reserve;
}

/** Keeps the buckets self-consistent after any mutation (games debit directly). */
export function normaliseCreditBuckets(player: Player): void {
  player.credits = Math.max(0, Math.round(player.credits ?? 0));
  player.bonusCredits = Math.max(0, Math.min(Math.round(player.bonusCredits ?? 0), player.credits));
  player.lockedCredits = Math.max(0, Math.round(player.lockedCredits ?? 0));
  if (isLinked(player)) player.lockedCredits = 0;
}

/* ------------------------------------------------------------------ *
 * Shape helpers for the store (kept here so migrations and creation agree)
 * ------------------------------------------------------------------ */
export interface IdentityFields {
  provider: AuthProvider;
  providerSubject: string | null;
  linkedAt: number | null;
  lockedCredits: number;
  bonusCredits: number;
  welcomeGrantClaimed: boolean;
}

export function identityFor(provider: AuthProvider, now = Date.now()): IdentityFields {
  return {
    provider,
    providerSubject: null,
    linkedAt: provider === 'guest' ? null : now,
    lockedCredits: provider === 'guest' ? PROVIDERS.guest.welcome : 0,
    bonusCredits: 0,
    welcomeGrantClaimed: false,
  };
}

export function providerLabel(provider: AuthProvider): string {
  return providerSpec(provider).label;
}

/** Guest countdown: null once linked, else whole days left (0 when expired). */
export function daysUntilExpiry(player: Pick<Player, 'provider' | 'guestExpiresAt'>, now = Date.now()): number | null {
  if (isLinked(player) || !player.guestExpiresAt) return null;
  return Math.max(0, Math.ceil((player.guestExpiresAt - now) / 86400000));
}
