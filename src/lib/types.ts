/** FINB Platinum — shared domain types. Fictional game data only. */

export type CardTierId = 'regular' | 'bass' | 'gold' | 'me' | 'platinum' | 'series';

export interface CardTier {
  id: CardTierId;
  name: string;
  rank: number;
  minCredits?: number;
  requirement: string;
  gradient: string;
  edge: string;
  blurb: string;
  authority: string;
}

export interface BankCard {
  number: string;
  cvv: string;
  expiry: string;
  holder: string;
  tier: CardTierId;
  frozen: boolean;
  issuedAt: number;
  serial: string;
  reissues: number;
}

export interface Holding {
  shares: number;
  basis: number;
}

export interface Business {
  id: string;
  name: string;
  cost: number;
  yieldPerMinute: number;
  owned: boolean;
  lastCollectedAt: number;
  totalEarned: number;
}

export interface Mission {
  id: string;
  cycle: 'daily' | 'weekly';
  title: string;
  hint: string;
  metric: MissionMetric;
  goal: number;
  progress: number;
  credits: number;
  liberals: number;
  lockedUntil: number;
  claimed: boolean;
  bonusGame?: string;
}

export type MissionMetric =
  | 'play-games'
  | 'win-games'
  | 'earn-credits'
  | 'game-credits'
  | 'multiplayer-wins'
  | 'liberals-earned'
  | 'friends-added'
  | 'transfers-sent'
  | 'market-trades'
  | 'perfect-strikes';

export interface ActivityEvent {
  id: string;
  kind: 'game' | 'reward' | 'trade' | 'business' | 'transfer' | 'referral' | 'achievement' | 'social' | 'card' | 'season';
  title: string;
  amount: number | null;
  at: number;
}

export interface PlayerStats {
  gamesPlayed: number;
  gamesWon: number;
  multiplayerPlayed: number;
  multiplayerWon: number;
  perfectStrikes: number;
  bestReactionMs: number;
  bestVaultRush: number;
  bestStockSurge: number;
  heistStars: number;
  tipsGiven: number;
  tipsReceived: number;
  spectated: number;
}

export interface ComboState {
  streak: number;
  best: number;
  multiplier: number;
  lastGameId: string | null;
  lastGameAt: number;
}

export interface FriendLink {
  /** stable key: local player id or simulated member id */
  id: string;
  username: string;
  addedAt: number;
  favourite: boolean;
  emote: string | null;
}

export interface Challenge {
  id: string;
  fromUsername: string;
  toUsername: string;
  gameId: string;
  target: number;
  metric: 'score' | 'wins' | 'credits';
  createdAt: number;
  state: 'open' | 'won' | 'lost' | 'expired';
  reward: number;
}

export interface PrivateRoom {
  code: string;
  name: string;
  hostUsername: string;
  members: string[];
  mode: string;
  createdAt: number;
  chat: { id: string; from: string; text: string; at: number }[];
}

export interface Player {
  id: string;
  username: string;
  displayName: string;
  linked: boolean;
  playGamesTag: string | null;
  avatarSeed: string;
  credits: number;
  liberals: number;
  createdAt: number;
  lastSeenAt: number;
  streak: number;
  lastDailyClaim: string | null;
  onboarded: boolean;
  onboardingStep: number;
  onboardingRewards: string[];
  card: BankCard;
  friends: FriendLink[];
  challenges: Challenge[];
  rooms: PrivateRoom[];
  activity: ActivityEvent[];
  holdings: Record<string, Holding>;
  businesses: Business[];
  missions: Mission[];
  achievements: string[];
  cosmetics: string[];
  stats: PlayerStats;
  combo: ComboState;
  invitedBy: string | null;
  referralCode: string;
  referralClaimed: boolean;
  linkBonusClaimed: boolean;
  seriesGranted: boolean;
  platinumInvited: boolean;
  guestExpiresAt: number | null;
}

export interface Quote {
  symbol: string;
  price: number;
  previous: number;
  series: number[];
  updatedAt: number;
}

export interface MarketState {
  quotes: Record<string, Quote>;
  lastTick: number;
}

export interface SeasonEvent {
  id: string;
  name: string;
  tagline: string;
  tint: string;
  multiplier: number;
  endsAt: number;
  cosmetic: string;
}

export interface Database {
  version: number;
  players: Player[];
  currentId: string | null;
  market: MarketState;
  globalActivity: ActivityEvent[];
  claimedPlayGamesTags: string[];
  onboardingSeen: boolean;
  seasonSeenId: string | null;
  soundOn: boolean;
  tipsWallet: Record<string, number>;
  season: SeasonEvent | null;
  lastSyncAt: number;
}

export interface StandingRow {
  id: string;
  username: string;
  credits: number;
  liberals: number;
  simulated: boolean;
  tier: CardTierId;
  linked: boolean;
  online: boolean;
  status: string;
  isYou: boolean;
  isFriend: boolean;
}

export interface RewardBundle {
  credits?: number;
  liberals?: number;
  cosmetic?: string;
  badge?: string;
}
