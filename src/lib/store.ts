import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ACHIEVEMENTS,
  CARD_COSMETICS,
  SOLO_GAMES,
  STOCKS,
  TEASERS,
  TIER_BY_ID,
} from './catalog';
import {
  ECONOMY,
  applySeriesCode,
  buildStandings,
  ensureMarket,
  formatCredits,
  getDailyBonus,
  localDayKey,
  missionsFor,
  nextCombo,
  progressMissions,
  resolveCardTierId,
  seasonFor,
  shiftDayKey,
  syncMissions,
  weekKey,
} from './economy';
import type {
  ActivityEvent,
  BankCard,
  CardTierId,
  Challenge,
  Database,
  FriendLink,
  Mission,
  MissionMetric,
  Player,
  PlayerStats,
  PrivateRoom,
  RewardBundle,
  SeasonEvent,
} from './types';
import { syncToSupabase } from './supabase';

export const STORAGE_KEY = 'finb-platinum-v2';
const DB_VERSION = 2;

/* ------------------------------------------------------------------ *
 * Small helpers
 * ------------------------------------------------------------------ */
export function uid(prefix = 'id'): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export function initials(username: string): string {
  const clean = username.replace(/^Guest_/, '');
  return clean.slice(0, 2).toUpperCase();
}

export function makeCard(holder: string, tier: CardTierId = 'regular'): BankCard {
  const digits = () => `${Math.floor(Math.random() * 10)}`;
  const body = Array.from({ length: 11 }, digits).join('');
  const number = `7242 2024 ${body.slice(0, 4)} ${body.slice(4, 8)}${body.slice(8)}`.slice(0, 19);
  const year = new Date().getFullYear() + 4;
  return {
    number,
    cvv: `${Math.floor(100 + Math.random() * 900)}`,
    expiry: `${String(((new Date().getMonth() + 1) % 12) + 1).padStart(2, '0')}/${String(year).slice(-2)}`,
    holder,
    tier,
    frozen: false,
    issuedAt: Date.now(),
    serial: `FINB-${Math.random().toString(36).slice(2, 7).toUpperCase()}`,
    reissues: 0,
  };
}

function emptyStats(): PlayerStats {
  return {
    gamesPlayed: 0,
    gamesWon: 0,
    multiplayerPlayed: 0,
    multiplayerWon: 0,
    perfectStrikes: 0,
    bestReactionMs: 0,
    bestVaultRush: 0,
    bestStockSurge: 0,
    heistStars: 0,
    tipsGiven: 0,
    tipsReceived: 0,
    spectated: 0,
  };
}

export function emptyDatabase(): Database {
  return {
    version: DB_VERSION,
    players: [],
    currentId: null,
    market: { quotes: ensureMarket({}), lastTick: Date.now() },
    globalActivity: [],
    claimedPlayGamesTags: [],
    onboardingSeen: false,
    seasonSeenId: null,
    soundOn: true,
    tipsWallet: {},
    season: seasonFor(),
    lastSyncAt: 0,
  };
}

export const USERNAME_PATTERN = /^[a-zA-Z0-9_]{3,16}$/;

export function usernameProblem(username: string, players: Player[]): string | null {
  if (!username.trim()) return 'Choose a username to continue.';
  if (!USERNAME_PATTERN.test(username.trim())) return '3–16 characters: letters, numbers and underscores only.';
  const clean = username.trim().toLowerCase();
  const clash = players.some(player => {
    const existing = player.username.toLowerCase();
    // 'Guest_Vera' and 'Vera' are the same name to a human, so treat them alike.
    return existing === clean || existing.replace(/^guest_/, '') === clean;
  });
  if (clash) return 'That username is already taken on this device.';
  return null;
}

/* ------------------------------------------------------------------ *
 * Initialisation + persistence
 * ------------------------------------------------------------------ */
function pruneGuests(db: Database): Database {
  const now = Date.now();
  const survivors = db.players.filter(player => {
    const expired = !player.linked && player.guestExpiresAt && player.guestExpiresAt < now;
    if (expired) logActivity(db, 'social', `Guest profile ${player.username} expired after 90 days.`, null);
    return !expired;
  });
  return { ...db, players: survivors, currentId: survivors.some(player => player.id === db.currentId) ? db.currentId : survivors[0]?.id ?? null };
}

export function logActivity(db: Database, kind: ActivityEvent['kind'], title: string, amount: number | null): ActivityEvent {
  const event: ActivityEvent = { id: uid('act'), kind, title, amount, at: Date.now() };
  db.globalActivity = [event, ...db.globalActivity].slice(0, 60);
  return event;
}

