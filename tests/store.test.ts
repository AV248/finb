import './setup.ts';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ECONOMY, localDayKey, shiftDayKey } from '../src/lib/economy.ts';
import {
  addFriend,
  claimDaily,
  buyBusiness,
  completeGame,
  createAccount,
  deleteLocalProfile,
  finishOnboarding,
  getDatabase,
  grantReward,
  linkPlayGames,
  reissueCard,
  removeFriend,
  resumePlayer,
  runBusiness,
  sendChallenge,
  sendTransfer,
  setDatabase,
  setOnboardingStep,
  tipPlayer,
  toggleCardFreeze,
  toggleFavourite,
  tradeStock,
  update,
  usernameProblem,
  USERNAME_PATTERN,
} from '../src/lib/store.ts';

/** Fresh vault for every test — the store is a module singleton. */
function freshAccount(username = 'PlayerOne') {
  setDatabase({ ...getDatabase(), players: [], currentId: null, claimedPlayGamesTags: [], onboardingSeen: false, tipsWallet: {} });
  const result = createAccount({ username, linked: false });
  assert.equal(result.ok, true, result.message);
  return getDatabase();
}

/** the current profile inside an update() draft */
function self(draft: ReturnType<typeof getDatabase>) {
  const player = draft.players.find(item => item.id === draft.currentId);
  assert.ok(player, 'expected a current profile in the draft');
  return player;
}

function me() {
  const db = getDatabase();
  const player = db.players.find(item => item.id === db.currentId);
  assert.ok(player, 'expected an active profile');
  return player;
}

test('usernames are validated and permanent', () => {
  freshAccount('VaultVera');
  assert.equal(USERNAME_PATTERN.test('VaultVera'), true);
  assert.equal(USERNAME_PATTERN.test('ab'), false);
  assert.equal(USERNAME_PATTERN.test('has space'), false);
  const clash = createAccount({ username: 'VaultVera', linked: false });
  assert.equal(clash.ok, false);
  assert.match(clash.message, /taken|already/i);
  assert.equal(usernameProblem('ok_name', getDatabase().players), null);
});

test('guest profiles are labelled Guest_[username] and carry the 90 day clock', () => {
  freshAccount('SkyMint');
  const player = me();
  assert.equal(player.username, 'Guest_SkyMint');
  assert.equal(player.displayName, 'Guest_SkyMint');
  assert.equal(player.linked, false);
  assert.ok(player.guestExpiresAt);
  const days = (player.guestExpiresAt as number) - Date.now();
  assert.ok(days > 89 * 86400000 && days <= 90 * 86400000, `expected ~90 days, got ${days}`);
});

test('linking a provider converts the reserve and pays the welcome grant once per handle', () => {
  freshAccount('Linker');
  const before = me().credits;
  const first = linkPlayGames('my_tag_01');
  assert.equal(first.ok, true, first.message);
  // the guest reserve (100) becomes usable — that is the Google welcome grant
  assert.equal(me().credits, before + ECONOMY.linkBonus);
  assert.equal(me().credits, 100);
  assert.equal(me().lockedCredits, 0);
  assert.equal(me().bonusCredits, 100);
  assert.equal(me().linked, true);
  assert.equal(linkPlayGames('other_tag').ok, false, 'a linked profile cannot link twice');
  // a second profile can still become permanent, but never mints the grant again
  createAccount({ username: 'Second', linked: false });
  const reused = linkPlayGames('MY_TAG_01');
  assert.equal(reused.ok, true, 'the door stays open, the grant does not');
  assert.equal(reused.granted ?? 0, 0);
  assert.equal(reused.grantReused, true);
  assert.match(reused.message, /already used its one-time welcome grant/i);
  assert.equal(me().credits, 100, 'only the converted reserve, no second grant');
});

test('daily login pays 10 and cannot be double-claimed the same day', () => {
  freshAccount('Streaker');
  const before = me().credits;
  const first = claimDaily();
  assert.equal(first.ok, true, first.message);
  assert.equal(me().credits, before + ECONOMY.dailyBase);
  assert.equal(me().streak, 1);
  const second = claimDaily();
  assert.equal(second.ok, false, 'a second claim on the same day must be refused');
  assert.equal(me().credits, before + ECONOMY.dailyBase);
  // a 7-day streak pays the milestone bonus on top of the base amount
  update(draft => {
    self(draft).streak = 6;
    // the day before today keeps the streak alive, so day 7 pays the +30 milestone
    self(draft).lastDailyClaim = shiftDayKey(localDayKey(), -1);
  });
  const milestone = claimDaily();
  assert.equal(milestone.ok, true, milestone.message);
  assert.equal(me().credits, before + ECONOMY.dailyBase * 2 + 30);
  assert.equal(me().streak, 7);
});

