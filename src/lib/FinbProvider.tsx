'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { FinbContext, type FinbApi, type ScreenId } from './appCtx';
import { GAMES } from './catalog';
import { CLOUD_ENABLED, fetchCloudStandings } from './supabase';
import { COLYSEUS_URL } from './net';
import { buildStandings, gameById, guestDaysLeft } from './economy';
import {
  addFriend as storeAddFriend,
  applySeriesToCurrent,
  buyBusiness as storeBuyBusiness,
  claimDaily as storeClaimDaily,
  claimMission as storeClaimMission,
  claimReferral as storeClaimReferral,
  completeGame,
  createRoom as storeCreateRoom,
  deleteLocalProfile,
  finishOnboarding as storeFinishOnboarding,
  getDatabase,
  grantReward,
  linkPlayGames as storeLinkPlayGames,
  removeFriend as storeRemoveFriend,
  reissueCard as storeReissueCard,
  resolveChallenge as storeResolveChallenge,
  runBusiness as storeRunBusiness,
  sendChallenge as storeSendChallenge,
  sendTransfer,
  setFriendEmote,
  setOnboardingStep as storeSetOnboardingStep,
  setRoomChat,
  tipPlayer,
  toggleCardFreeze as storeToggleFreeze,
  toggleFavourite as storeToggleFavourite,
  toggleSound as storeToggleSound,
  tradeStock,
  tickMarket,
  useCurrentUser,
  useDatabase,
  useToast,
  type GameResult,
  type ResolvedResult,
} from './store';
import { sfx } from './audio';
import { LivingWorld, NeonCursor, ToastHost, Confetti, VaultTransition } from '@/components/Effects';
import { Onboarding } from '@/components/Onboarding';
import { AccountGate } from '@/components/AccountGate';
import { AppNav } from '@/components/AppNav';
import { TopBar } from '@/components/TopBar';
import { GameModal } from '@/components/GameModal';
import { SpectatorOverlay } from '@/components/Spectator';
import { ProfilesOverlay } from '@/components/Profiles';
import { PwaBoot, screenFromLocation } from '@/components/PwaBoot';
import { HomeScreen } from '@/components/screens/Home';
import { ArcadeScreen } from '@/components/screens/Arcade';
import { ArenaScreen } from '@/components/screens/Arena';
import { FriendsScreen } from '@/components/screens/Friends';
import { RanksScreen } from '@/components/screens/Ranks';
import { RewardsScreen } from '@/components/screens/Rewards';
import { CardStudioScreen } from '@/components/screens/CardStudio';
import { MoreScreen, type MoreView } from '@/components/screens/More';

export const SCREEN_LABELS: Record<ScreenId, string> = {
  home: 'The Lobby',
  arcade: 'Arcade',
  arena: 'Arena',
  friends: 'Friends Zone',
  ranks: 'Live Ranks',
  rewards: 'Rewards',
  card: 'Card Studio',
  more: 'The Bank',
};

/**
 * The app shell. Owns the single React context the whole PWA talks to, the
 * overlay stack (games, spectator, profiles, guide) and the page transitions.
 */
