import React, { useCallback, useEffect, useState } from 'react';
import GameModal from './components/GameModal.jsx';
import {
  STOCKS,
  BUSINESSES,
  GAMES,
  DOC_SECTIONS,
  loadDatabase,
  persistDatabase,
  cloneDatabase,
  createAccount,
  createCardForAccount,
  normalizeGameTag,
  escapeUsername,
  localDayKey,
  shiftDayKey,
  getDailyBonus,
  formatCredits,
  formatCompact,
  formatDateTime,
  initials,
  getDirectory,
  appendActivity,
  applyChange,
  awardReferral,
  moveQuote,
  getTrend,
  getBusinessEarnings,
} from './lib.js';

const NAV = [
  { id: 'overview', label: 'Overview', icon: 'home', section: 'OFFICE' },
  { id: 'arcade', label: 'Play floor', icon: 'play', section: 'OFFICE' },
  { id: 'markets', label: 'Market lab', icon: 'chart', section: 'OFFICE' },
  { id: 'social', label: 'People & FAF', icon: 'people', section: 'OFFICE' },
  { id: 'card', label: 'Card studio', icon: 'card', section: 'OFFICE' },
  { id: 'rewards', label: 'Rewards', icon: 'spark', section: 'OFFICE' },
];

const PAGE_TITLES = {
  overview: 'Private client / Overview',
  arcade: 'Play floor / Arcade',
  markets: 'Treasury / Market lab',
  social: 'Network / People & FAF',
  card: 'Card services / Platinum',
  rewards: 'Progress / Rewards',
  documents: 'The fine print / FINB papers',
};

const ACHIEVEMENTS = [
  { id: 'first-game', name: 'First play', copy: 'Finish a game on the floor.', liberals: 8, glyph: '✳' },
  { id: 'first-win', name: 'Green lights', copy: 'Win your first game round.', liberals: 10, glyph: '↗' },
  { id: 'five-games', name: 'Regular at the floor', copy: 'Finish five rounds.', liberals: 20, glyph: '▦' },
  { id: 'first-trade', name: 'Market curious', copy: 'Make your first simulated share trade.', liberals: 10, glyph: '⌁' },
  { id: 'first-friend', name: 'Good company', copy: 'Add your first player to the address book.', liberals: 8, glyph: '◌' },
];

function awardAchievement(account, achievementId) {
  const achievement = ACHIEVEMENTS.find(item => item.id === achievementId);
  if (!achievement || account.achievements.includes(achievementId)) return false;
  account.achievements.push(achievementId);
  account.liberals += achievement.liberals;
  appendActivity(account, `Achievement · ${achievement.name}`, null, 'achievement');
  return true;
}

function saveLocal(next) {
  persistDatabase(next);
  return next;
}

