'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import { useFinb } from '@/lib/appCtx';
import { MULTI_GAMES, SOLO_GAMES } from '@/lib/catalog';
import { Badge, Panel, ScreenHeader, SectionTitle } from '../ui';

const FILTERS = ['All', 'Runner & action', 'Market', 'Craft & idle', 'Stealth', 'Garden', 'Quick IQ'] as const;
const FAMILY_MAP: Record<string, string> = {
  runner: 'Runner & action',
  market: 'Market',
  craft: 'Craft & idle',
  stealth: 'Stealth',
  garden: 'Garden',
  quick: 'Quick IQ',
};

export function ArcadeScreen() {
  const api = useFinb();
  const [filter, setFilter] = useState<string>('All');
  const games = SOLO_GAMES.filter(game => filter === 'All' || FAMILY_MAP[game.family] === filter);

  return (
    <div className="space-y-5">
      <ScreenHeader
        eyebrow="PLAY FLOOR · EIGHT SOLO GAMES"
        title={<>Earn it the <span className="aberrate">fun way</span></>}
        sub="Every game here pays Credits, most pay Liberals, and all of them are playable in under three minutes."
        right={
          <div className="flex flex-wrap gap-2">
            <Badge tone="flame">COMBO ×{api.user.combo.multiplier.toFixed(2)}</Badge>
            <Badge tone="lime">BEST RUNS: RUSH {api.user.stats.bestVaultRush} · SURGE {api.user.stats.bestStockSurge}</Badge>
          </div>
        }
      />

      <Panel glow="flame" className="relative overflow-hidden p-4 sm:p-5">
        <div className="grid items-center gap-4 md:grid-cols-[1.1fr_1fr]">
          <div>
            <div className="label text-lime-300">FEATURED · PHASER 3 ENGINE</div>
            <h2 className="mt-1 text-2xl text-cream-100 sm:text-3xl">Vault Rush</h2>
            <p className="mt-2 max-w-md text-xs text-white/65">
              Endless neon corridor. Collect Credits, dodge the laser lattice, and thread the orange Risk Zones for a 3× multiplier. The longer you
              survive, the louder the music gets.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button className="btn btn-flame" onClick={() => api.openGame('vault-rush')}>
                ▶ Start a run
              </button>
              <button className="btn btn-ghost" onClick={() => api.openRoom('heist-party', 8)}>
                Play with 7 others instead
              </button>
            </div>
          </div>
          <div className="relative aspect-[16/9] overflow-hidden rounded-2xl border border-flame-500/40 bg-[radial-gradient(circle_at_50%_120%,rgba(255,107,0,.5),rgba(7,10,24,.9))]">
            <div className="absolute inset-0 opacity-70 [background-image:repeating-linear-gradient(90deg,rgba(0,230,118,.25)_0_2px,transparent_2px_60px)]" />
            <motion.span
              className="absolute bottom-6 left-1/2 h-14 w-14 -translate-x-1/2 rounded-[12px] border-2 border-flame-400 bg-[linear-gradient(140deg,#ff9500,#ff6b00)] shadow-[0_0_40px_rgba(255,107,0,.9)]"
              animate={{ y: [0, -8, 0], rotate: [0, 6, -6, 0] }}
              transition={{ duration: 2.6, repeat: Infinity }}
            />
            {['¢', '★', '◆'].map((glyph, index) => (
              <motion.span
                key={glyph}
                className="absolute text-lg text-lime-300"
                style={{ left: `${24 + index * 22}%`, top: '22%' }}
                animate={{ y: [0, -14, 0], opacity: [0.6, 1, 0.6] }}
                transition={{ duration: 2 + index * 0.4, repeat: Infinity }}
              >
                {glyph}
              </motion.span>
            ))}
            <span className="absolute right-2 top-2 rounded-full bg-navy-900/70 px-2 py-1 font-mono text-[9px] tracking-[0.18em] text-lime-300">RISK ZONE ×3</span>
          </div>
        </div>
      </Panel>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <SectionTitle kicker="CHOOSE YOUR OBSESSION" title={`${games.length} of ${SOLO_GAMES.length} games`} />
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map(item => (
            <button key={item} onClick={() => setFilter(item)} className={`rounded-full border px-3 py-1.5 font-mono text-[10px] tracking-wide transition ${
              filter === item ? 'border-lime-500/60 bg-lime-500/15 text-lime-300' : 'border-white/12 bg-white/5 text-white/60 hover:border-flame-500/40'
            }`}>
              {item.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {games.map((game, index) => (
          <motion.article
            key={game.id}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.04 }}
            className="jelly gloss group flex flex-col p-4 transition hover:-translate-y-1"
          >
            <div className="flex items-start justify-between">
              <span className={`grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br ${game.accent} text-xl shadow-lg`}>{game.emoji}</span>
              <Badge>{game.duration}</Badge>
            </div>
            <h3 className="mt-3 text-base text-cream-100">{game.title}</h3>
            <p className="mt-1 flex-1 text-[11px] leading-snug text-white/60">{game.tagline}</p>
            <div className="mt-2 text-[10px] text-white/45">{game.howTo}</div>
            <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-3">
              <span className="font-mono text-[10px] text-lime-300">{game.reward}</span>
              <button className="btn btn-ghost-lime !px-3 !py-1.5 text-[11px]" onClick={() => api.openGame(game.id)}>
                PLAY ▶
              </button>
            </div>
          </motion.article>
        ))}
      </div>

      <Panel className="p-4">
        <SectionTitle kicker="WANT PEOPLE IN THE ROOM?" title="Six multiplayer modes live in the Arena" sub="2–13 players, Find-A-Friend matchmaking, practice lobbies when you are solo." />
        <div className="flex flex-wrap gap-2">
          {MULTI_GAMES.map(game => (
            <button key={game.id} className="chip hover:border-flame-500/60" onClick={() => api.navigate('arena')}>
              {game.emoji} {game.title}
            </button>
          ))}
        </div>
      </Panel>
    </div>
  );
}
