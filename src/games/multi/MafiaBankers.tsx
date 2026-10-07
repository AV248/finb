'use client';

import { motion } from 'framer-motion';
import { useMemo, useState } from 'react';
import type { StageProps } from './stage';
import { seatClass } from './stage';

const DISCUSSION_LINES = [
  'I transferred before the audit opened — check the log.',
  'Two people went quiet right after the leak. That is not nothing.',
  'If I were corrupt I would not have pushed the vault total that hard.',
  'Vote me out and the bank loses its best ledger hand. Your call.',
  'Someone here is very calm. Suspiciously calm.',
  'The pattern is in the timing, not the amounts.',
];

/** Mafia Bankers — hidden roles, discussion beats, board votes and mini-games. */
export function MafiaBankersStage({ state, session }: StageProps) {
  const you = state.you;
  const [selected, setSelected] = useState<string | null>(null);
  const [line, setLine] = useState(0);
  const alive = state.players.filter(player => player.alive);
  const roleHint = useMemo(() => {
    if (you.role === 'corrupt-banker') return { text: 'CORRUPT BANKER', tone: 'chip-magenta', body: 'Drain the vault quietly, survive the votes, and keep the auditors pointing at each other.' };
    return { text: 'AUDITOR', tone: 'chip-lime', body: 'Find the corrupt banker. Each correct vote pays 120 Credits and 5 investigation points.' };
  }, [you.role]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`chip ${roleHint.tone}`}>{roleHint.text}</span>
        <span className="chip">ROUND {state.round}</span>
        <span className="chip">ALIVE {alive.length}/{state.players.length}</span>
        <span className="chip chip-flame">¢ {you.credits}</span>
        <span className="chip chip-lime">LP {you.lp}</span>
      </div>

      <div className="jelly-flat p-3">
        <b className="text-xs text-cream-100">{state.headline}</b>
        <p className="mt-1 text-[11px] text-white/60">{roleHint.body}</p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {state.players.map(player => {
          const voted = state.votes?.[player.id];
          return (
            <motion.button
              key={player.id}
              onClick={() => player.id !== you.id && player.alive && setSelected(player.id)}
              layout
              className={`rounded-2xl border p-3 text-left text-[11px] transition ${seatClass(player, you)} ${selected === player.id ? 'ring-2 ring-flame-400/80' : ''}`}
              disabled={!player.alive}
            >
              <div className="flex items-center justify-between">
                <b className="truncate text-cream-100">{player.name}</b>
                <span>{player.alive ? player.emote ?? (player.kind === 'bot' ? '🤖' : '🧑‍💼') : '⚰️'}</span>
              </div>
              <div className="mt-1 text-white/60">¢{player.credits} · {player.score} pts</div>
              <div className="truncate text-[10px] text-white/45">{player.alive ? player.status : 'voted out'}</div>
              {voted ? <div className="mt-1 text-[10px] text-flame-300">board vote logged</div> : null}
            </motion.button>
          );
        })}
      </div>

      <div className="jelly-flat space-y-2 p-3">
        <div className="text-[11px] text-white/60">💬 Table talk — {DISCUSSION_LINES[line % DISCUSSION_LINES.length]}</div>
        <div className="flex flex-wrap gap-2">
          <button className="btn btn-ghost !px-3 !py-1.5 text-[11px]" onClick={() => setLine(value => value + 1)}>
            Next voice
          </button>
          <button
            className="btn btn-flame"
            disabled={!selected}
            onClick={() => {
              if (selected) session.action('vote', { targetId: selected });
              setSelected(null);
            }}
          >
            🗳️ Vote out {state.players.find(player => player.id === selected)?.name ?? '…'}
          </button>
          <button
            className="btn btn-ghost-lime !px-3 !py-1.5 text-[11px]"
            onClick={() => session.action('answer', { choice: Math.random() < 0.6 ? 0 : 1 })}
          >
            🎲 Coin-audit mini-game
          </button>
        </div>
        <p className="text-[11px] text-white/45">
          Corrupt Bankers drain Credits each round they survive. Auditors earn investigation points for mini-games and correct votes. Majority vote removes a player — right or wrong.
        </p>
      </div>

      <div className="jelly-flat max-h-28 space-y-1 overflow-y-auto p-3 scrollbar-none">
        {state.events.slice(0, 8).map(event => (
          <div key={event.id} className="text-[11px] text-white/65">
            <span className="mr-1">{event.kind === 'vote' ? '🗳️' : event.kind === 'collect' ? '🔎' : '•'}</span>
            {event.text}
          </div>
        ))}
      </div>
    </div>
  );
}