export default function App() {
  const [db, setDb] = useState(() => loadDatabase());
  const dbRef = React.useRef(db);
  const [page, setPage] = useState('overview');
  const [mode, setMode] = useState('guest');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [modal, setModal] = useState(null);
  const [cardRevealed, setCardRevealed] = useState(false);
  const [docSection, setDocSection] = useState('guide');
  const [libraryFilter, setLibraryFilter] = useState('All');
  const [rankBy, setRankBy] = useState('credits');
  const [selectedTicker, setSelectedTicker] = useState('NVA');
  const [marketWindow, setMarketWindow] = useState('DAY');
  const [marketSearch, setMarketSearch] = useState('');
  const toastTimer = React.useRef(null);

  useEffect(() => {
    dbRef.current = db;
    saveLocal(db);
  }, [db]);

  const user = db.accounts.find(account => account.id === db.currentId) || null;

  const writeDb = useCallback(next => {
    dbRef.current = next;
    saveLocal(next);
    setDb(next);
  }, []);

  const commit = useCallback(mutator => {
    const next = cloneDatabase(dbRef.current);
    mutator(next);
    writeDb(next);
    return next;
  }, [writeDb]);

  const showToast = useCallback((message, kind = 'success') => {
    setToast({ message, kind, key: Date.now() });
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 3600);
  }, []);

  useEffect(() => () => window.clearTimeout(toastTimer.current), []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      commit(state => {
        const now = Date.now();
        if (now - Number(state.market.lastTick || 0) < 14500) return;
        for (const stock of STOCKS) {
          const quote = state.market.quotes[stock.symbol];
          state.market.quotes[stock.symbol] = moveQuoteSafely(quote, stock);
        }
        state.market.lastTick = now;
      });
    }, 15000);
    return () => window.clearInterval(timer);
  }, [commit]);

  const navigate = (target) => {
    setPage(target);
    setDrawerOpen(false);
    setCardRevealed(false);
  };

  const openDocuments = (section = 'guide') => {
    setDocSection(section);
    navigate('documents');
  };

  const handleCreateAccount = (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const rawHandle = escapeUsername(form.get('username'));
    const linked = mode === 'linked';
    const handle = linked ? rawHandle : rawHandle.replace(/^Guest_/i, '');
    if (handle.length < 3 || handle.length > 16) {
      showToast('Choose a custom handle between 3 and 16 letters, numbers, or underscores.', 'error');
      return;
    }
    const username = linked ? handle : `Guest_${handle}`;
    const duplicateName = db.accounts.find(account => account.username.toLowerCase() === username.toLowerCase());
    if (duplicateName) {
      showToast('That username is already in this browser’s FINB directory. Sign in from your saved profiles instead.', 'error');
      return;
    }
    if (getDirectory(db).some(player => player.username.toLowerCase() === username.toLowerCase())) {
      showToast('That handle is in use on the FINB play floor. Try another.', 'error');
      return;
    }

    let tag = null;
    if (linked) {
      tag = normalizeGameTag(form.get('playGamesId'));
      if (!/^[a-z0-9_.#-]{3,40}$/.test(tag)) {
        showToast('Enter a Play Games tag (3–40 letters, numbers, dot, dash or underscore).', 'error');
        return;
      }
      const existing = db.accounts.find(account => account.linked && account.playGamesId === tag);
      if (existing) {
        const next = cloneDatabase(db);
        next.currentId = existing.id;
        writeDb(next);
        setPage('overview');
        showToast(`Welcome back, ${existing.username}. Your local profile is ready.`);
        return;
      }
    }

    const next = cloneDatabase(db);
    const account = createAccount({ username, linked, playGamesId: tag }, next.accounts);
    if (linked && !next.claimedGoogleIds.includes(tag)) {
      account.credits = 100;
      next.claimedGoogleIds.push(tag);
      appendActivity(account, 'Play Games profile welcome credit', 100, 'reward');
    }
    next.accounts.push(account);
    next.currentId = account.id;
    const referral = String(form.get('referral') || '').trim();
    const referralResult = referral && linked ? awardReferral(next, account, referral) : null;
    saveLocal(next);
    writeDb(next);
    setPage('overview');
    setCardRevealed(false);
    if (referralResult?.ok) showToast(`Account opened. ${referralResult.reason}`);
    else if (referral && !linked) showToast('Guest access opened with 0 Credits. Link a Play Games profile later to claim 100.', 'info');
    else if (referralResult && !referralResult.ok) showToast(`Account opened. ${referralResult.reason}`, 'info');
    else if (linked && account.credits === 100) showToast('Your Platinum profile is live. +100 welcome Credits added.');
    else showToast('Guest profile opened with 0 Credits. Your first login reward is ready to claim.');
  };

  const resumeAccount = (id) => {
    const next = cloneDatabase(db);
    next.currentId = id;
    writeDb(next);
    setPage('overview');
    setCardRevealed(false);
    const account = next.accounts.find(item => item.id === id);
    showToast(`Welcome back, ${account?.username || 'operator'}.`);
  };

  const switchProfile = () => {
    const next = cloneDatabase(db);
    next.currentId = null;
    writeDb(next);
    setPage('overview');
    setModal(null);
    setDrawerOpen(false);
  };

  const claimDailyReward = () => {
    if (!user) return;
    const today = localDayKey();
    if (user.lastDailyClaim === today) {
      showToast('Today’s login reward is already in your ledger.', 'info');
      return;
    }
    let nextStreak = 1;
    if (user.lastDailyClaim === shiftDayKey(today, -1)) nextStreak = Number(user.streak || 0) + 1;
    const milestoneBonus = getDailyBonus(nextStreak);
    const total = 10 + milestoneBonus;
    commit(state => {
      const account = state.accounts.find(item => item.id === state.currentId);
      if (!account || account.lastDailyClaim === today) return;
      account.streak = nextStreak;
      account.lastDailyClaim = today;
      applyChange(account, { credits: total, liberals: 1, title: `Daily login · day ${nextStreak}`, kind: 'reward' });
    });
    showToast(`Login reward collected: +${formatCredits(total)} Credits${milestoneBonus ? `, including the day ${nextStreak} streak bonus` : ''}.`);
  };

  const openGame = (gameId) => {
    let opponent = null;
    if (gameId === 'duel') {
      const directory = getDirectory(db).filter(player => player.id !== user?.id);
      opponent = directory[Math.floor(Math.random() * directory.length)] || null;
    }
    setModal({ type: 'game', gameId, opponent });
  };

  const completeGame = (payload) => {
    if (!user) return;
    const next = cloneDatabase(dbRef.current);
    const account = next.accounts.find(item => item.id === next.currentId);
    if (!account) return;
    applyChange(account, { credits: payload.credits || 0, liberals: payload.liberals || 0, title: payload.title || 'Play floor · round complete', kind: 'game' });
    account.stats.gamesPlayed += 1;
    if (payload.won) account.stats.gamesWon += 1;
    if (payload.reactionMs && (!account.stats.bestReaction || payload.reactionMs < account.stats.bestReaction)) account.stats.bestReaction = payload.reactionMs;
    const achievementNames = [];
    if (awardAchievement(account, 'first-game')) achievementNames.push('First play');
    if (payload.won && awardAchievement(account, 'first-win')) achievementNames.push('Green lights');
    if (account.stats.gamesPlayed >= 5 && awardAchievement(account, 'five-games')) achievementNames.push('Regular at the floor');
    writeDb(next);
    if (achievementNames.length) showToast(`Achievement unlocked: ${achievementNames.join(' · ')}. Liberals added.`);
  };

  const moveMarket = (symbol) => {
    const stock = STOCKS.find(item => item.symbol === symbol);
    const quote = dbRef.current.market.quotes[symbol];
    if (!stock || !quote) return { previous: 0, next: 0 };
    const nextQuote = moveQuoteSafely(quote, stock);
    commit(state => {
      state.market.quotes[symbol] = nextQuote;
      state.market.lastTick = Date.now();
    });
    return { previous: quote.price, next: nextQuote.price };
  };

  const tradeShares = (event) => {
    event.preventDefault();
    if (!user) return;
    const form = new FormData(event.currentTarget);
    const side = event.nativeEvent.submitter?.value || form.get('side');
    const symbol = String(form.get('symbol') || 'NVA');
    const quantity = Math.floor(Number(form.get('quantity')));
    const stock = STOCKS.find(item => item.symbol === symbol);
    const quote = db.market.quotes[symbol];
    if (!stock || !quote || !Number.isFinite(quantity) || quantity < 1 || quantity > 9999) {
      showToast('Enter a whole-share quantity from 1 to 9,999.', 'error');
      return;
    }
    const total = Math.round(quote.price * quantity * 100) / 100;
    if (side === 'buy' && user.credits < total) {
      showToast(`That order needs ${formatCredits(total, 2)} Credits. Choose fewer shares or earn more first.`, 'error');
      return;
    }
    const holding = user.holdings[symbol] || { shares: 0, avgPrice: 0 };
    if (side === 'sell' && holding.shares < quantity) {
      showToast(`You only hold ${holding.shares} ${symbol} shares.`, 'error');
      return;
    }
    const next = cloneDatabase(db);
    const account = next.accounts.find(item => item.id === next.currentId);
    if (!account) return;
    const current = account.holdings[symbol] || { shares: 0, avgPrice: 0 };
    if (side === 'buy') {
      const nextShares = current.shares + quantity;
      current.avgPrice = ((current.avgPrice * current.shares) + (quote.price * quantity)) / nextShares;
      current.shares = nextShares;
      account.holdings[symbol] = current;
      account.credits = Math.round((account.credits - total) * 100) / 100;
      appendActivity(account, `Bought ${quantity} ${symbol} share${quantity === 1 ? '' : 's'}`, -total, 'trade');
    } else {
      current.shares -= quantity;
      account.credits = Math.round((account.credits + total) * 100) / 100;
      if (current.shares === 0) delete account.holdings[symbol];
      else account.holdings[symbol] = current;
      appendActivity(account, `Sold ${quantity} ${symbol} share${quantity === 1 ? '' : 's'}`, total, 'trade');
    }
    const firstTradeAchievement = awardAchievement(account, 'first-trade');
    const key = `market-explorer-${symbol}`;
    if (!account.achievements.includes(key)) {
      account.achievements.push(key);
      account.liberals += 2;
      appendActivity(account, `Market explorer · ${symbol}`, null, 'achievement');
    }
    writeDb(next);
    showToast(`${side === 'buy' ? 'Buy' : 'Sell'} order filled in simulation: ${quantity} ${symbol} for ${formatCredits(total, 2)} Credits.${firstTradeAchievement ? ' Market Curious unlocked — +10 Liberals.' : ''}`);
  };

  const buyBusiness = (businessId) => {
    if (!user) return;
    const business = BUSINESSES.find(item => item.id === businessId);
    if (!business) return;
    if (user.businesses.some(item => item.id === businessId)) {
      showToast('You already own this little venture.', 'info');
      return;
    }
    if (user.credits < business.cost) {
      showToast(`You need ${formatCredits(business.cost)} Credits to open ${business.name}.`, 'error');
      return;
    }
    commit(state => {
      const account = state.accounts.find(item => item.id === state.currentId);
      if (!account || account.credits < business.cost || account.businesses.some(item => item.id === businessId)) return;
      account.credits -= business.cost;
      account.businesses.push({ id: business.id, name: business.name, yieldPerMinute: business.yieldPerMinute, purchasedAt: Date.now(), lastCollectedAt: Date.now() });
      appendActivity(account, `Opened ${business.name}`, -business.cost, 'business');
    });
    showToast(`${business.name} is open for business. Its simulated till is running.`);
  };

  const collectBusiness = (businessId) => {
    const owned = user?.businesses.find(item => item.id === businessId);
    const due = owned ? getBusinessEarnings(owned) : 0;
    if (!due) {
      showToast('No yield to collect yet. Your business needs a little more time.', 'info');
      return;
    }
    commit(state => {
      const account = state.accounts.find(item => item.id === state.currentId);
      const business = account?.businesses.find(item => item.id === businessId);
      if (!account || !business) return;
      const amount = getBusinessEarnings(business);
      if (!amount) return;
      business.lastCollectedAt = Date.now();
      applyChange(account, { credits: amount, title: `${business.name} · simulated yield`, kind: 'business' });
    });
    showToast(`${formatCredits(due)} Credits collected from ${owned?.name}.`);
  };

  const addFriend = (username) => {
    const clean = String(username || '').trim();
    if (!clean) {
      showToast('Enter a FINB username to search the local play floor.', 'error');
      return false;
    }
    const player = getDirectory(db).find(item => item.username.toLowerCase() === clean.toLowerCase());
    if (!player) {
      showToast('No matching player is registered in this browser-local FINB network.', 'error');
      return false;
    }
    if (player.id === user?.id) {
      showToast('You are already your own favourite player.', 'info');
      return false;
    }
    if (user?.friends.includes(player.username)) {
      showToast(`${player.username} is already in your address book.`, 'info');
      return false;
    }
    commit(state => {
      const account = state.accounts.find(item => item.id === state.currentId);
      if (!account || account.friends.some(name => name.toLowerCase() === player.username.toLowerCase())) return;
      account.friends.push(player.username);
      awardAchievement(account, 'first-friend');
      appendActivity(account, `Added ${player.username} to friends`, null, 'social');
    });
    showToast(`${player.username} added. You can send Credits by username — no card number needed.`);
    return true;
  };

  const submitAddFriend = (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (addFriend(form.get('friendUsername'))) event.currentTarget.reset();
  };

  const sendCredits = (event) => {
    event.preventDefault();
    if (!user) return;
    const form = new FormData(event.currentTarget);
    const recipientName = String(form.get('recipient') || '');
    const amount = Math.round(Number(form.get('amount')) * 100) / 100;
    const note = String(form.get('note') || '').trim().slice(0, 48);
    const directoryPlayer = getDirectory(db).find(item => item.username.toLowerCase() === recipientName.toLowerCase());
    if (!directoryPlayer || !user.friends.some(name => name.toLowerCase() === recipientName.toLowerCase())) {
      showToast('Add this player to your friends first. Transfers are username-based and local to this prototype.', 'error');
      return;
    }
    if (amount <= 0 || amount > user.credits) {
      showToast('Enter a positive amount within your available Credits.', 'error');
      return;
    }
    commit(state => {
      const sender = state.accounts.find(item => item.id === state.currentId);
      if (!sender || sender.credits < amount) return;
      const recipient = state.accounts.find(item => item.username.toLowerCase() === recipientName.toLowerCase());
      const agent = state.agents.find(item => item.username.toLowerCase() === recipientName.toLowerCase());
      sender.credits = Math.round((sender.credits - amount) * 100) / 100;
      appendActivity(sender, `Sent ${formatCredits(amount)} to ${recipientName}${note ? ` · ${note}` : ''}`, -amount, 'transfer');
      if (recipient) {
        recipient.credits = Math.round((recipient.credits + amount) * 100) / 100;
        appendActivity(recipient, `Received ${formatCredits(amount)} from ${sender.username}${note ? ` · ${note}` : ''}`, amount, 'transfer');
      } else if (agent) {
        agent.credits = Math.round((Number(agent.credits) + amount) * 100) / 100;
      }
    });
    event.currentTarget.reset();
    showToast(`${formatCredits(amount)} Credits sent to ${recipientName}.`);
  };

  const claimReferral = (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const code = String(form.get('referralCode') || '');
    const next = cloneDatabase(db);
    const joiner = next.accounts.find(item => item.id === next.currentId);
    const outcome = joiner ? awardReferral(next, joiner, code) : { ok: false, reason: 'Profile not found.' };
    if (outcome.ok) {
      writeDb(next);
      event.currentTarget.reset();
      showToast(outcome.reason);
    } else showToast(outcome.reason, 'error');
  };

  const freezeCard = () => {
    if (!user) return;
    const willFreeze = !user.card.frozen;
    commit(state => {
      const account = state.accounts.find(item => item.id === state.currentId);
      if (!account) return;
      account.card.frozen = !account.card.frozen;
      appendActivity(account, account.card.frozen ? 'Platinum game card frozen' : 'Platinum game card thawed', null, 'card');
    });
    showToast(willFreeze ? 'Card paused. This only affects the in-game card display.' : 'Card back in play. It still cannot make real payments.', 'info');
  };

  const replaceCard = () => {
    if (!user) return;
    commit(state => {
      const account = state.accounts.find(item => item.id === state.currentId);
      if (!account) return;
      account.card = createCardForAccount(state.accounts);
      appendActivity(account, 'Platinum game card reissued', null, 'card');
    });
    setCardRevealed(false);
    setModal(null);
    showToast('New fictional card credentials issued. The previous details are retired.');
  };

  const submitLinkProfile = (event) => {
    event.preventDefault();
    if (!user) return;
    const form = new FormData(event.currentTarget);
    const tag = normalizeGameTag(form.get('playGamesId'));
    if (!/^[a-z0-9_.#-]{3,40}$/.test(tag)) {
      showToast('Enter a Play Games tag with 3–40 permitted characters.', 'error');
      return;
    }
    const other = db.accounts.find(account => account.linked && account.playGamesId === tag && account.id !== user.id);
    if (other) {
      showToast('That Play Games tag is already linked to another local profile. Sign in to that profile instead.', 'error');
      return;
    }
    const next = cloneDatabase(db);
    const account = next.accounts.find(item => item.id === next.currentId);
    if (!account) return;
    account.linked = true;
    account.playGamesId = tag;
    let welcome = 0;
    if (!next.claimedGoogleIds.includes(tag)) {
      next.claimedGoogleIds.push(tag);
      account.credits += 100;
      welcome = 100;
      appendActivity(account, 'Play Games link · one-time welcome credit', 100, 'reward');
    }
    const referralCode = String(form.get('referral') || '').trim();
    let referralMessage = '';
    if (referralCode) {
      const result = awardReferral(next, account, referralCode);
      if (result.ok) referralMessage = result.reason;
      else appendActivity(account, `Referral not applied · ${result.reason}`, null, 'info');
    }
    writeDb(next);
    setModal(null);
    const linkMessage = welcome ? 'Play Games profile linked in this local demo. +100 first-link Credits added.' : 'Play Games profile linked. Its one-time welcome credit was already claimed.';
    showToast(`${linkMessage}${referralMessage ? ` ${referralMessage}` : ''}`, 'success');
  };

  const copyText = async (value, label) => {
    try {
      await navigator.clipboard.writeText(value);
      showToast(`${label} copied to clipboard.`);
    } catch {
      showToast(`${label}: ${value}`, 'info');
    }
  };

  const openAccountModal = () => setModal({ type: 'account' });

  const deleteLocalAccount = () => {
    if (!user) return;
    const next = cloneDatabase(db);
    next.accounts = next.accounts.filter(account => account.id !== user.id);
    next.currentId = null;
    writeDb(next);
    setModal(null);
    setPage('overview');
    showToast('This browser-local profile has been deleted. This cannot be undone.', 'info');
  };

  const onMoveMarket = (symbol) => moveMarket(symbol);

  if (!user) {
    return (
      <>
        <EntryPage
          db={db}
          mode={mode}
          setMode={setMode}
          onSubmit={handleCreateAccount}
          onResume={resumeAccount}
          onDocuments={openDocuments}
          onToast={showToast}
        />
        {page === 'documents' && <DocsModal section={docSection} setSection={setDocSection} onClose={() => setPage('overview')} />}
        {toast && <Toast toast={toast} />}
      </>
    );
  }

  return (
    <>
      <div className={`app-layout ${drawerOpen ? 'drawer-open' : ''}`}>
        <Sidebar user={user} page={page} onNavigate={navigate} onSwitch={switchProfile} onDocuments={openDocuments} />
        {drawerOpen && <button className="drawer-scrim" aria-label="Close navigation" onClick={() => setDrawerOpen(false)} />}
        <div className="workspace">
          <TopBar user={user} db={db} title={PAGE_TITLES[page] || 'FINB / Platinum'} onMenu={() => setDrawerOpen(value => !value)} onAccount={openAccountModal} onHelp={() => openDocuments('guide')} />
          <main className="main-content" key={page}>
            {page === 'overview' && <OverviewPage user={user} db={db} onNavigate={navigate} onClaim={claimDailyReward} onPlay={openGame} onCard={() => navigate('card')} cardRevealed={cardRevealed} onReveal={() => setCardRevealed(value => !value)} />}
            {page === 'arcade' && <ArcadePage filter={libraryFilter} setFilter={setLibraryFilter} onPlay={openGame} user={user} />}
            {page === 'markets' && <MarketPage user={user} db={db} selectedTicker={selectedTicker} setSelectedTicker={setSelectedTicker} marketWindow={marketWindow} setMarketWindow={setMarketWindow} search={marketSearch} setSearch={setMarketSearch} onTrade={tradeShares} onBuyBusiness={buyBusiness} onCollectBusiness={collectBusiness} />}
            {page === 'social' && <SocialPage user={user} db={db} rankBy={rankBy} setRankBy={setRankBy} onAddFriend={submitAddFriend} onTransfer={sendCredits} onReferral={claimReferral} onMatch={() => openGame('duel')} onCopy={copyText} />}
            {page === 'card' && <CardPage user={user} revealed={cardRevealed} onReveal={() => setCardRevealed(value => !value)} onFreeze={freezeCard} onReplace={() => setModal({ type: 'replace-card' })} onCopy={copyText} />}
            {page === 'rewards' && <RewardsPage user={user} onClaim={claimDailyReward} onNavigate={navigate} onCopy={copyText} />}
            {page === 'documents' && <DocumentsPage section={docSection} setSection={setDocSection} onSupport={() => setDocSection('guide')} />}
          </main>
          <Footer onDocuments={openDocuments} />
        </div>
      </div>
      {modal?.type === 'game' && <GameModal gameId={modal.gameId} opponent={modal.opponent} user={user} db={db} onClose={() => setModal(null)} onComplete={completeGame} onMoveMarket={onMoveMarket} />}
      {modal?.type === 'account' && <AccountModal user={user} onClose={() => setModal(null)} onSwitch={switchProfile} onLink={() => setModal({ type: 'link' })} onDelete={() => setModal({ type: 'delete-account' })} />}
      {modal?.type === 'link' && <LinkModal onClose={() => setModal(null)} onSubmit={submitLinkProfile} />}
      {modal?.type === 'replace-card' && <ConfirmModal title="Reissue this game card?" description="The current fictional card number and CVV will be retired and replaced. This does not contact a card network." confirmLabel="Reissue card" onClose={() => setModal(null)} onConfirm={replaceCard} />}
      {modal?.type === 'delete-account' && <ConfirmModal title="Delete this local profile?" description="This permanently removes the profile and its in-browser game progress. It cannot be recovered. Linked identity claim records remain on this browser to prevent repeat welcome credits." confirmLabel="Delete local profile" danger onClose={() => setModal({ type: 'account' })} onConfirm={deleteLocalAccount} />}
      {toast && <Toast toast={toast} />}
    </>
  );
}

function moveQuoteSafely(quote, stock) {
  if (!quote) return { price: stock.base, previous: stock.base, series: [stock.base], updatedAt: Date.now() };
  return moveQuote(quote, stock);
}

function EntryPage({ db, mode, setMode, onSubmit, onResume, onDocuments, onToast }) {
  const savedAccounts = db.accounts;
  return (
    <div className="entry-page">
      <header className="entry-topbar">
        <BrandLockup dark={false} />
        <div className="entry-top-meta"><span className="micro-pill"><i /> ESTD. 2024</span><span className="micro-pill micro-pill-plain">ISSUE Nº 024</span><button className="text-button" onClick={() => onDocuments('guide')}>The little print <span>↗</span></button></div>
      </header>
      <main className="entry-main">
        <section className="entry-copy">
          <div className="eyebrow entry-eyebrow"><span className="eyebrow-line" /> THE UNOFFICIAL FINANCIAL UNIVERSE</div>
          <h1>Money is a game.<br /><em>Play it brilliantly.</em></h1>
          <p className="entry-description">A fictional economy for curious people, ambitious thumbs, and anyone who likes their spreadsheets with a little sparkle.</p>
          <div className="entry-note"><span className="note-star">✳</span><span><b>MAKE-BELIEVE MONEY. REAL GOOD TIMES.</b><small>Credits and Liberals stay inside this game. No banking, payments, or cash value.</small></span></div>
          <div className="entry-form-card">
            <div className="entry-form-heading"><div><span className="eyebrow">OPEN A PRIVATE PLAY PROFILE</span><h2>Your name goes on the ledger.</h2></div><span className="entry-step">01 / 02</span></div>
            <div className="mode-switch" role="tablist" aria-label="Choose account type">
              <button type="button" className={mode === 'guest' ? 'active' : ''} role="tab" aria-selected={mode === 'guest'} onClick={() => setMode('guest')}><span>◌</span> Guest access <small>0 starting Credits</small></button>
              <button type="button" className={mode === 'linked' ? 'active' : ''} role="tab" aria-selected={mode === 'linked'} onClick={() => setMode('linked')}><span>✳</span> Play Games link <small>+100 once per tag</small></button>
            </div>
            <form className="entry-form" onSubmit={onSubmit}>
              <label htmlFor="new-username">YOUR CUSTOM USERNAME <span>3–16 characters</span></label>
              <div className="username-input-wrap">{mode === 'guest' && <span className="guest-prefix">Guest_</span>}<input id="new-username" name="username" placeholder={mode === 'guest' ? 'Orbit' : 'Orbit'} maxLength={16} minLength={3} autoComplete="username" required /></div>
              {mode === 'linked' && <><label htmlFor="play-games-tag">PLAY GAMES PROFILE TAG <span>Demo link · not OAuth</span></label><div className="tag-input-wrap"><span>@</span><input id="play-games-tag" name="playGamesId" placeholder="your-play-games-tag" maxLength={40} autoComplete="off" required /></div><p className="form-microcopy">For this front-end demo, a unique tag simulates linking. We never ask for a Google password or email.</p></>}
              <label htmlFor="referral-code">INVITE CODE <span>OPTIONAL · LINKED PROFILES ONLY</span></label>
              <input className="simple-input" id="referral-code" name="referral" placeholder="FINB-______" autoComplete="off" />
              <button className="button button-lime entry-submit" type="submit">{mode === 'guest' ? 'Enter as a guest' : 'Link & open account'} <span>↗</span></button>
              <div className="entry-form-foot"><span>{mode === 'guest' ? 'Guest profile · no signup bonus' : 'First linked profile · 100 Credits if unclaimed'}</span><span>90-day guest expiry <button type="button" className="tiny-help" title="Unlinked guest profiles are removed locally after 90 days.">?</button></span></div>
            </form>
          </div>
          {savedAccounts.length > 0 && <div className="saved-profiles"><div className="saved-title"><span>YOUR LOCAL PROFILES</span><small>Stored in this browser only</small></div><div className="saved-profile-list">{savedAccounts.map(account => <button key={account.id} className="saved-profile" onClick={() => onResume(account.id)}><span className="avatar avatar-small">{initials(account.username)}</span><span><b>{account.username}</b><small>{account.linked ? 'PLAY GAMES LINKED' : 'GUEST PROFILE'} · {formatCredits(account.credits)} CR</small></span><i>↗</i></button>)}</div></div>}
          <div className="entry-legal-links"><button onClick={() => onDocuments('privacy')}>Privacy</button><span>·</span><button onClick={() => onDocuments('terms')}>Terms</button><span>·</span><button onClick={() => onDocuments('brand')}>Name & rights</button><span>·</span><button onClick={() => onDocuments('support')}>Support: cs</button></div>
        </section>
        <aside className="entry-art" aria-label="Preview of the FINB Platinum game card and market">
          <div className="entry-art-stamp"><span>FINB</span><small>ESTD.<br />2024</small></div>
          <div className="art-orbit art-orbit-one" /><div className="art-orbit art-orbit-two" />
          <div className="entry-art-note entry-note-top"><small>NO. 01 / FICTIONAL INSTRUMENT</small><b>Playing with<br />possibility.</b></div>
          <CardVisual user={{ username: 'YOUR NAME', card: { number: '7242 2024 0000 2401', expiry: '12/29', cvv: '•••', type: 'Platinum', frozen: false } }} compact={false} revealed={false} onReveal={() => onToast('Your real card will be made when you open a profile.', 'info')} preview />
          <div className="entry-art-footer"><span className="live-pip" /> THE MARKET IS A SIMULATION <b>↗</b></div>
          <div className="preview-chart-card"><div className="preview-chart-head"><span><small>FINB INDEX</small><b>Today’s imagination</b></span><span className="market-change">+2.84%</span></div><Sparkline values={[28, 35, 31, 42, 38, 53, 46, 58, 55, 72, 66, 79, 75, 88]} color="#d4f06a" /><div className="preview-ticker-row"><span>BUY SHARES</span><span>PLAY GAMES</span><span>MAKE FRIENDS</span></div></div>
          <div className="art-edition">PLATINUM EDITION&nbsp; / &nbsp;VOL. 01</div>
        </aside>
      </main>
      <div className="entry-bottomline"><span>FAKE INTERNATIONAL BANK</span><span>SIMULATION ONLY · NOT A BANK OR PAYMENT SERVICE</span><span>FINB / 2024—∞</span></div>
    </div>
  );
}

function BrandLockup({ dark = true }) {
  return <div className={`brand-lockup ${dark ? 'brand-dark' : ''}`}><span className="brand-mark"><i /><i /><i /></span><span className="brand-wordmark">FINB<small>FAKE INTERNATIONAL BANK</small></span><span className="brand-divider" /><span className="brand-est">ESTD.<b>2024</b></span></div>;
}

function Sidebar({ user, page, onNavigate, onSwitch, onDocuments }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand"><BrandLockup /></div>
      <div className="platinum-ribbon"><span>MEMBER STATUS</span><b>PLATINUM <i>✳</i></b></div>
      <nav className="side-nav" aria-label="Main navigation">
        <span className="side-section-label">THE PRIVATE FLOOR</span>
        {NAV.map(item => <button key={item.id} className={`side-link ${page === item.id ? 'active' : ''}`} onClick={() => onNavigate(item.id)}><Icon name={item.icon} /><span>{item.label}</span>{item.id === 'arcade' && <b className="nav-count">08</b>}{page === item.id && <i className="nav-active-mark" />}</button>)}
      </nav>
      <div className="sidebar-soon">
        <div className="sidebar-section-head"><span>ON THE HORIZON</span><span className="soon-dot" /></div>
        <div className="soon-mini-list"><span>LOAN</span><span>COMMUNITY</span><span>INTEGRITY</span><span>CODES</span><span>THE GREAT LIBERALS GAME</span></div>
        <small>Good things take a little longer.</small>
      </div>
      <div className="sidebar-bottom-links"><button onClick={() => onDocuments('guide')}>The FINB papers <span>↗</span></button><button onClick={() => onDocuments('support')}>Support <span>cs</span></button></div>
      <button className="sidebar-player" onClick={onSwitch} title="Switch profile or add another local profile"><span className="avatar sidebar-avatar">{initials(user.username)}</span><span className="sidebar-player-details"><b>{user.username}</b><small>{user.linked ? 'PLAY GAMES LINKED' : 'GUEST PROFILE'}</small></span><span className="switch-icon">⇄</span></button>
    </aside>
  );
}

