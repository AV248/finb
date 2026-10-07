'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { sfx } from '@/lib/audio';
import type { SoloGameProps } from './VaultRush';

interface Bar {
  id: number;
  tier: number;
  value: number;
}

const TIER_VALUE = [6, 14, 32, 78, 180];
const TIER_NAME = ['Scrap', 'Copper', 'Bronze', 'Silver', 'SYNTH'];

/**
 * Credit Forge — idle/active crafting with a timing window.
 * Strike inside the green band for a perfect temper; chain perfects to mint Liberals.
 */
export function CreditForge({ onFinish }: SoloGameProps) {
  const [phase, setPhase] = useState<'idle' | 'forging' | 'done'>('idle');
  const [marker, setMarker] = useState(18);
  const [direction, setDirection] = useState(1);
  const [window_, setWindow] = useState({ start: 42, end: 62 });
  const [streak, setStreak] = useState(0);
  const [perfects, setPerfects] = useState(0);
  const [credits, setCredits] = useState(0);
  const [bars, setBars] = useState<Bar[]>([]);
  const [flash, setFlash] = useState<'perfect' | 'good' | 'miss' | null>(null);
  const [autoMiners, setAutoMiners] = useState(0);
  const markerRef = useRef(18);
  const directionRef = useRef(1);
  const speedRef = useRef(0.62);
  const idRef = useRef(1);
  const strikesRef = useRef(0);

  useEffect(() => {
    if (phase !== 'forging') return undefined;
    let frame = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const delta = Math.min(50, now - last) / 1000;
      last = now;
      markerRef.current += directionRef.current * speedRef.current * 48 * delta;
      if (markerRef.current >= 100) {
        markerRef.current = 100;
        directionRef.current = -1;
      }
      if (markerRef.current <= 0) {
        markerRef.current = 0;
        directionRef.current = 1;
      }
      setMarker(markerRef.current);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [phase]);

  useEffect(() => {
    if (autoMiners <= 0 || phase !== 'forging') return undefined;
    const interval = setInterval(() => {
      const gain = autoMiners * 3;
      setCredits(value => value + gain);
    }, 1200);
    return () => clearInterval(interval);
  }, [autoMiners, phase]);

  const strike = useCallback(() => {
    if (phase !== 'forging') return;
    strikesRef.current += 1;
    const position = markerRef.current;
    const inWindow = position >= window_.start && position <= window_.end;
    const deadCentre = Math.abs(position - (window_.start + window_.end) / 2) < (window_.end - window_.start) * 0.18;
    if (inWindow) {
      const nextStreak = streak + 1;
      setStreak(nextStreak);
      const tier = Math.min(TIER_VALUE.length - 1, Math.floor(nextStreak / 3));
      const value = TIER_VALUE[tier] * (deadCentre ? 2 : 1);
      setCredits(current => current + value);
      setBars(current => [{ id: idRef.current++, tier, value }, ...current].slice(0, 6));
      setFlash(deadCentre ? 'perfect' : 'good');
      if (deadCentre) {
        setPerfects(count => count + 1);
        sfx.perfect();
      } else {
        sfx.good();
      }
      speedRef.current = Math.min(1.5, speedRef.current + 0.045);
      const width = Math.max(12, 20 - nextStreak);
      const start = 32 + Math.random() * (60 - width);
      setWindow({ start, end: start + width });
    } else {
      setStreak(0);
      setFlash('miss');
      sfx.bad();
      speedRef.current = Math.max(0.5, speedRef.current - 0.08);
    }
    setTimeout(() => setFlash(null), 240);
  }, [phase, streak, window_]);

  useEffect(() => {
    if (phase !== 'forging') return undefined;
    const onKey = (event: KeyboardEvent) => {
      if (event.code === 'Space' || event.code === 'Enter') {
        event.preventDefault();
        strike();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, strike]);

  const finish = () => {
    const payout = Math.round(credits * 1.05);
    onFinish({
      credits: payout,
      liberals: perfects + 2,
      won: perfects >= 4,
      score: credits,
      title: `Credit Forge · ${perfects} perfect strikes`,
      message: `${strikesRef.current} strikes, ${perfects} dead-centre. Forged Credits converted at 1.05× into ${payout} Credits.`,
      meta: { perfectStrikes: perfects },
    });
    setPhase('done');
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-4">
        {[
          { label: 'FORGED', value: `${credits} cr`, tone: 'text-flame-400' },
          { label: 'STREAK', value: `${streak}`, tone: 'text-lime-400' },
          { label: 'PERFECTS', value: `${perfects}`, tone: 'text-lime-300' },
          { label: 'AUTO-MINERS', value: `${autoMiners}`, tone: 'text-cream-100' },
        ].map(item => (
          <div key={item.label} className="jelly-flat p-3">
            <div className="label">{item.label}</div>
            <div className={`font-mono text-lg ${item.tone}`}>{item.value}</div>
          </div>
        ))}
      </div>

      <div className={`relative overflow-hidden rounded-3xl border p-5 transition ${flash === 'perfect' ? 'border-lime-400 bg-lime-500/15' : flash === 'miss' ? 'border-flame-500 bg-flame-500/12' : 'border-white/12 bg-navy-900/70'}`}>
        <div className="relative h-16 overflow-hidden rounded-2xl border border-white/12 bg-[linear-gradient(90deg,rgba(255,107,0,.15),rgba(0,230,118,.12))]">
          <div className="absolute inset-y-0 border-x-2 border-lime-400/80 bg-lime-400/25" style={{ left: `${window_.start}%`, right: `${100 - window_.end}%` }}>
            <span className="absolute -top-0.5 left-1/2 -translate-x-1/2 font-mono text-[9px] text-navy-900">PERFECT</span>
          </div>
          <div className="absolute inset-y-1 w-1.5 rounded-full bg-cream-100 shadow-[0_0_18px_#fff6e9]" style={{ left: `calc(${marker}% - 3px)` }} />
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <p className="max-w-sm text-xs text-white/60">
            Slam the hammer when the white marker is inside the green band. Dead centre doubles the bar value and chains Liberals.
          </p>
          {phase === 'idle' ? (
            <button className="btn btn-flame" onClick={() => { setPhase('forging'); sfx.tap(); }}>
              🔥 Light the forge
            </button>
          ) : (
            <div className="flex gap-2">
              <button className="btn btn-lime" onClick={strike}>
                🔨 Strike (space)
              </button>
              <button
                className="btn btn-ghost"
                onClick={() => {
                  if (autoMiners >= 3 || credits < 120) return;
                  setCredits(value => value - 120);
                  setAutoMiners(value => value + 1);
                  sfx.coin();
                }}
                disabled={autoMiners >= 3 || credits < 120}
              >
                Hire auto-miner (120 cr)
              </button>
              <button className="btn btn-duo" onClick={finish}>
                Cash out
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {bars.map(bar => (
          <motion.div
            key={bar.id}
            initial={{ scale: 0.7, opacity: 0, rotate: -8 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            className="jelly-flat grid place-items-center p-3"
          >
            <span className="h-8 w-10 rounded-[6px] bg-gradient-to-br from-flame-500 to-lime-500" />
            <div className="mt-1 font-mono text-[10px] text-cream-100">{TIER_NAME[bar.tier]}</div>
            <div className="font-mono text-[10px] text-lime-300">+{bar.value}</div>
          </motion.div>
        ))}
      </div>

      <p className="text-[11px] text-white/45">
        Idle rule: hired auto-miners keep forging while this game is open — Credits are only banked when you cash out.
      </p>
    </div>
  );
}