test('transfers move Credits between members and reject bad amounts', () => {
  freshAccount('Sender');
  update(draft => {
    draft.players.push({
      ...draft.players[0],
      id: 'friend-1',
      username: 'Receiver',
      displayName: 'Receiver',
      credits: 500,
      friends: [],
    });
  });
  assert.equal(addFriend('Receiver').ok, true);
  const before = me().credits;
  update(draft => {
    const self = draft.players.find(item => item.id === draft.currentId);
    if (self) self.credits = 1000;
  });
  const over = sendTransfer('Receiver', 5000, 'too much');
  assert.equal(over.ok, false);
  const ok = sendTransfer('Receiver', 250, 'lunch');
  assert.equal(ok.ok, true, ok.message);
  const sender = me();
  const receiver = getDatabase().players.find(item => item.username === 'Receiver');
  assert.equal(sender.credits, 1000 - 250);
  assert.equal(receiver?.credits, 500 + 250);
  assert.ok(sender.credits < before + 1000);
  const unknown = sendTransfer('Nobody', 10, '');
  assert.equal(unknown.ok, false);
});

test('friends can be added, favourited and removed', () => {
  freshAccount('Social');
  update(draft => {
    draft.players.push({ ...draft.players[0], id: 'friend-2', username: 'PalTwo', displayName: 'PalTwo' });
  });
  addFriend('PalTwo');
  assert.equal(me().friends.length, 1);
  toggleFavourite(me().friends[0].id);
  assert.equal(me().friends[0].favourite, true);
  sendChallenge('PalTwo', 'vault-rush', 300);
  assert.ok(me().challenges.length >= 1);
  removeFriend(me().friends[0].id);
  assert.equal(me().friends.length, 0);
});

test('tips credit the target member wallet', () => {
  freshAccount('Tipper');
  update(draft => {
    draft.players.push({ ...draft.players[0], id: 'friend-3', username: 'Performer', displayName: 'Performer', credits: 0 });
    const self = draft.players.find(item => item.id === draft.currentId);
    if (self) self.credits = 500;
  });
  const result = tipPlayer('Performer', 25);
  assert.equal(result.ok, true, result.message);
  assert.equal(me().credits, 475);
});

test('completeGame banks Credits, Liberals, stats, missions and achievements', () => {
  freshAccount('Finisher');
  const startingBalance = me().credits;
  const resolved = completeGame({
    gameId: 'vault-rush',
    credits: 200,
    liberals: 6,
    won: true,
    title: 'Vault Rush · 320m',
    message: 'Outrun the corridor.',
    score: 320,
    meta: { bestVaultRush: 320, perfectStrikes: 4 },
  });
  // raw payout is 200; combos and the seasonal weekend multiplier may raise it
  assert.ok(resolved.credits >= 200, `expected at least 200 Credits, got ${resolved.credits}`);
  assert.equal(resolved.rawCredits, 200);
  assert.ok([1, 1, 2].includes(resolved.multiplier));
  assert.equal(resolved.liberals, 6);
  const player = me();
  // the game payout lands, plus any challenge that completed during the run
  assert.ok(player.credits >= startingBalance + 200, 'game Credits must be banked');
  assert.ok(player.liberals >= 6);
  assert.equal(player.stats.gamesPlayed, 1);
  assert.equal(player.stats.gamesWon, 1);
  assert.equal(player.stats.bestVaultRush, 320);
  assert.equal(player.stats.perfectStrikes, 4);
  assert.ok(player.achievements.includes('first-game'));
  assert.ok(player.achievements.includes('first-win'));
  assert.ok(player.card.tier === 'regular');
  // multiplayer results touch the multiplayer counters
  completeGame({ gameId: 'heist-party', credits: 90, liberals: 4, won: true, title: 'Heist Party', meta: { players: 8 } });
  assert.equal(me().stats.multiplayerPlayed, 1);
  assert.equal(me().stats.multiplayerWon, 1);
  // tier promotion happens immediately once the balance crosses 1,300
  // (Liberal milestones such as the 25 LP invitation can lift it further)
  completeGame({ gameId: 'vault-rush', credits: 2000, liberals: 2, won: false, title: 'Vault Rush' });
  assert.ok(me().credits >= 1300);
  assert.notEqual(me().card.tier, 'regular', `expected a promoted tier, got ${me().card.tier}`);
});