export function hydrate(raw: string | null): Database {
  const fresh = emptyDatabase();
  if (!raw) return fresh;
  try {
    const parsed = JSON.parse(raw) as Database;
    const merged: Database = {
      ...fresh,
      ...parsed,
      version: DB_VERSION,
      market: { ...fresh.market, ...parsed.market, quotes: ensureMarket(parsed.market?.quotes ?? {}) },
      season: seasonFor(),
    };
    merged.players = (merged.players || []).map(player => ({
      ...player,
      card: player.card ? { ...player.card, reissues: player.card.reissues ?? 0 } : makeCard(player.username),
      friends: player.friends || [],
      challenges: player.challenges || [],
      rooms: player.rooms || [],
      activity: (player.activity || []).slice(0, 40),
      holdings: player.holdings || {},
      businesses: player.businesses || [],
      missions: player.missions?.length ? player.missions : missionsFor(localDayKey(), weekKey()),
      achievements: player.achievements || [],
      cosmetics: player.cosmetics || [],
      stats: { ...emptyStats(), ...player.stats },
      combo: player.combo || { streak: 0, best: 0, multiplier: 1, lastGameId: null, lastGameAt: 0 },
      onboardingRewards: player.onboardingRewards || [],
    }));
    return pruneGuests(merged);
  } catch {
    return fresh;
  }
}

let database: Database = typeof window === 'undefined' ? emptyDatabase() : hydrate(window.localStorage.getItem(STORAGE_KEY));
const listeners = new Set<() => void>();

export function getDatabase(): Database {
  return database;
}

export function setDatabase(next: Database) {
  database = next;
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* storage full or blocked: keep the in-memory copy alive */
    }
  }
  listeners.forEach(listener => listener());
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function update(recipe: (draft: Database) => void, sync = true) {
  const draft: Database = JSON.parse(JSON.stringify(database));
  recipe(draft);
  draft.season = seasonFor();
  setDatabase(draft);
  if (sync) void pushToCloud(draft);
}

let syncTimer: ReturnType<typeof setTimeout> | null = null;
async function pushToCloud(db: Database) {
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    const current = db.players.find(player => player.id === db.currentId);
    void syncToSupabase(current ? { player: current, market: db.market, season: db.season } : null).then(ok => {
      if (ok) {
        database = { ...database, lastSyncAt: Date.now() };
      }
    });
  }, 1200);
}

/* ------------------------------------------------------------------ *
 * React bindings
 * ------------------------------------------------------------------ */
export function useDatabase(): Database {
  const [snapshot, setSnapshot] = useState<Database>(() => database);
  useEffect(() => {
    setSnapshot(database);
    return subscribe(() => setSnapshot({ ...database }));
  }, []);
  return snapshot;
}

export function useCurrentUser(): Player | null {
  const db = useDatabase();
  return db.players.find(player => player.id === db.currentId) ?? null;
}

export function useToast() {
  const [toast, setToast] = useState<{ id: string; text: string; tone: 'good' | 'bad' | 'info'; icon?: string } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const show = useCallback((text: string, tone: 'good' | 'bad' | 'info' = 'good', icon?: string) => {
    if (timer.current) clearTimeout(timer.current);
    setToast({ id: uid('toast'), text, tone, icon });
    timer.current = setTimeout(() => setToast(null), 3600);
  }, []);
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);
  return { toast, show, clear: () => setToast(null) };
}

/* ------------------------------------------------------------------ *
 * Account lifecycle
 * ------------------------------------------------------------------ */
export interface CreateAccountInput {
  username: string;
  linked: boolean;
  playGamesTag?: string;
  referralCode?: string;
}

export interface MutationResult<T = Player> {
  ok: boolean;
  message: string;
  player?: T;
}