function TopBar({ user, db, title, onMenu, onAccount, onHelp }) {
  const ticker = db.market.quotes.NVA;
  const trend = getTrend(ticker);
  return (
    <header className="topbar">
      <button className="mobile-menu" onClick={onMenu} aria-label="Open navigation"><Icon name="menu" /></button>
      <div className="topbar-breadcrumb"><span className="topbar-status"><i /> PLAY NETWORK LIVE</span><span className="breadcrumb-divider">/</span><span>{title}</span></div>
      <div className="topbar-right"><div className="topbar-ticker"><span>NVA</span><b>{formatCredits(ticker.price, 2)}</b><em className={trend.up ? 'positive' : 'negative'}>{trend.up ? '+' : ''}{trend.percent.toFixed(2)}%</em></div><button className="help-button" onClick={onHelp} aria-label="Help">?</button><button className="top-profile" onClick={onAccount}><span className="avatar avatar-small">{initials(user.username)}</span><span className="top-profile-name">{user.username}</span><span className="profile-chevron">⌄</span></button></div>
    </header>
  );
}

function Icon({ name }) {
  const paths = {
    home: <><path d="m3 10 9-7 9 7" /><path d="M5 9v11h14V9M9 20v-6h6v6" /></>,
    play: <><path d="m8 5 11 7-11 7z" /><circle cx="12" cy="12" r="9" /></>,
    chart: <><path d="M3 19h18M5 15l4-4 3 2 7-8" /><path d="M15 5h4v4" /></>,
    people: <><circle cx="9" cy="8" r="3" /><path d="M3.5 20v-1.5a5.5 5.5 0 0 1 11 0V20zM16 5.5a3 3 0 0 1 0 5.8M17 14a4.5 4.5 0 0 1 3.5 4.4V20" /></>,
    card: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 10h18M7 15h4" /></>,
    spark: <><path d="m12 3 1.7 5.3L19 10l-5.3 1.7L12 17l-1.7-5.3L5 10l5.3-1.7z" /><path d="m19 15 .8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z" /></>,
    menu: <><path d="M4 7h16M4 12h16M4 17h16" /></>,
    arrow: <><path d="M5 12h14M13 6l6 6-6 6" /></>,
  };
  return <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] || paths.spark}</svg>;
}

