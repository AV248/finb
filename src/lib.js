export const STORAGE_KEY = 'finb-platinum-local-v1';
export const GUEST_LIFETIME_MS = 90 * 24 * 60 * 60 * 1000;

export const STOCKS = [
  { symbol: 'NVA', name: 'Nova Energy', sector: 'Clean power', base: 86.42, color: '#a6c867', volatility: 0.024 },
  { symbol: 'CRX', name: 'Circuit Works', sector: 'Technology', base: 142.8, color: '#7874cf', volatility: 0.031 },
  { symbol: 'LUM', name: 'Lumen & Loom', sector: 'Consumer', base: 58.16, color: '#e29a71', volatility: 0.019 },
  { symbol: 'MRW', name: 'Morrow Metals', sector: 'Materials', base: 204.3, color: '#62b4a9', volatility: 0.017 },
  { symbol: 'FLX', name: 'Flux Systems', sector: 'Mobility', base: 37.64, color: '#d77c9b', volatility: 0.039 },
];

export const BUSINESSES = [
  { id: 'mosslight', name: 'Mosslight Coffee', mark: 'M.', type: 'Neighborhood café', cost: 220, yieldPerMinute: 1.2, description: 'A tiny window, very loyal regulars.' },
  { id: 'paper-moon', name: 'Paper Moon Press', mark: 'P.', type: 'Indie print studio', cost: 480, yieldPerMinute: 2.8, description: 'Beautiful little runs, sold out by lunch.' },
  { id: 'cloudnine', name: 'Cloud Nine Storage', mark: 'C.', type: 'Digital infrastructure', cost: 920, yieldPerMinute: 5.8, description: 'Quietly keeps the whole neighborhood online.' },
];

export const GAMES = [
  { id: 'reaction', title: 'Blink & Bank', category: 'Solo', tag: 'REFLEX / 20 SEC', icon: '↗', reward: 'Up to 40 cr', copy: 'Catch the green flash. Brag about your milliseconds.' },
  { id: 'cipher', title: 'The 4-digit vault', category: 'Solo', tag: 'LOGIC / 1 MIN', icon: '⌘', reward: '35 cr + LP', copy: 'Crack the code in six tries. Clues are very literal.' },
  { id: 'quiz', title: 'Ledger Logic', category: 'Learn', tag: 'MONEY IQ / 2 MIN', icon: '∑', reward: 'Up to 51 cr', copy: 'Three tiny questions. One surprisingly useful brain.' },
  { id: 'memory', title: 'Memory Mint', category: 'Solo', tag: 'MEMORY / 30 SEC', icon: '▦', reward: '28 cr + LP', copy: 'Watch the sequence. Repeat it without blinking.' },
  { id: 'sprint', title: 'Signal Sprint', category: 'Solo', tag: 'ARCADE / 8 SEC', icon: '⌁', reward: 'Up to 40 cr', copy: 'How many clean taps can you bank before the bell?' },
  { id: 'vault21', title: 'Vault 21', category: 'Solo', tag: 'ODDS / VIRTUAL CREDITS', icon: '21', reward: 'Variable', copy: 'Choose low or high. A seven gives your stake back.' },
  { id: 'forecast', title: 'Forecast Frenzy', category: 'Learn', tag: 'MARKET / 1 MIN', icon: '⌁', reward: '30 cr + LP', copy: 'Call the next market move. No stake, just instinct.' },
  { id: 'duel', title: 'FAF Market Duel', category: 'FAF MULTIPLAYER', tag: 'QUICK MATCH / 1 MIN', icon: '↔', reward: 'Up to 40 cr + LP', copy: 'A random-floor rival. One market call. Good sportsmanship.' },
];

export const DOC_SECTIONS = [
  { id: 'guide', label: 'How FINB works' },
  { id: 'privacy', label: 'Privacy' },
  { id: 'accountability', label: 'Accountability' },
  { id: 'terms', label: 'Terms & conditions' },
  { id: 'brand', label: 'Name & rights' },
  { id: 'support', label: 'Support' },
];

