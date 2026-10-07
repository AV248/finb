'use client';

import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

/* ------------------------------------------------------------------ icons */
const PATHS: Record<string, ReactNode> = {
  home: <><path d="m3 10 9-7 9 7" /><path d="M5 9v11h14V9M9 20v-6h6v6" /></>,
  arcade: <><path d="m8 5 11 7-11 7z" /><circle cx="12" cy="12" r="9" /></>,
  arena: <><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" /></>,
  friends: <><circle cx="9" cy="8" r="3" /><path d="M3.5 20v-1.5a5.5 5.5 0 0 1 11 0V20zM16 5.5a3 3 0 0 1 0 5.8M17 14a4.5 4.5 0 0 1 3.5 4.4V20" /></>,
  ranks: <><path d="M4 20h16M7 20V9M12 20V4M17 20v-7" /></>,
  rewards: <><path d="m12 3 2.4 5.6L20 10l-4 3.6.9 5.4L12 16.6 7.1 19l.9-5.4L4 10l5.6-1.4z" /></>,
  card: <><rect x="3" y="5" width="18" height="14" rx="3" /><path d="M3 10h18M7 15h4" /></>,
  more: <><circle cx="6" cy="12" r="1.4" /><circle cx="12" cy="12" r="1.4" /><circle cx="18" cy="12" r="1.4" /></>,
  close: <><path d="M6 6l12 12M18 6 6 18" /></>,
  play: <><path d="m8 5 11 7-11 7z" /></>,
  bolt: <><path d="M13 2 4 14h6l-1 8 9-12h-6z" /></>,
  gift: <><rect x="3" y="8" width="18" height="12" rx="2" /><path d="M3 12h18M12 8v12M8.5 8a2.5 2.5 0 1 1 3.5-2.3L12 8M15.5 8A2.5 2.5 0 1 0 12 5.7L12 8" /></>,
  eye: <><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6z" /><circle cx="12" cy="12" r="2.6" /></>,
  shield: <><path d="M12 3l7 3v6c0 4.2-3 7.4-7 9-4-1.6-7-4.8-7-9V6z" /></>,
  send: <><path d="M4 12 20 4l-7 16-2.5-6.5z" /></>,
  plus: <><path d="M12 5v14M5 12h14" /></>,
  check: <><path d="m4 12 5 5L20 6" /></>,
  download: <><path d="M12 3v12m0 0-4-4m4 4 4-4M4 19h16" /></>,
  spark: <><path d="m12 3 1.7 5.3L19 10l-5.3 1.7L12 17l-1.7-5.3L5 10l5.3-1.7z" /></>,
  lock: <><rect x="4" y="10" width="16" height="10" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></>,
  search: <><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4 4" /></>,
  emote: <><circle cx="12" cy="12" r="9" /><path d="M8.5 10h.01M15.5 10h.01M8.5 14.5s1.4 1.6 3.5 1.6 3.5-1.6 3.5-1.6" /></>,
};

export function Icon({ name, className = 'h-4 w-4' }: { name: string; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {PATHS[name] ?? PATHS.spark}
    </svg>
  );
}

/* ------------------------------------------------------------------ layout */
export function Panel({
  children,
  className = '',
  tone = 'navy',
  glow,
}: {
  children: ReactNode;
  className?: string;
  tone?: 'navy' | 'cream' | 'flat';
  glow?: 'flame' | 'lime' | 'none';
}) {
  const base = tone === 'cream' ? 'jelly jelly-cream gloss' : tone === 'flat' ? 'jelly-flat' : 'jelly gloss';
  const edge = glow === 'flame' ? 'neon-edge-flame' : glow === 'lime' ? 'neon-edge-lime' : '';
  return <div className={`relative ${base} ${edge} ${className}`}>{children}</div>;
}

export function SectionTitle({ kicker, title, action, sub }: { kicker: string; title: string; sub?: string; action?: ReactNode }) {
  return (
    <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
      <div>
        <div className="label text-flame-400">{kicker}</div>
        <h2 className="mt-1 text-xl leading-tight text-cream-100 sm:text-2xl">{title}</h2>
        {sub && <p className="mt-1 max-w-xl text-xs text-white/60">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

export function Meter({ value, max, className = '', height = 'h-2' }: { value: number; max: number; className?: string; height?: string }) {
  const percent = max <= 0 ? 0 : Math.min(100, Math.round((value / max) * 100));
  return (
    <div className={`meter ${height} ${className}`}>
      <i style={{ width: `${percent}%` }} />
    </div>
  );
}

export function StatPill({ label, value, sub, tone = 'flame' }: { label: string; value: string; sub?: string; tone?: 'flame' | 'lime' | 'plain' }) {
  const ring = tone === 'flame' ? 'text-flame-400' : tone === 'lime' ? 'text-lime-400' : 'text-white/70';
  return (
    <div className="jelly-flat px-3 py-2">
      <div className="label">{label}</div>
      <div className={`mt-0.5 font-mono text-sm font-semibold ${ring}`}>{value}</div>
      {sub && <div className="text-[10px] text-white/45">{sub}</div>}
    </div>
  );
}

export function RewardFloat({ text, tone = 'flame' }: { text: string; tone?: 'flame' | 'lime' }) {
  return (
    <motion.span
      initial={{ opacity: 0, y: 8, scale: 0.8 }}
      animate={{ opacity: 1, y: -18, scale: 1 }}
      exit={{ opacity: 0, y: -34 }}
      transition={{ duration: 0.5 }}
      className={`pointer-events-none absolute right-3 top-2 rounded-full px-2 py-1 font-mono text-[11px] font-bold ${
        tone === 'flame' ? 'bg-flame-500 text-navy-900' : 'bg-lime-500 text-navy-900'
      }`}
    >
      {text}
    </motion.span>
  );
}

export function Badge({ children, tone = 'plain' }: { children: ReactNode; tone?: 'plain' | 'flame' | 'lime' | 'magenta' }) {
  const map = {
    plain: 'border-white/12 bg-white/5 text-white/70',
    flame: 'border-flame-500/45 bg-flame-500/12 text-flame-300',
    lime: 'border-lime-500/45 bg-lime-500/12 text-lime-300',
    magenta: 'border-magenta-500/40 bg-magenta-500/12 text-magenta-500',
  } as const;
  return <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] ${map[tone]}`}>{children}</span>;
}

export function EmptyState({ glyph, title, hint }: { glyph: string; title: string; hint: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 py-8 text-center">
      <span className="text-2xl">{glyph}</span>
      <b className="text-sm text-cream-100">{title}</b>
      <span className="max-w-xs text-xs text-white/50">{hint}</span>
    </div>
  );
}

export function ScreenHeader({ eyebrow, title, sub, right }: { eyebrow: string; title: ReactNode; sub: string; right?: ReactNode }) {
  return (
    <header className="mb-4 flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-2xl">
        <div className="label text-lime-400">{eyebrow}</div>
        <h1 className="mt-1 text-2xl leading-[1.05] text-cream-100 sm:text-3xl">{title}</h1>
        <p className="mt-1 text-xs text-white/60 sm:text-sm">{sub}</p>
      </div>
      {right}
    </header>
  );
}