function OverviewPage({ user, db, onNavigate, onClaim, onPlay, onCard, cardRevealed, onReveal }) {
  const quote = db.market.quotes.NVA;
  const trend = getTrend(quote);
  const today = localDayKey();
  const claimed = user.lastDailyClaim === today;
  const nextMilestone = [7, 14, 30, 60].find(day => day > (user.streak || 0)) || 60;
  const totalShares = Object.entries(user.holdings).reduce((total, [symbol, holding]) => total + (holding.shares * (db.market.quotes[symbol]?.price || 0)), 0);
  const activity = user.activity.slice(0, 5);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  return (
    <div className="page-stack overview-page">
      <div className="page-intro-row"><div><div className="eyebrow"><span className="eyebrow-line" /> PRIVATE CLIENT / EST. 2024</div><h1>{greeting}, <em>{user.username.replace(/^Guest_/, '')}.</em></h1><p>Your next move is the only currency that counts here.</p></div><div className="today-stamp"><span>SESSION NOTE</span><b>{new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: '2-digit' }).format(new Date()).toUpperCase()}</b><small>PLATINUM FLOOR · OPEN</small></div></div>
      <section className="dashboard-hero-grid">
        <div className="balance-panel">
          <div className="balance-top"><span><i className="live-pip" /> AVAILABLE TO PLAY</span><span className="balance-index">ACCOUNT Nº {user.card.number.replaceAll(' ', '').slice(-8)}</span></div>
          <div className="balance-eyebrow">YOUR CIRCULATING CREDITS <span>⌁</span></div>
          <div className="balance-amount">{formatCredits(user.credits)}<small>cr</small></div>
          <div className="balance-bottom"><span>Simulated points. Not real money.</span><span>↑&nbsp; MEMBER SINCE {new Date(user.createdAt).getFullYear()}</span></div>
          <div className="balance-actions"><button onClick={() => onNavigate('arcade')} className="button button-lime">Find a game <span>↗</span></button><button onClick={() => onNavigate('markets')} className="button button-ghost-light">Explore the market <span>↗</span></button></div>
          <div className="balance-orb balance-orb-one" /><div className="balance-orb balance-orb-two" />
        </div>
        <div className="hero-card-panel"><div className="panel-overline"><span>01 / YOUR PLATINUM CARD</span><button className="inline-arrow" onClick={onCard}>CARD STUDIO <span>↗</span></button></div><CardVisual user={user} compact revealed={cardRevealed} onReveal={onReveal} /><div className="card-panel-foot"><span>{user.card.frozen ? '◌ CARD PAUSED' : '✳ READY FOR THE GAME'}</span><span>IN-GAME ONLY · NO PAYMENT NETWORK</span></div></div>
      </section>
      <div className="metric-row">
        <div className="metric-card metric-liberals"><div className="metric-icon">✳</div><div><span>LIBERALS <i title="Non-political achievement points">?</i></span><b>{formatCredits(user.liberals)}</b><small>Achievement points · non-transferable</small></div><span className="metric-corner">01</span></div>
        <div className="metric-card"><div className="metric-icon metric-icon-cream">◌</div><div><span>LOGIN STREAK</span><b>{user.streak} <small>days</small></b><small>{user.streak >= 60 ? 'You have the 60-day badge.' : `${Math.max(0, nextMilestone - user.streak)} days to the next bonus`}</small></div><span className="metric-corner">02</span></div>
        <div className="metric-card"><div className="metric-icon metric-icon-peach">⌁</div><div><span>SIMULATED PORTFOLIO</span><b>{formatCredits(totalShares, 2)} <small>cr</small></b><small>{Object.values(user.holdings).reduce((sum, item) => sum + item.shares, 0)} shares across {Object.keys(user.holdings).length} names</small></div><span className="metric-corner">03</span></div>
        <div className="metric-card"><div className="metric-icon metric-icon-lilac">↗</div><div><span>FLOOR ROUNDS</span><b>{user.stats.gamesPlayed} <small>played</small></b><small>{user.stats.gamesWon} wins · {user.stats.bestReaction ? `${user.stats.bestReaction} ms best` : 'Your story starts here'}</small></div><span className="metric-corner">04</span></div>
      </div>
      <section className="middle-grid">
        <div className={`daily-card ${claimed ? 'daily-card-claimed' : ''}`}>
          <div className="daily-illustration"><div className="reward-ring"><span>✳</span></div><span className="reward-spark spark-one">✳</span><span className="reward-spark spark-two">·</span></div>
          <div className="daily-copy"><div className="eyebrow">THE LITTLE DAILY GOOD THING</div><h2>{claimed ? 'You showed up.' : 'A small reason to return.'}</h2><p>{claimed ? `Day ${user.streak} is in the books. Come back tomorrow to keep your run alive.` : 'Collect 10 Credits for today. Keep a regular streak to unlock the lovely extras.'}</p><div className="streak-line"><span className="streak-line-fill" style={{ width: `${Math.min(100, Math.max(12, (user.streak / 60) * 100))}%` }} /></div><div className="streak-caption"><span>DAY {user.streak || 0}</span><span>DAY {nextMilestone} · +{getDailyBonus(nextMilestone)} CR</span></div></div>
          <button className={`button ${claimed ? 'button-soft' : 'button-dark'} daily-claim`} onClick={onClaim} disabled={claimed}>{claimed ? 'Collected ✓' : 'Collect +10 cr'}{!claimed && <span>↗</span>}</button>
        </div>
        <div className="quick-match-card"><div className="quick-match-art"><div className="match-radar"><span /><i /><b /></div><span className="radar-arc">FAF · 01</span></div><div className="quick-match-copy"><div className="eyebrow"><span className="online-pip" /> FIND A FRIEND</div><h2>Good games.<br /><em>New names.</em></h2><p>Drop into a random-floor match. Leave with a rival, a win, or a friend.</p><button className="button button-dark" onClick={() => onPlay('duel')}>Find a match <span>↗</span></button></div><span className="quick-match-index">MULTIPLAYER / 01</span></div>
      </section>
      <section className="bottom-grid">
        <div className="content-panel activity-panel"><div className="section-head"><div><span className="eyebrow">YOUR LEDGER / LIVE</span><h2>Recent movement</h2></div><button className="inline-arrow" onClick={() => onNavigate('rewards')}>ALL ACTIVITY <span>↗</span></button></div>{activity.length ? <div className="activity-list">{activity.map(item => <ActivityRow item={item} key={item.id} />)}</div> : <div className="empty-state"><span>◌</span><b>Your ledger is quiet.</b><small>Claim a daily reward or try a game to start a little movement.</small></div>}</div>
        <div className="content-panel market-snapshot"><div className="section-head"><div><span className="eyebrow">THE FICTIONAL EXCHANGE</span><h2>Market, today</h2></div><button className="inline-arrow" onClick={() => onNavigate('markets')}>OPEN LAB <span>↗</span></button></div><div className="snapshot-quote"><div><span className="quote-symbol">NVA</span><b>Nova Energy</b><small>Clean power / simulated share</small></div><div className="quote-last"><b>{formatCredits(quote.price, 2)}<small> cr</small></b><em className={trend.up ? 'positive' : 'negative'}>{trend.up ? '+' : ''}{trend.percent.toFixed(2)}%</em></div></div><div className="snapshot-chart"><Sparkline values={quote.series} color={trend.up ? '#9ebb5a' : '#e28b75'} /></div><div className="snapshot-foot"><span><i className="live-pip" /> RANDOM-WALK PRICE FEED</span><button onClick={() => onNavigate('markets')}>Trade the simulation <span>↗</span></button></div></div>
      </section>
    </div>
  );
}

function CardVisual({ user, compact = false, revealed = false, onReveal, preview = false }) {
  const card = user.card || {};
  const digits = card.number || '7242 2024 0000 0000';
  const mask = `••••  ••••  ••••  ${digits.replaceAll(' ', '').slice(-4)}`;
  return (
    <div className={`finb-card ${compact ? 'finb-card-compact' : ''} ${preview ? 'finb-card-preview' : ''} ${card.frozen ? 'finb-card-frozen' : ''}`}>
      <div className="card-sheen" /><div className="card-grid-etch" />
      <div className="finb-card-top"><div className="finb-card-brand"><span className="card-brand-mark">F<span>✳</span></span><span><b>FINB</b><small>FAKE INTERNATIONAL BANK</small></span></div><div className="platinum-card-tag"><small>EDITION</small><b>PLATINUM</b></div></div>
      <div className="card-chip"><span /><span /><span /><span /></div><div className="contactless-mark">)))</div>
      <div className="finb-number" aria-label={revealed ? 'Full fictional in-game card number' : 'Masked in-game card number'}>{revealed ? digits : mask}</div>
      <div className="finb-card-bottom"><div><small>PLAYER / CARDHOLDER</small><b>{user.username || 'YOUR NAME'}</b></div><div><small>VALID THRU</small><b>{revealed ? card.expiry : '•• / ••'}</b></div><div className="card-visa-mark"><small>GAME</small><b>FINB<span>✳</span></b></div></div>
      {card.frozen && <div className="card-frozen-ribbon">PAUSED FOR PLAY</div>}
      <div className="card-watermark">NOT A PAYMENT CARD</div>
      {onReveal && <button className="card-reveal-hitbox" aria-label={revealed ? 'Hide fictional card details' : 'Reveal fictional card details'} onClick={onReveal} />}
    </div>
  );
}