const agentSeeds = [
  { username: 'LedgerFox', credits: 18420, liberals: 740, status: 'The quiet overachiever', color: '#ead77a' },
  { username: 'MicaMint', credits: 12370, liberals: 1284, status: 'Seven-day streak club', color: '#a5c9a8' },
  { username: 'SableCircuit', credits: 8760, liberals: 1512, status: 'Market cartographer', color: '#b5a2da' },
  { username: 'CloudQuill', credits: 5410, liberals: 966, status: 'Avid puzzle solver', color: '#e4a789' },
  { username: 'ZeroPenny', credits: 3120, liberals: 804, status: 'Joined this season', color: '#86b8c1' },
  { username: 'FoxgloveFX', credits: 2075, liberals: 1190, status: 'FAF regular', color: '#db8cad' },
];

function makeId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `finb-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 11)}`;
}

function randomDigits(count) {
  const values = new Uint8Array(count);
  if (globalThis.crypto?.getRandomValues) globalThis.crypto.getRandomValues(values);
  else for (let i = 0; i < count; i += 1) values[i] = Math.floor(Math.random() * 256);
  return Array.from(values, value => String(value % 10)).join('');
}

function makeCard(accounts = []) {
  const known = new Set(accounts.map(account => account.card?.number).filter(Boolean));
  let number = '';
  do {
    const serial = randomDigits(8);
    number = `7242 2024 ${serial.slice(0, 4)} ${serial.slice(4, 8)}`;
  } while (known.has(number));
  const now = new Date();
  const expiry = `${String(now.getMonth() + 1).padStart(2, '0')}/${String((now.getFullYear() + 3) % 100).padStart(2, '0')}`;
  return { number, cvv: randomDigits(3), expiry, type: 'Platinum', frozen: false };
}

function createMarket() {
  const quotes = {};
  for (const stock of STOCKS) {
    const series = [];
    let price = stock.base;
    for (let index = 0; index < 24; index += 1) {
      const wobble = Math.sin(index * 0.74 + STOCKS.indexOf(stock)) * stock.base * 0.018;
      series.push(Math.max(1, Number((stock.base + wobble).toFixed(2))));
    }
    price = series.at(-1);
    quotes[stock.symbol] = { price, previous: series[0], series, updatedAt: Date.now() };
  }
  return { quotes, lastTick: Date.now() };
}

function makeAgents() {
  return agentSeeds.map((agent, index) => ({
    id: `agent-${index + 1}`,
    ...agent,
    liberals: agent.liberals,
    friends: [],
    referralCode: `FINB-${['MOSS', 'LUMA', 'SAGE', 'NOVA', 'WISP', 'MINT'][index]}`,
    simulated: true,
    activity: [],
  }));
}

function baseDatabase() {
  return {
    version: 1,
    accounts: [],
    agents: makeAgents(),
    currentId: null,
    claimedGoogleIds: [],
    market: createMarket(),
  };
}

export function loadDatabase() {
  let db = baseDatabase();
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      db = { ...db, ...parsed };
      db.accounts = Array.isArray(parsed.accounts) ? parsed.accounts : [];
      db.agents = Array.isArray(parsed.agents) && parsed.agents.length ? parsed.agents : makeAgents();
      db.claimedGoogleIds = Array.isArray(parsed.claimedGoogleIds) ? parsed.claimedGoogleIds : [];
      db.market = parsed.market?.quotes ? parsed.market : createMarket();
    }
  } catch (error) {
    console.warn('FINB could not read the local profile store. A fresh session was started.', error);
  }

  const before = db.accounts.length;
  db.accounts = db.accounts
    .filter(account => account && account.id && account.username)
    .map(normalizeAccount);
  const expiredIds = new Set(
    db.accounts
      .filter(account => !account.linked && Date.now() - Number(account.createdAt || 0) >= GUEST_LIFETIME_MS)
      .map(account => account.id),
  );
  if (expiredIds.size) {
    db.accounts = db.accounts.filter(account => !expiredIds.has(account.id));
    if (expiredIds.has(db.currentId)) db.currentId = null;
  }
  if (!db.accounts.some(account => account.id === db.currentId)) db.currentId = null;
  db.market = normalizeMarket(db.market);
  if (before !== db.accounts.length) persistDatabase(db);
  return db;
}

