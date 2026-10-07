import test from 'node:test';
import assert from 'node:assert/strict';
import {
  GAMES,
  STOCKS,
  createAccount,
  getBusinessEarnings,
  getDailyBonus,
  awardReferral,
  moveQuote,
} from '../src/lib.js';

test('Platinum game cards are unique local 16-digit credentials', () => {
  const first = createAccount({ username: 'FirstPlayer', linked: false }, []);
  const second = createAccount({ username: 'SecondPlayer', linked: false }, [first]);
  assert.match(first.card.number.replaceAll(' ', ''), /^\d{16}$/);
  assert.notEqual(first.card.number, second.card.number);
  assert.equal(first.card.type, 'Platinum');
  assert.match(first.card.cvv, /^\d{3}$/);
  assert.match(first.card.expiry, /^\d{2}\/\d{2}$/);
});

test('login bonuses match the published streak milestones', () => {
  assert.equal(getDailyBonus(1), 0);
  assert.equal(getDailyBonus(7), 30);
  assert.equal(getDailyBonus(14), 75);
  assert.equal(getDailyBonus(30), 200);
  assert.equal(getDailyBonus(60), 500);
  assert.equal(getDailyBonus(61), 0);
});

test('a linked referral pays each side once', () => {
  const referrer = createAccount({ username: 'MicaMint', linked: true, playGamesId: 'mica-tag' }, []);
  const joiner = createAccount({ username: 'OrbitGuest', linked: true, playGamesId: 'orbit-tag' }, [referrer]);
  const db = { accounts: [referrer, joiner] };
  const firstClaim = awardReferral(db, joiner, referrer.referralCode);
  assert.equal(firstClaim.ok, true);
  assert.equal(joiner.credits, 200);
  assert.equal(referrer.credits, 100);
  const duplicateClaim = awardReferral(db, joiner, referrer.referralCode);
  assert.equal(duplicateClaim.ok, false);
  assert.equal(joiner.credits, 200);
  assert.equal(referrer.credits, 100);
});

test('business yields are time-based and cap at twelve hours', () => {
  const now = Date.now();
  const venture = { yieldPerMinute: 2, lastCollectedAt: now - (100 * 60 * 1000) };
  assert.equal(getBusinessEarnings(venture, now), 200);
  const overdue = { yieldPerMinute: 2, lastCollectedAt: now - (24 * 60 * 60 * 1000) };
  assert.equal(getBusinessEarnings(overdue, now), 1440);
});

test('the play floor offers a deep, unique game catalog', () => {
  const ids = GAMES.map(game => game.id);
  assert.ok(GAMES.length >= 27, `expected at least 27 games, found ${GAMES.length}`);
  assert.equal(new Set(ids).size, ids.length);
  const multiplayer = GAMES.filter(game => game.category === 'FAF MULTIPLAYER');
  assert.ok(multiplayer.length >= 4, 'expected four FAF multiplayer formats');
  assert.ok(GAMES.filter(game => game.category === 'Learn').length >= 5, 'expected several educational games');
});

test('market ticks stay positive and keep a bounded history', () => {
  const stock = STOCKS[0];
  let quote = { price: stock.base, previous: stock.base, series: Array(48).fill(stock.base), updatedAt: Date.now() };
  quote = moveQuote(quote, stock);
  assert.ok(quote.price > 0);
  assert.equal(quote.series.length, 48);
  assert.equal(quote.previous, stock.base);
});