function MetricCard({ glyph, label, value, caption, number, tone, title }) {
  return <div className="metric-card"><div className={`metric-icon ${tone || ''}`}>{glyph}</div><div><span>{label} {title && <i title={title}>?</i>}</span><b>{value}</b><small>{caption}</small></div><span className="metric-corner">{number}</span></div>;
}

function ActivityRow({ item }) {
  const amount = item.amount == null ? null : Number(item.amount);
  return <div className="activity-row"><span className={`activity-icon activity-${item.kind}`}>{activityGlyph(item.kind)}</span><span className="activity-label"><b>{item.title}</b><small>{formatDateTime(item.at)}</small></span>{amount == null ? <span className="activity-kind">{String(item.kind || 'NOTE').toUpperCase()}</span> : <b className={`activity-amount ${amount >= 0 ? 'positive' : 'negative'}`}>{amount > 0 ? '+' : ''}{formatCredits(amount, Number.isInteger(amount) ? 0 : 2)} <small>cr</small></b>}</div>;
}

function activityGlyph(kind) {
  return ({ reward: '✳', game: '↗', transfer: '↔', trade: '⌁', business: '◈', referral: '⊹', achievement: '✳', social: '◌', card: '▱' })[kind] || '·';
}

function ArcadePage({ filter, setFilter, onPlay, user }) {
  const filters = ['All', 'Solo', 'Learn', 'FAF MULTIPLAYER'];
  const games = GAMES.filter(game => filter === 'All' || game.category.toLowerCase() === filter.toLowerCase());
  return (
    <div className="page-stack arcade-page">
      <div className="page-intro-row arcade-intro"><div><div className="eyebrow"><span className="eyebrow-line" /> HOUSE OF PLAY / 08 GAMES</div><h1>The floor is <em>open.</em></h1><p>Earn Credits. Collect Liberals. Leave a little better at something.</p></div><div className="arcade-score"><span>YOUR FLOOR RECORD</span><b>{user.stats.gamesWon}<small> / {user.stats.gamesPlayed}</small></b><small>WINS / ROUNDS PLAYED</small></div></div>
      <section className="arcade-feature"><div className="feature-art"><div className="feature-target"><span>FAF</span><i>✳</i></div><div className="feature-orbit feature-orbit-a" /><div className="feature-orbit feature-orbit-b" /><span className="feature-art-sticker">NO ENTRY FEE</span></div><div className="feature-copy"><span className="eyebrow"><i className="online-pip" /> FEATURED / MULTIPLAYER</span><h2>Find your<br /><em>friendly rival.</em></h2><p>One randomly matched player. One market call. No stake to lose, just a new name to learn.</p><div className="feature-foot"><button className="button button-lime" onClick={() => onPlay('duel')}>Find a random match <span>↗</span></button><span>FAF · FIND A FRIEND</span></div></div><div className="feature-id">PLAY ID / 08—FAF</div></section>
      <div className="section-head arcade-section-head"><div><span className="eyebrow">CHOOSE YOUR LITTLE OBSESSION</span><h2>Eight ways to play.</h2></div><div className="filter-pills" role="tablist" aria-label="Filter games">{filters.map(item => <button key={item} className={filter === item ? 'active' : ''} onClick={() => setFilter(item)}>{item}</button>)}</div></div>
      <section className="game-catalog">{games.map((game, index) => <article key={game.id} className={`game-tile game-tile-${game.id}`}><div className="game-tile-top"><span className={`game-tile-icon tile-icon-${game.id}`}>{game.icon}</span><span className="game-tile-index">0{GAMES.indexOf(game) + 1} / 08</span></div><span className="eyebrow game-tile-tag">{game.tag}</span><h3>{game.title}</h3><p>{game.copy}</p><div className="game-tile-bottom"><span>{game.reward}</span><button aria-label={`Play ${game.title}`} onClick={() => onPlay(game.id)}>PLAY <span>↗</span></button></div><span className="tile-ghost-number">0{index + 1}</span></article>)}</section>
      <div className="arcade-fairplay"><span>✳</span><p><b>Friendly-floor promise.</b> Games run in this browser-only prototype. Match opponents are simulated players or other profiles on this device; this is not online matchmaking.</p><button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>Back to top ↑</button></div>
    </div>
  );
}

function MarketPage({ user, db, selectedTicker, setSelectedTicker, marketWindow, setMarketWindow, search, setSearch, onTrade, onBuyBusiness, onCollectBusiness }) {
  const [quantity, setQuantity] = useState('1');
  const quote = db.market.quotes[selectedTicker] || db.market.quotes.NVA;
  const stock = STOCKS.find(item => item.symbol === selectedTicker) || STOCKS[0];
  const trend = getTrend(quote);
  const estimatedTotal = quote.price * Math.max(0, Number(quantity) || 0);
  const filteredStocks = STOCKS.filter(item => `${item.symbol} ${item.name} ${item.sector}`.toLowerCase().includes(search.toLowerCase()));
  const shares = user.holdings[selectedTicker]?.shares || 0;
  const avg = user.holdings[selectedTicker]?.avgPrice || 0;
  const profit = shares * (quote.price - avg);
  const chartValues = marketWindow === 'WEEK' ? [...quote.series, ...quote.series.slice(-8).map((value, index) => value * (1 + Math.sin(index * 1.2) * 0.015))] : quote.series;
  return (
    <div className="page-stack market-page">
      <div className="page-intro-row"><div><div className="eyebrow"><span className="eyebrow-line" /> TREASURY / PRACTICE, NOT ADVICE</div><h1>A market that <em>moves.</em></h1><p>Learn how a price ticks, a share behaves, and a thesis can be wrong.</p></div><div className="market-status-stamp"><i className="live-pip" /><span>FICTIONAL EXCHANGE</span><b>MARKET OPEN</b><small>RANDOM-WALK PRICE FEED</small></div></div>
      <section className="market-main-grid">
        <div className="market-chart-panel content-panel">
          <div className="market-chart-head"><div><span className="eyebrow">{stock.sector.toUpperCase()} / SIMULATED SHARE</span><h2>{stock.name} <span>{stock.symbol}</span></h2></div><div className="chart-controls">{['DAY', 'WEEK'].map(option => <button className={marketWindow === option ? 'active' : ''} onClick={() => setMarketWindow(option)} key={option}>{option}</button>)}</div></div>
          <div className="chart-price-row"><b>{formatCredits(quote.price, 2)} <small>cr</small></b><span className={trend.up ? 'positive' : 'negative'}>{trend.up ? '↗' : '↘'} {trend.up ? '+' : ''}{formatCredits(trend.change, 2)} ({trend.up ? '+' : ''}{trend.percent.toFixed(2)}%)</span><small>LAST MOCK TICK {formatDateTime(quote.updatedAt)}</small></div>
          <div className="main-chart-wrap"><MarketChart values={chartValues} color={stock.color} symbol={stock.symbol} /></div>
          <div className="chart-axis"><span>START OF WINDOW</span><span>SIMULATED PRICE / CR</span><span>NOW</span></div>
          <div className="ticker-strip">{STOCKS.map(item => { const itemTrend = getTrend(db.market.quotes[item.symbol]); return <button className={item.symbol === selectedTicker ? 'active' : ''} onClick={() => setSelectedTicker(item.symbol)} key={item.symbol}><i style={{ background: item.color }} /><span>{item.symbol}</span><b>{formatCredits(db.market.quotes[item.symbol].price, 2)}</b><em className={itemTrend.up ? 'positive' : 'negative'}>{itemTrend.up ? '+' : ''}{itemTrend.percent.toFixed(2)}%</em></button>; })}</div>
        </div>
        <div className="trade-panel content-panel"><div className="trade-panel-head"><div><span className="eyebrow">PAPER-ONLY ORDER TICKET</span><h2>Place a trade.</h2></div><span className="trade-ticket-id">TKT—024</span></div><div className="order-quote"><span className="quote-coin">{stock.symbol.slice(0, 1)}</span><div><b>{stock.name}</b><small>{stock.symbol} · simulated price</small></div><strong>{formatCredits(quote.price, 2)}<small> cr</small></strong></div><form className="trade-form" onSubmit={onTrade}><input type="hidden" name="symbol" value={selectedTicker} key={selectedTicker} /><label htmlFor="trade-quantity">WHOLE SHARES</label><div className="quantity-control"><span>×</span><input id="trade-quantity" name="quantity" type="number" min="1" max="9999" step="1" value={quantity} onChange={event => setQuantity(event.target.value)} required /><small>SHARES</small></div><div className="order-estimate"><span>ESTIMATED TOTAL</span><b>{formatCredits(estimatedTotal, 2)} <small>cr</small></b></div><div className="order-actions"><button type="submit" name="side" value="buy" className="button button-dark">Buy shares <span>↗</span></button><button type="submit" name="side" value="sell" className="button button-outline" disabled={shares < 1}>Sell</button></div></form><div className="holding-summary"><div><span>YOUR {selectedTicker} POSITION</span><b>{shares} <small>shares</small></b></div><div className="holding-separator" /><div><span>UNREALIZED SIM. P/L</span><b className={profit >= 0 ? 'positive' : 'negative'}>{profit > 0 ? '+' : ''}{formatCredits(profit, 2)} <small>cr</small></b></div></div><div className="risk-note"><span>i</span><p>This is a random price model for education and entertainment. No real exchange, investment advice, or cash is involved.</p></div></div>
      </section>
      <section className="stock-directory content-panel"><div className="section-head"><div><span className="eyebrow">THE WHOLE TINY EXCHANGE</span><h2>Names on the board.</h2></div><div className="search-box"><span>⌕</span><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Find a company" aria-label="Search companies" /><kbd>/</kbd></div></div><div className="stock-table"><div className="stock-table-head"><span>SIMULATED COMPANY</span><span>SECTOR</span><span>LAST PRICE</span><span>CHANGE</span><span>POSITION</span></div>{filteredStocks.map(item => { const q = db.market.quotes[item.symbol]; const t = getTrend(q); const position = user.holdings[item.symbol]?.shares || 0; return <button className={`stock-row ${selectedTicker === item.symbol ? 'selected' : ''}`} onClick={() => setSelectedTicker(item.symbol)} key={item.symbol}><span className="stock-name"><i style={{ background: item.color }}>{item.symbol.slice(0, 1)}</i><b>{item.name}<small>{item.symbol}</small></b></span><span className="stock-sector">{item.sector}</span><b className="stock-price">{formatCredits(q.price, 2)} <small>cr</small></b><span className={`stock-change ${t.up ? 'positive' : 'negative'}`}>{t.up ? '+' : ''}{t.percent.toFixed(2)}%</span><span className="stock-position">{position ? `${position} shares` : '—'} <i>↗</i></span></button>; })}{filteredStocks.length === 0 && <div className="empty-state"><span>⌕</span><b>No companies by that name.</b></div>}</div></section>
      <section className="business-section"><div className="section-head"><div><span className="eyebrow">BUILD A LITTLE SOMETHING</span><h2>Business is personal.</h2></div><p>Buy a tiny local venture; collect simulated yield as time passes.<br />Collections cap at 12 hours. Your ledger stays fictional.</p></div><div className="business-grid">{BUSINESSES.map(business => { const owned = user.businesses.find(item => item.id === business.id); const due = owned ? getBusinessEarnings(owned) : 0; return <article className={`business-card ${owned ? 'business-owned' : ''}`} key={business.id}><div className="business-card-head"><span className="business-mark">{business.mark}</span><span className="business-status">{owned ? 'OPEN' : 'AVAILABLE'}</span></div><span className="eyebrow">{business.type.toUpperCase()}</span><h3>{business.name}</h3><p>{business.description}</p><div className="business-yield"><span>SIM. TILL</span><b>+{formatCredits(business.yieldPerMinute, 1)} <small>cr / min</small></b></div>{owned ? <button className="button button-soft business-action" onClick={() => onCollectBusiness(business.id)} disabled={!due}>{due ? `Collect ${formatCredits(due)} cr` : 'Till is warming up'} <span>↗</span></button> : <button className="button button-outline business-action" onClick={() => onBuyBusiness(business.id)} disabled={user.credits < business.cost}>Open for {formatCredits(business.cost)} cr <span>↗</span></button>}</article>; })}</div></section>
    </div>
  );
}

