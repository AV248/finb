import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ECONOMY,
  buildStandings,
  floorMembers,
  formatCompact,
  formatCredits,
  getDailyBonus,
  guestDaysLeft,
  levelFor,
  localDayKey,
  missionsFor,
  nextCombo,
  progressMissions,
  resolveCardTierId,
  seasonFor,
  timeAgo,
} from '../src/lib/economy.ts';
import { CARD_TIERS, GAMES, MULTI_GAMES, SOLO_GAMES } from '../src/lib/catalog.ts';
import type { ComboState, Player } from '../src/lib/types.ts';

function player(overrides: Partial<Player> = {}): Player {
  return {
    id: 'p1',
    username: 'Tester',
    displayName: 'Tester',
    linked: false,
    playGamesTag: null,
    avatarSeed: 'seed',
    credits: 0,
    liberals: 0,
    createdAt: Date.now(),
    lastSeenAt: Date.now(),
    streak: 0,
    lastDailyClaim: null,
    onboarded: false,
    onboardingStep: 0,
    onboardingRewards: [],
    card: { number: '', cvv: '', expiry: '', holder: 'Tester', tier: 'regular', frozen: false, reissues: 0, issuedAt: Date.now(), serial: 'test' },
    friends: [],
    challenges: [],
    rooms: [],
    activity: [],
    holdings: {},
    businesses: [],
    missions: missionsFor(localDayKey(), localDayKey()),
    achievements: [],
    cosmetics: [],
    stats: {} as Player['stats'],
    combo: { streak: 0, best: 0, multiplier: 1, lastGameId: null, lastGameAt: 0 },
    invitedBy: null,
    referralCode: 'FINB-TEST',
    referralClaimed: false,
    linkBonusClaimed: false,
    seriesGranted: false,
    platinumInvited: false,
    guestExpiresAt: null,
    ...overrides,
  } as Player;
}

test('daily streak bonuses match the published economy', () => {
  assert.equal(ECONOMY.dailyBase, 10);
  assert.equal(getDailyBonus(0), 0);
  assert.equal(getDailyBonus(6), 0);
  assert.equal(getDailyBonus(7), 30);
  assert.equal(getDailyBonus(14), 75);
  assert.equal(getDailyBonus(30), 200);
  assert.equal(getDailyBonus(60), 500);
  assert.equal(getDailyBonus(61), 0);
});

test('referral and link awards are the fixed one-time values', () => {
  assert.equal(ECONOMY.linkBonus, 100);
  assert.equal(ECONOMY.referralReferrer, 100);
  assert.equal(ECONOMY.referralJoiner, 200);
  assert.equal(ECONOMY.guestTtlDays, 90);
  assert.equal(ECONOMY.comboStep, 0.1);
  assert.equal(ECONOMY.comboMax, 3);
  assert.equal(ECONOMY.sharedPotRate, 0.55);
});

test('combo multiplier only rises when wins chain across different games', () => {
  let combo: ComboState = { streak: 0, best: 0, multiplier: 1, lastGameId: null, lastGameAt: 0 };
  // first win: no bonus yet
  combo = nextCombo(combo, 'vault-rush', true);
  assert.equal(combo.streak, 1);
  assert.equal(combo.multiplier, 1);
  // a different game inside the window starts the chain
  combo = nextCombo(combo, 'credit-forge', true);
  assert.equal(combo.streak, 2);
  assert.equal(combo.multiplier, 1.1);
  // winning the same game again does not inflate the chain
  const repeat = nextCombo(combo, 'credit-forge', true);
  assert.equal(repeat.streak, 2);
  // a loss resets everything
  assert.equal(nextCombo(combo, 'vault-rush', false).multiplier, 1);
  // the chain caps out at 3x
  let chained = combo;
  for (let index = 0; index < 40; index += 1) chained = nextCombo(chained, `game-${index}`, true);
  assert.equal(chained.multiplier, ECONOMY.comboMax);
  // a gap longer than the combo window resets the streak
  const stale: ComboState = { streak: 4, best: 4, multiplier: 1.4, lastGameId: 'vault-rush', lastGameAt: Date.now() - ECONOMY.comboWindowMs - 1000 };
  const afterGap = nextCombo(stale, 'vault-rush', true);
  assert.equal(afterGap.streak, 1);
  assert.equal(afterGap.multiplier, 1);
});