function normalizeAccount(account) {
  return {
    ...account,
    id: account.id || makeId(),
    username: account.username || 'Guest_Orbit',
    linked: Boolean(account.linked),
    playGamesId: account.playGamesId || null,
    referralCode: account.referralCode || makeReferralCode(),
    referralUsed: Boolean(account.referralUsed),
    referralPaid: Array.isArray(account.referralPaid) ? account.referralPaid : [],
    credits: Number.isFinite(Number(account.credits)) ? Number(account.credits) : 0,
    liberals: Number.isFinite(Number(account.liberals)) ? Number(account.liberals) : 0,
    streak: Number(account.streak) || 0,
    lastDailyClaim: account.lastDailyClaim || null,
    createdAt: Number(account.createdAt) || Date.now(),
    card: account.card || makeCard(),
    friends: Array.isArray(account.friends) ? account.friends : [],
    holdings: account.holdings || {},
    businesses: Array.isArray(account.businesses) ? account.businesses : [],
    achievements: Array.isArray(account.achievements) ? account.achievements : [],
    activity: Array.isArray(account.activity) ? account.activity : [],
    stats: { gamesPlayed: 0, gamesWon: 0, bestReaction: null, ...(account.stats || {}) },
  };
}

function normalizeMarket(market) {
  const result = market?.quotes ? market : createMarket();
  const fresh = createMarket();
  for (const stock of STOCKS) {
    const quote = result.quotes?.[stock.symbol];
    if (!quote || !Number.isFinite(Number(quote.price))) {
      result.quotes[stock.symbol] = fresh.quotes[stock.symbol];
      continue;
    }
    result.quotes[stock.symbol] = {
      ...quote,
      price: Number(quote.price),
      previous: Number(quote.previous) || Number(quote.price),
      series: Array.isArray(quote.series) && quote.series.length ? quote.series.map(Number).slice(-48) : [Number(quote.price)],
      updatedAt: Number(quote.updatedAt) || Date.now(),
    };
  }
  return result;
}

export function persistDatabase(db) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    return true;
  } catch (error) {
    console.warn('FINB could not save this browser-local session.', error);
    return false;
  }
}

export function cloneDatabase(db) {
  return JSON.parse(JSON.stringify(db));
}

export function makeReferralCode(existing = []) {
  const alphabet = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  const used = new Set(existing.map(account => account.referralCode));
  let code;
  do {
    let token = '';
    for (let index = 0; index < 6; index += 1) token += alphabet[Math.floor(Math.random() * alphabet.length)];
    code = `FINB-${token}`;
  } while (used.has(code));
  return code;
}

export function createAccount({ username, linked = false, playGamesId = null }, accounts = []) {
  const account = {
    id: makeId(),
    username,
    linked,
    playGamesId: linked ? normalizeGameTag(playGamesId) : null,
    referralCode: makeReferralCode(accounts),
    referralUsed: false,
    referralPaid: [],
    credits: 0,
    liberals: 0,
    streak: 0,
    lastDailyClaim: null,
    createdAt: Date.now(),
    card: makeCard(accounts),
    friends: [],
    holdings: {},
    businesses: [],
    achievements: [],
    activity: [],
    stats: { gamesPlayed: 0, gamesWon: 0, bestReaction: null },
  };
  return account;
}

export function normalizeGameTag(value) {
  return String(value || '').trim().replace(/^@/, '').toLowerCase();
}

export function localDayKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function shiftDayKey(dayKey, offset) {
  if (!dayKey) return null;
  const date = new Date(`${dayKey}T12:00:00`);
  date.setDate(date.getDate() + offset);
  return localDayKey(date);
}

