'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { sfx } from '@/lib/audio';
import type { SoloGameProps } from './VaultRush';

interface Bubble {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  tone: 'bull' | 'risk' | 'crash';
  life: number;
  symbol: string;
}

const SYMBOLS = ['NVA', 'CRB', 'LMB', 'SPR', 'HVT', 'ZEN'];

/**
 * Stock Surge — canvas bubble market. Tap orange (bull) bubbles to buy the trend,
 * green (risk) bubbles for a spike with a 40% chance of a crash, and every
 * 20 seconds a Market Boom doubles the next three wins.
 */
export function StockSurge({ onFinish, onToast }: SoloGameProps) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [hud, setHud] = useState({ bank: 100, streak: 0, boom: false, seconds: 90, heat: 0 });
  const stats = useRef({ bank: 100, wins: 0, losses: 0, streak: 0, best: 0, boomLeft: 0, crashesAvoided: 0 });

  const tone = useMemo(() => ({ bull: '#FF6B00', risk: '#00E676', crash: '#FF2FB9' }), []);

  useEffect(() => {
    const element = canvas.current;
    if (!element) return undefined;
    const ctx = element.getContext('2d');
    if (!ctx) return undefined;

    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const resize = () => {
      const rect = element.getBoundingClientRect();
      element.width = rect.width * dpr;
      element.height = rect.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const width = () => element.width / dpr;
    const height = () => element.height / dpr;
    const bubbles: Bubble[] = [];
    const particles: { x: number; y: number; vx: number; vy: number; life: number; tone: string; text?: string }[] = [];
    let id = 0;
    let frame = 0;
    let last = performance.now();
    let elapsed = 0;
    let spawnAt = 0;
    let ema = 100;
    let running = true;

    const spawn = () => {
      const roll = Math.random();
      const tone: Bubble['tone'] = roll < 0.5 ? 'bull' : roll < 0.86 ? 'risk' : 'crash';
      bubbles.push({
        id: id++,
        x: 60 + Math.random() * (width() - 120),
        y: height() + 40,
        vx: (Math.random() - 0.5) * 40,
        vy: -(30 + Math.random() * 42) * (tone === 'bull' ? 1 : 1.25),
        r: tone === 'crash' ? 40 : tone === 'risk' ? 32 : 42,
        tone,
        life: 9.5 + Math.random() * 4,
        symbol: SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
      });
    };

    const burst = (x: number, y: number, tone: string, text: string) => {
      particles.push({ x, y, vx: 0, vy: -40, life: 1, tone, text });
      for (let index = 0; index < 14; index += 1) {
        const angle = (Math.PI * 2 * index) / 14;
        particles.push({ x, y, vx: Math.cos(angle) * 120, vy: Math.sin(angle) * 120, life: 0.7, tone });
      }
    };

    const tap = (clientX: number, clientY: number) => {
      const rect = element.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      for (let index = bubbles.length - 1; index >= 0; index -= 1) {
        const bubble = bubbles[index];
        if (Math.hypot(bubble.x - x, bubble.y - y) <= bubble.r + 8) {
          bubbles.splice(index, 1);
          const multiplier = stats.current.boomLeft > 0 ? 2 : 1;
          if (stats.current.boomLeft > 0) stats.current.boomLeft -= 1;
          if (bubble.tone === 'bull') {
            const gain = Math.round((12 + stats.current.streak * 3) * multiplier);
            stats.current.bank += gain;
            stats.current.streak += 1;
            stats.current.wins += 1;
            burst(bubble.x, bubble.y, tone.bull, `+${gain}`);
            sfx.coin();
          } else if (bubble.tone === 'risk') {
            if (Math.random() < 0.42) {
              const gain = Math.round((34 + stats.current.streak * 5) * multiplier);
              stats.current.bank += gain;
              stats.current.wins += 1;
              stats.current.streak += 1;
              burst(bubble.x, bubble.y, tone.risk, `SPIKE +${gain}`);
              sfx.perfect();
            } else {
              const loss = Math.round(18 * multiplier);
              stats.current.bank = Math.max(0, stats.current.bank - loss);
              stats.current.streak = 0;
              stats.current.losses += 1;
              burst(bubble.x, bubble.y, tone.crash, `−${loss}`);
              sfx.bad();
            }
          } else {
            stats.current.streak = 0;
            stats.current.crashesAvoided += 1;
            burst(bubble.x, bubble.y, tone.crash, 'AVOIDED');
            sfx.good();
          }
          ema = ema * 0.9 + stats.current.bank * 0.1;
          setHud(value => ({
            ...value,
            bank: stats.current.bank,
            streak: stats.current.streak,
            boom: stats.current.boomLeft > 0,
            heat: Math.min(100, stats.current.bank / 6),
          }));
          return;
        }
      }
      stats.current.streak = 0;
      setHud(value => ({ ...value, streak: 0 }));
    };

    const onClick = (event: MouseEvent) => tap(event.clientX, event.clientY);
    element.addEventListener('pointerdown', onClick);

    let boomAt = 20;
    let clockAt = 0;

    const loop = (now: number) => {
      if (!running) return;
      const delta = Math.min(0.05, (now - last) / 1000);
      last = now;
      elapsed += delta;
      spawnAt -= delta;
      clockAt += delta;
      if (spawnAt <= 0) {
        spawn();
        spawnAt = Math.max(0.22, 0.62 - elapsed * 0.004);
      }
      if (elapsed > boomAt) {
        stats.current.boomLeft = 3;
        boomAt += 20;
        sfx.reward();
      }
      if (clockAt >= 1) {
        clockAt = 0;
        setHud(value => ({ ...value, seconds: Math.max(0, 90 - Math.round(elapsed)), boom: stats.current.boomLeft > 0 }));
        if (elapsed >= 90) {
          running = false;
          const bank = stats.current.bank;
          const profit = Math.max(0, bank - 100);
          sfx.reward();
          onFinish({
            credits: Math.round(profit * 1.6),
            liberals: 3 + Math.floor(profit / 220),
            won: profit > 120,
            score: bank,
            title: `Stock Surge · ${bank} banked`,
            message: `${stats.current.wins} good calls, ${stats.current.losses} bad ones, ${stats.current.crashesAvoided} crashes dodged. Profit ${profit} → ${Math.round(profit * 1.6)} Credits.`,
            meta: { bestStockSurge: profit },
          });
        }
      }

      // draw
      ctx.clearRect(0, 0, width(), height());
      const gradient = ctx.createLinearGradient(0, 0, 0, height());
      gradient.addColorStop(0, 'rgba(255,107,0,.10)');
      gradient.addColorStop(1, 'rgba(0,230,118,.06)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width(), height());

      // market line
      ctx.strokeStyle = 'rgba(255,246,233,.35)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      const lineY = height() - 40 - Math.min(height() * 0.5, stats.current.bank / 3.6);
      ctx.moveTo(0, lineY);
      for (let x = 0; x <= width(); x += 24) {
        ctx.lineTo(x, lineY + Math.sin((x + elapsed * 40) / 46) * 8);
      }
      ctx.stroke();

      for (let index = bubbles.length - 1; index >= 0; index -= 1) {
        const bubble = bubbles[index];
        bubble.x += bubble.vx * delta;
        bubble.y += bubble.vy * delta;
        bubble.life -= delta;
        if (bubble.life <= 0 || bubble.y < -60) {
          bubbles.splice(index, 1);
          continue;
        }
        const gradientTone = ctx.createRadialGradient(bubble.x - bubble.r * 0.3, bubble.y - bubble.r * 0.4, 4, bubble.x, bubble.y, bubble.r);
        gradientTone.addColorStop(0, 'rgba(255,255,255,.85)');
        gradientTone.addColorStop(0.35, tone[bubble.tone]);
        gradientTone.addColorStop(1, 'rgba(7,10,24,.15)');
        ctx.fillStyle = gradientTone;
        ctx.beginPath();
        ctx.arc(bubble.x, bubble.y + Math.sin((elapsed + bubble.id) * 2) * 4, bubble.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = bubble.tone === 'crash' ? 'rgba(255,47,185,.9)' : 'rgba(255,246,233,.65)';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = '#070a18';
        ctx.font = 'bold 11px ui-monospace, monospace';
        ctx.textAlign = 'center';
        ctx.fillText(bubble.tone === 'bull' ? 'BUY' : bubble.tone === 'risk' ? 'RISK' : 'CRASH', bubble.x, bubble.y - 2);
        ctx.fillStyle = 'rgba(7,10,24,.75)';
        ctx.fillText(bubble.symbol, bubble.x, bubble.y + 12);
      }

      for (let index = particles.length - 1; index >= 0; index -= 1) {
        const particle = particles[index];
        particle.life -= delta;
        particle.x += particle.vx * delta;
        particle.y += particle.vy * delta;
        if (particle.life <= 0) {
          particles.splice(index, 1);
          continue;
        }
        ctx.globalAlpha = Math.max(0, particle.life);
        if (particle.text) {
          ctx.fillStyle = particle.tone;
          ctx.font = 'bold 16px ui-monospace, monospace';
          ctx.fillText(particle.text, particle.x, particle.y);
        } else {
          ctx.fillStyle = particle.tone;
          ctx.beginPath();
          ctx.arc(particle.x, particle.y, 3, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }

      ctx.strokeStyle = 'rgba(255,246,233,.9)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, height() - 26);
      for (let x = 0; x <= width(); x += 12) {
        const value = ema / 3 + Math.sin((x + elapsed * 90) / 30) * 6;
        ctx.lineTo(x, height() - 26 - Math.min(height() - 60, value));
      }
      ctx.stroke();

      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);

    return () => {
      running = false;
      cancelAnimationFrame(frame);
      element.removeEventListener('pointerdown', onClick);
      window.removeEventListener('resize', resize);
    };
  }, [onFinish, tone]);

  return (
    <div className="relative w-full overflow-hidden rounded-3xl border border-lime-500/40 bg-navy-900">
      <div className="pointer-events-none absolute left-3 top-3 z-10 flex flex-wrap gap-1.5">
        <span className="chip chip-flame">BANK {hud.bank}</span>
        <span className="chip chip-lime">STREAK {hud.streak}</span>
        <span className="chip">⏱ {hud.seconds}s</span>
        {hud.boom && <span className="chip chip-flame">MARKET BOOM ×2</span>}
      </div>
      <div className="pointer-events-none absolute right-3 top-3 z-10">
        <span className="chip">HEAT</span>
      </div>
      <canvas ref={canvas} className="h-[62vh] max-h-[560px] min-h-[380px] w-full touch-none" />
      <div className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap font-mono text-[10px] tracking-[0.18em] text-white/45">
        TAP ORANGE = TREND · TAP GREEN = RISK · IGNORE MAGENTA CRASH BUBBLES
      </div>
    </div>
  );
}
