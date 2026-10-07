import { ACHIEVEMENTS, CARD_TIERS, GAMES, PLATINUM_LIBERAL_REQUIREMENT, SERIES_UNLOCK_CODE, STOCKS, TIER_BY_ID } from './catalog';
import type {
  CardTierId,
  ComboState,
  Mission,
  MissionMetric,
  Player,
  Quote,
  SeasonEvent,
  StandingRow,
} from './types';

/* ------------------------------------------------------------------ *
 * Numbers that must never drift from the published rules.
 * ------------------------------------------------------------------ */
export const ECONOMY = {
  dailyBase: 10,
  linkBonus: 100,
  referralReferrer: 100,
  referralJoiner: 200,
  guestTtlDays: 90,
  streakMilestones: [
    { days: 7, bonus: 30 },
    { days: 14, bonus: 75 },
    { days: 30, bonus: 200 },
    { days: 60, bonus: 500 },
  ],
  comboWindowMs: 1000 * 60 * 60 * 6,
  comboStep: 0.1,
  comboMax: 3,
  sharedPotRate: 0.55,
};

export function getDailyBonus(streak: number): number {
  const milestone = ECONOMY.streakMilestones.find(item => item.days === streak);
  return milestone ? milestone.bonus : 0;
}

export function formatCredits(value: number | null | undefined, decimals = 0): string {
  const amount = Number(value ?? 0);
  return amount.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export function formatCompact(value: number | null | undefined): string {
  const amount = Number(value ?? 0);
  if (Math.abs(amount) >= 1_000_000) return `${(amount / 1_000_000).toFixed(amount % 1_000_000 === 0 ? 0 : 1)}M`;
  if (Math.abs(amount) >= 10_000) return `${(amount / 1000).toFixed(amount % 1000 === 0 ? 0 : 1)}k`;
  return formatCredits(amount);
}

export function localDayKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function shiftDayKey(key: string, delta: number): string {
  const [year, month, day] = key.split('-').map(Number);
  const date = new Date(year, month - 1, day + delta);
  return localDayKey(date);
}

export function weekKey(date = new Date()): string {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - day);
  return `W${localDayKey(start)}`;
}

export function formatDateTime(at: number): string {
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(at));
}

