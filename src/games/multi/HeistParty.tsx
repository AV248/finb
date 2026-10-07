'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import type { StageProps } from './stage';
import { seatClass } from './stage';

const DROPS = ['🪙', '💰', '🔑', '📡', '🛡️', '💸', '🧲', '⚡'];

interface Falling {
  id: number;
  emoji: string;
  kind: 'loot' | 'drone' | 'jam';
  x: number;
  delay: number;
}

/** Bank Heist Party — robbers vs bankers, 90 seconds, power-ups raining down. */
export function HeistPartyStage({ state, session }: StageProps) {
  const you = state.you;
  const [drops, setDrops] = useState<Falling[]>([]);
  const [shake, setShake] = useState(0);

  useEffect(() => {
    if (state.phase !== 'playing') return undefined;
    let counter = 0;
    const interval = setInterval(() => {
      counter += 1;
      const kind: Falling['kind'] = you.role === 'robber' ? (Math.random() < 0.78 ? 'loot' : 'drone') : Math.random() < 0.7 ? 'drone' : 'jam';
      setDrops(current =>
        [
          ...current.slice(-16),
          { id: counter, emoji: kind === 'loot' ? DROPS[Math.floor(Math.random() * DROPS.length)] : kind === 'drone' ? '🛸' : '🧊', kind, x: 4 + Math.random() * 88, delay: 0 },
        ].slice(-18),
      );
    }, 620);
    return () => clearInterval(interval);
  }, [state.phase, you.role]);

  const grab = (drop: Falling) => {
    setDrops(current => current.filter(item => item.id !== drop.id));
    if (you.role === 'robber' && drop.kind === 'loot') {
      session.action('dash');
      setShake(value => value + 1);
    } else if (you.role === 'banker' && drop.kind === 'drone') {
      session.action('drone');
      setShake(value => value + 1);
    } else {
      session.action('shield');
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`chip ${you.role === 'robber' ? 'chip-flame' : 'chip-lime'}`}>{you.role === 'robber' ? '🕶️ ROBBER' : '🛡️ BANKER'}</span>
        <span className="chip">BAG ¢{Math.max(0, you.credits - 120)}</span>
        <span className="chip">IMPACT {you.score}</span>
        <span className="chip">COOLDOWN {you.cooldown.toFixed(1)}s</span>
      </div>

      <motion.div
        key={shake}
        initial={{ x: 0 }}
        animate={{ x: [0, -6, 5, -3, 0] }}
        transition={{ duration: 0.32 }}
        className="relative h-64 overflow-hidden rounded-3xl border border-flame-500/30 bg-[radial-gradient(circle_at_50%_-10%,rgba(255,107,0,.28),transparent_62%),radial-gradient(circle_at_12%_100%,rgba(0,200,83,.22),transparent_60%)]"
      >
        <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-flame-500 via-lime-500 to-cyanx-400 opacity-70" />
        <div className="absolute bottom-0 left-[18%] h-24 w-[64%] rounded-t-[40%] border border-white/10 bg-navy-900/60 blur-[1px]" />
        {drops.map(drop => (
          <motion.button
            key={drop.id}
            initial={{ y: -40, opacity: 0 }}
            animate={{ y: 250, opacity: [0, 1, 1, 0.9] }}
            transition={{ duration: 3.4, ease: 'linear', delay: drop.delay }}
            onAnimationComplete={() => setDrops(current => current.filter(item => item.id !== drop.id))}
            onClick={() => grab(drop)}
            style={{ left: `${drop.x}%` }}
            className="absolute top-0 text-2xl drop-shadow-[0_0_10px_rgba(255,107,0,.6)]"
            aria-label={drop.kind}
          >
            {drop.emoji}
          </motion.button>
        ))}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-[11px] text-white/55">
          {you.role === 'robber' ? 'Tap falling loot to dash-grab it. Drones cost you a bag.' : 'Tap drones to freeze the richest robber. Ice jams give everyone a break.'}
        </div>
      </motion.div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
        {state.players.map(player => (
          <div key={player.id} className={`rounded-2xl border p-2 text-[11px] ${seatClass(player, you)}`}>
            <div className="flex items-center justify-between">
              <b className="truncate text-cream-100">{player.name}</b>
              <span>{player.emote ?? (player.kind === 'bot' ? '🤖' : '🟠')}</span>
            </div>
            <div className="mt-1 flex items-center justify-between text-white/60">
              <span>{player.role}</span>
              <span>¢{player.credits}</span>
            </div>
            <div className="truncate text-[10px] text-white/45">{player.frozen > 0 ? `frozen ${player.frozen.toFixed(1)}s` : player.status}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