export function createAccount(input: CreateAccountInput): MutationResult {
  const db = getDatabase();
  const problem = usernameProblem(input.username, db.players);
  if (problem) return { ok: false, message: problem };

  const username = input.username.trim();
  const displayName = input.linked ? username : `Guest_${username}`;
  const now = Date.now();
  const tag = input.playGamesTag?.trim() || null;
  const tagTaken = tag ? db.claimedPlayGamesTags.includes(tag.toLowerCase()) : false;
  const linked = Boolean(input.linked && tag && !tagTaken);
  const player: Player = {
    id: uid('player'),
    username: displayName,
    displayName,
    linked,
    playGamesTag: linked ? tag : null,
    avatarSeed: `${username}-${now}`,
    credits: 0,
    liberals: 0,
    createdAt: now,
    lastSeenAt: now,
    streak: 0,
    lastDailyClaim: null,
    onboarded: false,
    onboardingStep: 0,
    onboardingRewards: [],
    card: makeCard(displayName),
    friends: [],
    challenges: [],
    rooms: [],
    activity: [],
    holdings: {},
    businesses: [],
    missions: missionsFor(localDayKey(), weekKey()),
    achievements: [],
    cosmetics: [],
    stats: emptyStats(),
    combo: { streak: 0, best: 0, multiplier: 1, lastGameId: null, lastGameAt: 0 },
    invitedBy: input.referralCode?.trim() || null,
    referralCode: `FINB-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
    referralClaimed: false,
    linkBonusClaimed: false,
    seriesGranted: false,
    platinumInvited: window.localStorage.getItem('finb-platinum-invite') === 'yes',
    guestExpiresAt: linked ? null : now + ECONOMY.guestTtlDays * 86400000,
  };

  let message = linked ? `Welcome aboard, ${displayName}. Play Games link confirmed for this device.` : `Welcome, ${displayName}. Guest rules apply.`;
  update(draft => {
    draft.players.push(player);
    draft.currentId = player.id;
    if (linked && tag) {
      draft.claimedPlayGamesTags.push(tag.toLowerCase());
      player.credits += ECONOMY.linkBonus;
      player.linkBonusClaimed = true;
      logActivity(draft, 'reward', `${displayName} linked Play Games and claimed the welcome award.`, ECONOMY.linkBonus);
    }
    draft.onboardingSeen = false;
  });
  if (linked) message += ` ${formatCredits(ECONOMY.linkBonus)} welcome Credits are in your balance.`;
  else if (input.linked && tag && tagTaken) message += ' That Play Games tag already claimed the welcome award on this device.';
  return { ok: true, message, player };
}

export function resumePlayer(id: string) {
  update(draft => {
    draft.currentId = id;
    const player = draft.players.find(item => item.id === id);
    if (player) player.lastSeenAt = Date.now();
  });
}

export function deleteLocalProfile(id: string) {
  update(draft => {
    draft.players = draft.players.filter(player => player.id !== id);
    if (draft.currentId === id) draft.currentId = draft.players[0]?.id ?? null;
  });
}

export function setOnboardingStep(step: number, reward?: { credits?: number; liberals?: number; id?: string }) {
  update(draft => {
    const player = draft.players.find(item => item.id === draft.currentId);
    if (!player) return;
    player.onboardingStep = Math.max(player.onboardingStep, step);
    // A step only pays once. Replaying the guide is free, farming it is not.
    const fresh = !reward?.id || !player.onboardingRewards.includes(reward.id);
    if (reward?.id && fresh) player.onboardingRewards.push(reward.id);
    if (!fresh) return;
    if (reward?.credits) {
      player.credits += reward.credits;
      player.activity.unshift({ id: uid('act'), kind: 'reward', title: 'Guide step reward', amount: reward.credits, at: Date.now() });
    }
    if (reward?.liberals) player.liberals += reward.liberals;
    if (reward?.liberals || reward?.credits) {
      player.activity = player.activity.slice(0, 40);
    }
  });
}

/** Ad-hoc reward bundle (guide steps, event grants, support gestures). */
export function grantReward(bundle: RewardBundle): MutationResult {
  const player = getDatabase().players.find(item => item.id === getDatabase().currentId);
  if (!player) return { ok: false, message: 'No active profile.' };
  const credits = Math.max(0, Math.round(bundle.credits ?? 0));
  const liberals = Math.max(0, Math.round(bundle.liberals ?? 0));
  update(draft => {
    const target = draft.players.find(item => item.id === draft.currentId);
    if (!target) return;
    target.credits += credits;
    target.liberals += liberals;
    if (bundle.cosmetic && !target.cosmetics.includes(bundle.cosmetic)) target.cosmetics.push(bundle.cosmetic);
    target.activity.unshift({ id: uid('act'), kind: 'reward', title: bundle.badge ?? 'Reward granted', amount: credits || null, at: Date.now() });
    target.activity = target.activity.slice(0, 40);
  });
  const parts = [credits ? `${credits} Credits` : null, liberals ? `${liberals} Liberals` : null].filter(Boolean).join(' and ');
  return { ok: true, message: parts ? `Granted ${parts}.` : 'Reward granted.' };
}

export function finishOnboarding() {
  update(draft => {
    draft.onboardingSeen = true;
    const player = draft.players.find(item => item.id === draft.currentId);
    if (!player) return;
    player.onboarded = true;
    // The welcome bundle and the Ember cosmetic are one-time: replays of the guide
    // (openGuide) must never pay out again.
    if (player.onboardingRewards.includes('welcome-bundle')) return;
    player.onboardingRewards.push('welcome-bundle');
    player.credits += 150;
    player.liberals += 5;
    if (!player.cosmetics.includes('ember')) player.cosmetics.push('ember');
    player.activity.unshift({ id: uid('act'), kind: 'reward', title: 'Guide completed — welcome bundle', amount: 150, at: Date.now() });
  });
}

export function linkPlayGames(tag: string): MutationResult {
  const db = getDatabase();
  const player = db.players.find(item => item.id === db.currentId);
  if (!player) return { ok: false, message: 'No active profile.' };
  const clean = tag.trim();
  if (clean.length < 3) return { ok: false, message: 'Enter a Play Games tag with at least 3 characters.' };
  if (player.linked) return { ok: false, message: `Already linked as ${player.playGamesTag ?? 'a Play Games tag'} on this device.` };
  if (db.claimedPlayGamesTags.includes(clean.toLowerCase())) {
    return { ok: false, message: 'That tag already claimed a welcome award on this device. Try another tag.' };
  }
  let awarded = 0;
  update(draft => {
    const target = draft.players.find(item => item.id === draft.currentId);
    if (!target) return;
    target.linked = true;
    target.playGamesTag = clean;
    target.username = target.username.replace(/^Guest_/, '');
    target.displayName = target.username;
    target.card.holder = target.username;
    target.guestExpiresAt = null;
    draft.claimedPlayGamesTags.push(clean.toLowerCase());
    if (!target.linkBonusClaimed) {
      target.linkBonusClaimed = true;
      target.credits += ECONOMY.linkBonus;
      awarded = ECONOMY.linkBonus;
      target.activity.unshift({ id: uid('act'), kind: 'reward', title: 'Play Games link award', amount: ECONOMY.linkBonus, at: Date.now() });
    }
  });
  return {
    ok: true,
    message: awarded
      ? `Linked. ${formatCredits(awarded)} Credits dropped into your balance, and guest expiry is cancelled.`
      : 'Linked. Guest expiry cancelled. This tag already used its welcome award.',
  };
}

/* ------------------------------------------------------------------ *
 * Rewards, referrals, combos
 * ------------------------------------------------------------------ */
export function claimDaily(): MutationResult {
  const db = getDatabase();
  const player = db.players.find(item => item.id === db.currentId);
  if (!player) return { ok: false, message: 'No active profile.' };
  const today = localDayKey();
  if (player.lastDailyClaim === today) return { ok: false, message: 'Today’s login reward is already banked.' };
  const streak = player.lastDailyClaim === shiftDayKey(today, -1) ? Number(player.streak || 0) + 1 : 1;
  const bonus = getDailyBonus(streak);
  const total = ECONOMY.dailyBase + bonus;
  update(draft => {
    const target = draft.players.find(item => item.id === draft.currentId);
    if (!target) return;
    target.streak = streak;
    target.lastDailyClaim = today;
    target.credits += total;
    target.liberals += 1;
    target.activity.unshift({ id: uid('act'), kind: 'reward', title: `Daily login day ${streak}`, amount: total, at: Date.now() });
    logActivity(draft, 'reward', `${target.username} claimed the day ${streak} login reward.`, total);
    bumpMission(target, 'liberals-earned', 1);
  });
  return { ok: true, message: `Day ${streak} banked: +${formatCredits(total)} Credits${bonus ? ` (includes the +${bonus} streak bonus)` : ''}.` };
}

export function claimMission(id: string): MutationResult {
  const db = getDatabase();
  const player = db.players.find(item => item.id === db.currentId);
  const mission = player?.missions.find(item => item.id === id);
  if (!player || !mission) return { ok: false, message: 'Challenge not found.' };
  if (mission.progress < mission.goal) return { ok: false, message: 'Not finished yet — keep going.' };
  if (mission.claimed) return { ok: false, message: 'Already claimed.' };
  update(draft => {
    const target = draft.players.find(item => item.id === draft.currentId);
    const found = target?.missions.find(item => item.id === id);
    if (!target || !found) return;
    found.claimed = true;
    target.credits += found.credits;
    target.liberals += found.liberals;
    target.activity.unshift({ id: uid('act'), kind: 'achievement', title: `${found.cycle === 'daily' ? 'Daily' : 'Weekly'} challenge · ${found.title}`, amount: found.credits, at: Date.now() });
  });
  return { ok: true, message: `Challenge claimed: +${formatCredits(mission.credits)} Credits and +${mission.liberals} Liberals.` };
}

export function claimReferral(code: string): MutationResult {
  const db = getDatabase();
  const player = db.players.find(item => item.id === db.currentId);
  if (!player) return { ok: false, message: 'No active profile.' };
  if (!player.linked) return { ok: false, message: 'Link a Play Games tag before claiming a referral.' };
  if (player.referralClaimed) return { ok: false, message: 'This profile already claimed a referral reward.' };
  const cleaner = code.trim().toUpperCase();
  const referrer = db.players.find(item => item.id !== player.id && item.referralCode === cleaner && item.linked);
  if (!referrer) return { ok: false, message: 'No linked member on this device owns that code. Try a floor player’s code or invite a friend first.' };
  update(draft => {
    const joiner = draft.players.find(item => item.id === draft.currentId);
    const owner = draft.players.find(item => item.id === referrer.id);
    if (!joiner || !owner) return;
    joiner.referralClaimed = true;
    joiner.invitedBy = owner.username;
    joiner.credits += ECONOMY.referralJoiner;
    joiner.liberals += 2;
    owner.credits += ECONOMY.referralReferrer;
    joiner.activity.unshift({ id: uid('act'), kind: 'referral', title: `Referral from ${owner.username}`, amount: ECONOMY.referralJoiner, at: Date.now() });
    logActivity(draft, 'referral', `${joiner.username} joined via ${owner.username}’s invite.`, ECONOMY.referralReferrer);
    grantAchievement(joiner, 'referral');
  });
  return { ok: true, message: `Referral applied: +${ECONOMY.referralJoiner} Credits for you, +${ECONOMY.referralReferrer} for ${referrer.username}.` };
}

export function grantAchievement(player: Player, id: string): boolean {
  if (player.achievements.includes(id)) return false;
  const definition = ACHIEVEMENTS.find(item => item.id === id);
  if (!definition) return false;
  player.achievements.push(id);
  player.liberals += definition.liberals;
  player.activity.unshift({ id: uid('act'), kind: 'achievement', title: `Achievement · ${definition.name}`, amount: null, at: Date.now() });
  return true;
}

export function bumpMission(player: Player, metric: MissionMetric, amount: number) {
  const missions = player.missions.map(mission => (mission.metric === metric ? { ...mission, progress: Math.min(mission.goal, mission.progress + amount) } : mission));
  player.missions = missions;
}

/* ------------------------------------------------------------------ *
 * Game results
 * ------------------------------------------------------------------ */
export interface GameResult {
  gameId: string;
  credits: number;
  liberals: number;
  won: boolean;
  title: string;
  message?: string;
  score?: number;
  meta?: Record<string, number>;
}

export interface ResolvedResult extends GameResult {
  rawCredits: number;
  multiplier: number;
  missionsCompleted: Mission[];
  achievements: string[];
}

export function completeGame(result: GameResult): ResolvedResult {
  const db = getDatabase();
  const player = db.players.find(item => item.id === db.currentId);
  const combo = nextCombo(player?.combo ?? { streak: 0, best: 0, multiplier: 1, lastGameId: null, lastGameAt: 0 }, result.gameId, result.won);
  const season = db.season ?? seasonFor();
  const raw = Math.round(Number(result.credits || 0));
  const credits = Math.round(raw * combo.multiplier * season.multiplier);
  const resolved: ResolvedResult = {
    ...result,
    credits,
    rawCredits: raw,
    multiplier: combo.multiplier * season.multiplier,
    missionsCompleted: [],
    achievements: [],
  };

  update(draft => {
    const target = draft.players.find(item => item.id === draft.currentId);
    if (!target) return;
    target.credits = Math.max(0, target.credits + credits);
    target.liberals += result.liberals || 0;
    target.combo = combo;
    target.stats.gamesPlayed += 1;
    if (result.won) target.stats.gamesWon += 1;
    const isMulti = (result.meta?.players ?? 1) > 1;
    if (isMulti) {
      target.stats.multiplayerPlayed += 1;
      if (result.won) target.stats.multiplayerWon += 1;
    }
    target.activity.unshift({ id: uid('act'), kind: 'game', title: result.title, amount: credits, at: Date.now() });
    target.activity = target.activity.slice(0, 40);

    if (result.meta?.bestVaultRush && result.meta.bestVaultRush > target.stats.bestVaultRush) target.stats.bestVaultRush = result.meta.bestVaultRush;
    if (result.meta?.bestStockSurge && result.meta.bestStockSurge > target.stats.bestStockSurge) target.stats.bestStockSurge = result.meta.bestStockSurge;
    if (result.meta?.perfectStrikes) target.stats.perfectStrikes += result.meta.perfectStrikes;
    if (result.meta?.heistStars && result.meta.heistStars > target.stats.heistStars) target.stats.heistStars = result.meta.heistStars;

    const metricEvents: { metric: MissionMetric; amount: number; gameId?: string }[] = [
      { metric: 'play-games', amount: 1, gameId: result.gameId },
      { metric: 'earn-credits', amount: Math.max(0, credits) },
      { metric: 'game-credits', amount: Math.max(0, credits), gameId: result.gameId },
      { metric: 'liberals-earned', amount: result.liberals || 0 },
    ];
    if (result.won) metricEvents.push({ metric: 'win-games', amount: 1 });
    if (result.won && isMulti) metricEvents.push({ metric: 'multiplayer-wins', amount: 1 });
    if (result.meta?.perfectStrikes) metricEvents.push({ metric: 'perfect-strikes', amount: result.meta.perfectStrikes });
    const progress = progressMissions(target.missions, metricEvents);
    target.missions = progress.missions;
    if (progress.credits) target.credits += progress.credits;
    if (progress.liberals) target.liberals += progress.liberals;
    resolved.missionsCompleted = progress.completed;

    const unlocks = new Set<string>();
    const tryUnlock = (id: string) => {
      if (grantAchievement(target, id)) unlocks.add(id);
    };
    tryUnlock('first-game');
    if (result.won) tryUnlock('first-win');
    if (target.stats.gamesPlayed >= 5) tryUnlock('five-games');
    if (isMulti) tryUnlock('multiplayer');
    if (combo.streak >= 5) tryUnlock('combo-5');
    if ((result.meta?.bestVaultRush ?? 0) >= 300) tryUnlock('runner-300');
    if (target.stats.perfectStrikes >= 10) tryUnlock('forge-perfect');
    if ((result.meta?.heistStars ?? 0) >= 3) tryUnlock('heist-3star');
    if (target.stats.gamesPlayed >= 1 && season) tryUnlock('season');
    if (season && !target.cosmetics.includes(season.cosmetic)) target.cosmetics.push(season.cosmetic);
    resolved.achievements = [...unlocks];
    target.card.tier = resolveCardTierId(target, draft.players, draft.currentId);
  });

  return resolved;
}

/* ------------------------------------------------------------------ *
 * Social: friends, transfers, challenges, rooms, spectating
 * ------------------------------------------------------------------ */
export function addFriend(username: string): MutationResult<FriendLink> {
  const db = getDatabase();
  const player = db.players.find(item => item.id === db.currentId);
  if (!player) return { ok: false, message: 'No active profile.' };
  const target = username.trim().replace(/^@/, '');
  if (!target) return { ok: false, message: 'Type a username to search.' };
  if (player.friends.some(friend => friend.username.toLowerCase() === target.toLowerCase())) return { ok: false, message: `${target} is already in your circle.` };
  const directory = buildStandings(db.players, db.currentId);
  const found = directory.find(row => row.username.toLowerCase() === target.toLowerCase());
  if (!found) return { ok: false, message: `No member named ${target} on this device. Invite them or use a floor player’s name.` };
  const link: FriendLink = { id: found.id, username: found.username, addedAt: Date.now(), favourite: false, emote: null };
  update(draft => {
    const self = draft.players.find(item => item.id === draft.currentId);
    if (!self) return;
    self.friends.push(link);
    if (self.friends.length >= 3) grantAchievement(self, 'social-3');
    bumpMission(self, 'friends-added', 1);
    self.activity.unshift({ id: uid('act'), kind: 'social', title: `Added ${found.username} to your circle`, amount: null, at: Date.now() });
    logActivity(draft, 'social', `${self.username} linked up with ${found.username}.`, null);
  });
  return { ok: true, message: `${found.username} joined your circle. Friends can now receive instant transfers.`, player: link };
}

export function removeFriend(id: string) {
  update(draft => {
    const self = draft.players.find(item => item.id === draft.currentId);
    if (!self) return;
    self.friends = self.friends.filter(friend => friend.id !== id);
  });
}

export function sendTransfer(recipient: string, amount: number, note: string): MutationResult {
  const db = getDatabase();
  const player = db.players.find(item => item.id === db.currentId);
  if (!player) return { ok: false, message: 'No active profile.' };
  const value = Math.round(Number(amount));
  if (!Number.isFinite(value) || value <= 0) return { ok: false, message: 'Enter an amount above zero.' };
  if (value > player.credits) return { ok: false, message: 'Not enough Credits for that transfer.' };
  const friend = player.friends.find(item => item.username.toLowerCase() === recipient.toLowerCase());
  if (!friend) return { ok: false, message: 'Pick a friend from your circle first.' };
  update(draft => {
    const self = draft.players.find(item => item.id === draft.currentId);
    if (!self) return;
    self.credits -= value;
    self.activity.unshift({ id: uid('act'), kind: 'transfer', title: `Transfer to ${friend.username}${note ? ` · ${note}` : ''}`, amount: -value, at: Date.now() });
    bumpMission(self, 'transfers-sent', 1);
    const local = draft.players.find(item => item.id === friend.id);
    if (local) {
      local.credits += value;
      local.activity.unshift({ id: uid('act'), kind: 'transfer', title: `Transfer from ${self.username}${note ? ` · ${note}` : ''}`, amount: value, at: Date.now() });
    }
    logActivity(draft, 'transfer', `${self.username} sent ${formatCredits(value)} Credits to ${friend.username}.`, value);
  });
  return { ok: true, message: `Sent ${formatCredits(value)} Credits to ${friend.username}.` };
}

export function tipPlayer(username: string, amount: number): MutationResult {
  const db = getDatabase();
  const player = db.players.find(item => item.id === db.currentId);
  if (!player) return { ok: false, message: 'No active profile.' };
  const value = Math.max(1, Math.round(amount));
  if (value > player.credits) return { ok: false, message: 'Not enough Credits to tip that much.' };
  update(draft => {
    const self = draft.players.find(item => item.id === draft.currentId);
    if (!self) return;
    self.credits -= value;
    self.stats.tipsGiven += 1;
    grantAchievement(self, 'tipster');
    self.activity.unshift({ id: uid('act'), kind: 'social', title: `Tipped ${username}`, amount: -value, at: Date.now() });
    draft.tipsWallet[username] = (draft.tipsWallet[username] ?? 0) + value;
    logActivity(draft, 'social', `${self.username} tipped ${username} for a lovely play.`, value);
  });
  return { ok: true, message: `Tipped ${username} ${formatCredits(value)} Credits.` };
}

export function sendChallenge(username: string, gameId: string, target: number): MutationResult {
  const db = getDatabase();
  const player = db.players.find(item => item.id === db.currentId);
  if (!player) return { ok: false, message: 'No active profile.' };
  const challenge: Challenge = {
    id: uid('chal'),
    fromUsername: player.username,
    toUsername: username,
    gameId,
    target: Math.round(target),
    metric: 'score',
    createdAt: Date.now(),
    state: 'open',
    reward: 80,
  };
  update(draft => {
    const self = draft.players.find(item => item.id === draft.currentId);
    if (!self) return;
    self.challenges.unshift(challenge);
    self.challenges = self.challenges.slice(0, 12);
    self.activity.unshift({ id: uid('act'), kind: 'social', title: `Challenged ${username} in ${gameId}`, amount: null, at: Date.now() });
    logActivity(draft, 'social', `${self.username} challenged ${username}: beat ${formatCredits(target)}.`, null);
  });
  return { ok: true, message: `Challenge sent to ${username}. Beat ${formatCredits(target)} to take the pot.` };
}

export function resolveChallenge(id: string, score: number): MutationResult {
  const db = getDatabase();
  const player = db.players.find(item => item.id === db.currentId);
  const challenge = player?.challenges.find(item => item.id === id);
  if (!player || !challenge || challenge.state !== 'open') return { ok: false, message: 'Challenge unavailable.' };
  const won = score >= challenge.target;
  update(draft => {
    const self = draft.players.find(item => item.id === draft.currentId);
    const found = self?.challenges.find(item => item.id === id);
    if (!self || !found) return;
    found.state = won ? 'won' : 'lost';
    if (won) {
      self.credits += found.reward;
      self.liberals += 2;
      self.activity.unshift({ id: uid('act'), kind: 'social', title: `Won challenge from ${found.fromUsername}`, amount: found.reward, at: Date.now() });
    }
  });
  return { ok: true, message: won ? `Challenge beaten. +${challenge.reward} Credits.` : 'Challenge closed — target not reached this time.' };
}

export function createRoom(name: string, mode: string): { ok: boolean; message: string; room?: PrivateRoom } {
  const db = getDatabase();
  const player = db.players.find(item => item.id === db.currentId);
  if (!player) return { ok: false, message: 'No active profile.' };
  const room: PrivateRoom = {
    code: Math.random().toString(36).slice(2, 7).toUpperCase(),
    name: name.trim() || 'Private Vault',
    hostUsername: player.username,
    members: [player.username, ...player.friends.slice(0, 4).map(friend => friend.username)],
    mode,
    createdAt: Date.now(),
    chat: [{ id: uid('msg'), from: 'FINB Sprite', text: 'Room is live. Invite codes work on this device.', at: Date.now() }],
  };
  update(draft => {
    const self = draft.players.find(item => item.id === draft.currentId);
    if (!self) return;
    self.rooms.unshift(room);
    self.rooms = self.rooms.slice(0, 6);
    self.activity.unshift({ id: uid('act'), kind: 'social', title: `Opened private room ${room.code}`, amount: null, at: Date.now() });
  });
  return { ok: true, message: `Private room ${room.code} created for ${room.members.length} players.`, room };
}

export function setRoomChat(roomCode: string, text: string, from: string) {
  update(draft => {
    const self = draft.players.find(item => item.id === draft.currentId);
    const room = self?.rooms.find(item => item.code === roomCode);
    if (!room) return;
    room.chat.push({ id: uid('msg'), from, text: text.slice(0, 160), at: Date.now() });
    room.chat = room.chat.slice(-24);
  });
}

export function toggleFavourite(friendId: string) {
  update(draft => {
    const self = draft.players.find(item => item.id === draft.currentId);
    const friend = self?.friends.find(item => item.id === friendId);
    if (!friend) return;
    friend.favourite = !friend.favourite;
  });
}

export function setFriendEmote(friendId: string, emote: string) {
  update(draft => {
    const self = draft.players.find(item => item.id === draft.currentId);
    const friend = self?.friends.find(item => item.id === friendId);
    if (!friend) return;
    friend.emote = emote;
  });
}

export function toggleSound() {
  update(draft => {
    draft.soundOn = !draft.soundOn;
  }, false);
}

export function applySeriesToCurrent(): MutationResult {
  update(draft => {
    const self = draft.players.find(item => item.id === draft.currentId);
    if (!self) return;
    self.seriesGranted = true;
    self.card.tier = 'series';
    self.activity.unshift({ id: uid('act'), kind: 'card', title: 'FINBSeries authority granted', amount: null, at: Date.now() });
    logActivity(draft, 'card', `${self.username} unlocked FINBSeries authority.`, null);
  });
  return { ok: true, message: 'FINBSeries granted. Highest authority card issued.' };
}

export function toggleCardFreeze(): MutationResult {
  let frozen = false;
  update(draft => {
    const self = draft.players.find(item => item.id === draft.currentId);
    if (!self) return;
    self.card.frozen = !self.card.frozen;
    frozen = self.card.frozen;
    self.activity.unshift({ id: uid('act'), kind: 'card', title: self.card.frozen ? 'Card frozen in game' : 'Card unfrozen in game', amount: null, at: Date.now() });
  });
  return { ok: true, message: frozen ? 'Card frozen. Game-state only — nothing real was touched.' : 'Card unfrozen and back in play.' };
}

export function reissueCard(): MutationResult {
  update(draft => {
    const self = draft.players.find(item => item.id === draft.currentId);
    if (!self) return;
    const tier = self.card.tier;
    self.card = { ...makeCard(self.username, tier), reissues: self.card.reissues + 1 };
    self.activity.unshift({ id: uid('act'), kind: 'card', title: `Card reissued (rotation ${self.card.reissues})`, amount: null, at: Date.now() });
    logActivity(draft, 'card', `${self.username} rotated their fictional card credentials.`, null);
  });
  return { ok: true, message: 'New fictional credentials issued. The old number and CVV are retired.' };
}

export function exportLocalData(): string {
  return JSON.stringify(getDatabase(), null, 2);
}

export function isSeriesCode(code: string) {
  return applySeriesCode({} as Player, code);
}

/* ------------------------------------------------------------------ *
 * Market actions
 * ------------------------------------------------------------------ */
export function tradeStock(symbol: string, quantity: number, side: 'buy' | 'sell'): MutationResult {
  const db = getDatabase();
  const player = db.players.find(item => item.id === db.currentId);
  if (!player) return { ok: false, message: 'No active profile.' };
  const quote = db.market.quotes[symbol];
  const stock = STOCKS.find(item => item.symbol === symbol);
  if (!quote || !stock) return { ok: false, message: 'Unknown ticker.' };
  const shares = Math.floor(quantity);
  if (shares <= 0) return { ok: false, message: 'Choose at least one share.' };
  const cost = Number((shares * quote.price).toFixed(2));
  const holding = player.holdings[symbol] ?? { shares: 0, basis: 0 };
  if (side === 'buy' && cost > player.credits) return { ok: false, message: 'Not enough Credits for that order.' };
  if (side === 'sell' && shares > holding.shares) return { ok: false, message: 'You do not hold that many shares.' };

  update(draft => {
    const self = draft.players.find(item => item.id === draft.currentId);
    if (!self) return;
    const current = self.holdings[symbol] ?? { shares: 0, basis: 0 };
    if (side === 'buy') {
      self.credits -= cost;
      self.holdings[symbol] = { shares: current.shares + shares, basis: Number((current.basis + cost).toFixed(2)) };
    } else {
      const soldBasis = current.shares ? (current.basis / current.shares) * shares : 0;
      self.credits += cost;
      self.holdings[symbol] = { shares: current.shares - shares, basis: Number(Math.max(0, current.basis - soldBasis).toFixed(2)) };
    }
    self.activity.unshift({ id: uid('act'), kind: 'trade', title: `${side === 'buy' ? 'Bought' : 'Sold'} ${shares} ${symbol}`, amount: side === 'buy' ? -cost : cost, at: Date.now() });
    bumpMission(self, 'market-trades', 1);
  });
  return { ok: true, message: `${side === 'buy' ? 'Bought' : 'Sold'} ${shares} ${symbol} at ${formatCredits(quote.price, 2)} Credits per share.` };
}

export function tickMarket(symbol?: string) {
  update(draft => {
    const target = symbol ?? STOCKS[Math.floor(Math.random() * STOCKS.length)].symbol;
    const stock = STOCKS.find(item => item.symbol === target);
    if (!stock) return;
    const quote = draft.market.quotes[target];
    const previous = quote?.price ?? stock.base;
    const shock = (Math.random() - 0.48) * previous * (0.02 + stock.drift * 14);
    const pull = (stock.base - previous) * 0.03;
    const price = Math.max(1, Number((previous + shock + pull).toFixed(2)));
    draft.market.quotes[target] = {
      symbol: target,
      price,
      previous,
      series: [...(quote?.series ?? []), price].slice(-36),
      updatedAt: Date.now(),
    };
    draft.market.lastTick = Date.now();
  }, false);
}

export function runBusiness(id: string): MutationResult {
  const db = getDatabase();
  const player = db.players.find(item => item.id === db.currentId);
  const business = player?.businesses.find(item => item.id === id);
  if (!player || !business) return { ok: false, message: 'Business not found.' };
  const minutes = Math.min(720, (Date.now() - business.lastCollectedAt) / 60000);
  const earnings = Math.round(minutes * business.yieldPerMinute);
  if (earnings < 1) return { ok: false, message: 'Still brewing — check back in a moment.' };
  update(draft => {
    const self = draft.players.find(item => item.id === draft.currentId);
    const found = self?.businesses.find(item => item.id === id);
    if (!self || !found) return;
    found.lastCollectedAt = Date.now();
    found.totalEarned += earnings;
    self.credits += earnings;
    self.activity.unshift({ id: uid('act'), kind: 'business', title: `${found.name} payout`, amount: earnings, at: Date.now() });
  });
  return { ok: true, message: `${business.name} paid out ${formatCredits(earnings)} Credits.` };
}

export function buyBusiness(id: string, name: string, cost: number, yieldPerMinute: number): MutationResult {
  const db = getDatabase();
  const player = db.players.find(item => item.id === db.currentId);
  if (!player) return { ok: false, message: 'No active profile.' };
  if (player.credits < cost) return { ok: false, message: 'Not enough Credits to open that business yet.' };
  update(draft => {
    const self = draft.players.find(item => item.id === draft.currentId);
    if (!self) return;
    self.credits -= cost;
    self.businesses.push({ id, name, cost, yieldPerMinute, owned: true, lastCollectedAt: Date.now(), totalEarned: 0 });
    self.activity.unshift({ id: uid('act'), kind: 'business', title: `Opened ${name}`, amount: -cost, at: Date.now() });
  });
  return { ok: true, message: `${name} is open for business.` };
}

/* ------------------------------------------------------------------ *
 * Utility selectors
 * ------------------------------------------------------------------ */
export function currentTier(player: Player) {
  return TIER_BY_ID[player.card.tier] ?? TIER_BY_ID.regular;
}

export function tierProgress(player: Player): { next: string; percent: number } {
  const tiers = Object.values(TIER_BY_ID).filter(tier => tier.minCredits && tier.minCredits > player.credits);
  const next = tiers.sort((a, b) => (a.minCredits ?? 0) - (b.minCredits ?? 0))[0];
  if (!next?.minCredits) return { next: 'Highest live tier reached', percent: 100 };
  const previous = Object.values(TIER_BY_ID)
    .filter(tier => tier.minCredits && tier.minCredits <= player.credits)
    .sort((a, b) => (b.minCredits ?? 0) - (a.minCredits ?? 0))[0];
  const floor = previous?.minCredits ?? 0;
  const percent = Math.round(((player.credits - floor) / (next.minCredits - floor)) * 100);
  return { next: next.name, percent: Math.min(99, Math.max(0, percent)) };
}

export function cosmeticFor(id: string) {
  return CARD_COSMETICS.find(item => item.id === id);
}

export const SOLO_IDS = SOLO_GAMES.map(game => game.id);
export const TEASER_IDS = TEASERS.map(teaser => teaser.id);
export type { Mission, MissionMetric, Player, StandingRow, SeasonEvent } from './types';
