'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { MULTI_STAGES } from '@/games/multi';
import { createSession, modeMeta, type MultiModeId, type RoomResult, type RoomSession, type RoomState } from '@/lib/net';
import { useFinb } from '@/lib/appCtx';
import { Badge, Meter, Panel } from './ui';

const TIP_OPTIONS = [10, 25, 50];

/**
 * Spectator mode: watch a practice room play itself move by move and tip the
 * performance. Tipping moves Credits between simulated members.
 */
export function SpectatorOverlay({
  modeId,
  seats,
  onClose,
  onTip,
}: {
  modeId: string;
  seats: number;
  onClose: () => void;
  onTip: (username: string, amount: number) => void;
}) {
  const api = useFinb();
  const mode = modeId as MultiModeId;
  const meta = modeMeta(mode);
  const Stage = MULTI_STAGES[mode];
  const [room, setRoom] = useState<RoomState | null>(null);
  const [session, setSession] = useState<RoomSession | null>(null);
  const [payout, setPayout] = useState<RoomResult | null>(null);
  const [tipTarget, setTipTarget] = useState<string | null>(null);
  const [tipAmount, setTipAmount] = useState(10);

  useEffect(() => {
    const next = createSession(mode, api.user.username, seats);
    setSession(next);
    const offState = next.subscribe(state => setRoom(state));
    const offResult = next.onResult(result => setPayout(result));
    const bell = setTimeout(() => next.start(), 900);
    return () => {
      clearTimeout(bell);
      offState();
      offResult();
      next.leave();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, seats]);

  const leaders = useMemo(() => (room ? [...room.players].sort((a, b) => b.credits - a.credits).slice(0, 5) : []), [room]);
  const clockRatio = room ? Math.max(0, Math.min(1, room.secondsLeft / (room.mode === 'mafia-bankers' ? 240 : 90))) : 1;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[95] flex items-center justify-center bg-navy-950/85 p-2 backdrop-blur-md sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={`Spectating ${meta.title}`}
    >
      <motion.div initial={{ y: 40, scale: 0.98 }} animate={{ y: 0, scale: 1 }} exit={{ y: 30 }} className="glass neon-edge-lime flex max-h-[94vh] w-full max-w-3xl flex-col overflow-hidden rounded-4xl">
        <div className="flex items-center justify-between gap-3 border-b border-white/10 p-3 sm:p-4">
          <div className="flex items-center gap-3">
            <span className={`grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br text-xl ${meta.accent}`}>{meta.emoji}</span>
            <div>
              <div className="flex items-center gap-2">
                <b className="text-sm text-cream-100">Spectating · {meta.title}</b>
                <Badge tone="lime">👀 LIVE PRACTICE</Badge>
              </div>
              <p className="text-[11px] text-white/55">
                {meta.minPlayers}–{meta.maxPlayers} seats · {room?.players.length ?? seats} seated · tips move Credits between simulated members
              </p>
            </div>
          </div>
          <button className="btn btn-ghost !px-3 !py-1.5 text-[11px]" onClick={onClose}>
            ✕ Leave stands
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3 sm:p-4 scrollbar-none">
          {room && (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <span className="chip chip-flame">⏱ {Math.ceil(room.secondsLeft)}s</span>
                <span className="chip">POT ¢{room.pot}</span>
                <span className="chip chip-lime">ROUND {room.round}</span>
                <span className="chip">{room.live ? 'LIVE SERVER' : 'PRACTICE SIM'}</span>
              </div>
              <Meter value={clockRatio * 100} max={100} height="h-1.5" />

              <Panel className="p-3">
                <div className="label text-flame-400">THE BOARD</div>
                <div className="mt-2 space-y-1.5">
                  {leaders.map((player, index) => (
                    <div key={player.id} className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/4 px-3 py-2">
                      <span className="w-5 font-mono text-[11px] text-white/50">#{index + 1}</span>
                      <span className="text-base">{player.emote ?? (player.kind === 'human' ? '🧑‍💼' : '🤖')}</span>
                      <div className="min-w-0 flex-1">
                        <b className="block truncate text-xs text-cream-100">{player.name}</b>
                        <span className="text-[10px] text-white/45">{player.role} · {player.status}</span>
                      </div>
                      <span className="font-mono text-xs text-flame-300">¢{player.credits}</span>
                      <span className="font-mono text-xs text-lime-300">🌿{player.lp}</span>
                      <button
                        className={`btn !px-2.5 !py-1 text-[10px] ${tipTarget === player.id ? 'btn-flame' : 'btn-ghost'}`}
                        onClick={() => setTipTarget(player.id)}
                      >
                        Tip
                      </button>
                    </div>
                  ))}
                </div>

                {tipTarget && (
                  <div className="mt-3 flex flex-wrap items-center gap-2 rounded-2xl border border-lime-500/40 bg-lime-500/10 p-2.5">
                    <span className="text-[11px] text-lime-200">
                      Tip {room.players.find(player => player.id === tipTarget)?.name}
                    </span>
                    {TIP_OPTIONS.map(amount => (
                      <button key={amount} className={`chip ${tipAmount === amount ? 'chip-lime' : ''}`} onClick={() => setTipAmount(amount)}>
                        {amount} cr
                      </button>
                    ))}
                    <button
                      className="btn btn-lime !px-3 !py-1.5 text-[11px]"
                      onClick={() => {
                        const target = room.players.find(player => player.id === tipTarget);
                        if (target) onTip(target.name, tipAmount);
                        setTipTarget(null);
                      }}
                    >
                      Send tip
                    </button>
                    <span className="text-[10px] text-white/50">Tipping a simulated member is a game action with no cash value.</span>
                  </div>
                )}
              </Panel>

              {session && <Stage state={room} session={session} />}

              <div className="jelly-flat max-h-32 space-y-1 overflow-y-auto p-3 scrollbar-none">
                <div className="label mb-1 text-white/60">PLAY BY PLAY</div>
                {room.events.slice(0, 10).map(event => (
                  <div key={event.id} className="text-[11px] text-white/60">
                    <span className="mr-1">
                      {event.kind === 'steal' ? '🖐️' : event.kind === 'freeze' ? '❄️' : event.kind === 'boom' ? '💥' : event.kind === 'crash' ? '📉' : event.kind === 'surge' ? '📈' : event.kind === 'vote' ? '🗳️' : '•'}
                    </span>
                    {event.text}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {payout && (
          <div className="border-t border-white/10 p-3 text-[11px] text-white/60 sm:px-4">
            Final whistle: {payout.title}. Watching pays nothing and costs nothing — tip from the board if you enjoyed it.
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