function MarketChart({ values, color, symbol }) {
  const width = 760;
  const height = 228;
  const points = values?.length ? values : [1, 2, 3, 2, 4];
  const min = Math.min(...points);
  const max = Math.max(...points);
  const spread = max - min || 1;
  const coords = points.map((value, index) => ({ x: 8 + (index / Math.max(1, points.length - 1)) * (width - 16), y: height - 16 - ((value - min) / spread) * (height - 42) }));
  const line = coords.map(point => `${point.x},${point.y}`).join(' ');
  const area = `8,${height} ${line} ${width - 8},${height}`;
  return <svg className="market-svg" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" role="img" aria-label={`${symbol} simulated price trend chart`}><defs><linearGradient id={`area-${symbol}`} x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity=".22" /><stop offset="100%" stopColor={color} stopOpacity="0" /></linearGradient></defs><g className="chart-grid">{[0, 1, 2, 3].map(value => <line key={value} x1="0" x2={width} y1={34 + value * 52} y2={34 + value * 52} />)}</g><polygon points={area} fill={`url(#area-${symbol})`} /><polyline points={line} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" /><circle cx={coords.at(-1).x} cy={coords.at(-1).y} r="5" fill={color} className="chart-live-dot" /></svg>;
}

function Sparkline({ values, color = '#adc56b' }) {
  const points = values?.length ? values : [2, 4, 3, 5, 4, 7];
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const coords = points.map((value, index) => `${(index / Math.max(points.length - 1, 1)) * 220},${36 - ((value - min) / range) * 28}`).join(' ');
  return <svg className="sparkline" viewBox="0 0 220 40" preserveAspectRatio="none" aria-hidden="true"><polyline points={coords} fill="none" stroke={color} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" /></svg>;
}

function SocialPage({ user, db, rankBy, setRankBy, onAddFriend, onTransfer, onReferral, onMatch, onCopy }) {
  const directory = getDirectory(db);
  const friends = user.friends.map(name => directory.find(player => player.username.toLowerCase() === name.toLowerCase())).filter(Boolean);
  const leaderboard = [...directory].sort((a, b) => (rankBy === 'credits' ? b.credits - a.credits || b.liberals - a.liberals : b.liberals - a.liberals || b.credits - a.credits)).slice(0, 8);
  const options = directory.filter(player => player.id !== user.id).map(player => player.username);
  return (
    <div className="page-stack social-page">
      <div className="page-intro-row"><div><div className="eyebrow"><span className="eyebrow-line" /> FINB SOCIAL / USERNAME-BASED</div><h1>Better together.<br /><em>Even in pretend.</em></h1><p>Find a familiar face, send a little Credit, or see who is collecting Liberals.</p></div><button className="button button-dark social-cta" onClick={onMatch}><span className="online-pip" /> Find a random match <span>↗</span></button></div>
      <div className="social-top-grid">
        <section className="content-panel address-book-panel"><div className="section-head"><div><span className="eyebrow">YOUR LITTLE BLACK BOOK</span><h2>Find a player.</h2></div><span className="friend-count">{friends.length.toString().padStart(2, '0')} FRIENDS</span></div><form className="friend-search-form" onSubmit={onAddFriend}><label htmlFor="friend-search">SEARCH BY UNIQUE USERNAME</label><div><span className="search-at">@</span><input id="friend-search" name="friendUsername" placeholder="Try LedgerFox or another local profile" list="player-directory" autoComplete="off" /><datalist id="player-directory">{options.map(name => <option value={name} key={name} />)}</datalist><button className="button button-dark" type="submit">Add friend <span>↗</span></button></div><small>Transfers use usernames — never ask a friend for their card number.</small></form><div className="friends-list">{friends.length ? friends.map(player => <div className="friend-row" key={player.id}><span className="avatar" style={{ '--avatar-tint': player.simulated ? '#dce7c3' : '#e4d9ce' }}>{initials(player.username)}</span><span className="friend-name"><b>{player.username}</b><small>{player.simulated ? 'SIMULATED FLOOR PLAYER' : player.linked ? 'PLAY GAMES LINKED' : 'GUEST PROFILE'}</small></span><span className="friend-balance"><b>{formatCompact(player.credits)} <small>cr</small></b><small>{formatCompact(player.liberals)} liberals</small></span><i className="friend-status">{player.simulated ? '●' : '◦'}</i></div>) : <div className="empty-state friend-empty"><span>◌</span><b>Your address book is still a blank page.</b><small>Add a local profile or simulated player above to start.</small></div>}</div></section>
        <section className="transfer-panel"><div className="transfer-header"><span className="eyebrow">PRIVATE / USERNAME ROUTE</span><span className="transfer-glyph">↗</span><h2>Send a little<br /><em>something.</em></h2><p>Instant in the local simulation. No card number required.</p></div><form className="transfer-form" onSubmit={onTransfer}><label htmlFor="transfer-person">SEND TO</label><select id="transfer-person" name="recipient" defaultValue="" required><option value="" disabled>Choose a friend</option>{friends.map(friend => <option value={friend.username} key={friend.id}>{friend.username}{friend.simulated ? ' · simulated' : ''}</option>)}</select><label htmlFor="transfer-amount">AMOUNT IN CREDITS</label><div className="transfer-amount-input"><input id="transfer-amount" name="amount" type="number" min="0.01" max={user.credits} step="0.01" placeholder="0" required /><span>cr</span></div><input className="transfer-note-input" name="note" placeholder="Add a note (optional)" maxLength={48} /><div className="transfer-available"><span>AVAILABLE</span><b>{formatCredits(user.credits)} cr</b></div><button className="button button-lime" type="submit" disabled={!friends.length}>Send Credits <span>↗</span></button></form></section>
      </div>
      <section className="social-lower-grid">
        <div className="leaderboard-panel content-panel"><div className="section-head"><div><span className="eyebrow">A LITTLE FRIENDLY COMPETITION</span><h2>The daily table.</h2></div><div className="rank-toggle"><button className={rankBy === 'credits' ? 'active' : ''} onClick={() => setRankBy('credits')}>CREDITS</button><button className={rankBy === 'liberals' ? 'active' : ''} onClick={() => setRankBy('liberals')}>LIBERALS</button></div></div><div className="leaderboard-table"><div className="leaderboard-labels"><span>RANK / PLAYER</span><span>{rankBy === 'credits' ? 'CREDITS' : 'LIBERALS'}</span></div>{leaderboard.map((player, index) => <div className={`leaderboard-row ${player.id === user.id ? 'is-you' : ''}`} key={player.id}><span className={`rank-number rank-${index + 1}`}>{String(index + 1).padStart(2, '0')}</span><span className="leader-user"><span className="avatar avatar-small">{initials(player.username)}</span><b>{player.username}{player.id === user.id && <i>YOU</i>}</b><small>{player.simulated ? 'SIMULATED PLAYER' : player.linked ? 'PLAY GAMES' : 'GUEST'}</small></span><b className="leader-score">{formatCompact(rankBy === 'credits' ? player.credits : player.liberals)}<small>{rankBy === 'credits' ? ' cr' : ' LP'}</small></b><span className="leader-arrow">↗</span></div>)}</div><p className="leaderboard-note">Scores include fictional floor profiles to keep the board lively. Simulated players are clearly marked.</p></div>
        <div className="referral-card"><div className="referral-orbit"><span>⊹</span></div><span className="eyebrow">THE NICEST LOOP</span><h2>Bring a friend.<br /><em>Both leave richer.</em></h2><p>Link a unique Play Games profile, share your code, and make an actual introduction.</p><div className="referral-code"><span><small>YOUR LOCAL INVITE CODE</small><b>{user.referralCode}</b></span><button aria-label="Copy invite code" onClick={() => onCopy(user.referralCode, 'Invite code')}>COPY ↗</button></div><div className="referral-reward-row"><span><b>+100 cr</b><small>YOU GET</small></span><i>↔</i><span><b>+200 cr</b><small>NEW LINKED FRIEND</small></span></div><form className="referral-claim-form" onSubmit={onReferral}><label htmlFor="claim-referral">HAVE A FRIEND’S CODE?</label><div><input id="claim-referral" name="referralCode" placeholder="FINB-______" maxLength={11} /><button type="submit" aria-label="Claim invite code">↗</button></div><small>One claim per linked profile. Codes resolve inside this browser demo.</small></form></div>
      </section>
      <div className="social-disclaimer"><span>✳</span><p><b>Just between us (and this device).</b> “Local FINB network” means accounts saved in this browser. There is no server, real online matchmaking, or connection to Play Games yet.</p></div>
    </div>
  );
}

function CardPage({ user, revealed, onReveal, onFreeze, onReplace, onCopy }) {
  const card = user.card;
  return (
    <div className="page-stack card-page">
      <div className="page-intro-row"><div><div className="eyebrow"><span className="eyebrow-line" /> FINB CARD SERVICES / Nº 01</div><h1>It looks <em>the part.</em></h1><p>A memorable in-game credential. Looks like a card, works only inside the simulation.</p></div><span className="in-game-seal"><i>✳</i> NOT A REAL<br />PAYMENT CARD</span></div>
      <div className="card-studio-grid"><section className="card-showcase"><div className="showcase-head"><span>PLATINUM / GAME ISSUE</span><span>{card.frozen ? '◌ PAUSED' : '✳ ACTIVE IN SIMULATION'}</span></div><CardVisual user={user} revealed={revealed} onReveal={onReveal} /><div className="card-showcase-foot"><span>FINB / ESTD. 2024</span><span>ISSUED {new Date(user.createdAt).getFullYear()}</span><span>PLATINUM EDITION</span></div></section><section className="card-controls-panel content-panel"><span className="eyebrow">CARD MANAGEMENT</span><h2>In your hands.</h2><p>Reveal or copy the details, pause this card for play, or rotate its fictional credentials.</p><div className="card-control-actions"><button className="button button-dark" onClick={onReveal}>{revealed ? 'Hide card details' : 'Reveal card details'} <span>{revealed ? '◌' : '◉'}</span></button><button className={`button ${card.frozen ? 'button-lime' : 'button-outline'}`} onClick={onFreeze}>{card.frozen ? 'Unpause card' : 'Pause card'} <span>◌</span></button><button className="text-button reissue-button" onClick={onReplace}>Reissue card credentials <span>↗</span></button></div><div className="card-safety-note"><span>i</span><p>Never use these details on a real checkout. This card has no network, issuer, or payment capability. “Freeze” is a game-state toggle only.</p></div></section></div>
      <section className="credential-panel content-panel"><div className="section-head"><div><span className="eyebrow">YOUR MEMORABLE CARD DETAILS</span><h2>The numbers, in plain view.</h2></div><span className="credential-note">IN-GAME ONLY · NO MONEY MOVES</span></div><div className="credential-grid"><Credential label="CARD NUMBER" value={revealed ? card.number : `••••  ••••  ••••  ${card.number.replaceAll(' ', '').slice(-4)}`} revealed={revealed} onCopy={() => onCopy(card.number, 'Fictional card number')} /><Credential label="SECURITY CODE / CVV" value={revealed ? card.cvv : '•••'} revealed={revealed} onCopy={() => onCopy(card.cvv, 'Fictional CVV')} /><Credential label="EXPIRY DATE" value={revealed ? card.expiry : '•• / ••'} revealed={revealed} onCopy={() => onCopy(card.expiry, 'Fictional expiry')} /><Credential label="CARD TYPE" value="PLATINUM" revealed onCopy={() => onCopy('FINB PLATINUM', 'Card type')} /><Credential label="CARDHOLDER" value={user.username} revealed onCopy={() => onCopy(user.username, 'Cardholder name')} /><Credential label="ISSUING NETWORK" value="FINB GAME FLOOR" revealed /></div></section>
      <div className="card-number-note"><span>✳</span><p><b>A note about “real cards.”</b> FINB issues no bank account, card network, or payment credential. These unique details are fictional game props and can never authorize a real-world purchase or transfer.</p></div>
    </div>
  );
}