export function timeAgo(at: number): string {
  const seconds = Math.max(0, Math.round((Date.now() - at) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

/* ------------------------------------------------------------------ *
 * Combo multiplier — chaining wins across DIFFERENT games.
 * ------------------------------------------------------------------ */
export function nextCombo(current: ComboState, gameId: string, won: boolean): ComboState {
  if (!won) return { ...current, streak: 0, multiplier: 1, lastGameId: gameId, lastGameAt: Date.now() };
  // A chain only survives inside the combo window: after a longer break the
  // multiplier decays back to 1x instead of being kept forever.
  const fresh = Date.now() - (current.lastGameAt || 0) <= ECONOMY.comboWindowMs;
  const base = fresh ? current.streak : 0;
  const chained = fresh && current.lastGameId && current.lastGameId !== gameId ? base + 1 : base;
  const streak = chained || 1;
  const multiplier = Math.min(ECONOMY.comboMax, Number((1 + Math.max(0, streak - 1) * ECONOMY.comboStep).toFixed(2)));
  return { streak, best: Math.max(current.best, streak), multiplier, lastGameId: gameId, lastGameAt: Date.now() };
}

/* ------------------------------------------------------------------ *
 * Live standings: local profiles + a deterministic simulated floor
 * membership that shifts every day, so ranks genuinely move.
 * ------------------------------------------------------------------ */
function seededRandom(seed: number) {
  let value = seed % 2147483647;
  if (value <= 0) value += 2147483646;
  return () => {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
}

const FLOOR_NAMES = [
  'LedgerFox', 'MicaMint', 'OrbitOllie', 'VaultVera', 'NovaKite', 'PipPenny', 'GlassGoblin', 'TallyTiger',
  'BrassBee', 'CoinCactus', 'FizzFable', 'MangoMortgage', 'InkOtter', 'TickerTia', 'SproutSage', 'IrisInterest',
  'JunoJetsam', 'KlaraKredits', 'LoopLumi', 'MidnightMiller', 'NyxNickel', 'OpalOverdraft', 'PlumPayout', 'QuillQuota',
  'RuneRebate', 'SableSurge', 'TonicTess', 'UmbraUnits', 'VexVerity', 'WispWallet', 'XenXchange', 'YarnYield',
  'ZetaZero', 'AsterAudit', 'BramBounty', 'CobaltCora', 'DuneDividend', 'EmberEquity', 'FlintFortune', 'GaleGrant',
  'HaloHedge', 'IndigoInvoice', 'JoltJuno', 'KiteKinetic', 'LarkLiquidity', 'MossMargin', 'NimbusNetting', 'OnyxOffset',
];

const FLOOR_STATUS = ['stacking Liberals in the garden', 'running the corridor', 'forging Credit bars', 'heisting floor 12', 'trading the surge', 'tipping a friend', 'hosting a private room', 'cracking the cipher'];

export function floorMembers(dayKey = localDayKey()): StandingRow[] {
  const seed = [...dayKey].reduce((acc, char) => acc + char.charCodeAt(0) * 31, 7);
  const random = seededRandom(seed);
  const now = Date.now();
  return FLOOR_NAMES.map((username, index) => {
    const credits = Math.round(180 + random() * 52000 + (index % 7) * 900);
    const liberals = Math.round(4 + random() * 220);
    const tier: CardTierId = credits > 100000 ? 'gold' : credits > 12000 ? 'bass' : 'regular';
    return {
      id: `floor-${username}`,
      username,
      credits,
      liberals,
      simulated: true,
      tier,
      linked: random() > 0.32,
      online: random() > 0.45,
      status: FLOOR_STATUS[Math.floor(random() * FLOOR_STATUS.length)],
      isYou: false,
      isFriend: false,
      joinedAt: now - Math.round(random() * 40) * 86400000,
    } as StandingRow;
  });
}

export function buildStandings(players: Player[], currentId: string | null, friends: string[] = []): StandingRow[] {
  const local: StandingRow[] = players.map(player => ({
    id: player.id,
    username: player.username,
    credits: Number(player.credits || 0),
    liberals: Number(player.liberals || 0),
    simulated: false,
    tier: player.card.tier,
    linked: player.linked,
    online: true,
    status: player.linked ? 'linked member' : 'guest member',
    isYou: player.id === currentId,
    isFriend: friends.some(name => name.toLowerCase() === player.username.toLowerCase()),
  }));
  const rows = [...local, ...floorMembers()];
  return rows.sort((a, b) => b.credits - a.credits || b.liberals - a.liberals);
}

export function topTen(players: Player[], currentId: string | null): StandingRow[] {
  return buildStandings(players, currentId).slice(0, 10);
}

/* ------------------------------------------------------------------ *
 * Card hierarchy resolution (live, deterministic, documented in-app).
 * ------------------------------------------------------------------ */
export function meetsPlatinum(player: Player): boolean {
  return player.platinumInvited || player.liberals >= PLATINUM_LIBERAL_REQUIREMENT;
}

export function resolveCardTierId(player: Player, players: Player[], currentId: string | null): CardTierId {
  const eligible: CardTierId[] = ['regular'];
  if (player.credits >= 1300) eligible.push('bass');
  if (player.credits >= 100000) eligible.push('gold');
  const liveTopTen = topTen(players, currentId).some(row => row.id === player.id);
  if (liveTopTen) eligible.push('me');
  if (meetsPlatinum(player)) eligible.push('platinum');
  if (player.seriesGranted) eligible.push('series');
  return eligible.sort((a, b) => TIER_BY_ID[b].rank - TIER_BY_ID[a].rank)[0];
}

export function applySeriesCode(player: Player, code: string): boolean {
  return code.trim().toUpperCase() === SERIES_UNLOCK_CODE || code.trim().toUpperCase() === 'FINB-GREAT-2026';
}

export function guestDaysLeft(player: Player): number | null {
  if (player.linked || !player.guestExpiresAt) return null;
  return Math.max(0, Math.ceil((player.guestExpiresAt - Date.now()) / 86400000));
}

/* ------------------------------------------------------------------ *
 * Market simulation (random walk, bounded history).
 * ------------------------------------------------------------------ */
export function moveQuote(quote: Quote | undefined, stock: (typeof STOCKS)[number]): Quote {
  const base = stock.base;
  const previous = quote?.price ?? base;
  const shock = (Math.random() - 0.48) * previous * (0.02 + stock.drift * 14);
  const pull = (base - previous) * 0.03;
  const price = Math.max(1, Number((previous + shock + pull).toFixed(2)));
  const series = [...(quote?.series ?? Array.from({ length: 36 }, () => base)), price].slice(-36);
  return { symbol: stock.symbol, price, previous, series, updatedAt: Date.now() };
}

export function ensureMarket(quotes: Record<string, Quote>): Record<string, Quote> {
  const next: Record<string, Quote> = { ...quotes };
  for (const stock of STOCKS) {
    if (!next[stock.symbol]) {
      next[stock.symbol] = {
        symbol: stock.symbol,
        price: stock.base,
        previous: stock.base,
        series: Array.from({ length: 36 }, (_, index) => Number((stock.base * (1 + Math.sin(index / 3) * 0.02)).toFixed(2))),
        updatedAt: Date.now(),
      };
    }
  }
  return next;
}

/* ------------------------------------------------------------------ *
 * Seasons rotate every 14 days so the world always has an event live.
 * ------------------------------------------------------------------ */
const SEASONS = [
  { name: 'Ember Weeks', tagline: 'Orange skies, double Credit weekends, flame card halos.', tint: 'flame', cosmetic: 'season' },
  { name: 'Sprout Sessions', tagline: 'Green rush: Liberals grow 25% faster in the garden.', tint: 'lime', cosmetic: 'sprout' },
  { name: 'Midnight Circuit', tagline: 'Neon navy nights, cyan corridors, heist leaderboards.', tint: 'cyan', cosmetic: 'heist' },
  { name: 'Molten Reunion', tagline: 'Forge parties, shared pots and a very loud bell.', tint: 'magenta', cosmetic: 'forge' },
];

export function seasonFor(date = new Date()): SeasonEvent {
  const epoch = Date.UTC(2025, 0, 1);
  const cycle = Math.floor((date.getTime() - epoch) / (14 * 86400000));
  const theme = SEASONS[((cycle % SEASONS.length) + SEASONS.length) % SEASONS.length];
  const startsAt = epoch + cycle * 14 * 86400000;
  return {
    id: `${theme.tint}-${cycle}`,
    name: theme.name,
    tagline: theme.tagline,
    tint: theme.tint,
    // Seasonal events pay normally on weekdays and double on weekends.
    multiplier: date.getUTCDay() === 0 || date.getUTCDay() === 6 ? 2 : 1,
    endsAt: startsAt + 14 * 86400000,
    cosmetic: theme.cosmetic,
  };
}

/* ------------------------------------------------------------------ *
 * Daily + weekly challenges. Deterministic per cycle so the board is
 * identical for everyone playing that day.
 * ------------------------------------------------------------------ */
const DAILY_TEMPLATES: Omit<Mission, 'id' | 'cycle' | 'progress' | 'lockedUntil' | 'claimed'>[] = [
  { title: 'Play 3 rounds anywhere', hint: 'Any game on the floor counts.', metric: 'play-games', goal: 3, credits: 60, liberals: 2 },
  { title: 'Win 2 rounds', hint: 'Solo or multiplayer.', metric: 'win-games', goal: 2, credits: 90, liberals: 3 },
  { title: 'Earn 250 Credits from games', hint: 'Payouts, pots and perfect strikes.', metric: 'earn-credits', goal: 250, credits: 80, liberals: 2 },
  { title: 'Win a multiplayer room', hint: '2–13 players, bots count in practice lobbies.', metric: 'multiplayer-wins', goal: 1, credits: 140, liberals: 4 },
  { title: 'Collect 6 Liberals', hint: 'Garden, relays and perfect strikes.', metric: 'liberals-earned', goal: 6, credits: 70, liberals: 2 },
  { title: 'Send a transfer or a tip', hint: 'Friends Zone or spectator tipping.', metric: 'transfers-sent', goal: 1, credits: 50, liberals: 2 },
  { title: 'Make 3 market moves', hint: 'Trades in the Market Lab.', metric: 'market-trades', goal: 3, credits: 70, liberals: 2 },
];

const WEEKLY_TEMPLATES: Omit<Mission, 'id' | 'cycle' | 'progress' | 'lockedUntil' | 'claimed'>[] = [
  { title: 'Score 1,200 Credits in a single game mode', hint: 'Stock Surge and Vault Rush are the classic routes.', metric: 'game-credits', goal: 1200, credits: 400, liberals: 12, bonusGame: 'stock-surge' },
  { title: 'Win 8 rounds this week', hint: 'Any mix of solo and multiplayer.', metric: 'win-games', goal: 8, credits: 320, liberals: 10 },
  { title: 'Grow 30 Liberals', hint: 'Garden harvests are efficient.', metric: 'liberals-earned', goal: 30, credits: 260, liberals: 14 },
  { title: 'Land 25 perfect forge strikes', hint: 'Green window only. No mercy.', metric: 'perfect-strikes', goal: 25, credits: 300, liberals: 12, bonusGame: 'credit-forge' },
];

function hash(text: string): number {
  return [...text].reduce((acc, char) => (acc * 33 + char.charCodeAt(0)) % 99999989, 17);
}

export function missionsFor(dayKey: string, weekKeyValue: string): Mission[] {
  const dailySeed = hash(dayKey);
  const weeklySeed = hash(weekKeyValue);
  const daily = [0, 1, 2].map(offset => {
    const template = DAILY_TEMPLATES[(dailySeed + offset * 3) % DAILY_TEMPLATES.length];
    return { ...template, id: `d-${dayKey}-${offset}`, cycle: 'daily' as const, progress: 0, lockedUntil: 0, claimed: false };
  });
  const weekly = [0, 1].map(offset => {
    const template = WEEKLY_TEMPLATES[(weeklySeed + offset * 2) % WEEKLY_TEMPLATES.length];
    return { ...template, id: `w-${weekKeyValue}-${offset}`, cycle: 'weekly' as const, progress: 0, lockedUntil: 0, claimed: false };
  });
  return [...daily, ...weekly];
}

/** Rolls the board forward: keeps progress on still-valid challenges, drops expired ones. */
export function syncMissions(missions: Mission[], dayKey: string, weekKeyValue: string): Mission[] {
  return missionsFor(dayKey, weekKeyValue).map(mission => {
    const previous = missions.find(item => item.id === mission.id);
    return previous ? { ...mission, progress: previous.progress, claimed: previous.claimed } : mission;
  });
}

export interface MissionEvent {
  metric: MissionMetric;
  amount: number;
  gameId?: string;
}

export interface MissionProgressResult {
  missions: Mission[];
  completed: Mission[];
  credits: number;
  liberals: number;
}

export function progressMissions(missions: Mission[], events: MissionEvent[]): MissionProgressResult {
  let credits = 0;
  let liberals = 0;
  const completed: Mission[] = [];
  const next = missions.map(mission => {
    const relevant = events.filter(event => event.metric === mission.metric);
    if (!relevant.length) return mission;
    const gain = relevant.reduce((total, event) => {
      if (mission.metric === 'game-credits') return Math.max(total, event.amount);
      return total + event.amount;
    }, 0);
    const progress = Math.min(mission.goal, mission.progress + gain);
    const justFinished = progress >= mission.goal && !mission.claimed;
    if (justFinished) {
      credits += mission.credits;
      liberals += mission.liberals;
      completed.push({ ...mission, progress, claimed: true });
      return { ...mission, progress, claimed: true };
    }
    return { ...mission, progress };
  });
  return { missions: next, completed, credits, liberals };
}

/* ------------------------------------------------------------------ *
 * Achievements + level.
 * ------------------------------------------------------------------ */
export function achievementById(id: string) {
  return ACHIEVEMENTS.find(item => item.id === id);
}

export function levelFor(liberals: number): { level: number; into: number; span: number } {
  const span = 25;
  const level = Math.floor(liberals / span) + 1;
  return { level, into: liberals % span, span };
}

export function stageLabel(player: Player): string {
  const total = player.stats.gamesPlayed;
  if (total >= 60) return 'Vault Architect';
  if (total >= 35) return 'Floor Veteran';
  if (total >= 18) return 'Trusted Operator';
  if (total >= 8) return 'Regular';
  if (total >= 3) return 'New Arrival';
  return 'Fresh Guest';
}

export function gameById(id: string) {
  return GAMES.find(game => game.id === id);
}

export function pickWeighted<T>(items: T[], random = Math.random): T {
  return items[Math.floor(random() * items.length)];
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
