'use client';

import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState, type ComponentType, type LazyExoticComponent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { GAME_BY_ID, type GameDef } from '@/lib/catalog';
import { useFinb } from '@/lib/appCtx';
import type { ResolvedResult } from '@/lib/store';
import {
  COLYSEUS_URL,
  createSession,
  emotePalette,
  modeMeta,
  seatCount,
  type MultiModeId,
  type RoomResult,
  type RoomSession,
  type RoomState,
} from '@/lib/net';
import { MULTI_STAGES } from '@/games/multi';
import type { SoloGameProps } from '@/games/VaultRush';
import { sfx } from '@/lib/audio';
import { Badge, Meter } from './ui';

type SoloComponent = LazyExoticComponent<ComponentType<SoloGameProps>>;

/** Every solo cabinet is code-split — Phaser only downloads when Vault Rush opens. */
const SOLO_SCREENS: Record<string, SoloComponent> = {
  'vault-rush': lazy(() => import('@/games/VaultRush').then(module => ({ default: module.VaultRush }))),
  'stock-surge': lazy(() => import('@/games/StockSurge').then(module => ({ default: module.StockSurge }))),
  'credit-forge': lazy(() => import('@/games/CreditForge').then(module => ({ default: module.CreditForge }))),
  'daily-heist': lazy(() => import('@/games/DailyHeist').then(module => ({ default: module.DailyHeist }))),
  'liberals-garden': lazy(() => import('@/games/LiberalsGarden').then(module => ({ default: module.LiberalsGarden }))),
  'cipher-vault': lazy(() => import('@/games/QuickGames').then(module => ({ default: module.CipherVault }))),
  'ticker-sniper': lazy(() => import('@/games/QuickGames').then(module => ({ default: module.TickerSniper }))),
  'interest-ladder': lazy(() => import('@/games/QuickGames').then(module => ({ default: module.InterestLadder }))),
};

interface GameModalProps {
  gameId: string;
  seats?: number;
  onClose: () => void;
}

