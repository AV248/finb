'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { sfx } from '@/lib/audio';
import type { SoloGameProps } from './VaultRush';

type PlantId = 'ember' | 'sprout' | 'glass' | 'mythic';

interface Plant {
  id: PlantId;
  name: string;
  emoji: string;
  growMs: number;
  lp: number;
  credits: number;
  cost: number;
}

const PLANTS: Plant[] = [
  { id: 'ember', name: 'Ember Bloom', emoji: '🌺', growMs: 9000, lp: 4, credits: 30, cost: 0 },
  { id: 'sprout', name: 'Sprout Crystal', emoji: '🌱', growMs: 15000, lp: 8, credits: 70, cost: 40 },
  { id: 'glass', name: 'Glass Orchid', emoji: '🪻', growMs: 24000, lp: 15, credits: 150, cost: 120 },
  { id: 'mythic', name: 'Series Lotus', emoji: '🪷', growMs: 36000, lp: 26, credits: 300, cost: 260 },
];

interface Slot {
  index: number;
  plant: Plant | null;
  plantedAt: number;
  watered: boolean;
  pest: boolean;
  weather: 'clear' | 'rain' | 'sun';
}

const WEATHER: Slot['weather'][] = ['clear', 'rain', 'sun'];

export function LiberalsGarden({ onFinish, onToast }: SoloGameProps) {
  const [slots, setSlots] = useState<Slot[]>(() =>
    Array.from({ length: 6 }, (_, index) => ({ index, plant: null, plantedAt: 0, watered: false, pest: false, weather: 'clear' })),
  );
  const [lp, setLp] = useState(0);
  const [credits, setCredits] = useState(0);
  const [selected, setSelected] = useState<'ember' | 'sprout' | 'glass' | 'mythic'>('ember');
  const [tick, setTick] = useState(0);
  const [harvests, setHarvests] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setTick(value => value + 1);
      setSlots(current =>
        current.map(slot => {
          if (!slot.plant) return slot;
          const weather = Math.random() < 0.08 ? WEATHER[Math.floor(Math.random() * WEATHER.length)] : slot.weather;
          const pest = Math.random() < 0.05 ? true : slot.pest;
          return { ...slot, weather, pest };
        }),
      );
    }, 2600);
    return () => clearInterval(interval);
  }, []);

  const growth = (slot: Slot) => {
    if (!slot.plant) return 0;
    const elapsed = Date.now() - slot.plantedAt;
    const speed = (slot.watered ? 1.35 : 1) * (slot.weather === 'rain' ? 1.2 : slot.weather === 'sun' ? 1.1 : 1) * (slot.pest ? 0.55 : 1);
    return Math.min(1, (elapsed * speed) / slot.plant.growMs);
  };

  const plant = (index: number) => {
    const plant = PLANTS.find(item => item.id === selected);
    if (!plant) return;
    if (plant.cost > credits) {
      onToast(`${plant.name} needs ${plant.cost} forged Credits. Harvest something first.`, 'bad');
      return;
    }
    setCredits(value => value - plant.cost);
    setSlots(current => current.map(slot => (slot.index === index ? { ...slot, plant, plantedAt: Date.now(), watered: false, pest: false, weather: 'clear' } : slot)));
    sfx.tap();
  };

  const water = (index: number) => {
    setSlots(current => current.map(slot => (slot.index === index ? { ...slot, watered: true } : slot)));
    sfx.coin();
  };

  const clearPest = (index: number) => {
    setSlots(current => current.map(slot => (slot.index === index ? { ...slot, pest: false } : slot)));
    sfx.good();
  };

  const harvest = (index: number) => {
    const slot = slots.find(item => item.index === index);
    if (!slot?.plant || growth(slot) < 1) return;
    const bonus = slot.watered ? 1.25 : 1;
    const earnedLp = Math.round(slot.plant.lp * bonus);
    setLp(value => value + earnedLp);
    setCredits(value => value + slot.plant!.credits);
    setHarvests(value => value + 1);
    setSlots(current => current.map(item => (item.index === index ? { ...item, plant: null, plantedAt: 0, watered: false, pest: false } : item)));
    sfx.perfect();
  };

  const ready = slots.filter(slot => slot.plant && growth(slot) >= 1).length;
  const summary = useMemo(
    () => `${slots.filter(slot => slot.plant).length} growing · ${ready} ready · ${harvests} harvested`,
    [slots, ready, harvests],
  );

  const bank = () => {
    const payout = Math.round(credits * 1.1);
    onFinish({
      credits: payout,
      liberals: lp + 2,
      won: harvests >= 3,
      score: lp,
      title: `Liberals Garden · ${harvests} harvests`,
      message: `${lp} Liberals grown and ${payout} Credits banked from the greenhouse. Watered plants pay 25% more.`,
      meta: {},
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="chip chip-lime">🌿 LP {lp}</span>
        <span className="chip chip-flame">¢ FORGED {credits}</span>
        <span className="chip">HARVESTS {harvests}</span>
        <span className="chip">TICK {tick}</span>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {slots.map(slot => {
          const progress = growth(slot);
          const isReady = progress >= 1;
          return (
            <motion.div
              key={slot.index}
              className={`jelly-flat relative overflow-hidden p-3 ${isReady ? 'neon-edge-lime' : ''}`}
              animate={slot.plant ? { y: [0, -2, 0] } : { y: 0 }}
              transition={{ duration: 4 + slot.index * 0.3, repeat: Infinity }}
            >
              <div className="flex items-center justify-between">
                <span className="text-2xl">{slot.plant ? slot.plant.emoji : '🟫'}</span>
                <div className="flex gap-1">
                  {slot.pest && <span className="text-xs">🐛</span>}
                  {slot.weather === 'rain' && <span className="text-xs">🌧️</span>}
                  {slot.weather === 'sun' && <span className="text-xs">☀️</span>}
                  {slot.watered && <span className="text-xs">💧</span>}
                </div>
              </div>
              <b className="mt-1 block truncate text-xs text-cream-100">{slot.plant ? slot.plant.name : 'Empty bed'}</b>
              <div className="meter mt-1 h-1.5">
                <i style={{ width: `${Math.round(progress * 100)}%` }} />
              </div>
              <div className="mt-1 flex items-center justify-between text-[10px] text-white/50">
                <span>{Math.round(progress * 100)}%</span>
                {slot.plant && <span>+{slot.plant.lp} LP</span>}
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {!slot.plant && (
                  <button className="btn btn-ghost !px-2 !py-1 text-[10px]" onClick={() => plant(slot.index)}>
                    Plant
                  </button>
                )}
                {slot.plant && !slot.watered && !isReady && (
                  <button className="btn btn-ghost-lime !px-2 !py-1 text-[10px]" onClick={() => water(slot.index)}>
                    Water 💧
                  </button>
                )}
                {slot.pest && (
                  <button className="btn btn-ghost !px-2 !py-1 text-[10px]" onClick={() => clearPest(slot.index)}>
                    Clear pest 🐛
                  </button>
                )}
                {isReady && (
                  <button className="btn btn-lime !px-2 !py-1 text-[10px]" onClick={() => harvest(slot.index)}>
                    Harvest ✦
                  </button>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="jelly-flat flex flex-wrap items-center justify-between gap-3 p-3">
        <div className="flex flex-wrap gap-1.5">
          {PLANTS.map(item => (
            <button
              key={item.id}
              onClick={() => setSelected(item.id)}
              className={`chip ${selected === item.id ? 'chip-lime' : ''}`}
              title={`${item.growMs / 1000}s · +${item.lp} LP · ${item.cost} cr`}
            >
              {item.emoji} {item.name} · {item.cost} cr
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-white/50">{summary}</span>
          <button className="btn btn-duo" onClick={bank} disabled={lp + credits === 0}>
            Bank the harvest
          </button>
        </div>
      </div>
      <p className="text-[11px] text-white/45">
        Growth continues while this screen is open. Rain speeds growth, sun adds a small bonus, pests halve it until cleared. Banking converts {credits} forged
        Credits at 1.1× and adds {lp} Liberals to your profile.
      </p>
    </div>
  );
}
