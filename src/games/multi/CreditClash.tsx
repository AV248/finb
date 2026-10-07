'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import type { StageProps } from './stage';
import { seatClass } from './stage';

/** Credit Clash Arena — free-for-all tag battle royale with Market Crash events. */
export function CreditClashStage({ state, session }: StageProps) {
  const you = state.you;
  const [crash, setCrash] = useState(false);
  const [flash, setFlash] = useState(0);

  useEffect(() => {
    if (state.phase !== 'playing') return undefined;
    const interval = setInterval(() => {
      setCrash(true);
      setFlash(value => value + 1);
      setTimeout(() => setCrash(false), 3200);
    }, 17000);
    return () => clearInterval(interval);
  }, [state.phase]);

  const tag = () => {
    if (you.cooldown > 0) return;
    session.action('tag');
    setFlash(value => value + 1);
  };

  const standings = state.leaderboard.slice(0, 13);
  const max = Math.max(1, ...standings.map(player => player.credits));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="chip chip-flame">¢ {you.credits}</span>
        <span className="chip chip-lime">TAGS {you.score}</span>
        <span className="chip">SHIELD {you.shield > 0 ? `${you.shield.toFixed(1)}s` : 'off'}</span>
        {crash && <span className="chip chip-magenta pulse-soft">📉 MARKET CRASH — steal rate doubled</span>}
      </div>

      <div className="relative overflow-hidden rounded-3xl border border-lime-500/25 bg-[conic-gradient(from_140deg_at_50%_120%,rgba(255,107,0,.22),rgba(0,200,83,.18),rgba(34,225,255,.16),rgba(255,107,0,.22))] p-4">
        <motion.div key={flash} initial={{ opacity: 0.6 }} animate={{ opacity: 0 }} transition={{ duration: 0.5 }} className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-flame-500/25 via-transparent to-lime-500/25" />
        <div className="relative flex h-52 items-end justify-center gap-2">
          {standings.map(player => {
            const height = 20 + (player.credits / max) * 150;
            return (
              <motion.div key={player.id} layout className="flex w-8 flex-col items-center gap-1 sm:w-11">
                <span className="text-[10px] text-white/65">{player.emote ?? (player.potato ? '🥔' : '')}</span>
                <motion.div
                  layout
                  animate={{ height }}
                  transition={{ type: 'spring', stiffness: 180, damping: 22 }}
                  className={`w-full rounded-t-xl border ${
                    player.id === you.id ? 'border-lime-300 bg-gradient-to-t from-lime-500 to-flame-500' : player.team === 'orange' ? 'border-flame-500/50 bg-flame-500/35' : 'border-lime-500/50 bg-lime-500/30'
                  } ${player.frozen > 0 ? 'opacity-50 grayscale' : ''}`}
                />
                <b className="w-full truncate text-center text-[9px] text-white/70">{player.name.slice(0, 8)}</b>
              </motion.div>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button className="btn btn-flame" onClick={tag} disabled={you.cooldown > 0 || you.frozen > 0}>
          {you.cooldown > 0 ? `TAG READY IN ${you.cooldown.toFixed(1)}s` : '🖐️ TAG THE RICHEST RIVAL'}
        </button>
        <button className="btn btn-ghost-lime" onClick={() => session.action('shield')} disabled={you.cooldown > 0}>
          🛡️ Shield 8s
        </button>
        <span className="text-[11px] text-white/50">Tagging steals 18% of the target’s Credits — or 36% while the market crashes. Shields make you untaggable.</span>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
        {state.players.map(player => (
          <div key={player.id} className={`rounded-2xl border p-2 text-[11px] ${seatClass(player, you)}`}>
            <div className="flex items-center justify-between">
              <b className="truncate text-cream-100">{player.name}</b>
              <span>{player.shield > 0 ? '🛡️' : player.frozen > 0 ? '❄️' : ''}</span>
            </div>
            <div className="mt-1 text-white/65">¢{player.credits} · {player.score} tags</div>
            <div className="truncate text-[10px] text-white/45">{player.status}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