export function GameModal({ gameId, seats = 8, onClose }: GameModalProps) {
  const api = useFinb();
  const game = GAME_BY_ID[gameId] ?? GAME_BY_ID['vault-rush'];
  const isMulti = game.mode === 'multi';
  const [result, setResult] = useState<ResolvedResult | null>(null);
  const [round, setRound] = useState(0);
  const [showGuide, setShowGuide] = useState(false);
  const [session, setSession] = useState<RoomSession | null>(null);
  const [room, setRoom] = useState<RoomState | null>(null);
  const [seatTotal, setSeatTotal] = useState(() => (isMulti ? seatCount(game.id as MultiModeId, seats) : 1));
  const startedRef = useRef(false);

  /* ---------------- solo completion ---------------- */
  const onFinish = useCallback(
    (payload: { credits: number; liberals: number; won: boolean; score: number; title: string; message: string; meta?: Record<string, number> }) => {
      const resolved = api.finishGame({
        gameId: game.id,
        credits: payload.credits,
        liberals: payload.liberals,
        won: payload.won,
        title: payload.title,
        message: payload.message,
        score: payload.score,
        meta: payload.meta,
      });
      setResult(resolved);
      if (resolved.won) api.celebrate();
    },
    [api, game.id],
  );

  const onToast = useCallback(
    (text: string, tone: 'good' | 'bad' | 'info' = 'info', icon?: string) => api.toast(text, tone, icon),
    [api],
  );

  /* ---------------- multiplayer session ---------------- */
  useEffect(() => {
    if (!isMulti) return undefined;
    const next = createSession(game.id as MultiModeId, api.user.username, seatTotal);
    setSession(next);
    const unsubState = next.subscribe(state => setRoom(state));
    const unsubResult = next.onResult((payload: RoomResult) => {
      const resolved = api.finishGame({
        gameId: game.id,
        credits: payload.credits,
        liberals: payload.liberals,
        won: payload.won,
        title: payload.title,
        message: payload.message,
        score: payload.placement,
        meta: { players: payload.players },
      });
      setResult(resolved);
      if (payload.won) api.celebrate();
    });
    return () => {
      unsubState();
      unsubResult();
      next.leave();
    };
  }, [api, game.id, isMulti, seatTotal]);

  const launch = useCallback(() => {
    if (!session) return;
    startedRef.current = true;
    session.start();
    sfx.teleport();
  }, [session]);

  useEffect(() => {
    // A live Colyseus room starts as soon as the server seats everyone.
    if (room?.phase === 'playing' && !startedRef.current) startedRef.current = true;
  }, [room?.phase]);

  const replay = useCallback(() => {
    setResult(null);
    startedRef.current = false;
    // Re-mounting the branch resets solo engines and seats a fresh room.
    setRound(value => value + 1);
  }, []);

  const close = useCallback(() => {
    session?.leave();
    onClose();
  }, [onClose, session]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [close]);

  const Solo = SOLO_SCREENS[game.id];
  const Stage = isMulti ? MULTI_STAGES[game.id as MultiModeId] : null;
  const emotes = useMemo(() => emotePalette(), []);
  const live = Boolean(COLYSEUS_URL);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[90] flex items-end justify-center bg-navy-950/80 p-2 backdrop-blur-md sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={`${game.title} cabinet`}
    >
      <motion.div
        initial={{ y: 60, scale: 0.97 }}
        animate={{ y: 0, scale: 1 }}
        exit={{ y: 40, scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 220, damping: 26 }}
        className="glass neon-edge-flame relative flex max-h-[94vh] w-full max-w-4xl flex-col overflow-hidden rounded-4xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-white/8 p-3 sm:p-4">
          <div className="flex items-center gap-3">
            <span className={`grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br text-2xl ${game.accent}`}>{game.emoji}</span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <b className="text-sm text-cream-100">{game.title}</b>
                <Badge tone={game.mode === 'multi' ? 'lime' : 'flame'}>{game.mode === 'multi' ? `${game.minPlayers}–${game.maxPlayers} PLAYERS` : 'SOLO'}</Badge>
                {isMulti && <Badge tone={live ? 'lime' : 'flame'}>{live ? 'LIVE ROOM' : 'PRACTICE SEATS'}</Badge>}
              </div>
              <p className="mt-0.5 text-[11px] text-white/55">{game.tagline}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button className="btn btn-ghost !px-2.5 !py-1.5 text-[11px]" onClick={() => setShowGuide(value => !value)}>
              {showGuide ? 'Hide' : 'How to play'}
            </button>
            <button className="btn btn-ghost !px-2.5 !py-1.5 text-[11px]" onClick={api.toggleSound} aria-label="Toggle sound">
              {api.soundOn ? '🔊' : '🔇'}
            </button>
            <button className="btn btn-ghost !px-3 !py-1.5 text-[11px]" onClick={close} aria-label="Close game">
              ✕
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4 scrollbar-none">
          <AnimatePresence mode="wait">
            {showGuide && (
              <motion.div key="guide" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="mb-3 overflow-hidden">
                <div className="jelly-flat p-3 text-[11px] text-white/70">
                  <b className="mb-1 block text-cream-100">How it plays</b>
                  {game.howTo}
                  <div className="mt-2 flex flex-wrap gap-2 text-white/55">
                    <span className="chip">{game.duration}</span>
                    <span className="chip">{game.reward}</span>
                    <span className="chip">{game.family}</span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {result ? (
            <ResultCard result={result} game={game} onReplay={replay} onClose={close} />
          ) : isMulti && Stage && session && room ? (
            room.phase === 'lobby' ? (
              <LobbyView game={game} seats={seatTotal} setSeats={setSeatTotal} onLaunch={launch} room={room} />
            ) : (
              <div className="space-y-3">
                <MultiHud room={room} onEmote={symbol => session.emote(symbol)} emotes={emotes} />
                <Stage key={round} state={room} session={session} />
              </div>
            )
          ) : (
            <Suspense
              key={round}
              fallback={
                <div className="grid h-64 place-items-center text-sm text-white/60">
                  <div className="text-center">
                    <div className="text-3xl">🛞</div>
                    <p className="mt-2">Spinning up the cabinet…</p>
                  </div>
                </div>
              }
            >
              {Solo ? (
                <Solo key={round} onFinish={onFinish} onToast={onToast} seasonMultiplier={1} />
              ) : (
                <p className="p-6 text-center text-sm text-white/60">This cabinet is still being wired up. Try another floor.</p>
              )}
            </Suspense>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-white/8 p-2.5 text-[10px] text-white/45 sm:px-4">
          <span>
            {isMulti ? 'Pot-based rewards · practice seats are labelled · no real money anywhere' : 'Simulation only — Credits and Liberals have no cash value'}
          </span>
          <span className="hidden sm:block">Esc closes the cabinet</span>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ *
 * Lobby — seats, rules and the start bell.
 * ------------------------------------------------------------------ */
function LobbyView({
  game,
  seats,
  setSeats,
  onLaunch,
  room,
}: {
  game: GameDef;
  seats: number;
  setSeats: (value: number) => void;
  onLaunch: () => void;
  room: RoomState;
}) {
  const meta = modeMeta(game.id as MultiModeId);
  return (
    <div className="space-y-4">
      <div className="jelly-flat p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="label text-lime-300">PRACTICE LOBBY</div>
            <b className="text-sm text-cream-100">{meta.tagline}</b>
            <p className="mt-1 text-[11px] text-white/55">
              {room.botCount} floor members are warming up {room.pot > 0 ? `· pot ${room.pot} Credits` : '· the pot opens at the bell'}. Set seats from {meta.minPlayers} to {meta.maxPlayers}.
            </p>
          </div>
          <button className="btn btn-duo" onClick={onLaunch}>
            🔔 Start the match
          </button>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <span className="label">SEATS</span>
          <input
            type="range"
            min={meta.minPlayers}
            max={meta.maxPlayers}
            value={seats}
            onChange={event => setSeats(Number(event.target.value))}
            className="h-1.5 w-40 appearance-none rounded-full bg-white/15 accent-flame-500"
          />
          <b className="font-mono text-sm text-flame-300">{seats}</b>
          <span className="text-[11px] text-white/45">Change seats to re-seat the room.</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
        {room.players.map(player => (
          <div key={player.id} className={`rounded-2xl border p-2 text-[11px] ${player.kind === 'human' ? 'border-lime-400/60 bg-lime-500/12' : 'border-white/10 bg-white/4'}`}>
            <div className="flex items-center justify-between">
              <b className="truncate text-cream-100">{player.name}</b>
              <span>{player.kind === 'human' ? '🧑‍💼' : '🤖'}</span>
            </div>
            <div className="mt-1 text-[10px] text-white/50">{player.kind === 'human' ? 'linked member' : 'practice seat'}</div>
          </div>
        ))}
      </div>

      <div className="jelly-flat p-3 text-[11px] text-white/65">
        <b className="mb-1 block text-cream-100">Room rules</b>
        {meta.howTo}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Multiplayer HUD — clock, pot, live board, emote tray.
 * ------------------------------------------------------------------ */
function MultiHud({ room, onEmote, emotes }: { room: RoomState; onEmote: (symbol: string) => void; emotes: string[] }) {
  const total = room.mode === 'mafia-bankers' ? 240 : 90;
  const ratio = Math.max(0, Math.min(1, room.secondsLeft / total));
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`chip ${ratio < 0.25 ? 'chip-flame pulse-soft' : 'chip-lime'}`}>⏱ {Math.ceil(room.secondsLeft)}s</span>
        <span className="chip">POT ¢{room.pot}</span>
        <span className="chip">
          ROUND {room.round}/{room.totalRounds}
        </span>
        <span className="chip chip-flame">{room.players.length} SEATS</span>
        <div className="ml-auto flex items-center gap-1">
          {emotes.slice(0, 6).map(symbol => (
            <button key={symbol} className="chip !px-2" onClick={() => onEmote(symbol)} aria-label={`Send ${symbol}`}>
              {symbol}
            </button>
          ))}
        </div>
      </div>
      <Meter value={ratio * 100} max={100} height="h-1.5" />
      <div className="jelly-flat flex items-center gap-2 p-2.5 text-[11px] text-white/70">
        <span className="text-lg">📣</span>
        <b className="text-cream-100">{room.headline}</b>
        <span className="ml-auto hidden text-white/45 sm:block">{room.live ? 'live server' : 'practice simulation'}</span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Result card — every payout shown with its multipliers.
 * ------------------------------------------------------------------ */
function ResultCard({ result, game, onReplay, onClose }: { result: ResolvedResult; game: GameDef; onReplay: () => void; onClose: () => void }) {
  const api = useFinb();
  return (
    <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
      <div className={`jelly-flat relative overflow-hidden p-4 ${result.won ? 'neon-edge-lime' : ''}`}>
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-flame-500 via-lime-500 to-cyanx-400" />
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="label text-flame-300">{result.won ? 'WIN · BANKED' : 'RUN COMPLETE'}</div>
            <h3 className="mt-1 text-xl text-cream-100">{result.title}</h3>
            <p className="mt-1 max-w-xl text-xs text-white/65">{result.message}</p>
          </div>
          <span className="text-3xl">{result.won ? '🏆' : game.emoji}</span>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="rounded-2xl border border-flame-500/40 bg-flame-500/10 p-2.5">
            <div className="label text-flame-300">CREDITS</div>
            <b className="font-mono text-lg text-cream-100">+{result.credits.toLocaleString()}</b>
            {result.multiplier !== 1 && <div className="text-[10px] text-white/50">base {result.rawCredits.toLocaleString()} · ×{result.multiplier.toFixed(2)}</div>}
          </div>
          <div className="rounded-2xl border border-lime-500/40 bg-lime-500/10 p-2.5">
            <div className="label text-lime-300">LIBERALS</div>
            <b className="font-mono text-lg text-cream-100">+{result.liberals}</b>
            <div className="text-[10px] text-white/50">achievement points</div>
          </div>
          <div className="rounded-2xl border border-white/12 bg-white/5 p-2.5">
            <div className="label text-white/60">BALANCE</div>
            <b className="font-mono text-lg text-cream-100">¢{api.user.credits.toLocaleString()}</b>
            <div className="text-[10px] text-white/50">×{api.user.combo.multiplier.toFixed(2)} combo held</div>
          </div>
          <div className="rounded-2xl border border-cyanx-400/35 bg-cyanx-400/8 p-2.5">
            <div className="label text-cyanx-300">CARD</div>
            <b className="text-sm text-cream-100">{api.user.card.tier.toUpperCase()}</b>
            <div className="text-[10px] text-white/50">{api.standings.length} floor members ranked</div>
          </div>
        </div>

        {(result.missionsCompleted.length > 0 || result.achievements.length > 0) && (
          <div className="mt-3 space-y-1.5">
            {result.missionsCompleted.map(mission => (
              <div key={mission.id} className="flex items-center gap-2 rounded-xl border border-lime-500/40 bg-lime-500/10 px-3 py-1.5 text-[11px] text-lime-200">
                <span>🎯</span>
                <b>{mission.title} complete</b>
                <span className="ml-auto font-mono">
                  {mission.credits ? `+${mission.credits} cr ` : ''}
                  {mission.liberals ? `+${mission.liberals} LP` : ''}
                </span>
              </div>
            ))}
            {result.achievements.map(id => (
              <div key={id} className="flex items-center gap-2 rounded-xl border border-flame-500/40 bg-flame-500/10 px-3 py-1.5 text-[11px] text-flame-200">
                <span>🏅</span>
                <b>{id.replace(/-/g, ' ')}</b>
                <span className="ml-auto">unlocked</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-wrap justify-end gap-2">
        <button className="btn btn-ghost" onClick={onClose}>
          Back to the floor
        </button>
        <button className="btn btn-flame" onClick={onReplay}>
          ↻ Play again
        </button>
      </div>
    </motion.div>
  );
}
