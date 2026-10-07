'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import type { ScreenId } from '@/lib/appCtx';
import { Icon } from './ui';

const NAV: { id: ScreenId; label: string; icon: string; glyph: string }[] = [
  { id: 'home', label: 'Lobby', icon: 'home', glyph: '🏛️' },
  { id: 'arcade', label: 'Arcade', icon: 'arcade', glyph: '🕹️' },
  { id: 'arena', label: 'Arena', icon: 'arena', glyph: '⚔️' },
  { id: 'friends', label: 'Friends', icon: 'friends', glyph: '🤝' },
  { id: 'ranks', label: 'Ranks', icon: 'ranks', glyph: '🏆' },
  { id: 'rewards', label: 'Rewards', icon: 'rewards', glyph: '🎁' },
  { id: 'card', label: 'Card', icon: 'card', glyph: '💳' },
  { id: 'more', label: 'Bank', icon: 'more', glyph: '🏦' },
];

/** Game-style navigation: magnetic orbit buttons on desktop, thumb bar on mobile. */
export function AppNav({ current, onNavigate }: { current: ScreenId; onNavigate: (screen: ScreenId) => void }) {
  const [hover, setHover] = useState<ScreenId | null>(null);

  return (
    <>
      {/* desktop: floating orbit dock */}
      <nav aria-label="Primary" className="pointer-events-none fixed inset-x-0 bottom-4 z-40 hidden lg:block">
        <div className="pointer-events-auto mx-auto flex w-fit items-center gap-1.5 rounded-[28px] border border-white/12 bg-navy-900/70 p-2 shadow-[0_24px_60px_-24px_rgba(0,0,0,.9)] backdrop-blur-2xl">
          {NAV.map(item => {
            const active = current === item.id;
            const near = hover === item.id;
            return (
              <motion.button
                key={item.id}
                onMouseEnter={() => setHover(item.id)}
                onMouseLeave={() => setHover(null)}
                onClick={() => onNavigate(item.id)}
                animate={{ y: near ? -7 : active ? -3 : 0, scale: near ? 1.08 : 1 }}
                transition={{ type: 'spring', stiffness: 320, damping: 20 }}
                className={`relative flex w-[74px] flex-col items-center gap-1 rounded-3xl px-2 py-2.5 text-[10px] transition-colors ${
                  active ? 'text-navy-900' : 'text-white/60 hover:text-cream-100'
                }`}
                aria-current={active ? 'page' : undefined}
              >
                {active && (
                  <motion.span
                    layoutId="finb-nav-orb"
                    transition={{ type: 'spring', stiffness: 320, damping: 26 }}
                    className="absolute inset-0 rounded-3xl bg-[linear-gradient(140deg,#FF6B00,#FF9500_45%,#00E676)] shadow-[0_0_26px_-6px_rgba(255,107,0,.9)]"
                  />
                )}
                <span className="relative text-lg">
                  <span aria-hidden>{item.glyph}</span>
                </span>
                <span className="relative font-mono uppercase tracking-[0.14em]">{item.label}</span>
              </motion.button>
            );
          })}
        </div>
      </nav>

      {/* mobile: thumb-reach bar */}
      <nav aria-label="Primary" className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-navy-900/85 px-1 pb-[max(6px,env(safe-area-inset-bottom))] pt-1.5 backdrop-blur-2xl lg:hidden">
        <div className="flex items-stretch justify-between">
          {NAV.map(item => {
            const active = current === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`relative flex flex-1 flex-col items-center gap-1 rounded-2xl px-1 py-1.5 text-[9px] transition-colors ${
                  active ? 'text-flame-300' : 'text-white/50'
                }`}
                aria-current={active ? 'page' : undefined}
              >
                {active && <span className="absolute -top-1.5 h-1 w-8 rounded-full bg-[linear-gradient(90deg,#FF6B00,#00C853)]" />}
                <Icon name={item.icon} className={`h-[18px] w-[18px] ${active ? 'text-flame-400' : ''}`} />
                <span className="font-mono uppercase tracking-[0.1em]">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
