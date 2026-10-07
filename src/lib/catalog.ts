import type { CardTier, CardTierId } from './types';

/** ------------------------------------------------------------------ *
 * Card hierarchy. Order of the array is the authority ladder.
 * ------------------------------------------------------------------ */
export const CARD_TIERS: CardTier[] = [
  {
    id: 'regular',
    name: 'FINBRegular',
    rank: 1,
    requirement: 'Every new member — issued instantly',
    gradient: 'linear-gradient(133deg,#2b3560 0%,#161d3d 52%,#0c1022 100%)',
    edge: 'rgba(255,255,255,.35)',
    blurb: 'The starting key to the floor. Reliable, quietly proud of you.',
    authority: 'Member',
  },
  {
    id: 'bass',
    name: 'FINBBass',
    rank: 2,
    minCredits: 1300,
    requirement: 'Hold 1,300+ Credits',
    gradient: 'linear-gradient(133deg,#1d4b3c 0%,#10352f 48%,#07202a 100%)',
    edge: 'rgba(0,230,118,.55)',
    blurb: 'A deeper vault tone. Awarded the moment your balance crosses 1,300.',
    authority: 'Established member',
  },
  {
    id: 'gold',
    name: 'FINBGold',
    rank: 3,
    minCredits: 100000,
    requirement: 'Hold 100,000+ Credits',
    gradient: 'linear-gradient(133deg,#7a4a06 0%,#c07f0d 46%,#ffb066 100%)',
    edge: 'rgba(255,176,102,.7)',
    blurb: 'Six figures of imaginary money. Extremely serious make-believe.',
    authority: 'Senior member',
  },
  {
    id: 'me',
    name: 'FINBMe',
    rank: 4,
    requirement: 'Live top-10 by Credits',
    gradient: 'linear-gradient(133deg,#3a1d6b 0%,#7a2f97 42%,#ff6b00 100%)',
    edge: 'rgba(255,47,185,.6)',
    blurb: 'Personalised to you while you hold a live top-ten seat. Moves in real time.',
    authority: 'Elite ten',
  },
  {
    id: 'platinum',
    name: 'FINBPlatinum',
    rank: 5,
    requirement: 'Invitation — 25+ Liberals and a seasonal event run',
    gradient: 'linear-gradient(133deg,#22194a 0%,#3d2a86 40%,#00c853 100%)',
    edge: 'rgba(0,230,118,.8)',
    blurb: 'Selected members only. The card the whole floor notices.',
    authority: 'Selected member',
  },
  {
    id: 'series',
    name: 'FINBSeries',
    rank: 6,
    requirement: 'Code Cabinet grant — highest authority',
    gradient: 'linear-gradient(120deg,#ff6b00 0%,#fff6e9 32%,#ff2fb9 58%,#00e676 100%)',
    edge: 'rgba(255,255,255,.9)',
    blurb: 'Highest authority. Special treatment, private line to the Sprite, zero queue.',
    authority: 'Highest authority',
  },
];

export const TIER_BY_ID: Record<CardTierId, CardTier> = CARD_TIERS.reduce(
  (acc, tier) => ({ ...acc, [tier.id]: tier }),
  {} as Record<CardTierId, CardTier>,
);

export const SERIES_UNLOCK_CODE = 'FINB-SERIES-0001';
export const PLATINUM_LIBERAL_REQUIREMENT = 25;

/** ------------------------------------------------------------------ *
 * Card cosmetics (unlockable, no real-money meaning whatsoever).
 * ------------------------------------------------------------------ */
export interface Cosmetic {
  id: string;
  name: string;
  css: string;
  unlock: string;
}

export const CARD_COSMETICS: Cosmetic[] = [
  { id: 'ember', name: 'Ember Overlay', css: 'linear-gradient(120deg,rgba(255,107,0,.4),transparent 60%)', unlock: 'Onboarding reward' },
  { id: 'sprout', name: 'Sprout Overlay', css: 'linear-gradient(120deg,rgba(0,200,83,.38),transparent 60%)', unlock: 'Liberals Garden — harvest 5 crystal flowers' },
  { id: 'heist', name: 'Blueprint Overlay', css: 'repeating-linear-gradient(90deg,rgba(34,225,255,.22) 0 2px,transparent 2px 9px)', unlock: 'Daily Heist — 3 stars' },
  { id: 'forge', name: 'Molten Overlay', css: 'radial-gradient(circle at 30% 110%,rgba(255,149,0,.55),transparent 58%)', unlock: 'Credit Forge — 12 perfect strikes' },
  { id: 'season', name: 'Seasonal Halo', css: 'conic-gradient(from 210deg,rgba(255,47,185,.35),rgba(34,225,255,.3),rgba(0,230,118,.35),rgba(255,107,0,.35))', unlock: 'Seasonal event participation' },
];