test('card tiers resolve in the documented order', () => {
  const floor = floorMembers();
  const floorMax = Math.max(...floor.map(row => row.credits));
  const floorAbove1400 = floor.filter(row => row.credits > 1400).length;
  assert.ok(floorAbove1400 > 12, 'the simulated floor should comfortably fill the top ten');

  // Regular: no threshold reached and nowhere near the top ten.
  const small = player({ id: 'p1', username: 'Small', credits: 0 });
  assert.equal(resolveCardTierId(small, [small], 'p1'), 'regular');

  // Bass: 1,300+ Credits, but not a top-ten seat.
  const bass = player({ id: 'p2', username: 'Bass', credits: 1400 });
  assert.equal(resolveCardTierId(bass, [bass], 'p2'), 'bass');

  // Gold: 100,000+ Credits without a top-ten seat (ten bigger local members exist).
  const bigTen = Array.from({ length: 10 }, (_, index) => player({ id: `big${index}`, username: `Big${index}`, credits: 250000 + index * 1000 }));
  const gold = player({ id: 'p3', username: 'Gold', credits: 100000 });
  assert.equal(resolveCardTierId(gold, [...bigTen, gold], 'p3'), 'gold');

  // Me: a live top-ten seat outranks Gold.
  const leader = player({ id: 'p4', username: 'Leader', credits: floorMax + 500000 });
  assert.equal(resolveCardTierId(leader, [leader], 'p4'), 'me');

  // Platinum: 25 Liberals (or an explicit invitation).
  const platinum = player({ id: 'pl', username: 'Patron', credits: 10, liberals: 30 });
  assert.equal(resolveCardTierId(platinum, [platinum], 'pl'), 'platinum');
  const invited = player({ id: 'inv', username: 'Invited', credits: 0, platinumInvited: true });
  assert.equal(resolveCardTierId(invited, [invited], 'inv'), 'platinum');

  // Series: code-granted highest authority, even above Platinum.
  const series = player({ id: 's1', username: 'Series', credits: 0, seriesGranted: true, liberals: 40 });
  assert.equal(resolveCardTierId(series, [series], 's1'), 'series');
});

test('tier ladder keeps the required thresholds', () => {
  const bass = CARD_TIERS.find(tier => tier.id === 'bass');
  const gold = CARD_TIERS.find(tier => tier.id === 'gold');
  assert.equal(bass?.minCredits, 1300);
  assert.equal(gold?.minCredits, 100000);
  assert.equal(CARD_TIERS.length, 6);
  assert.deepEqual(CARD_TIERS.map(tier => tier.id), ['regular', 'bass', 'gold', 'me', 'platinum', 'series']);
});

test('guests expire 90 days after creation', () => {
  const now = Date.now();
  const guest = player({ linked: false, guestExpiresAt: now + 89 * 86400000 });
  assert.equal(guestDaysLeft(guest), 89);
  assert.equal(guestDaysLeft(player({ linked: true, guestExpiresAt: now + 5 * 86400000 })), null);
  assert.equal(guestDaysLeft(player({ linked: false, guestExpiresAt: now - 1000 })), 0);
});

test('levels and standings behave for the current profile', () => {
  const level = levelFor(0);
  assert.equal(level.level, 1);
  const roster = [player({ id: 'a', username: 'A', credits: 0 }), player({ id: 'b', username: 'B', credits: 10 }), player({ id: 'c', username: 'C', credits: 250 })];
  const standings = buildStandings(roster, 'b');
  // local profiles plus the simulated daily floor, sorted by Credits
  assert.ok(standings.length > roster.length);
  assert.equal(standings.filter(row => !row.simulated).length, roster.length);
  for (let index = 1; index < standings.length; index += 1) {
    assert.ok(standings[index - 1].credits >= standings[index].credits);
  }
  const me = standings.find(row => row.id === 'b');
  assert.equal(me?.isYou, true);
  assert.equal(me?.simulated, false);
  assert.equal(standings.find(row => row.id === 'a')?.isYou, false);
});

test('missions progress and complete with their rewards', () => {
  const missions = missionsFor('2026-10-07', 'W2026-10-05');
  assert.equal(missions.filter(mission => mission.cycle === 'daily').length, 3);
  assert.equal(missions.filter(mission => mission.cycle === 'weekly').length, 2);
  const result = progressMissions(missions, [{ metric: 'play-games', amount: 50 }, { metric: 'earn-credits', amount: 100000 }]);
  assert.ok(result.completed.length >= 1);
  assert.ok(result.credits > 0 || result.liberals > 0);
});

test('seasons rotate every 14 days with a multiplier and a cosmetic', () => {
  const season = seasonFor(new Date('2026-10-07T00:00:00Z'));
  assert.ok(season.name.length > 0);
  assert.ok([1, 2].includes(season.multiplier), 'weekdays pay 1x, weekends pay double');
  assert.ok(season.endsAt > Date.now() - 86400000 * 30);
});

test('game catalogue matches the promised 8 solo + 6 multiplayer cabinets', () => {
  assert.equal(SOLO_GAMES.length, 8);
  assert.equal(MULTI_GAMES.length, 6);
  assert.equal(GAMES.length, 14);
  for (const game of MULTI_GAMES) {
    assert.ok(game.minPlayers >= 2, `${game.id} must seat at least 2`);
    assert.ok(game.maxPlayers <= 13, `${game.id} must never exceed 13 seats`);
    assert.ok(game.maxPlayers >= game.minPlayers);
  }
  const ids = new Set(GAMES.map(game => game.id));
  assert.equal(ids.size, GAMES.length);
});

test('display formatters never throw on empty input', () => {
  assert.equal(formatCredits(0), '0');
  assert.equal(formatCompact(undefined), '0');
  assert.equal(typeof timeAgo(Date.now() - 1000), 'string');
  assert.equal(localDayKey(new Date('2026-10-07T12:00:00Z')).length, 10);
});