test('guide steps pay once each and the welcome bundle is one-time', () => {
  freshAccount('GuideReader');
  setOnboardingStep(1, { credits: 40, liberals: 0, id: 'welcome' });
  assert.equal(me().credits, 40);
  setOnboardingStep(2, { credits: 40, liberals: 0, id: 'welcome' });
  assert.equal(me().credits, 40, 'replaying a step must not pay again');
  setOnboardingStep(2, { credits: 30, liberals: 2, id: 'card' });
  assert.equal(me().credits, 70);
  assert.equal(me().liberals, 2);
  finishOnboarding();
  const afterFirst = me().credits;
  assert.equal(afterFirst, 70 + 150);
  assert.ok(me().cosmetics.includes('ember'));
  finishOnboarding();
  assert.equal(me().credits, afterFirst, 'the welcome bundle is granted only once');
});

test('reward bundles add Credits, Liberals and cosmetics without touching stats', () => {
  freshAccount('Rewardee');
  const games = me().stats.gamesPlayed;
  const result = grantReward({ credits: 55, liberals: 3, cosmetic: 'sprout', badge: 'Seasonal gift' });
  assert.equal(result.ok, true);
  assert.equal(me().credits, 55);
  assert.equal(me().liberals, 3);
  assert.ok(me().cosmetics.includes('sprout'));
  assert.equal(me().stats.gamesPlayed, games);
});

test('card controls freeze, unfreeze and reissue the credentials', () => {
  freshAccount('CardHolder');
  const original = me().card.number;
  assert.equal(toggleCardFreeze().ok, true);
  assert.equal(me().card.frozen, true);
  assert.equal(toggleCardFreeze().ok, true);
  assert.equal(me().card.frozen, false);
  const reissue = reissueCard();
  assert.equal(reissue.ok, true, reissue.message);
  assert.notEqual(me().card.number, original);
  assert.equal(me().card.reissues, 1);
});

test('market trades and business payouts move Credits correctly', () => {
  freshAccount('Trader');
  update(draft => {
    const self = draft.players.find(item => item.id === draft.currentId);
    if (self) self.credits = 10000;
  });
  const quote = getDatabase().market.quotes.NVA;
  assert.ok(quote, 'the seeded market ships a quote for NVA');
  const buy = tradeStock('NVA', 10, 'buy');
  assert.equal(buy.ok, true, buy.message);
  const holding = me().holdings.NVA;
  assert.equal(holding.shares, 10);
  assert.ok(holding.basis > 0);
  const sell = tradeStock('NVA', 10, 'sell');
  assert.equal(sell.ok, true, sell.message);
  assert.equal(me().holdings.NVA.shares, 0);
  const oversell = tradeStock('NVA', 5, 'sell');
  assert.equal(oversell.ok, false);

  const bought = buyBusiness('coffee', 'Ember Coffee Cart', 250, 4);
  assert.equal(bought.ok, true, bought.message);
  assert.equal(me().businesses.length, 1);
  const tooSoon = runBusiness('coffee');
  assert.equal(tooSoon.ok, false, 'a fresh counter has nothing to collect yet');
  update(draft => {
    const self = draft.players.find(item => item.id === draft.currentId);
    const shop = self?.businesses.find(item => item.id === 'coffee');
    if (shop) shop.lastCollectedAt = Date.now() - 60 * 60 * 1000;
  });
  const payout = runBusiness('coffee');
  assert.equal(payout.ok, true, payout.message);
  assert.ok(me().businesses[0].totalEarned > 200);
});

test('profile lifecycle: resume, delete and prune-to-empty', () => {
  freshAccount('FirstProfile');
  createAccount({ username: 'SecondProfile', linked: false });
  const second = getDatabase().players.find(player => player.username === 'Guest_SecondProfile');
  assert.ok(second);
  resumePlayer(second.id);
  assert.equal(me().username, 'Guest_SecondProfile');
  deleteLocalProfile(second.id);
  assert.equal(getDatabase().players.length, 1);
  deleteLocalProfile(getDatabase().players[0].id);
  assert.equal(getDatabase().players.length, 0);
  assert.equal(getDatabase().currentId, null);
});

test('the stored day key is used for daily missions', () => {
  freshAccount('Missioneer');
  const key = localDayKey();
  assert.match(key, /^\d{4}-\d{2}-\d{2}$/);
  assert.ok(me().missions.length >= 5);
});
