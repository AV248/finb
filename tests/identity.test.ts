import './setup.ts';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ECONOMY } from '../src/lib/economy.ts';
import {
  ACCOUNT_RULES,
  PROVIDERS,
  claimKey,
  debitCredits,
  normaliseCreditBuckets,
  normaliseSubject,
  reservedCredits,
  subjectProblem,
  totalCredits,
  transferableCredits,
  usableCredits,
} from '../src/lib/identity.ts';
import {
  buyBusiness,
  createAccount,
  getDatabase,
  hydrate,
  linkProvider,
  linkPlayGames,
  setDatabase,
  STORAGE_KEY,
  tradeStock,
  sendTransfer,
  tipPlayer,
  addFriend,
  claimReferral,
  claimDaily,
  walletSnapshot,
} from '../src/lib/store.ts';

/** Fresh vault for every test — the store is a module singleton. */
function reset() {
  setDatabase({
    ...getDatabase(),
    players: [],
    currentId: null,
    claimedProviderSubjects: [],
    claimedPlayGamesTags: [],
    onboardingSeen: false,
    tipsWallet: {},
  });
}

function open(input: Parameters<typeof createAccount>[0]) {
  const result = createAccount(input);
  assert.equal(result.ok, true, result.message);
  return getDatabase();
}

function me() {
  const db = getDatabase();
  const player = db.players.find(item => item.id === db.currentId);
  assert.ok(player, 'expected an active profile');
  return player;
}

/* ------------------------------------------------------------------ *
 * Published numbers
 * ------------------------------------------------------------------ */
test('the welcome grants match the published account rules exactly', () => {
  assert.equal(ACCOUNT_RULES.guestReserve, 100);
  assert.equal(ACCOUNT_RULES.googleWelcome, 100);
  assert.equal(ACCOUNT_RULES.discordWelcome, 300);
  assert.equal(ACCOUNT_RULES.discordTopUp, 200);
  assert.equal(ACCOUNT_RULES.guestTtlDays, 90);
  assert.equal(ECONOMY.welcome.guest, 100);
  assert.equal(ECONOMY.welcome.google, 100);
  assert.equal(ECONOMY.welcome.discord, 300);
  assert.equal(ECONOMY.discordTopUp, 200);
  // the discord grant is the guest reserve plus the top-up, never a mismatch
  assert.equal(PROVIDERS.guest.welcome + PROVIDERS.discord.topUp, PROVIDERS.discord.welcome);
  assert.equal(PROVIDERS.guest.welcome + PROVIDERS.google.topUp, PROVIDERS.google.welcome);
});

test('provider subjects are normalised into one canonical dedupe key', () => {
  assert.equal(normaliseSubject('  @VaultVera '), 'vaultvera');
  assert.equal(normaliseSubject('Vault Vera'), 'vaultvera');
  assert.equal(claimKey('discord', '@VaultVera'), 'discord:vaultvera');
  assert.equal(claimKey('google', 'vaultvera'), 'google:vaultvera');
  // and the two providers never share a key
  assert.notEqual(claimKey('discord', 'x1'), claimKey('google', 'x1'));
  assert.match(subjectProblem('discord', 'ab') ?? '', /at least 3/i);
  assert.equal(subjectProblem('discord', 'vault_vera'), null);
  assert.equal(subjectProblem('guest', ''), null);
});

/* ------------------------------------------------------------------ *
 * Guest accounts
 * ------------------------------------------------------------------ */
test('a guest holds 100 reserved Credits that no action can spend', () => {
  reset();
  open({ username: 'Reserve', provider: 'guest' });
  const player = me();

  assert.equal(player.username, 'Guest_Reserve');
  assert.equal(player.provider, 'guest');
  assert.equal(player.linked, false);
  assert.equal(player.credits, 0, 'nothing usable at signup');
  assert.equal(player.lockedCredits, 100, 'the 100 Credits are reserved');
  assert.equal(usableCredits(player), 0);
  assert.equal(reservedCredits(player), 100);
  assert.equal(totalCredits(player), 100);
  assert.equal(transferableCredits(player), 0);
  assert.ok(player.guestExpiresAt, 'the 90 day clock starts at creation');
  const days = ((player.guestExpiresAt as number) - Date.now()) / 86400000;
  assert.ok(days > 89.9 && days <= 90, `expected ~90 days, saw ${days}`);

  // the reserve is invisible to every spend path
  const trade = tradeStock('FINB', 1, 'buy');
  assert.equal(trade.ok, false, 'a guest cannot buy shares with reserved Credits');
  const business = buyBusiness('cafe', 'Vault Café', 250, 3);
  assert.equal(business.ok, false, 'a guest cannot open a business with reserved Credits');
  assert.equal(me().lockedCredits, 100, 'failed spends never touch the reserve');
  assert.equal(me().credits, 0);
  assert.equal(totalCredits(me()), 100);
});

