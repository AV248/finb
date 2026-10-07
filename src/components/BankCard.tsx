'use client';

import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { CARD_COSMETICS, TIER_BY_ID } from '@/lib/catalog';
import type { Player } from '@/lib/types';

export function BankCard({
  player,
  revealed,
  onReveal,
  size = 'full',
  interactive = true,
}: {
  player: Player;
  revealed: boolean;
  onReveal?: () => void;
  size?: 'full' | 'mini';
  interactive?: boolean;
}) {
  const tier = TIER_BY_ID[player.card.tier] ?? TIER_BY_ID.regular;
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const rotateX = useSpring(rx, { stiffness: 160, damping: 18 });
  const rotateY = useSpring(ry, { stiffness: 160, damping: 18 });
  const glowX = useTransform(rotateY, [-14, 14], ['8%', '92%']);

  const onMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!interactive) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width - 0.5;
    const py = (event.clientY - rect.top) / rect.height - 0.5;
    ry.set(px * 22);
    rx.set(-py * 16);
  };
  const reset = () => {
    rx.set(0);
    ry.set(0);
  };

  const mask = player.card.number.replace(/\D/g, '');
  const shown = revealed ? player.card.number : `•••• •••• •••• ${mask.slice(-4)}`;
  const cosmetic = player.cosmetics.includes('season') ? CARD_COSMETICS.find(item => item.id === 'season') : null;

  return (
    <motion.div
      onPointerMove={onMove}
      onPointerLeave={reset}
      style={{ rotateX, rotateY, transformPerspective: 900 }}
      className={`relative select-none ${size === 'mini' ? 'aspect-[1.58/1] w-full max-w-[300px]' : 'aspect-[1.58/1] w-full'} ${player.card.frozen ? 'saturate-[.45]' : ''}`}
    >
      <div
        className="absolute inset-0 overflow-hidden rounded-[18px] border shadow-[0_28px_60px_-24px_rgba(0,0,0,.95)]"
        style={{ background: tier.gradient, borderColor: tier.edge }}
      >
        {/* holographic + jelly layers */}
        <motion.span
          className="absolute inset-y-0 w-1/2 opacity-40 mix-blend-screen"
          style={{ left: glowX, background: 'radial-gradient(circle at 50% 50%, rgba(255,255,255,.55), transparent 62%)' }}
        />
        <span className="absolute inset-0 bg-[linear-gradient(112deg,rgba(255,255,255,.28)_0_14%,transparent_30%_68%,rgba(255,255,255,.12)_84%)]" />
        <span className="absolute inset-0 opacity-30 [background-image:repeating-linear-gradient(115deg,rgba(255,255,255,.16)_0_1px,transparent_1px_9px)]" />
        <span className="absolute -right-10 -top-16 h-40 w-40 rounded-full bg-lime-400/25 blur-3xl" />
        <span className="absolute -bottom-16 -left-10 h-40 w-40 rounded-full bg-flame-500/30 blur-3xl" />
        {cosmetic && <span className="absolute inset-0 opacity-70" style={{ background: cosmetic.css }} />}

        <div className="relative flex h-full flex-col justify-between p-4 sm:p-5">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-xl border border-white/60 bg-white/12 text-sm font-black text-cream-100">F</span>
              <span className="leading-none">
                <b className="block font-mono text-[13px] tracking-[0.22em] text-cream-100">FINB</b>
                <small className="font-mono text-[7px] tracking-[0.18em] text-cream-100/70">FAKE INTERNATIONAL BANK</small>
              </span>
            </div>
            <div className="text-right">
              <div className="font-mono text-[7px] tracking-[0.22em] text-cream-100/70">CATEGORY</div>
              <div className="font-mono text-[11px] font-bold tracking-[0.1em] text-cream-100">{tier.name}</div>
            </div>
          </div>

          <div className="flex items-end gap-3">
            <span className="grid h-7 w-10 grid-rows-3 gap-[2px] rounded-[5px] border border-white/60 bg-[linear-gradient(135deg,#ffe9cf,#ffb066,#00e676)] p-[2px]">
              <i className="block rounded-[1px] bg-navy-900/35" />
              <i className="block rounded-[1px] bg-navy-900/35" />
              <i className="block rounded-[1px] bg-navy-900/35" />
            </span>
            <span className="font-mono text-[9px] tracking-[0.16em] text-cream-100/70">{tier.authority.toUpperCase()}</span>
          </div>

          <div className="font-mono text-[15px] tracking-[0.14em] text-white drop-shadow-[0_2px_10px_rgba(0,0,0,.6)] sm:text-[17px]">{shown}</div>

          <div className="flex items-end justify-between gap-3">
            <div>
              <div className="font-mono text-[6px] tracking-[0.2em] text-cream-100/65">CARDHOLDER</div>
              <div className="font-mono text-[10px] font-semibold tracking-[0.06em] text-cream-100">{player.card.holder || player.username}</div>
            </div>
            <div>
              <div className="font-mono text-[6px] tracking-[0.2em] text-cream-100/65">EXPIRES</div>
              <div className="font-mono text-[10px] font-semibold text-cream-100">{revealed ? player.card.expiry : '••/••'}</div>
            </div>
            <div>
              <div className="font-mono text-[6px] tracking-[0.2em] text-cream-100/65">CVV</div>
              <div className="font-mono text-[10px] font-semibold text-cream-100">{revealed ? player.card.cvv : '•••'}</div>
            </div>
            <span className="font-mono text-[9px] font-bold tracking-[0.1em] text-cream-100">FINB<span className="text-flame-300">✦</span></span>
          </div>
        </div>

        <span className="pointer-events-none absolute bottom-1.5 left-1/2 -translate-x-1/2 font-mono text-[6px] tracking-[0.28em] text-white/35">
          FICTIONAL IN-GAME CARD · NOT A PAYMENT CARD
        </span>
        {player.card.frozen && (
          <span className="absolute inset-x-0 top-1/2 -translate-y-1/2 rotate-[-7deg] bg-[linear-gradient(90deg,#ff6b00,#00c853)] py-1.5 text-center font-mono text-[11px] font-black tracking-[0.3em] text-navy-900">
            FROZEN IN GAME
          </span>
        )}
        {onReveal && (
          <button
            className="absolute inset-0 rounded-[18px] transition hover:bg-white/5"
            aria-label={revealed ? 'Hide fictional card details' : 'Reveal fictional card details'}
            onClick={onReveal}
          />
        )}
      </div>
    </motion.div>
  );
}
