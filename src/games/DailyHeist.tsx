'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { sfx } from '@/lib/audio';
import type { SoloGameProps } from './VaultRush';

const GRID = 7;
const LOADOUTS = [
  { id: 'ghost', name: 'Ghost Kit', blurb: 'Quiet boots. Guards see 1 tile less.', cost: 0, emoji: '🥷' },
  { id: 'drill', name: 'Silent Drill', blurb: 'Crack the vault with one fewer tap.', cost: 40, emoji: '🛠️' },
  { id: 'gadget', name: 'Jammer', blurb: 'Freezes one guard per floor.', cost: 60, emoji: '📡' },
];

interface Occupant {
  id: string;
  kind: 'guard' | 'dog' | 'camera' | 'loot' | 'exit' | 'vault';
  x: number;
  y: number;
  frozen: number;
  patrol?: { dx: number; dy: number };
}

/** Deterministic per-day floor so everyone gets the same layout for the day. */
function buildFloor(seed: number): Occupant[] {
  const random = (() => {
    let value = seed % 2147483647 || 12345;
    return () => {
      value = (value * 16807) % 2147483647;
      return (value - 1) / 2147483646;
    };
  })();
  const occupants: Occupant[] = [];
  const free = new Set<string>();
  for (let x = 0; x < GRID; x += 1) for (let y = 0; y < GRID; y += 1) free.add(`${x},${y}`);

  const take = (): { x: number; y: number } => {
    const options = [...free];
    const pick = options[Math.floor(random() * options.length)];
    free.delete(pick);
    const [x, y] = pick.split(',').map(Number);
    return { x, y };
  };

  const lootCount = 4;
  for (let index = 0; index < lootCount; index += 1) {
    const spot = take();
    occupants.push({ id: `loot-${index}`, kind: 'loot', x: spot.x, y: spot.y, frozen: 0 });
  }
  const guardCount = 4 + Math.floor(random() * 3);
  for (let index = 0; index < guardCount; index += 1) {
    const spot = take();
    occupants.push({
      id: `guard-${index}`,
      kind: random() < 0.3 ? 'dog' : random() < 0.5 ? 'camera' : 'guard',
      x: spot.x,
      y: spot.y,
      frozen: 0,
      patrol: random() < 0.6 ? { dx: random() < 0.5 ? 1 : -1, dy: 0 } : undefined,
    });
  }
  const vaultSpot = take();
  occupants.push({ id: 'vault', kind: 'vault', x: vaultSpot.x, y: vaultSpot.y, frozen: 0 });
  occupants.push({ id: 'exit', kind: 'exit', x: 0, y: GRID - 1, frozen: 0 });
  return occupants;
}

const KIND_ART: Record<Occupant['kind'], string> = { guard: '🕴️', dog: '🐕', camera: '📹', loot: '💎', exit: '🚪', vault: '🔐' };