test('linking Google turns the reserved 100 into 100 usable Credits', () => {
  reset();
  open({ username: 'Googler', provider: 'guest' });
  const result = linkProvider('google', 'googler_tag');
  assert.equal(result.ok, true, result.message);
  assert.equal(result.released, 100);
  assert.equal(result.granted, 0, 'Google tops the reserve up by nothing');
  const player = me();

  assert.equal(player.linked, true);
  assert.equal(player.provider, 'google');
  assert.equal(player.providerSubject, 'googler_tag');
  assert.equal(player.credits, 100);
  assert.equal(player.bonusCredits, 100, 'the welcome Credits are flagged as a grant');
  assert.equal(player.lockedCredits, 0);
  assert.equal(player.guestExpiresAt, null);
  assert.equal(player.username, 'Googler', 'the Guest_ prefix is dropped on link');
  assert.equal(player.card.holder, 'Googler');
  assert.ok(player.linkedAt);
});

test('linking Discord turns the reserved 100 into 300 usable Credits', () => {
  reset();
  open({ username: 'Discorder', provider: 'guest' });
  const result = linkProvider('discord', 'Discorder#1');
  assert.equal(result.ok, true, result.message);
  assert.equal(result.released, 100);
  assert.equal(result.granted, 200);
  const player = me();
  assert.equal(player.provider, 'discord');
  assert.equal(player.credits, 300);
  assert.equal(player.bonusCredits, 300);
  assert.equal(player.lockedCredits, 0);
  assert.equal(totalCredits(player), 300);
});

/* ------------------------------------------------------------------ *
 * Direct provider sign-up
 * ------------------------------------------------------------------ */
test('opening straight from Google or Discord pays the same one-time grant', () => {
  reset();
  open({ username: 'DirectGoogle', provider: 'google', providerSubject: 'direct_g' });
  assert.equal(me().credits, 100);
  assert.equal(me().bonusCredits, 100);
  assert.equal(me().lockedCredits, 0);
  assert.equal(me().username, 'DirectGoogle');

  reset();
  open({ username: 'DirectDiscord', provider: 'discord', providerSubject: 'direct_d' });
  assert.equal(me().credits, 300);
  assert.equal(me().bonusCredits, 300);
  assert.equal(me().lockedCredits, 0);
  assert.equal(me().guestExpiresAt, null);
});

test('one Discord account can never claim the 300 Credit grant twice', () => {
  reset();
  open({ username: 'Claimer', provider: 'discord', providerSubject: 'shared#7' });
  assert.equal(me().credits, 300);

  // second profile, same Discord account → the door opens, the grant does not
  open({ username: 'Dupe', provider: 'discord', providerSubject: 'SHARED#7' });
  assert.equal(me().credits, 0, 'no second grant is minted');
  assert.equal(me().welcomeGrantClaimed, false);
  assert.match(getDatabase().players[0].username, /Claimer/);

  // and a third profile that signs up as a guest cannot launder a top-up either
  open({ username: 'Sneaky', provider: 'guest' });
  const link = linkProvider('discord', 'shared#7');
  assert.equal(link.ok, true);
  assert.equal(link.grantReused, true);
  assert.equal(link.granted, 0);
  assert.equal(me().credits, 100, 'only the profile’s own reserve converts');
  assert.equal(getDatabase().claimedProviderSubjects.filter(key => key === 'discord:shared#7').length, 1);
});