function Credential({ label, value, revealed, onCopy }) {
  return <div className="credential-item"><span>{label}</span><b className={revealed ? 'credential-visible' : 'credential-masked'}>{value}</b>{onCopy && <button onClick={onCopy} disabled={!revealed} title={revealed ? `Copy ${label.toLowerCase()}` : 'Reveal card details before copying'} aria-label={`Copy ${label.toLowerCase()}`}>{revealed ? 'COPY ↗' : 'HIDDEN'}</button>}</div>;
}

function RewardsPage({ user, onClaim, onNavigate, onCopy }) {
  const today = localDayKey();
  const claimed = user.lastDailyClaim === today;
  const nextStreak = user.lastDailyClaim === today ? user.streak : user.lastDailyClaim === shiftDayKey(today, -1) ? user.streak + 1 : 1;
  const nextTarget = [7, 14, 30, 60].find(value => value > (claimed ? user.streak : nextStreak)) || 60;
  const completed = ACHIEVEMENTS.filter(item => user.achievements.includes(item.id));
  return (
    <div className="page-stack rewards-page">
      <div className="page-intro-row"><div><div className="eyebrow"><span className="eyebrow-line" /> YOUR PERSONAL SCOREBOARD</div><h1>Time well <em>played.</em></h1><p>Liberals are earned by exploring, learning, and showing up. Not political. Not transferable.</p></div><div className="liberal-total"><span>TOTAL LIBERALS</span><b>✳ {formatCredits(user.liberals)}</b><small>ALL-TIME ACHIEVEMENT POINTS</small></div></div>
      <section className="rewards-hero"><div className="reward-hero-stamp">✳<small>FINB<br />STREAK CLUB</small></div><div className="rewards-copy"><span className="eyebrow">THE DAILY APPEARANCE FEE (PAID TO YOU)</span><h2>{claimed ? `Day ${user.streak}. Nice.` : 'One small check-in.'}</h2><p>Collect 10 Credits each local calendar day. Keep the chain and hit the streak milestones for a little extra.</p><div className="streak-progress-track"><span style={{ width: `${Math.min(100, ((claimed ? user.streak : nextStreak) / nextTarget) * 100)}%` }} /></div><div className="streak-progress-labels"><span>DAY {claimed ? user.streak : nextStreak} / {nextTarget}</span><b>+{getDailyBonus(nextTarget)} BONUS CR</b></div></div><div className="reward-hero-action"><span>ONCE A DAY</span><button className={`button ${claimed ? 'button-soft' : 'button-lime'}`} disabled={claimed} onClick={onClaim}>{claimed ? 'Already collected ✓' : 'Collect +10 Credits'} {!claimed && <span>↗</span>}</button><small>Resets at local midnight.</small></div></section>
      <section className="streak-milestones"><div className="section-head"><div><span className="eyebrow">STAY A LITTLE LONGER</span><h2>Four lovely landmarks.</h2></div><span className="streak-current">CURRENT RUN <b>{user.streak} DAYS</b></span></div><div className="milestone-grid">{[{ days: 7, bonus: 30, glyph: '◒' }, { days: 14, bonus: 75, glyph: '✳' }, { days: 30, bonus: 200, glyph: '◇' }, { days: 60, bonus: 500, glyph: '✦' }].map((item, index) => { const reached = user.streak >= item.days; return <article className={`milestone-card ${reached ? 'milestone-reached' : ''}`} key={item.days}><div className="milestone-card-top"><span>{item.glyph}</span><small>0{index + 1}</small></div><b>DAY {item.days}</b><strong>+{item.bonus} <small>cr</small></strong><p>{reached ? 'A little proof of your consistency.' : `${Math.max(0, item.days - user.streak)} more daily ${item.days - user.streak === 1 ? 'claim' : 'claims'} to go.`}</p><i className="milestone-check">{reached ? '✓' : '·'}</i></article>; })}</div></section>
      <section className="achievement-section"><div className="section-head"><div><span className="eyebrow">LIBERALS, EARNED THE FUN WAY</span><h2>Little things add up.</h2></div><button className="inline-arrow" onClick={() => onNavigate('arcade')}>PLAY A GAME <span>↗</span></button></div><div className="achievement-grid">{ACHIEVEMENTS.map(item => { const achieved = user.achievements.includes(item.id); return <article className={`achievement-card ${achieved ? 'achievement-earned' : ''}`} key={item.id}><span className="achievement-glyph">{item.glyph}</span><div><b>{item.name}</b><small>{item.copy}</small></div><strong>{achieved ? 'EARNED' : `+${item.liberals} LP`}</strong></article>; })}</div></section>
      <section className="rewards-referral-strip"><div><span className="eyebrow">PASS THE GOOD THING ON</span><h3>Your code: <b>{user.referralCode}</b></h3><p>Invite a new linked profile. You earn 100 Credits; they earn 200 Credits.</p></div><button className="button button-dark" onClick={() => onCopy(user.referralCode, 'Invite code')}>Copy invite code <span>↗</span></button></section>
    </div>
  );
}

function DocumentsPage({ section, setSection, onSupport }) {
  return (
    <div className="page-stack documents-page">
      <div className="page-intro-row"><div><div className="eyebrow"><span className="eyebrow-line" /> DOCUMENTS / READ BEFORE YOU PLAY</div><h1>The fine <em>print.</em></h1><p>Plain-language notes on how this prototype works, what it stores, and what it is not.</p></div><div className="doc-stamp"><span>THE FINB PAPERS</span><b>VOL. 01 / 2024</b><small>FICTIONAL BY DESIGN</small></div></div>
      <div className="documents-layout"><nav className="doc-nav" aria-label="FINB legal and help documents">{DOC_SECTIONS.map((item, index) => <button key={item.id} className={section === item.id ? 'active' : ''} onClick={() => setSection(item.id)}><span>0{index + 1}</span>{item.label}<b>↗</b></button>)}<div className="doc-nav-note"><span>✳</span><p>This copy is a practical prototype disclosure, not a jurisdiction-specific legal review.</p></div></nav><article className="doc-content">{renderDocument(section, onSupport)}</article></div>
    </div>
  );
}