/** ------------------------------------------------------------------ *
 * Playable catalog — solo progression + 2-13 player multiplayer.
 * ------------------------------------------------------------------ */
export type GameMode = 'solo' | 'multi';
export type GameFamily = 'runner' | 'market' | 'craft' | 'stealth' | 'garden' | 'quick' | 'party' | 'battle' | 'social' | 'team' | 'race' | 'deduction';

export interface GameDef {
  id: string;
  title: string;
  mode: GameMode;
  family: GameFamily;
  tagline: string;
  howTo: string;
  minPlayers: number;
  maxPlayers: number;
  duration: string;
  reward: string;
  accent: string;
  emoji: string;
  featured?: boolean;
  engine?: 'phaser' | 'canvas' | 'dom';
}

export const GAMES: GameDef[] = [
  {
    id: 'vault-rush',
    title: 'Vault Rush',
    mode: 'solo',
    family: 'runner',
    tagline: 'Endless neon corridor. One glowing vault door. No brakes.',
    howTo: 'Steer through the corridor, hoover up Credits, thread the Risk Zones for a 3× payout and survive the laser lattice.',
    minPlayers: 1,
    maxPlayers: 1,
    duration: '50–120s',
    reward: 'Up to 600 cr + LP',
    accent: 'from-flame-500 via-flame-400 to-lime-500',
    emoji: '🛞',
    featured: true,
    engine: 'phaser',
  },
  {
    id: 'stock-surge',
    title: 'Stock Surge',
    mode: 'solo',
    family: 'market',
    tagline: 'Bubble market. Three-second decisions. Very loud noises.',
    howTo: 'Tap orange bubbles to buy the uptrend, green ones for the risky spike, then cash out before the pop.',
    minPlayers: 1,
    maxPlayers: 1,
    duration: '90s',
    reward: 'Up to 500 cr + LP',
    accent: 'from-flame-400 to-lime-400',
    emoji: '🫧',
    engine: 'canvas',
  },
  {
    id: 'credit-forge',
    title: 'Credit Forge',
    mode: 'solo',
    family: 'craft',
    tagline: 'Slam the hammer in the green window. Get rich, calmly.',
    howTo: 'Time each strike inside the green band to forge higher-tier Credit bars. Chains of perfect strikes mint Liberals.',
    minPlayers: 1,
    maxPlayers: 1,
    duration: '60–180s',
    reward: 'Up to 420 cr + LP',
    accent: 'from-lime-500 to-flame-500',
    emoji: '🔨',
    engine: 'dom',
  },
  {
    id: 'daily-heist',
    title: 'Daily Heist',
    mode: 'solo',
    family: 'stealth',
    tagline: 'A friendly heist on a floor that rewrites itself every day.',
    howTo: 'Pick a loadout, route past the guards, crack the vault, extract. Speed and quiet earn stars.',
    minPlayers: 1,
    maxPlayers: 1,
    duration: '2–4 min',
    reward: 'Up to 550 cr + LP',
    accent: 'from-cyanx-400 to-flame-500',
    emoji: '🕵️',
    engine: 'dom',
  },
  {
    id: 'liberals-garden',
    title: 'Liberals Garden',
    mode: 'solo',
    family: 'garden',
    tagline: 'Plant crystals. Water them. Feel oddly proud.',
    howTo: 'Plant, water and harvest Liberal crystals. Beat pests and weather to upgrade the greenhouse.',
    minPlayers: 1,
    maxPlayers: 1,
    duration: '2–5 min',
    reward: '18–120 LP per cycle',
    accent: 'from-lime-400 to-lime-500',
    emoji: '🌱',
    engine: 'dom',
  },
  {
    id: 'cipher-vault',
    title: 'Cipher Vault',
    mode: 'solo',
    family: 'quick',
    tagline: 'Six turns to crack the teller’s four-digit code.',
    howTo: 'Every guess reports exact and nearby digits. Crack it quickly for a bigger payout.',
    minPlayers: 1,
    maxPlayers: 1,
    duration: '30–90s',
    reward: '40 cr + 4 LP',
    accent: 'from-flame-400 to-cyanx-400',
    emoji: '🔐',
    engine: 'dom',
  },
  {
    id: 'ticker-sniper',
    title: 'Ticker Sniper',
    mode: 'solo',
    family: 'quick',
    tagline: 'Read the live board, pick the winner, no hesitation.',
    howTo: 'Answer fast financial-literacy prompts against a shrinking clock. Speed multiplies the payout.',
    minPlayers: 1,
    maxPlayers: 1,
    duration: '45s',
    reward: 'Up to 160 cr + LP',
    accent: 'from-lime-400 to-flame-400',
    emoji: '🎯',
    engine: 'dom',
  },
  {
    id: 'interest-ladder',
    title: 'Interest Ladder',
    mode: 'solo',
    family: 'quick',
    tagline: 'Climb the compounding ladder rung by rung.',
    howTo: 'Solve compounding prompts correctly to climb. One slip sends you a rung down.',
    minPlayers: 1,
    maxPlayers: 1,
    duration: '60s',
    reward: 'Up to 200 cr + LP',
    accent: 'from-lime-500 to-cyanx-400',
    emoji: '🪜',
    engine: 'dom',
  },
  {
    id: 'heist-party',
    title: 'Bank Heist Party',
    mode: 'multi',
    family: 'party',
    tagline: 'Robbers vs Bankers. 90 seconds of raining power-ups.',
    howTo: 'Robbers snatch floating Credit bags, Bankers freeze them with drones. Winner takes the shared pot.',
    minPlayers: 4,
    maxPlayers: 13,
    duration: '90s',
    reward: 'Shared pot up to 900 cr',
    accent: 'from-flame-500 via-flame-400 to-lime-500',
    emoji: '🎉',
    featured: true,
  },
  {
    id: 'credit-clash',
    title: 'Credit Clash Arena',
    mode: 'multi',
    family: 'battle',
    tagline: 'Free-for-all. Everyone starts equal. Few finish polite.',
    howTo: 'Tag rivals to siphon Credits, form temporary alliances, and survive the Market Crash that halves the map.',
    minPlayers: 3,
    maxPlayers: 13,
    duration: '75s',
    reward: 'Up to 700 cr',
    accent: 'from-flame-500 to-magenta-500',
    emoji: '⚔️',
    featured: true,
  },
  {
    id: 'hot-potato',
    title: 'Hot Potato Vault',
    mode: 'multi',
    family: 'party',
    tagline: 'Hold the vault. It glows louder every second.',
    howTo: 'Pass, block or force-pass the vault around the circle. Whoever holds it when it detonates pays the room.',
    minPlayers: 3,
    maxPlayers: 13,
    duration: '60–120s',
    reward: 'Split pot up to 600 cr',
    accent: 'from-flame-400 to-flame-600',
    emoji: '🥵',
  },
  {
    id: 'team-stock-war',
    title: 'Team Stock War',
    mode: 'multi',
    family: 'team',
    tagline: 'Two houses, two tickers, one very loud bell.',
    howTo: 'Win micro-challenges for your team to push your stock higher. Biggest surge at the bell splits the prize.',
    minPlayers: 2,
    maxPlayers: 13,
    duration: '75s',
    reward: 'Up to 800 cr shared',
    accent: 'from-lime-500 to-cyanx-400',
    emoji: '📈',
  },
  {
    id: 'liberals-relay',
    title: 'Liberals Relay',
    mode: 'multi',
    family: 'race',
    tagline: 'Run, collect, and sabotage your friends’ lanes.',
    howTo: 'One runner per team collects Liberals while team-mates drop boosts for allies and traps for rivals.',
    minPlayers: 2,
    maxPlayers: 8,
    duration: '80s',
    reward: 'Up to 320 LP + 400 cr',
    accent: 'from-lime-400 to-flame-400',
    emoji: '🏃',
  },
  {
    id: 'mafia-bankers',
    title: 'Mafia Bankers',
    mode: 'multi',
    family: 'deduction',
    tagline: 'Someone in this boardroom is quietly draining the vault.',
    howTo: 'Corrupt Bankers drain Credits in secret. Everyone else earns investigation points in mini-games, then discusses and votes.',
    minPlayers: 7,
    maxPlayers: 13,
    duration: '3 rounds',
    reward: 'Up to 900 cr',
    accent: 'from-navy-600 via-magenta-500 to-flame-500',
    emoji: '🕶️',
  },
];