export function FinbProvider({ children }: { children?: ReactNode }) {
  const db = useDatabase();
  const user = useCurrentUser();
  const { toast, show } = useToast();

  const [mounted, setMounted] = useState(false);
  const [screen, setScreen] = useState<ScreenId>('home');
  const [transition, setTransition] = useState<string | null>(null);
  const [burst, setBurst] = useState(0);
  const [game, setGame] = useState<{ gameId: string; seats: number } | null>(null);
  const [spectating, setSpectating] = useState<{ modeId: string; seats: number } | null>(null);
  const [profilesOpen, setProfilesOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [moreView, setMoreView] = useState<MoreView>({ view: 'hub' });
  const transitionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => setMounted(true), []);

  /* Manifest shortcuts arrive as /?screen=arcade and open straight onto the floor. */
  useEffect(() => {
    const deep = screenFromLocation();
    if (deep) setScreen(deep as ScreenId);
  }, []);

  /* Local storage is only readable in the browser: gate the shell on mount so
     the exported HTML never disagrees with the hydrated tree. */
  useEffect(() => {
    const interval = setInterval(() => tickMarket(), 26000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!CLOUD_ENABLED) return undefined;
    let cancelled = false;
    void fetchCloudStandings().then(rows => {
      if (!cancelled && rows?.length) show(`Cloud ladder refreshed — ${rows.length} linked members ranked.`, 'info', '☁️');
    });
    return () => {
      cancelled = true;
    };
  }, [show]);

  useEffect(
    () => () => {
      if (transitionTimer.current) clearTimeout(transitionTimer.current);
    },
    [],
  );

  const toastFn = useCallback(
    (text: string, tone: 'good' | 'bad' | 'info' = 'info', icon?: string) => {
      show(text, tone, icon);
      if (tone === 'bad') sfx.bad();
      else if (tone === 'good') sfx.good();
    },
    [show],
  );

  const celebrate = useCallback(() => {
    setBurst(value => value + 1);
    sfx.reward();
  }, []);

  const navigate = useCallback((next: ScreenId) => {
    setScreen(current => {
      if (current === next) return current;
      setTransition(SCREEN_LABELS[next]);
      if (transitionTimer.current) clearTimeout(transitionTimer.current);
      transitionTimer.current = setTimeout(() => setTransition(null), 620);
      sfx.teleport();
      return next;
    });
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const finishGame = useCallback((result: GameResult): ResolvedResult => completeGame(result), []);

  /* Bridges for non-React surfaces (Phaser scenes, service worker messages):
     anything may `dispatchEvent(new CustomEvent('finb:complete-game', { detail }))`
     and the vault banks it exactly once. */
  useEffect(() => {
    const onComplete = (event: Event) => {
      const detail = (event as CustomEvent<GameResult>).detail;
      if (!detail || typeof detail.credits !== 'number') return;
      const resolved = completeGame(detail);
      toastFn(
        `${resolved.title} · +${resolved.credits.toLocaleString()} Credits${resolved.liberals ? ` · +${resolved.liberals} LP` : ''}`,
        resolved.won ? 'good' : 'info',
        resolved.won ? '🏁' : '📉',
      );
      if (resolved.won) celebrate();
    };
    window.addEventListener('finb:complete-game', onComplete);
    return () => window.removeEventListener('finb:complete-game', onComplete);
  }, [celebrate, toastFn]);

  const standings = useMemo(() => buildStandings(db.players, db.currentId), [db]);

  const api = useMemo<FinbApi | null>(() => {
    if (!user) return null;
    const current = () => getDatabase().players.find(player => player.id === getDatabase().currentId) ?? user;

    return {
      db,
      user,
      standings,
      screen,
      navigate,
      toast: toastFn,
      celebrate,
      refresh: () => setMounted(true),
      openGame: gameId => {
        if (!gameById(gameId)) {
          toastFn('That cabinet is still being wired up.', 'info', '🔧');
          return;
        }
        setGame({ gameId, seats: 0 });
      },
      openRoom: (modeId, seats) => {
        const definition = gameById(modeId);
        if (!definition || definition.mode !== 'multi') {
          toastFn('Private rooms are open for the six multiplayer modes only.', 'info', '🧭');
          return;
        }
        setGame({ gameId: modeId, seats });
      },
      spectrum: modeId => {
        if (!gameById(modeId)) {
          toastFn('Nothing to watch on that floor yet.', 'info', '👀');
          return;
        }
        setSpectating({ modeId, seats: 8 });
      },
      claimDaily: () => {
        const result = storeClaimDaily();
        toastFn(result.message, result.ok ? 'good' : 'info', result.ok ? '🎁' : '⏳');
        if (result.ok) celebrate();
      },
      claimMission: id => {
        const result = storeClaimMission(id);
        toastFn(result.message, result.ok ? 'good' : 'info', result.ok ? '🎯' : '⏳');
        if (result.ok) celebrate();
      },
      addFriend: username => {
        const result = storeAddFriend(username);
        toastFn(result.message, result.ok ? 'good' : 'bad', result.ok ? '🤝' : '🧐');
      },
      removeFriend: id => {
        storeRemoveFriend(id);
        toastFn('Removed from your circle.', 'info', '👋');
      },
      transfer: (to, amount, note) => {
        const result = sendTransfer(to, amount, note);
        toastFn(result.message, result.ok ? 'good' : 'bad', result.ok ? '💸' : '⚠️');
      },
      tip: (username, amount) => {
        const result = tipPlayer(username, amount);
        toastFn(result.message, result.ok ? 'good' : 'bad', result.ok ? '🎩' : '⚠️');
      },
      challenge: (username, gameId, target) => {
        const result = storeSendChallenge(username, gameId, target);
        toastFn(result.message, result.ok ? 'good' : 'bad', result.ok ? '⚔️' : '⚠️');
      },
      resolveChallenge: (id, score) => {
        const result = storeResolveChallenge(id, score);
        toastFn(result.message, result.ok ? 'good' : 'info', result.ok ? '🏆' : '⏳');
        if (result.ok) celebrate();
      },
      createRoom: (name, mode) => {
        const result = storeCreateRoom(name, mode);
        toastFn(result.message, result.ok ? 'good' : 'bad', result.ok ? '🚪' : '⚠️');
      },
      chatRoom: (code, text) => setRoomChat(code, text, current().username),
      toggleFavourite: id => storeToggleFavourite(id),
      setEmote: (id, emote) => setFriendEmote(id, emote),
      buyBusiness: (id, name, cost, yieldPerMinute) => {
        const result = storeBuyBusiness(id, name, cost, yieldPerMinute);
        toastFn(result.message, result.ok ? 'good' : 'bad', result.ok ? '🏭' : '⚠️');
        if (result.ok) celebrate();
      },
      runBusiness: id => {
        const result = storeRunBusiness(id);
        toastFn(result.message, result.ok ? 'good' : 'info', result.ok ? '⚙️' : '⏳');
      },
      trade: (symbol, quantity, side) => {
        const result = tradeStock(symbol, quantity, side);
        toastFn(result.message, result.ok ? 'good' : 'bad', result.ok ? '📈' : '⚠️');
      },
      linkPlayGames: tag => {
        const result = storeLinkPlayGames(tag);
        toastFn(result.message, result.ok ? 'good' : 'bad', result.ok ? '🔗' : '⚠️');
        if (result.ok) celebrate();
      },
      claimReferral: code => {
        const result = storeClaimReferral(code);
        toastFn(result.message, result.ok ? 'good' : 'bad', result.ok ? '🎟️' : '⚠️');
        if (result.ok) celebrate();
      },
      redeemSeries: () => {
        const result = applySeriesToCurrent();
        toastFn(result.message, result.ok ? 'good' : 'info', result.ok ? '💳' : '🔐');
        if (result.ok) celebrate();
      },
      toggleFreeze: () => {
        const result = storeToggleFreeze();
        toastFn(result.message, 'info', '❄️');
      },
      reissueCard: () => {
        const result = storeReissueCard();
        toastFn(result.message, result.ok ? 'good' : 'bad', result.ok ? '🔁' : '🔐');
      },
      finishGame,
      openDocuments: section => {
        setMoreView({ view: 'docs', section });
        navigate('more');
      },
      openSitemap: () => {
        setMoreView({ view: 'sitemap' });
        navigate('more');
      },
      switchProfile: () => setProfilesOpen(true),
      openGuide: () => setGuideOpen(true),
      exportData: () => {
        if (typeof window === 'undefined') return;
        const blob = new Blob([JSON.stringify(getDatabase(), null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `finb-${current().username}-backup.json`;
        anchor.click();
        URL.revokeObjectURL(url);
        toastFn('Device profile exported as JSON. Keep it somewhere safe — it is the only copy.', 'good', '📤');
      },
      deleteProfile: () => {
        deleteLocalProfile(current().id);
        toastFn('Profile wiped from this device.', 'info', '🧽');
      },
      setOnboardingStep: (step, reward) => storeSetOnboardingStep(step, reward),
      finishOnboarding: () => storeFinishOnboarding(),
      reward: bundle => {
        const result = grantReward(bundle);
        if (!result.ok) {
          toastFn(result.message, 'bad', '⚠️');
          return;
        }
        toastFn(result.message, 'good', bundle.badge === 'Guide step reward' ? '🧭' : '🎁');
      },
      games: GAMES,
      dailyMissions: user.missions.filter(mission => mission.cycle === 'daily'),
      weeklyMissions: user.missions.filter(mission => mission.cycle === 'weekly'),
      soundOn: db.soundOn,
      toggleSound: () => storeToggleSound(),
      cloudEnabled: CLOUD_ENABLED,
      liveServerEnabled: Boolean(COLYSEUS_URL),
      guestDaysLeft: guestDaysLeft(user),
    };
  }, [celebrate, db, finishGame, navigate, screen, standings, toastFn, user]);

  const screenNode = useMemo(() => {
    switch (screen) {
      case 'arcade':
        return <ArcadeScreen />;
      case 'arena':
        return <ArenaScreen />;
      case 'friends':
        return <FriendsScreen />;
      case 'ranks':
        return <RanksScreen />;
      case 'rewards':
        return <RewardsScreen />;
      case 'card':
        return <CardStudioScreen />;
      case 'more':
        return <MoreScreen view={moreView} onChange={setMoreView} />;
      default:
        return <HomeScreen />;
    }
  }, [moreView, screen]);

  if (!mounted) {
    return (
      <main className="grid min-h-dvh place-items-center bg-transparent">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="text-3xl">🏦</span>
          <b className="text-lg text-cream-100 chroma">FINB</b>
          <span className="font-mono text-[10px] uppercase tracking-[0.34em] text-white/45">opening the vault…</span>
        </div>
      </main>
    );
  }

  if (!api || !user) {
    return (
      <>
        <LivingWorld />
        <NeonCursor />
        <AccountGate />
        <ToastHost toast={toast} />
      </>
    );
  }

  const showOnboarding = guideOpen || !db.onboardingSeen;
  const guard = showOnboarding && db.players.some(player => player.id === db.currentId);

  return (
    <FinbContext.Provider value={api}>
      <PwaBoot />
      <LivingWorld />
      <NeonCursor />
      <Confetti burst={burst} />
      <ToastHost toast={toast} />

      <div className="relative mx-auto flex min-h-dvh w-full max-w-[1180px] flex-col px-3 pb-28 pt-3 sm:px-5 lg:pb-8">
        <TopBar onOpenGuide={() => setGuideOpen(true)} onOpenProfiles={() => setProfilesOpen(true)} onOpenMore={() => navigate('more')} />
        <main key={screen} className="mt-3 flex-1">
          <motion.div
            initial={{ opacity: 0, y: 14, filter: 'blur(6px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ duration: 0.32, ease: 'easeOut' }}
          >
            {screenNode}
          </motion.div>
        </main>
        <AppNav current={screen} onNavigate={navigate} />
      </div>

      <VaultTransition active={Boolean(transition)} label={transition ?? ''} onSkip={() => setTransition(null)} />

      <AnimatePresence>
        {game && <GameModal key={`${game.gameId}:${game.seats}`} gameId={game.gameId} seats={game.seats || undefined} onClose={() => setGame(null)} />}
      </AnimatePresence>

      <AnimatePresence>
        {spectating && (
          <SpectatorOverlay
            key={spectating.modeId}
            modeId={spectating.modeId}
            seats={spectating.seats}
            onClose={() => setSpectating(null)}
            onTip={(username, amount) => api.tip(username, amount)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>{profilesOpen && <ProfilesOverlay onClose={() => setProfilesOpen(false)} />}</AnimatePresence>

      {children}

      {guard && (
        <div className="relative z-[170]">
          <Onboarding key={guideOpen ? 'replay' : 'first-run'} onClose={() => setGuideOpen(false)} />
        </div>
      )}
    </FinbContext.Provider>
  );
}