test('Google and Discord grants are tracked per provider, not per handle text', () => {
  reset();
  open({ username: 'BothWays', provider: 'guest' });
  linkProvider('google', 'shared');
  const second = linkProvider('discord', 'shared');
  assert.equal(second.ok, false, 'a profile links exactly one provider');
  assert.match(second.message, /already a permanent/i);
});

/* ------------------------------------------------------------------ *
 * Transfer rules
 * ------------------------------------------------------------------ */
test('welcome Credits can be spent but never transferred out', () => {
  reset();
  open({ username: 'Wallet', provider: 'discord', providerSubject: 'wallet_one' });
  const player = me();
  assert.equal(player.credits, 300);
  assert.equal(transferableCredits(player), 0, 'all of it is a welcome grant');

  open({ username: 'Friend', provider: 'google', providerSubject: 'friend_one' });
  setDatabase({ ...getDatabase(), currentId: getDatabase().players[0].id });
  addFriend('Friend');

  const blocked = sendTransfer('Friend', 100, 'gift');
  assert.equal(blocked.ok, false);
  assert.match(blocked.message, /never transferred|welcome Credits stay personal/i);

  // earn 80 Credits in a game, then 200 becomes sendable? no: 80 only.
  setDatabase({
    ...getDatabase(),
    players: getDatabase().players.map(item => (item.id === getDatabase().currentId ? { ...item, credits: 380 } : item)),
  });
  const partial = sendTransfer('Friend', 120, 'gift');
  assert.equal(partial.ok, false, 'only the earned 80 Credits may leave the profile');
  const ok = sendTransfer('Friend', 80, 'gift');
  assert.equal(ok.ok, true, ok.message);
  assert.equal(me().credits, 300);
  assert.equal(me().bonusCredits, 300, 'the grant is untouched while earned Credits remain');

  const tip = tipPlayer('Friend', 10);
  assert.equal(tip.ok, false, 'tips are transfers and obey the same rule');
});

test('debits consume earned Credits first and the welcome grant last', () => {
  reset();
  open({ username: 'Sorter', provider: 'discord', providerSubject: 'sorter_one' });
  const player = me();
  player.credits += 50; // pretend a game paid out
  normaliseCreditBuckets(player);
  assert.equal(player.credits, 350);
  assert.equal(player.bonusCredits, 300);
  assert.equal(transferableCredits(player), 50);

  debitCredits(player, 50);
  assert.equal(player.credits, 300);
  assert.equal(player.bonusCredits, 300, 'earned Credits were spent first');

  debitCredits(player, 40);
  assert.equal(player.credits, 260);
  assert.equal(player.bonusCredits, 260, 'the grant is spent only when nothing else is left');

  // a raw debit from a game can never leave the grant above the balance
  const raw = me();
  raw.credits = 10;
  normaliseCreditBuckets(raw);
  assert.equal(raw.bonusCredits, 10);
  assert.equal(transferableCredits(raw), 0);
});

test('the wallet snapshot exposes every bucket the UI shows', () => {
  reset();
  open({ username: 'Snapshot', provider: 'guest' });
  assert.deepEqual(walletSnapshot(me()), { usable: 0, reserved: 100, total: 100, transferable: 0, bonus: 0, linked: false, provider: 'guest' });
  linkProvider('discord', 'snap_one');
  assert.deepEqual(walletSnapshot(me()), { usable: 300, reserved: 0, total: 300, transferable: 0, bonus: 300, linked: true, provider: 'discord' });
});

/* ------------------------------------------------------------------ *
 * Referrals + daily rewards stay earned Credits
 * ------------------------------------------------------------------ */
test('referrals need a linked account and pay earned Credits', () => {
  reset();
  open({ username: 'Owner', provider: 'discord', providerSubject: 'owner_one' });
  const code = me().referralCode;
  open({ username: 'GuestJoin', provider: 'guest' });

  const refused = claimReferral(code);
  assert.equal(refused.ok, false);
  assert.match(refused.message, /link google or discord/i);

  linkProvider('google', 'join_one');
  const claimed = claimReferral(code);
  assert.equal(claimed.ok, true, claimed.message);
  const joiner = me();
  const owner = getDatabase().players.find(item => item.id !== joiner.id);
  assert.ok(owner);
  // the referral pays earned Credits on top of the 100 Credit welcome grant
  assert.equal(joiner.credits, 100 + ECONOMY.referralJoiner);
  assert.equal(joiner.bonusCredits, 100, 'referral Credits are earned, not granted');
  assert.equal(transferableCredits(joiner), ECONOMY.referralJoiner);
  assert.equal(owner.credits, 300 + ECONOMY.referralReferrer);

  const daily = claimDaily();
  assert.equal(daily.ok, true, daily.message);
  assert.equal(me().bonusCredits, 100, 'login rewards never inflate the grant bucket');
});

