'use client';

import { motion } from 'framer-motion';
import type { StageProps } from './stage';

/** Liberals Relay Race — team lanes, crystals, boosts and traps. */
export function LiberalsRelayStage({ state, session }: StageProps) {
  const you = state.you;
  const teams = ['orange', 'green'] as const;

  const laneProgress = (team: (typeof teams)[number]) => {
    const members = state.players.filter(player => player.team === team);
    const total = members.reduce((sum, player) => sum + player.lp, 0);
    return Math.min(100, Math.round((total / Math.max(1, members.length * 18)) * 100));
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`chip ${you.team === 'orange' ? 'chip-flame' : 'chip-lime'}`}>LANE {you.team.toUpperCase()}</span>
        <span className="chip chip-lime">🌿 LP {you.lp}</span>
        <span className="chip">BOOSTS {you.score}</span>
        <span className="chip">COOLDOWN {you.cooldown.toFixed(1)}s</span>
      </div>

      <div className="space-y-3 rounded-3xl border border-lime-500/25 bg-navy-900/70 p-4">
        {teams.map(team => {
          const progress = laneProgress(team);
          const members = state.players.filter(player => player.team === team);
          return (
            <div key={team}>
              <div className="mb-1 flex items-center justify-between text-[11px] text-white/60">
                <b className={team === 'orange' ? 'text-flame-300' : 'text-lime-300'}>{team === 'orange' ? '🟠 EMBER LANE' : '🟢 SPROUT LANE'}</b>
                <span>{progress}% · {members.length} runners</span>
              </div>
              <div className="relative h-12 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-r from-white/4 via-white/6 to-white/4">
                <div className={`absolute inset-y-0 left-0 ${team === 'orange' ? 'bg-gradient-to-r from-flame-600/60 to-flame-400/25' : 'bg-gradient-to-r from-lime-600/60 to-lime-400/25'}`} style={{ width: `${progress}%` }} />
                <div className="absolute inset-0 flex items-center gap-1 px-2">
                  {members.map(player => (
                    <motion.div
                      key={player.id}
                      layout
                      animate={{ x: 0, y: player.frozen > 0 ? [0, -2, 0] : 0 }}
                      className={`grid h-8 w-8 place-items-center rounded-full border text-sm ${
                        player.id === you.id ? 'border-lime-300 bg-lime-500/25' : 'border-white/15 bg-navy-900/70'
                      } ${player.frozen > 0 ? 'opacity-60 grayscale' : ''}`}
                      title={player.name}
                    >
                      {player.frozen > 0 ? '❄️' : player.emote ?? (player.kind === 'bot' ? '🤖' : '🏃')}
                    </motion.div>
                  ))}
                </div>
                <div className="absolute right-2 top-1/2 -translate-y-1/2 text-lg">🏁</div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-2">
        <button className="btn btn-lime" onClick={() => session.action('boost')} disabled={you.cooldown > 0}>
          ✨ Place boost (+3 Liberals)
        </button>
        <button className="btn btn-flame" onClick={() => session.action('trap')} disabled={you.cooldown > 0}>
          🪤 Drop a trap on their lane
        </button>
        <span className="text-[11px] text-white/50">Boosts feed your own lane. Traps freeze the nearest rival for three seconds — pick your moment.</span>
      </div>

      <div className="jelly-flat max-h-28 space-y-1 overflow-y-auto p-3 scrollbar-none">
        {state.events.slice(0, 8).map(event => (
          <div key={event.id} className="text-[11px] text-white/65">
            <span className="mr-1">{event.kind === 'collect' ? '✨' : event.kind === 'freeze' ? '🪤' : '•'}</span>
            {event.text}
          </div>
        ))}
      </div>
    </div>
  );
}
