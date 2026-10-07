'use client';

import { motion } from 'framer-motion';
import { useFinb } from '@/lib/appCtx';
import { useDatabase } from '@/lib/store';
import { CLOUD_MODE_LABEL } from '@/lib/supabase';
import { levelFor } from '@/lib/economy';
import { tierProgress } from '@/lib/store';
import { sfx } from '@/lib/audio';
import { Badge } from './ui';

/** Sticky brand bar: balances, combo, card tier, guide and profile entries. */
export function TopBar({
  onOpenGuide,
  onOpenProfiles,
  onOpenMore,
}: {
  onOpenGuide: () => void;
  onOpenProfiles: () => void;
  onOpenMore: () => void;
}) {
  const api = useFinb();
  const db = useDatabase();
  const user = api.user;
  const level = levelFor(user.liberals);
  const tier = tierProgress(user);
  const guestDays = api.guestDaysLeft;

  return (
    <header className="sticky top-0 z-40 -mx-3 px-3 pb-2 pt-1 backdrop-blur-xl sm:-mx-5 sm:px-5">
      <div className="glass flex flex-wrap items-center gap-2 rounded-3xl px-3 py-2.5">
        <button className="flex items-center gap-2.5 text-left" onClick={onOpenMore} aria-label="Open The Bank hub">
          <motion.span
            whileHover={{ rotate: -6, scale: 1.05 }}
            className="grid h-9 w-9 place-items-center rounded-2xl bg-[linear-gradient(140deg,#FF6B00,#00C853)] text-base font-black text-navy-900 shadow-[0_0_18px_-4px_rgba(255,107,0,.9)]"
          >
            F
          </motion.span>
          <span className="leading-tight">
            <b className="block text-[13px] tracking-wide text-cream-100">FINB</b>
            <span className="block font-mono text-[8px] uppercase tracking-[0.24em] text-white/45">
              ESTD. 2024 · {CLOUD_MODE_LABEL}
            </span>
          </span>
        </button>

        <button onClick={onOpenMore} className="hidden items-center gap-2 rounded-2xl border border-white/10 bg-white/4 px-2.5 py-1.5 text-[10px] text-white/60 transition hover:border-flame-500/50 lg:flex">
          <span className="font-mono uppercase tracking-[0.2em] text-lime-300">LVL {level.level}</span>
          <span className="relative block h-1.5 w-24 overflow-hidden rounded-full bg-white/10">
            <motion.i
              animate={{ width: `${Math.round((level.into / Math.max(1, level.span)) * 100)}%` }}
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-lime-500 to-flame-500"
            />
          </span>
          <span>
            next: {tier.next} · {tier.percent}%
          </span>
        </button>

        <div className="ml-auto flex items-center gap-1.5">
          <motion.span key={user.credits} initial={{ scale: 1.12 }} animate={{ scale: 1 }} className="chip chip-flame font-mono" title="Credits — the spending currency">
            ¢ {user.credits.toLocaleString()}
          </motion.span>
          <motion.span key={user.liberals} initial={{ scale: 1.12 }} animate={{ scale: 1 }} className="chip chip-lime font-mono" title="Liberals — achievement points, never purchasable">
            🌿 {user.liberals.toLocaleString()}
          </motion.span>
          {user.combo.multiplier > 1 && (
            <span className="chip hidden sm:inline-flex" title={`${user.combo.streak}-game win streak`}>
              ×{user.combo.multiplier.toFixed(2)}
            </span>
          )}
          {!user.linked && guestDays !== null && <Badge tone="magenta">GUEST · {guestDays}d</Badge>}
          {db.players.length > 1 && (
            <button className="btn btn-ghost !px-2.5 !py-1.5 text-[11px]" onClick={onOpenProfiles} title="Switch profile">
              🧑‍💼 {db.players.length}
            </button>
          )}
          <button className="btn btn-ghost !px-2.5 !py-1.5 text-[11px]" onClick={onOpenGuide} title="Replay the interactive guide">
            🧭
          </button>
          <button
            className="btn btn-ghost !px-2.5 !py-1.5 text-[11px]"
            onClick={() => {
              api.toggleSound();
              if (!db.soundOn) sfx.good();
            }}
            aria-label={db.soundOn ? 'Mute sound' : 'Unmute sound'}
          >
            {db.soundOn ? '🔊' : '🔇'}
          </button>
        </div>
      </div>
    </header>
  );
}