/* ------------------------------------------------------------------ *
 * Migration
 * ------------------------------------------------------------------ */
test('v2 profiles upgrade in place without losing a balance or a bonus', () => {
  const legacy = {
    version: 2,
    players: [
      {
        id: 'player-old',
        username: 'Guest_Old',
        displayName: 'Guest_Old',
        linked: false,
        playGamesTag: null,
        avatarSeed: 'old',
        credits: 0,
        liberals: 4,
        createdAt: Date.now() - 1000,
        lastSeenAt: Date.now(),
        streak: 2,
        lastDailyClaim: null,
        onboarded: true,
        onboardingStep: 3,
        onboardingRewards: [],
        card: null,
        friends: [],
        challenges: [],
        rooms: [],
        activity: [],
        holdings: {},
        businesses: [],
        missions: [],
        achievements: [],
        cosmetics: [],
        stats: null,
        combo: null,
        invitedBy: null,
        referralCode: 'FINB-OLD',
        referralClaimed: false,
        linkBonusClaimed: false,
        seriesGranted: false,
        platinumInvited: false,
        guestExpiresAt: Date.now() + 86400000,
      },
      {
        id: 'player-linked',
        username: 'Veteran',
        displayName: 'Veteran',
        linked: true,
        playGamesTag: 'vet_tag',
        credits: 4200,
        liberals: 90,
        createdAt: Date.now() - 5000,
        lastSeenAt: Date.now(),
        streak: 9,
        lastDailyClaim: null,
        onboarded: true,
        onboardingStep: 9,
        onboardingRewards: [],
        card: null,
        friends: [],
        challenges: [],
        rooms: [],
        activity: [],
        holdings: {},
        businesses: [],
        missions: [],
        achievements: [],
        cosmetics: [],
        stats: null,
        combo: null,
        invitedBy: null,
        referralCode: 'FINB-VET',
        referralClaimed: true,
        linkBonusClaimed: true,
        seriesGranted: false,
        platinumInvited: false,
        guestExpiresAt: null,
      },
    ],
    currentId: 'player-linked',
    market: { quotes: {}, lastTick: Date.now() },
    globalActivity: [],
    claimedPlayGamesTags: ['vet_tag'],
    onboardingSeen: true,
    seasonSeenId: null,
    soundOn: true,
    tipsWallet: {},
    season: null,
    lastSyncAt: 0,
  };

  const migrated = hydrate(JSON.stringify(legacy));
  const guest = migrated.players.find(item => item.id === 'player-old');
  const veteran = migrated.players.find(item => item.id === 'player-linked');
  assert.ok(guest && veteran);

  assert.equal(guest.provider, 'guest');
  assert.equal(guest.lockedCredits, 100, 'upgraded guests keep the reserved 100');
  assert.equal(guest.credits, 0);
  assert.equal(veteran.provider, 'google');
  assert.equal(veteran.providerSubject, 'vet_tag');
  assert.equal(veteran.bonusCredits, 100, 'the legacy link award is re-flagged as a grant');
  assert.equal(veteran.credits, 4200, 'balances are carried over untouched');
  assert.equal(veteran.lockedCredits, 0);
  assert.deepEqual(migrated.claimedProviderSubjects, ['google:vet_tag']);
  assert.equal(migrated.version, 3);
});

test('hydrate falls back to an empty vault when storage is corrupt', () => {
  const fresh = hydrate('{not json');
  assert.equal(fresh.players.length, 0);
  assert.deepEqual(fresh.claimedProviderSubjects, []);
  assert.equal(STORAGE_KEY, 'finb-platinum-v2');
});
