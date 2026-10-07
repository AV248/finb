'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useFinb } from '@/lib/appCtx';
import { MULTI_GAMES } from '@/lib/catalog';
import { Badge, Panel, ScreenHeader, SectionTitle } from '../ui';
import { COLYSEUS_URL } from '@/lib/net';

export function ArenaScreen() {
  const api = useFinb();
  const [seats, setSeats] = useState(8);
  const [hover, setHover] = useState<string | null>(null);
  const live = Boolean(COLYSEUS_URL);

  return (
    <div className="space-y-5">
      <ScreenHeader
        eyebrow="THE ARENA · 2–13 PLAYERS"
        title={<>Chaos, but <span className="aberrate">polite</span></>}
        sub="Six multiplayer modes with Find-A-Friend matchmaking. Every room pays the pot to the winner and a consolation purse to everyone else."
        right={
          <div className="flex flex-col items-end gap-2">
            <Badge tone={live ? 'lime' : 'flame'}>{live ? '● LIVE SERVER CONNECTED' : '● PRACTICE LOBBY (AI SEATS)'}</Badge>
            <BridgeHint live={live} />
          </div>
        }
      />

      <Panel glow="lime" className="flex flex-wrap items-center justify-between gap-4 p-4">
        <div className="flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-lime-500/15 text-2xl">🧭</span>
          <div>
            <div className="label text-lime-300">FAF · FIND-A-FRIEND</div>
            <b className="text-sm text-cream-100">Instant match — random mode, random rivals</b>
            <div className="text-[11px] text-white/55">You are seated with {Math.max(2, seats - 1)} others. Practice rivals are labelled in the room.</div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-[11px] text-white/60">
            <span className="label">SEATS</span>
            <input
              type="range"
              min={2}
              max={13}
              value={seats}
              onChange={event => setSeats(Number(event.target.value))}
              className="h-1.5 w-32 appearance-none rounded-full bg-white/15 accent-flame-500"
            />
            <b className="w-6 font-mono text-sm text-flame-300">{seats}</b>
          </label>
          <button className="btn btn-duo" onClick={() => api.openRoom(MULTI_GAMES[Math.floor(Math.random() * MULTI_GAMES.length)].id, seats)}>
            ⚡ Find a match
          </button>
        </div>
      </Panel>

      <SectionTitle kicker="PICK YOUR BRAND OF CHAOS" title={`${MULTI_GAMES.length} modes`} sub="Solo players are seated with AI floor members so nothing is ever dead." />

      <div className="grid gap-3 lg:grid-cols-3">
        {MULTI_GAMES.map((game, index) => (
          <motion.article
            key={game.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.04 }}
            onMouseEnter={() => setHover(game.id)}
            onMouseLeave={() => setHover(null)}
            className={`jelly gloss relative flex flex-col overflow-hidden p-4 transition ${hover === game.id ? '-translate-y-1 neon-edge-flame' : ''}`}
          >
            <span className={`absolute -right-8 -top-10 h-28 w-28 rounded-full bg-gradient-to-br ${game.accent} opacity-30 blur-2xl`} />
            <div className="flex items-start justify-between">
              <span className={`grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br ${game.accent} text-xl`}>{game.emoji}</span>
              <div className="text-right">
                <Badge tone="flame">{game.minPlayers}–{game.maxPlayers} PLAYERS</Badge>
                <div className="mt-1 font-mono text-[10px] text-white/45">{game.duration}</div>
              </div>
            </div>
            <h3 className="mt-3 text-base text-cream-100">{game.title}</h3>
            <p className="mt-1 flex-1 text-[11px] leading-snug text-white/60">{game.tagline}</p>
            <p className="mt-2 text-[10px] text-white/45">{game.howTo}</p>
            <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-3">
              <span className="font-mono text-[10px] text-lime-300">{game.reward}</span>
              <div className="flex items-center gap-1.5">
                <button className="rounded-full border border-white/15 px-2.5 py-1 font-mono text-[10px] text-white/60 hover:border-white/40" onClick={() => api.spectrum(game.id)}>
                  👀 WATCH
                </button>
                <button className="btn btn-flame !px-3 !py-1.5 text-[11px]" onClick={() => api.openRoom(game.id, Math.max(game.minPlayers, Math.min(seats, game.maxPlayers)))}>
                  PLAY ▶
                </button>
              </div>
            </div>
          </motion.article>
        ))}
      </div>

      <Panel className="p-4">
        <SectionTitle kicker="HOW ROOMS WORK" title="Fair by construction" />
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { icon: '🎲', title: 'Server-side roles', copy: 'Heist teams and Mafia roles are assigned by the room, never by purchase. Practice lobbies use the same code path.' },
            { icon: '🤖', title: 'Labelled AI', copy: 'Practice seats are clearly marked. In live rooms every seat is a human player.' },
            { icon: '🏆', title: 'Shared pot', copy: 'Winners take the pot; every finisher keeps a consolation purse so short sessions still feel rewarding.' },
          ].map(item => (
            <div key={item.title} className="jelly-flat p-3">
              <div className="text-lg">{item.icon}</div>
              <b className="mt-1 block text-xs text-cream-100">{item.title}</b>
              <p className="mt-1 text-[11px] text-white/55">{item.copy}</p>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function BridgeHint({ live }: { live: boolean }) {
  return (
    <p className="max-w-xs text-right text-[10px] leading-snug text-white/40">
      {live
        ? 'Colyseus authoritative rooms are enabled for this deployment.'
        : 'Set NEXT_PUBLIC_COLYSEUS_URL and run `npm run server` for true cross-device rooms.'}
    </p>
  );
}
