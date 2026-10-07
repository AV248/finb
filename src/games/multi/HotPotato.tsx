'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import type { StageProps } from './stage';
import { seatClass } from './stage';

/** Hot Potato Vault — pass the ticking vault, block the boom, force a pass. */
export function HotPotatoStage({ state, session }: StageProps) {
  const you = state.you;
  const [fuse, setFuse] = useState(3.4);
  const [boom, setBoom] = useState(0);

  useEffect(() => {
    if (state.phase !== 'playing') return undefined;
    const interval = setInterval(() => {
      setFuse(value => {
        if (value <= 0.4) {
          if (you.potato) setBoom(count => count + 1);
          return 3.2 + Math.random() * 1.8;
        }
        return value - 0.25;
      });
    }, 250);
    return () => clearInterval(interval);
  }, [state.phase, you.potato]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`chip ${you.potato ? 'chip-flame pulse-soft' : 'chip-lime'}`}>{you.potato ? '💣 YOU HOLD THE VAULT' : '✅ HANDS FREE'}</span>
        <span className="chip">FUSE {fuse.toFixed(1)}s</span>
        <span className="chip">BLOCKS {you.shield > 0 ? `${you.shield.toFixed(1)}s` : 'ready'}</span>
        <span className="chip">BOOMS SURVIVED {you.score}</span>
      </div>

      <motion.div
        key={boom}
        animate={{ scale: [1, 1.03, 1], rotate: [0, -0.6, 0.6, 0] }}
        transition={{ duration: 0.4 }}
        className="relative grid place-items-center overflow-hidden rounded-3xl border border-flame-500/30 bg-[radial-gradient(circle_at_50%_50%,rgba(255,149,0,.22),transparent_68%)] py-8"
      >
        <div className="flex flex-wrap items-center justify-center gap-3">
          {state.players.map(player => (
            <motion.div
              key={player.id}
              animate={player.potato ? { y: [0, -8, 0] } : { y: 0 }}
              transition={{ duration: 1.1, repeat: player.potato ? Infinity : 0 }}
              className={`grid h-20 w-20 place-items-center rounded-2xl border text-2xl ${seatClass(player, you)} ${player.id === you.id ? 'ring-2 ring-lime-400/70' : ''}`}
            >
              <div className="text-center">
                <div>{player.potato ? '💣' : player.emote ?? (player.kind === 'bot' ? '🤖' : '🧑‍💼')}</div>
                <b className="block truncate text-[9px] text-white/75">{player.name.slice(0, 9)}</b>
              </div>
            </motion.div>
          ))}
        </div>
        <div className="mt-4 text-center text-[11px] text-white/60">
          {you.potato ? 'Get rid of it — pass it, force it onto someone, or block and eat the boom.' : 'Ride it out. When the fuse hits zero whoever holds it takes the hit.'}
        </div>
      </motion.div>

      <div className="flex flex-wrap gap-2">
        <button className="btn btn-duo" onClick={() => session.action('pass')} disabled={!you.potato}>
          🤝 Flick it onward
        </button>
        <button className="btn btn-flame" onClick={() => session.action('force-pass')} disabled={!you.potato || you.cooldown > 0}>
          🧲 Force-pass ({you.cooldown > 0 ? `${you.cooldown.toFixed(1)}s` : 'ready'})
        </button>
        <button className="btn btn-ghost-lime" onClick={() => session.action('block')} disabled={you.cooldown > 0}>
          🛡️ Block next boom
        </button>
        <button className="btn btn-ghost" onClick={() => {
          session.action('answer', { choice: Math.random() < 0.62 ? 0 : 1 });
        }}>
          🎯 Timing window
        </button>
      </div>

      <div className="jelly-flat max-h-28 space-y-1 overflow-y-auto p-3 scrollbar-none">
        {state.events.slice(0, 8).map(event => (
          <div key={event.id} className="text-[11px] text-white/65">
            <span className="mr-1">{event.kind === 'pass' ? '🏐' : event.kind === 'freeze' ? '❄️' : event.kind === 'boom' ? '💥' : '•'}</span>
            {event.text}
          </div>
        ))}
      </div>
    </div>
  );
}
