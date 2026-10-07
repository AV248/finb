'use client';

import { motion } from 'framer-motion';
import { useMemo, useState } from 'react';
import type { StageProps } from './stage';

/** Team Stock War — two tickers, micro-challenges and taps to push your side up. */
export function TeamStockWarStage({ state, session }: StageProps) {
  const you = state.you;
  const [history, setHistory] = useState<number[]>([]);
  const teams = useMemo(() => {
    const orange = state.players.filter(player => player.team === 'orange');
    const green = state.players.filter(player => player.team === 'green');
    const score = (list: typeof orange) => list.reduce((total, player) => total + player.score, 0);
    return { orange, green, orangeScore: score(orange), greenScore: score(green) };
  }, [state.players]);
  const orangeLead = teams.orangeScore - teams.greenScore;
  const total = Math.max(1, teams.orangeScore + teams.greenScore);
  const orangeShare = Math.round((teams.orangeScore / total) * 100);

  const push = () => {
    if (you.cooldown > 0) return;
    session.action('pusher');
    setHistory(current => [...current.slice(-40), Math.random()]);
  };

  const prompt = state.prompt;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`chip ${you.team === 'orange' ? 'chip-flame' : 'chip-lime'}`}>TEAM {you.team.toUpperCase()}</span>
        <span className="chip chip-flame">🟠 {teams.orangeScore}</span>
        <span className="chip chip-lime">🟢 {teams.greenScore}</span>
        <span className="chip">{orangeLead === 0 ? 'ALL SQUARE' : orangeLead > 0 ? `ORANGE +${orangeLead}` : `GREEN +${Math.abs(orangeLead)}`}</span>
      </div>

      <div className="relative h-40 overflow-hidden rounded-3xl border border-white/12 bg-navy-900/70 p-3">
        <svg viewBox="0 0 300 90" className="h-24 w-full">
          <defs>
            <linearGradient id="finbWarFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(255,107,0,.5)" />
              <stop offset="100%" stopColor="rgba(255,107,0,0)" />
            </linearGradient>
          </defs>
          <polyline
            fill="none"
            stroke="#FF9500"
            strokeWidth="2.5"
            points={[...history, ...Array(Math.max(0, 40 - history.length)).fill(history.at(-1) ?? 0.5)]
              .map((value, index) => `${(index / 39) * 300},${85 - value * 70}`)
              .join(' ')}
          />
          <polygon
            fill="url(#finbWarFill)"
            points={`0,90 ${[...history, ...Array(Math.max(0, 40 - history.length)).fill(history.at(-1) ?? 0.5)]
              .map((value, index) => `${(index / 39) * 300},${85 - value * 70}`)
              .join(' ')} 300,90`}
          />
        </svg>
        <div className="absolute bottom-2 left-3 right-3 flex items-center gap-2">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-lime-500/30">
            <motion.div animate={{ width: `${orangeShare}%` }} className="h-full bg-gradient-to-r from-flame-500 to-flame-400" />
          </div>
          <b className="font-mono text-[11px] text-cream-100">{orangeShare}%</b>
        </div>
      </div>

      {prompt ? (
        <div className="jelly-flat space-y-2 p-3">
          <b className="block text-xs text-cream-100">⚡ Micro-challenge: {prompt.question}</b>
          <div className="flex flex-wrap gap-2">
            {prompt.options.map((option, index) => (
              <button key={option} className="btn btn-ghost !px-3 !py-1.5 text-[11px]" onClick={() => session.action('answer', { choice: index })}>
                {option}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-[11px] text-white/50">Micro-challenges appear between pushes. Correct answers are worth 40 points — a lot more than a tap.</p>
      )}

      <button className="btn btn-duo w-full" onClick={push} disabled={you.cooldown > 0}>
        {you.cooldown > 0 ? `RELOADING ${you.cooldown.toFixed(1)}s` : '📈 Push our ticker'}
      </button>

      <div className="grid gap-2 sm:grid-cols-2">
        {[{ name: 'Team Orange', list: teams.orange }, { name: 'Team Green', list: teams.green }].map(team => (
          <div key={team.name} className="jelly-flat p-3">
            <b className="text-xs text-cream-100">{team.name}</b>
            <div className="mt-1.5 space-y-1">
              {team.list.map(player => (
                <div key={player.id} className="flex items-center justify-between text-[11px] text-white/65">
                  <span className="truncate">{player.id === you.id ? `${player.name} (you)` : player.name}</span>
                  <span className="font-mono">{player.score}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