export function getDailyBonus(streak) {
  return ({ 7: 30, 14: 75, 30: 200, 60: 500 })[streak] || 0;
}

export function formatCredits(value, digits = 0) {
  const number = Number(value) || 0;
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits || (Number.isInteger(number) ? 0 : 2),
  }).format(number);
}

export function formatCompact(value) {
  return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(Number(value) || 0);
}

export function formatDateTime(timestamp) {
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(timestamp));
}

export function initials(name) {
  return String(name || 'F').split(/[_\s-]+/).filter(Boolean).slice(0, 2).map(part => part[0].toUpperCase()).join('') || 'F';
}

export function escapeUsername(value) {
  return String(value || '').trim().replace(/[^a-zA-Z0-9_]/g, '').slice(0, 18);
}

export function getDirectory(db) {
  return [
    ...db.accounts.map(account => ({ ...account, simulated: false })),
    ...db.agents.map(agent => ({ ...agent, simulated: true })),
  ];
}

export function appendActivity(account, title, amount = null, kind = 'info') {
  if (!Array.isArray(account.activity)) account.activity = [];
  account.activity.unshift({ id: makeId(), title, amount, kind, at: Date.now() });
  account.activity = account.activity.slice(0, 40);
}

export function applyChange(account, { credits = 0, liberals = 0, title, kind = 'game' }) {
  account.credits = Math.round((Number(account.credits) + Number(credits)) * 100) / 100;
  account.liberals = Math.max(0, Number(account.liberals) + Number(liberals));
  if (title) appendActivity(account, title, credits, kind);
}

export function awardReferral(db, joiner, rawCode) {
  const code = String(rawCode || '').trim().toUpperCase();
  if (!code) return { ok: false, reason: 'Enter an invite code first.' };
  if (!joiner.linked || !joiner.playGamesId) return { ok: false, reason: 'Link a unique Play Games profile before claiming a referral.' };
  if (joiner.referralUsed) return { ok: false, reason: 'This profile has already used its one referral.' };
  const referrer = db.accounts.find(account => account.referralCode.toUpperCase() === code);
  if (!referrer) return { ok: false, reason: 'That invite code is not in this local FINB network.' };
  if (referrer.id === joiner.id) return { ok: false, reason: 'You cannot refer yourself.' };
  if (!referrer.linked) return { ok: false, reason: 'The referrer needs a linked Play Games profile.' };
  if (referrer.referralPaid.includes(joiner.id)) return { ok: false, reason: 'This invite was already rewarded.' };
  joiner.referralUsed = true;
  referrer.referralPaid.push(joiner.id);
  applyChange(joiner, { credits: 200, title: 'Referral welcome', kind: 'referral' });
  applyChange(referrer, { credits: 100, title: `Referred ${joiner.username}`, kind: 'referral' });
  return { ok: true, reason: `Invite verified. +200 Credits for ${joiner.username}; +100 for ${referrer.username}.` };
}

export function moveQuote(quote, stock) {
  const noise = (Math.random() * 2 - 1) * stock.volatility;
  const drift = (Math.random() - 0.49) * stock.volatility * 0.65;
  const next = Math.max(1, Number((quote.price * (1 + noise + drift)).toFixed(2)));
  return {
    price: next,
    previous: quote.price,
    series: [...quote.series, next].slice(-48),
    updatedAt: Date.now(),
  };
}

export function getTrend(quote) {
  const change = Number(quote.price) - Number(quote.previous);
  const percent = quote.previous ? (change / quote.previous) * 100 : 0;
  return { change, percent, up: change >= 0 };
}

export function createCardForAccount(accounts = []) {
  return makeCard(accounts);
}

export function getBusinessEarnings(business, now = Date.now()) {
  const maxMinutes = 60 * 12;
  const elapsed = Math.max(0, Math.min(maxMinutes, (now - Number(business.lastCollectedAt || now)) / 60000));
  return Math.floor(elapsed * Number(business.yieldPerMinute || 0));
}

export function cleanCardDigits(card) {
  return String(card?.number || '').replace(/\s/g, '');
}
