'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';

/* ------------------------------------------------------------------ *
 * Living background: midnight navy, orange + green nebulas, floating
 * platforms, parallax skyline and drifting collectible particles.
 * ------------------------------------------------------------------ */
const GLYPHS = ['¢', '★', '◆', '✦', '✧', '⬢', '◈', '✳'];

export function LivingWorld() {
  const ref = useRef<HTMLDivElement>(null);
  const particles = useMemo(
    () =>
      Array.from({ length: 26 }, (_, index) => ({
        glyph: GLYPHS[index % GLYPHS.length],
        left: `${(index * 37 + 5) % 96}%`,
        top: `${(index * 29 + 7) % 92}%`,
        delay: `${(index % 9) * -1.6}s`,
        duration: `${11 + (index % 7) * 2.2}s`,
        tone: index % 3 === 0 ? 'text-lime-400/70' : index % 3 === 1 ? 'text-flame-400/70' : 'text-cyanx-400/60',
        size: 10 + (index % 4) * 4,
      })),
    [],
  );

  useEffect(() => {
    const onScroll = () => {
      const y = Math.min(200, window.scrollY * 0.12);
      ref.current?.style.setProperty('--sky', `${-y}px`);
      ref.current?.style.setProperty('--ground', `${-y * 0.45}px`);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div ref={ref} aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-navy-900">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_-10%,#1a2352_0%,#0b1024_46%,#070a18_100%)]" />
      <div className="absolute inset-0 opacity-[0.35] [background-image:linear-gradient(rgba(255,149,0,.08)_1px,transparent_1px),linear-gradient(90deg,rgba(0,230,118,.07)_1px,transparent_1px)] [background-size:64px_64px] [mask-image:linear-gradient(180deg,transparent,black_45%,transparent)]" />
      <div className="absolute -left-[12%] -top-[22%] h-[46vw] min-h-[420px] w-[46vw] min-w-[420px] rounded-full bg-flame-500/20 blur-[120px] animate-[float_14s_ease-in-out_infinite]" />
      <div className="absolute -right-[16%] -top-[12%] h-[42vw] min-h-[380px] w-[42vw] min-w-[380px] rounded-full bg-lime-500/16 blur-[130px] animate-[float_18s_ease-in-out_infinite_reverse]" />
      <div className="absolute left-1/3 top-1/3 h-[40vw] w-[40vw] rounded-full bg-magenta-500/10 blur-[150px]" />

      <div className="absolute inset-x-[-4%] bottom-[16%] flex h-[190px] items-end justify-around gap-1.5 opacity-60" style={{ transform: 'translateY(var(--sky,0px))' }}>
        {Array.from({ length: 22 }, (_, index) => (
          <i
            key={index}
            className="relative block flex-none border border-flame-400/25 bg-[linear-gradient(135deg,rgba(38,48,104,.5),rgba(8,12,30,.9))] [background-image:linear-gradient(rgba(255,149,0,.16)_1px,transparent_1px)] [background-size:100%_11px]"
            style={{ width: 16 + ((index * 13) % 30), height: 44 + ((index * 41) % 140) }}
          />
        ))}
      </div>
      <div className="absolute inset-x-[-6%] bottom-[7%] flex h-[150px] items-end justify-around gap-1.5 opacity-75" style={{ transform: 'translateY(var(--ground,0px)) scaleX(1.05)' }}>
        {Array.from({ length: 16 }, (_, index) => (
          <i
            key={index}
            className="relative block flex-none border border-lime-500/25 bg-[linear-gradient(135deg,rgba(22,58,52,.72),rgba(6,10,26,.94))] [background-image:linear-gradient(90deg,transparent_34%,rgba(0,230,118,.34)_35%_41%,transparent_42%_70%,rgba(255,107,0,.3)_71%_77%,transparent_78%)]"
            style={{ width: 22 + ((index * 11) % 36), height: 36 + ((index * 31) % 112), clipPath: index % 3 === 0 ? 'polygon(0 14%,50% 0,100% 14%,100% 100%,0 100%)' : undefined }}
          />
        ))}
      </div>

      {/* floating isometric platforms with a vault monument */}
      <div className="absolute right-[6%] top-[16%] hidden h-[280px] w-[300px] lg:block" style={{ transform: 'translateY(var(--sky,0px))' }}>
        <div className="absolute bottom-6 left-1/2 h-[110px] w-[260px] -translate-x-1/2 [clip-path:polygon(50%_0,100%_46%,50%_100%,0_46%)] border border-lime-500/40 bg-[linear-gradient(135deg,rgba(24,40,86,.9),rgba(12,18,44,.85))]" />
        <div className="absolute bottom-10 left-1/2 h-[126px] w-[300px] -translate-x-1/2 [clip-path:polygon(50%_0,100%_46%,50%_100%,0_46%)] border border-flame-500/40 bg-[linear-gradient(135deg,rgba(70,32,10,.35),rgba(14,20,48,.7))]" />
        <div className="absolute bottom-[92px] left-1/2 h-[86px] w-[86px] -translate-x-1/2 rotate-45 rounded-[10px] border border-flame-400/70 bg-[linear-gradient(145deg,rgba(60,66,140,.95),rgba(120,44,12,.85))] shadow-[0_0_40px_-6px_rgba(255,107,0,.7)]">
          <span className="absolute inset-0 grid -rotate-45 place-items-center text-4xl font-black text-cream-100 chroma">F</span>
        </div>
        <div className="absolute bottom-[190px] left-1/2 h-[70px] w-[3px] -translate-x-1/2 bg-gradient-to-b from-lime-400 via-flame-500 to-magenta-500 shadow-[0_0_16px_rgba(0,230,118,.7)]" />
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap font-mono text-[7px] tracking-[0.3em] text-white/35">FINB · ESTD. 2024</div>
      </div>

      <div className="absolute inset-0">
        {particles.map((particle, index) => (
          <span
            key={index}
            className={`absolute ${particle.tone}`}
            style={{ left: particle.left, top: particle.top, fontSize: particle.size, animation: `float ${particle.duration} ease-in-out ${particle.delay} infinite alternate`, textShadow: '0 0 12px currentColor' }}
          >
            {particle.glyph}
          </span>
        ))}
      </div>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_28%,transparent_12%,rgba(5,7,20,.45)_78%,#070a18_130%)]" />
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Custom animated cursor: a jelly controller with a comic trail.
 * ------------------------------------------------------------------ */
export function NeonCursor() {
  const dot = useRef<HTMLDivElement>(null);
  const trails = useRef<(HTMLSpanElement | null)[]>([]);
  const points = useRef<{ x: number; y: number }[]>([]);
  const frame = useRef(0);
  const latest = useRef({ x: -60, y: -60 });
  const [mode, setMode] = useState<'idle' | 'hover' | 'text' | 'down'>('idle');

  useEffect(() => {
    const fine = window.matchMedia('(pointer: fine) and (prefers-reduced-motion: no-preference)');
    if (!fine.matches) return undefined;
    document.documentElement.classList.add('finb-cursor');

    const paint = () => {
      frame.current = 0;
      const { x, y } = latest.current;
      if (dot.current) dot.current.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      points.current.forEach((point, index) => {
        const node = trails.current[index];
        if (node) {
          node.style.transform = `translate3d(${point.x}px, ${point.y}px, 0)`;
          node.style.opacity = `${((index + 1) / points.current.length) * 0.35}`;
        }
      });
    };
    const move = (event: PointerEvent) => {
      latest.current = { x: event.clientX, y: event.clientY };
      points.current = [...points.current, { x: event.clientX, y: event.clientY }].slice(-4);
      if (!frame.current) frame.current = requestAnimationFrame(paint);
    };
    const over = (event: PointerEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      if (!target) return;
      if (target.closest('input, textarea, select, [contenteditable="true"]')) setMode('text');
      else if (target.closest('button, a, [role="button"], summary, label')) setMode('hover');
      else setMode('idle');
    };
    const down = () => setMode('down');
    const up = () => setMode('idle');
    window.addEventListener('pointermove', move, { passive: true });
    window.addEventListener('pointerover', over, { passive: true });
    window.addEventListener('pointerdown', down, { passive: true });
    window.addEventListener('pointerup', up, { passive: true });
    return () => {
      document.documentElement.classList.remove('finb-cursor');
      cancelAnimationFrame(frame.current);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerover', over);
      window.removeEventListener('pointerdown', down);
      window.removeEventListener('pointerup', up);
    };
  }, []);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[200] hidden overflow-hidden [@media(pointer:fine)]:block">
      {[0, 1, 2, 3].map(index => (
        <span
          key={index}
          ref={node => {
            trails.current[index] = node;
          }}
          className="fixed left-0 top-0 rounded-[40%_50%_50%] border border-flame-400/60 bg-flame-500/20 shadow-[0_0_16px_rgba(255,107,0,.6)]"
          style={{ width: 16 - index * 3, height: 16 - index * 3 }}
        />
      ))}
      <div
        ref={dot}
        className={`fixed left-0 top-0 grid h-8 w-8 place-items-center transition-[scale] duration-150 ${mode === 'hover' ? 'scale-125' : ''} ${mode === 'down' ? 'scale-90' : ''}`}
      >
        <span className="absolute inset-0 rounded-full border border-lime-400/60 shadow-[0_0_14px_rgba(0,230,118,.5)] animate-[spin_9s_linear_infinite]" />
        <span
          className={`relative grid place-items-center border border-white/80 bg-[linear-gradient(140deg,#ff6b00,#00c853)] text-[7px] font-black text-navy-900 shadow-[0_0_18px_rgba(255,107,0,.8)] ${
            mode === 'text' ? 'h-5 w-[3px] rounded-[2px]' : 'h-4 w-4 rounded-[5px_46%_46%]'
          }`}
        >
          {mode === 'text' ? '' : 'FINB'}
        </span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Vault teleport page transition (shards of orange + green).
 * ------------------------------------------------------------------ */
export function VaultTransition({ active, label, onSkip }: { active: boolean; label: string; onSkip?: () => void }) {
  return (
    <AnimatePresence>
      {active && (
        <motion.div
          key="vault"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-[150] grid place-items-center overflow-hidden bg-[radial-gradient(circle_at_50%_45%,rgba(255,107,0,.28),rgba(7,10,24,.97)_58%,#05070f)] backdrop-blur-md"
        >
          <div className="absolute inset-0">
            {Array.from({ length: 14 }, (_, index) => (
              <motion.i
                key={index}
                initial={{ opacity: 0, x: 0, y: 0, rotate: 0, scale: 0.4 }}
                animate={{ opacity: [0, 1, 0], x: (index % 2 ? 1 : -1) * (90 + index * 26), y: (index % 3 ? -1 : 1) * (70 + index * 24), rotate: index * 47, scale: 1.35 }}
                transition={{ duration: 0.72, delay: index * 0.012, ease: 'easeOut' }}
                className="absolute left-1/2 top-1/2 border border-lime-400/60 bg-[linear-gradient(145deg,rgba(255,107,0,.42),rgba(0,230,118,.24))]"
                style={{ width: 30 + index * 7, height: 40 + index * 9, clipPath: 'polygon(50% 0,100% 30%,74% 100%,0 66%)' }}
              />
            ))}
          </div>
          <motion.div initial={{ opacity: 0, scale: 0.86 }} animate={{ opacity: 1, scale: 1 }} className="relative z-10 flex flex-col items-center gap-2 text-center">
            <span className="label text-lime-400">VAULT TELEPORT</span>
            <b className="text-2xl text-cream-100 chroma sm:text-3xl">{label}</b>
            <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/45">cinching the vault door…</span>
            {onSkip && (
              <button onClick={onSkip} className="mt-2 font-mono text-[10px] tracking-[0.2em] text-white/45 underline hover:text-lime-300">
                SKIP
              </button>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ------------------------------------------------------------------ confetti */
export function Confetti({ burst }: { burst: number }) {
  if (!burst) return null;
  const pieces = Array.from({ length: 40 }, (_, index) => index);
  return (
    <div aria-hidden key={burst} className="pointer-events-none fixed inset-0 z-[180] overflow-hidden">
      {pieces.map(index => (
        <motion.i
          key={index}
          initial={{ opacity: 1, x: '50vw', y: '42vh', scale: 0.6 }}
          animate={{
            opacity: [1, 1, 0],
            x: `${20 + ((index * 17) % 60)}vw`,
            y: `${70 + ((index * 23) % 26)}vh`,
            rotate: index * 61,
            scale: 1.1,
          }}
          transition={{ duration: 1.5 + (index % 5) * 0.16, ease: [0.2, 0.8, 0.3, 1] }}
          className={`absolute h-2.5 w-2.5 ${index % 3 === 0 ? 'bg-flame-500' : index % 3 === 1 ? 'bg-lime-500' : 'bg-cream-100'}`}
          style={{ clipPath: index % 2 ? 'polygon(50% 0,100% 50%,50% 100%,0 50%)' : 'polygon(0 0,100% 0,100% 100%,0 100%)' }}
        />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ toasts */
export interface ToastMessage {
  id: string;
  text: string;
  tone: 'good' | 'bad' | 'info';
  icon?: string;
}

export function ToastHost({ toast }: { toast: ToastMessage | null }) {
  return (
    <div className="pointer-events-none fixed bottom-24 left-1/2 z-[190] w-[min(94vw,460px)] -translate-x-1/2 sm:bottom-8">
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 22, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 14, scale: 0.96 }}
            className={`jelly flex items-start gap-3 px-4 py-3 text-sm shadow-2xl ${
              toast.tone === 'bad' ? 'neon-edge-flame' : toast.tone === 'info' ? '' : 'neon-edge-lime'
            }`}
          >
            <span className={`grid h-7 w-7 flex-none place-items-center rounded-full text-sm ${
              toast.tone === 'bad' ? 'bg-flame-500/25 text-flame-300' : toast.tone === 'info' ? 'bg-cyanx-400/20 text-cyanx-400' : 'bg-lime-500/25 text-lime-300'
            }`}>
              {toast.icon ?? (toast.tone === 'bad' ? '!' : toast.tone === 'info' ? 'i' : '✓')}
            </span>
            <p className="pt-0.5 leading-snug text-cream-100">{toast.text}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Screen-shake + particle burst helper used by every game. */
export function useJuice() {
  const [shakeKey, setShakeKey] = useState(0);
  const [burst, setBurst] = useState(0);
  return {
    shakeKey,
    burst,
    shake: () => setShakeKey(key => key + 1),
    celebrate: () => {
      setBurst(value => value + 1);
      setShakeKey(key => key + 1);
    },
  };
}