function renderDocument(section, onSupport) {
  if (section === 'privacy') return <><span className="eyebrow">LAST UPDATED · OCTOBER 2026 / PROTOTYPE</span><h2>Privacy, in plain English.</h2><p className="doc-lede">This demo is designed to keep profile and game progress in your browser. It is not a production account service.</p><h3>What this version stores</h3><p>FINB saves usernames, fictional card details, virtual balances, achievements, friend lists, trades, and simulated market prices in this browser’s <code>localStorage</code>. The records are used to make the game function after a refresh. This front-end prototype does not send that data to a FINB server.</p><h3>What not to enter</h3><p>Do not enter passwords, a real Google account identifier, payment details, government identifiers, or other sensitive information. The Play Games tag is a locally entered demo value; no Google authentication, verification, or OAuth connection is implemented.</p><h3>Who can see local data?</h3><p>Anyone with access to this browser profile or its developer tools may be able to inspect or change local storage. Local storage is not encrypted or suitable for confidential information. Clearing site data can erase your profiles. No promise of backup or recovery is made.</p><h3>Retention & deletion</h3><p>Unlinked guest profiles are pruned from this browser after 90 days from creation. You can also delete a local profile from its account menu. A locally stored record of a claimed Play Games tag may remain to prevent repeating the welcome bonus on this device. Clearing all site data removes that local record too.</p><h3>Analytics, cookies & third parties</h3><p>This prototype includes no analytics, advertising trackers, or custom cookie-based profiling. Google Fonts may be requested from Google when the page loads. Hosting or network infrastructure may independently process standard request data under its own terms.</p><h3>Contact</h3><p>There is no live privacy inbox in this build. The requested support label is <b>CNAME: cs</b>; see the Support note for its current status.</p><p className="doc-callout"><b>For a public launch:</b> publish an operator identity, jurisdiction, contact channel, retention process, verified OAuth flow, and security review before collecting any personal data.</p></>;
  if (section === 'accountability') return <><span className="eyebrow">THE LEDGER SHOULD MAKE SENSE</span><h2>Accountability & fair play.</h2><p className="doc-lede">Every balance in FINB is a game score. The ledger is visible because a made-up bank should still explain its maths.</p><h3>Credits</h3><p>Credits are non-cash game points. Guest profiles start at zero. A newly linked, previously unclaimed Play Games demo tag receives 100 Credits once in this browser-local store. Daily login rewards can be claimed once per local calendar day: 10 Credits, plus 30 at day 7, 75 at day 14, 200 at day 30, and 500 at day 60 of a consecutive streak.</p><h3>Liberals</h3><p>Liberals (LP) are non-transferable achievement points for activity and exploration. The name is a game label only; it is not political endorsement, currency, or a cash-equivalent score.</p><h3>Games & market</h3><p>Game rewards are defined in the interface and vary by outcome. Some rounds are randomized. Vault 21 uses only virtual Credits and does not accept real-money stakes. The share prices are generated by a lightweight random-walk simulation; trades only change local game balances and do not represent listed securities or a real brokerage.</p><h3>Friends, matches & leaderboards</h3><p>Friends, invites, and transfers resolve only against accounts saved on the same browser, plus visibly identified simulated floor players. “Find a match” is a local simulation, not an online player-matching service. NPC balances exist to make the leaderboard and exchange feel inhabited.</p><h3>Corrections & reliability</h3><p>Local state may be edited, reset, or lost by the browser owner. There is no server-side reconciliation, fraud monitoring, or guaranteed uptime. Game scores should not be used for decisions outside this experience.</p><p className="doc-callout"><b>Promise:</b> no hidden conversion from Credits or Liberals into money is offered. No prize, yield, or market performance is guaranteed.</p></>;
  if (section === 'terms') return <><span className="eyebrow">TERMS / A FRIENDLY BUT IMPORTANT READ</span><h2>Terms & conditions.</h2><p className="doc-lede">These are prototype terms to explain the experience. They have not been reviewed for your jurisdiction and are not a substitute for counsel.</p><h3>1. What FINB is</h3><p>Fake International Bank (FINB) in this build is a fictional browser game and educational-style simulation. It is not a bank, payment service, financial institution, broker, lender, investment adviser, or Google product. No real account or payment card is issued.</p><h3>2. Credits, Liberals & fictional assets</h3><p>Credits, Liberals, cards, shares, companies, and game rewards are virtual game data with no real-world monetary value. They cannot be redeemed, transferred outside this prototype, sold, or used to buy goods or services. Simulated share performance is not a prediction or investment recommendation.</p><h3>3. Your local profile</h3><p>You are responsible for choosing a non-sensitive username and protecting access to the browser profile. Do not impersonate others or use the interface to collect their private credentials. Guest profiles may be removed after 90 days. This prototype can be changed, interrupted, or reset at any time.</p><h3>4. Acceptable use</h3><p>Do not attempt to mislead anyone into believing the fictional card is a payment instrument, scrape or alter other people’s data, interfere with the application, or use the name to suggest affiliation with a real financial institution. No real card details or passwords should be entered.</p><h3>5. Availability & liability</h3><p>The game is supplied as-is for demonstration. To the extent allowed by applicable law, no warranty is made about availability, data persistence, fitness for a particular purpose, or accuracy of the simulations. Nothing here limits rights that cannot lawfully be excluded.</p><h3>6. Governing law & changes</h3><p>No launch jurisdiction, governing law, dispute process, or legal operator has been configured for this prototype. A production publisher must insert those details after local legal review. These disclosures may be revised as the product changes.</p><h3>7. Contact</h3><p>The only support label supplied for this concept is “CNAME: cs”. It is not yet a verified mailbox or active customer-support service. Do not send sensitive information to an unverified address.</p></>;
  if (section === 'brand') return <><span className="eyebrow">NAME, IDEA & CREATIVE WORK</span><h2>What we can — and can’t — promise.</h2><p className="doc-lede">A website notice cannot magically grant exclusive rights over a name or a general idea. We will not pretend otherwise.</p><h3>No legal guarantee of exclusivity</h3><p>This prototype does not claim that “Fake International Bank,” “FINB,” the concept, or any associated name is registered, available, or exclusively owned in any country. A disclaimer, footer, or website launch does not by itself guarantee protection from use by others or establish a monopoly over a general idea.</p><h3>Copyright</h3><p>Original text, artwork, and code may receive copyright protection automatically in many jurisdictions, subject to local law and authorship. Copyright generally protects a particular expression, not a name, system, method, or abstract game idea. This notice is information, not legal advice or a registration.</p><h3>Trademarks & patents</h3><p>Brand protection depends on the facts and jurisdiction. Trademark rights, clearance, registration, and enforceability vary; a name should be searched before launch. Patents do not ordinarily protect a bare abstract idea, and eligibility is technical and jurisdiction-specific. No trademark or patent application is asserted here.</p><h3>Practical next steps before launch</h3><ol><li>Search company, domain, app store, and trademark records in target markets.</li><li>Ask a qualified local IP lawyer to assess name clearance and protectable assets.</li><li>Keep dated authorship and licensing records for original code, design, and content.</li><li>Replace this disclosure with reviewed notices and the correct legal operator details.</li></ol><p className="doc-callout"><b>In short:</b> we can describe the project honestly, but cannot promise the name, idea, or site is “protected by law” without the necessary rights, evidence, and jurisdiction-specific advice.</p></>;
  if (section === 'support') return <><span className="eyebrow">A REAL PERSON WOULD BE NICE</span><h2>Support, with the honest version.</h2><p className="doc-lede">Requested support route: <b>CNAME: cs</b>.</p><h3>Current status</h3><p>This prototype has no configured customer-support mailbox, CNAME record, support team, or ticket service. The text “cs” is shown as a supplied alias only; it is not a resolvable web address or verified contact.</p><h3>When a support channel is configured</h3><p>Publish a real domain-controlled contact, response expectations, privacy notice, and escalation route. Never ask players to email a password, payment credential, or Google sign-in code. For this local demo, try refreshing the page to restore the saved in-browser profile; deleting site data will erase it.</p><button className="button button-dark doc-support-button" onClick={onSupport}>Read the getting-started guide <span>↗</span></button></>;
  return <><span className="eyebrow">A SMALL FIELD GUIDE / VERSION PLATINUM</span><h2>Welcome to the made-up money.</h2><p className="doc-lede">FINB ESTD. 2024 is a fictional economy built for play, experimentation, and gentle financial learning.</p><h3>Start here</h3><ol><li>Create a custom username. Guest accounts start with zero Credits and expire from this browser after 90 days unless linked.</li><li>Choose “Play Games link” to enter a unique demo tag. This front-end does not perform real Google authentication. The first unclaimed tag gets a one-time 100 Credit welcome award.</li><li>Claim the daily login reward yourself: 10 Credits per day, plus milestone bonuses at 7, 14, 30, and 60 consecutive days.</li><li>Play the eight mini-games, explore the random-walk share market, open a little business, add a friend, or drop into an FAF match.</li></ol><h3>What are the scores?</h3><p><b>Credits</b> are the spendable game points used by market trades, small businesses, and username-based transfers. <b>Liberals</b> are earned achievement points; the term is non-political, non-transferable, and has no cash value.</p><h3>Card details</h3><p>Your Platinum card has a unique in-game number, CVV, expiry, holder, and freeze/reissue controls. They are deliberately fictional. No real card network, bank account, checkout, or payment authorization exists.</p><h3>Friends & FAF</h3><p>Profiles and transfers are local to this browser. The leaderboard includes simulated floor characters marked as such. Random matches are bot-style local opponents, not live multiplayer.</p><h3>Play responsibly</h3><p>No real money is accepted, earned, invested, or lost. Market activity is a random simulation, not financial advice. Vault 21 is virtual-credit gameplay only.</p><p className="doc-callout"><b>For builders:</b> see <code>README.md</code> for the framework, local data model, security limits, and production integration checklist.</p></>;
}

function Footer({ onDocuments }) {
  return <footer className="app-footer"><span>FAKE INTERNATIONAL BANK <b>·</b> ESTD. 2024 <b>·</b> PLATINUM</span><span><i /> ALL CREDITS ARE FICTIONAL / NO REAL BANKING</span><div><button onClick={() => onDocuments('privacy')}>PRIVACY</button><button onClick={() => onDocuments('terms')}>TERMS</button><button onClick={() => onDocuments('brand')}>NAME & RIGHTS</button><button onClick={() => onDocuments('support')}>CS / SUPPORT</button></div></footer>;
}

function LinkModal({ onClose, onSubmit }) {
  const closeIfBackdrop = event => { if (event.target === event.currentTarget) onClose(); };
  return <div className="modal-scrim" onMouseDown={closeIfBackdrop}><section className="simple-modal" role="dialog" aria-modal="true" aria-labelledby="link-modal-title"><div className="modal-cap"><div className="modal-kicker"><span className="live-pip" /> PROFILE / LOCAL LINK</div><button className="icon-button modal-close" onClick={onClose} aria-label="Close">×</button></div><span className="modal-large-glyph">✳</span><h2 id="link-modal-title">Link your game profile.</h2><p>Enter a unique demo tag to mark this local profile linked. The first use of a tag claims 100 Credits once. No Google sign-in, email, or password is requested.</p><form className="modal-form" onSubmit={onSubmit}><label htmlFor="link-game-tag">PLAY GAMES PROFILE TAG</label><div className="tag-input-wrap"><span>@</span><input id="link-game-tag" name="playGamesId" minLength={3} maxLength={40} placeholder="your-play-games-tag" autoComplete="off" required /></div><label htmlFor="link-referral">INVITE CODE <span>OPTIONAL</span></label><input id="link-referral" className="simple-input" name="referral" placeholder="FINB-______" maxLength={11} /><p className="form-microcopy">Treat this as a simulation handle, not an authentication credential.</p><button className="button button-dark button-wide" type="submit">Link profile <span>↗</span></button></form></section></div>;
}

function AccountModal({ user, onClose, onSwitch, onLink, onDelete }) {
  return <div className="modal-scrim" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}><section className="simple-modal account-modal" role="dialog" aria-modal="true" aria-labelledby="account-modal-title"><div className="modal-cap"><div className="modal-kicker">PROFILE / YOUR LOCAL PLAYER FILE</div><button className="icon-button modal-close" onClick={onClose} aria-label="Close">×</button></div><div className="account-modal-head"><span className="avatar avatar-large">{initials(user.username)}</span><div><span className="eyebrow">{user.linked ? 'PLAY GAMES LINKED (DEMO)' : 'GUEST PROFILE'}</span><h2 id="account-modal-title">{user.username}</h2><p>{formatCredits(user.credits)} Credits · {formatCredits(user.liberals)} Liberals</p></div></div><div className="account-detail-row"><span>LOCAL ACCOUNT ID</span><code>{user.id.slice(0, 14).toUpperCase()}</code></div><div className="account-detail-row"><span>CREATED</span><b>{new Intl.DateTimeFormat(undefined, { dateStyle: 'long' }).format(new Date(user.createdAt))}</b></div><div className="account-detail-row"><span>REFERRAL CODE</span><b>{user.referralCode}</b></div><div className="account-modal-actions">{!user.linked && <button className="button button-lime" onClick={onLink}>Link Play Games <span>↗</span></button>}<button className="button button-outline" onClick={onSwitch}>Switch / add profile <span>⇄</span></button><button className="text-button danger-text" onClick={onDelete}>Delete this local profile</button></div><p className="form-microcopy">This profile lives in local storage on this browser. It is not a secure or synced account.</p></section></div>;
}

function ConfirmModal({ title, description, confirmLabel, danger = false, onClose, onConfirm }) {
  return <div className="modal-scrim" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}><section className="simple-modal confirm-modal" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title"><div className="modal-cap"><div className="modal-kicker">PLEASE CONFIRM</div><button className="icon-button modal-close" onClick={onClose} aria-label="Close">×</button></div><span className="modal-large-glyph">{danger ? '!' : '▱'}</span><h2 id="confirm-title">{title}</h2><p>{description}</p><div className="confirm-actions"><button className={`button ${danger ? 'button-danger' : 'button-dark'}`} onClick={onConfirm}>{confirmLabel}</button><button className="button button-outline" onClick={onClose}>Keep it as is</button></div></section></div>;
}

function DocsModal({ section, setSection = () => {}, onClose }) {
  return <div className="modal-scrim" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}><section className="docs-modal" role="dialog" aria-modal="true" aria-label="FINB papers"><div className="docs-modal-top"><BrandLockup dark={false} /><button className="icon-button modal-close" onClick={onClose} aria-label="Close documents">×</button></div><div className="docs-modal-body"><nav className="docs-modal-nav">{DOC_SECTIONS.map(item => <button key={item.id} className={section === item.id ? 'active' : ''} onClick={() => setSection(item.id)}>{item.label}</button>)}</nav><article className="doc-content">{renderDocument(section, () => setSection('guide'))}</article></div></section></div>;
}

function Toast({ toast }) {
  return <div className={`toast toast-${toast.kind}`} key={toast.key}><span>{toast.kind === 'error' ? '!' : toast.kind === 'info' ? 'i' : '✳'}</span><p>{toast.message}</p><b>×</b></div>;
}