export const SOLO_GAMES = GAMES.filter(game => game.mode === 'solo');
export const MULTI_GAMES = GAMES.filter(game => game.mode === 'multi');
export const GAME_BY_ID = GAMES.reduce<Record<string, GameDef>>((acc, game) => ({ ...acc, [game.id]: game }), {});

/** Fictional listed companies used by the market lab and market games. */
export const STOCKS = [
  { symbol: 'NVA', name: 'Nova Energy', sector: 'Clean power', base: 42.5, drift: 0.0016 },
  { symbol: 'CRB', name: 'Current Bank', sector: 'Banking', base: 118.2, drift: 0.0009 },
  { symbol: 'LMB', name: 'Limbless Motors', sector: 'Mobility', base: 76.4, drift: 0.0021 },
  { symbol: 'SPR', name: 'Sprout Foods', sector: 'Agri', base: 23.9, drift: 0.0013 },
  { symbol: 'HVT', name: 'Heavy Tower', sector: 'Property', base: 205.7, drift: 0.0006 },
  { symbol: 'ZEN', name: 'Zenith Cloud', sector: 'Computing', base: 311.4, drift: 0.0026 },
];

export const ACHIEVEMENTS = [
  { id: 'first-game', name: 'First Deposit of Fun', glyph: '🟠', liberals: 2, copy: 'Finish your very first game.' },
  { id: 'first-win', name: 'Green Lights', glyph: '🟢', liberals: 3, copy: 'Win a round anywhere on the floor.' },
  { id: 'five-games', name: 'Regular at the Floor', glyph: '🎟️', liberals: 4, copy: 'Play five rounds.' },
  { id: 'multiplayer', name: 'Table for Many', glyph: '🫂', liberals: 5, copy: 'Join a 2–13 player room.' },
  { id: 'combo-5', name: 'Hot Hand', glyph: '🔥', liberals: 6, copy: 'Reach a 5-win combo multiplier.' },
  { id: 'runner-300', name: 'Corridor Legend', glyph: '🛞', liberals: 6, copy: 'Score 300+ in Vault Rush.' },
  { id: 'forge-perfect', name: 'Perfect Temper', glyph: '🔨', liberals: 5, copy: 'Land 10 perfect forge strikes.' },
  { id: 'heist-3star', name: 'Quiet Professional', glyph: '🕵️', liberals: 8, copy: 'Earn 3 stars in Daily Heist.' },
  { id: 'garden-bloom', name: 'Patient Banker', glyph: '🌱', liberals: 7, copy: 'Harvest five crystal flowers.' },
  { id: 'social-3', name: 'Well Connected', glyph: '🤝', liberals: 4, copy: 'Add three friends to your circle.' },
  { id: 'tipster', name: 'Generous Spectator', glyph: '💛', liberals: 3, copy: 'Tip a player while spectating.' },
  { id: 'referral', name: 'Recruiter', glyph: '🧧', liberals: 5, copy: 'Refer a linked member successfully.' },
  { id: 'streak-7', name: 'Seven Straight', glyph: '📅', liberals: 6, copy: 'Claim a 7-day login streak.' },
  { id: 'season', name: 'Season Player', glyph: '🎊', liberals: 4, copy: 'Play during a seasonal event.' },
];

/** Coming-soon modules. */
export const TEASERS = [
  { id: 'loan', name: 'Loan', kicker: 'BORROW / BUILD', copy: 'Tiny seed Credits, a repayment plan with a personality and an interest rate you can actually see.', eta: 'NEXT DROP', tint: 'from-flame-500/25' },
  { id: 'community', name: 'Community', kicker: 'CLUBS / DARES', copy: 'Clubs, friendly dares and a noticeboard for showing off your ledger.', eta: 'IN DESIGN', tint: 'from-lime-500/25' },
  { id: 'integrity', name: 'Integrity', kicker: 'TRUST / REPUTATION', copy: 'A reputation layer where clean play glows visibly and cheats dim out.', eta: 'IN REVIEW', tint: 'from-cyanx-400/25' },
  { id: 'codes', name: 'Codes', kicker: 'SECRET DRAWERS', copy: 'The Code Cabinet: seasonal gifts, hidden codes and small delightful secrets.', eta: 'SOON', tint: 'from-magenta-500/25' },
  { id: 'great-liberals', name: 'The Great Liberals Game', kicker: 'THE BIG ONE', copy: 'An entire game-world built around curiosity, skill and Liberals.', eta: '2026', tint: 'from-lime-400/30' },
];