export function DailyHeist({ onFinish, onToast }: SoloGameProps) {
  const daySeed = useMemo(() => {
    const key = new Date().toISOString().slice(0, 10);
    return [...key].reduce((acc, char) => acc * 33 + char.charCodeAt(0), 7);
  }, []);
  const [phase, setPhase] = useState<'brief' | 'run' | 'done'>('brief');
  const [loadout, setLoadout] = useState('ghost');
  const [step, setStep] = useState(0);
  const [moves, setMoves] = useState(0);
  const [noise, setNoise] = useState(0);
  const [bag, setBag] = useState(0);
  const [hasVault, setHasVault] = useState(false);
  const [position, setPosition] = useState({ x: GRID - 1, y: GRID - 1 });
  const [occupants, setOccupants] = useState<Occupant[]>(() => buildFloor(daySeed));
  const [log, setLog] = useState<string[]>(['Floor plan loaded. Guards are on rotation.']);

  const vision = loadout === 'ghost' ? 2 : 3;

  const reset = useCallback(() => {
    setOccupants(buildFloor(daySeed));
    setPosition({ x: GRID - 1, y: GRID - 1 });
    setMoves(0);
    setNoise(0);
    setBag(0);
    setHasVault(false);
    setStep(0);
    setLog(['Floor plan loaded. Guards are on rotation.']);
  }, [daySeed]);

  useEffect(() => {
    if (phase !== 'run') return undefined;
    const interval = setInterval(() => {
      setOccupants(current =>
        current.map(occupant => {
          if (occupant.frozen > 0) return { ...occupant, frozen: occupant.frozen - 1 };
          if (!occupant.patrol || occupant.kind === 'camera') return occupant;
          const nextX = occupant.x + occupant.patrol.dx;
          if (nextX < 0 || nextX >= GRID) return { ...occupant, patrol: { ...occupant.patrol, dx: -occupant.patrol.dx } };
          return { ...occupant, x: nextX };
        }),
      );
    }, 1100);
    return () => clearInterval(interval);
  }, [phase]);

  useEffect(() => {
    if (phase !== 'run') return;
    const caught = occupants.find(
      occupant =>
        (occupant.kind === 'guard' || occupant.kind === 'dog' || occupant.kind === 'camera') &&
        occupant.frozen <= 0 &&
        Math.abs(occupant.x - position.x) + Math.abs(occupant.y - position.y) <= vision / 2,
    );
    if (caught && Math.random() < 0.65) {
      setNoise(value => value + 32);
      setLog(current => [`${KIND_ART[caught.kind]} Spotted by a ${caught.kind}! Alarm noise rising.`, ...current].slice(0, 6));
      sfx.bad();
      setOccupants(current => current.map(item => (item.id === caught.id ? { ...item, x: Math.max(0, item.x - 1) } : item)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [position, phase]);

  useEffect(() => {
    if (noise >= 100 && phase === 'run') {
      setLog(current => ['🚨 Alarm maxed. Extraction forced — bag dropped on the way out.', ...current]);
      sfx.boom();
      finishRun(0, true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noise, phase]);

  const move = (dx: number, dy: number) => {
    if (phase !== 'run') return;
    const x = Math.min(GRID - 1, Math.max(0, position.x + dx));
    const y = Math.min(GRID - 1, Math.max(0, position.y + dy));
    if (x === position.x && y === position.y) return;
    setPosition({ x, y });
    setMoves(value => value + 1);
    sfx.tap();
    const here = occupants.find(occupant => occupant.x === x && occupant.y === y && (occupant.kind === 'loot' || occupant.kind === 'vault' || occupant.kind === 'exit'));
    if (!here) return;
    if (here.kind === 'loot') {
      setOccupants(current => current.filter(item => item.id !== here.id));
      setBag(value => value + 90);
      setLog(current => ['💎 Loot secured. +90 bag value.', ...current].slice(0, 6));
      sfx.coin();
    }
    if (here.kind === 'vault') {
      const needed = loadout === 'drill' ? 2 : 3;
      const next = step + 1;
      setStep(next);
      setNoise(value => value + 6);
      if (next >= needed) {
        setHasVault(true);
        setBag(value => value + 200);
        setOccupants(current => current.filter(item => item.id !== here.id));
        setLog(current => ['🔐 Vault cracked. +200 bag value. Get to the exit!', ...current].slice(0, 6));
        sfx.perfect();
      } else {
        setLog(current => [`🔓 Dial turning… ${needed - next} more turns.`, ...current].slice(0, 6));
      }
    }
    if (here.kind === 'exit' && (bag > 0 || hasVault)) {
      finishRun(bag, false);
    }
  };

  const finishRun = (bagValue: number, caught: boolean) => {
    const stars = caught ? 1 : moves <= 14 ? 3 : moves <= 24 ? 2 : 1;
    const credits = Math.round(bagValue * (1 + stars * 0.15));
    const liberals = stars * 3 + (hasVault ? 4 : 0);
    setPhase('done');
    if (!caught) sfx.reward();
    onToast(caught ? 'The alarm cut your run short.' : `Extracted with ${bagValue} bag value.`, caught ? 'bad' : 'good', caught ? '🚨' : '🚪');
    onFinish({
      credits,
      liberals,
      won: !caught && bagValue > 0,
      score: bagValue,
      title: `Daily Heist · ${stars}★`,
      message: caught
        ? 'Caught on floor 12. The layout resets at midnight — the same code, a fresh plan.'
        : `Out clean in ${moves} moves with ${bagValue} bag value${hasVault ? ' and the vault cracked' : ''}. ${stars}-star job.`,
      meta: { heistStars: stars },
    });
  };

  const grid = Array.from({ length: GRID * GRID }, (_, index) => ({ x: index % GRID, y: Math.floor(index / GRID) }));

  return (
    <div className="space-y-3">
      {phase === 'brief' ? (
        <div className="space-y-3">
          <p className="text-xs text-white/65">
            Today’s floor is generated at midnight and identical for every player (seed {daySeed % 9999}). Pick a kit, stay quiet, and walk out with the bag.
          </p>
          <div className="grid gap-2 sm:grid-cols-3">
            {LOADOUTS.map(item => (
              <button
                key={item.id}
                onClick={() => setLoadout(item.id)}
                className={`jelly-flat p-3 text-left transition ${loadout === item.id ? 'neon-edge-lime' : 'opacity-75'}`}
              >
                <div className="text-xl">{item.emoji}</div>
                <b className="mt-1 block text-xs text-cream-100">{item.name}</b>
                <p className="mt-1 text-[11px] text-white/55">{item.blurb}</p>
              </button>
            ))}
          </div>
          <button className="btn btn-flame" onClick={() => { reset(); setPhase('run'); }}>
            🥷 Start the heist
          </button>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <span className="chip chip-flame">💎 BAG {bag}</span>
            <span className="chip chip-lime">MOVES {moves}</span>
            <span className={`chip ${noise > 60 ? 'chip-flame' : ''}`}>🔊 NOISE {Math.round(noise)}%</span>
            <span className="chip">{hasVault ? 'VAULT CRACKED' : `DIAL ${step}`}</span>
            <button className="btn btn-ghost !px-3 !py-1.5 text-[11px]" onClick={reset}>
              Reset floor
            </button>
          </div>

          <div className="mx-auto grid aspect-square w-full max-w-[440px] grid-cols-7 gap-1 rounded-3xl border border-flame-500/30 bg-navy-900/70 p-2">
            {grid.map(cell => {
              const here = occupants.find(occupant => occupant.x === cell.x && occupant.y === cell.y);
              const isYou = position.x === cell.x && position.y === cell.y;
              const distance = Math.abs(position.x - cell.x) + Math.abs(position.y - cell.y);
              const lit = distance <= vision;
              return (
                <motion.button
                  key={`${cell.x}-${cell.y}`}
                  onClick={() => {
                    const dx = Math.sign(cell.x - position.x);
                    const dy = Math.sign(cell.y - position.y);
                    if (Math.abs(cell.x - position.x) + Math.abs(cell.y - position.y) === 1) move(dx, dy);
                  }}
                  className={`grid place-items-center rounded-lg border text-lg transition ${
                    isYou ? 'border-lime-400 bg-lime-500/25' : lit ? 'border-white/12 bg-white/6' : 'border-white/6 bg-white/2'
                  }`}
                >
                  <span>{isYou ? '🥷' : here && lit ? KIND_ART[here.kind] : here && !lit ? '·' : ''}</span>
                </motion.button>
              );
            })}
          </div>

          <div className="flex items-center justify-center gap-2">
            <button className="btn btn-ghost !px-4" onClick={() => move(0, -1)}>
              ↑
            </button>
            <button className="btn btn-ghost !px-4" onClick={() => move(-1, 0)}>
              ←
            </button>
            <button className="btn btn-ghost !px-4" onClick={() => move(0, 1)}>
              ↓
            </button>
            <button className="btn btn-ghost !px-4" onClick={() => move(1, 0)}>
              →
            </button>
            <button className="btn btn-lime" onClick={() => finishRun(bag, false)} disabled={bag === 0}>
              Extract now
            </button>
          </div>

          <div className="jelly-flat max-h-28 space-y-1 overflow-y-auto p-3 scrollbar-none">
            {log.map((line, index) => (
              <div key={`${line}-${index}`} className="text-[11px] text-white/65">
                {line}
              </div>
            ))}
          </div>
          <p className="text-[11px] text-white/45">
            Guards patrol each second; cameras never move but see further. Reach 🚪 with a full bag to extract. Noise above 100% forces an early exit.
          </p>
        </>
      )}
    </div>
  );
}
