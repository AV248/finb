'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useFinb } from '@/lib/appCtx';
import { CARD_TIERS } from '@/lib/catalog';
import { ECONOMY, formatCredits } from '@/lib/economy';
import { Mascot, MascotBubble } from './Mascot';
import { Badge, Meter, Panel } from './ui';
import { sfx } from '@/lib/audio';

interface Step {
  id: string;
  title: string;
  line: string;
  body: string;
  reward: { credits?: number; liberals?: number };
  mood: 'happy' | 'wow' | 'cheer' | 'think';
  action?: 'card' | 'game' | 'friends' | 'liberals';
}

const STEPS: Step[] = [
  {
    id: 'welcome',
    title: 'Welcome to the vault',
    line: 'I’m Penny. I guard the fake money.',
    body: 'FINB — Fake International Bank — is a game-bank that lives on this device. Credits are for playing. Liberals are for showing off. Nothing here is real money, and nothing here can be spent outside the app.',
    reward: { credits: 40 },
    mood: 'happy',
  },
  {
    id: 'card',
    title: 'Meet your card',
    line: 'Every member gets a fictional card. Yours is already minted.',
    body: 'Reveal it, copy the numbers, freeze it, even reissue it — all game controls. It has no issuer and no network, so it will never work at a real checkout. Which is exactly the point.',
    reward: { credits: 30, liberals: 2 },
    mood: 'wow',
    action: 'card',
  },
  {
    id: 'game',
    title: 'First run: Vault Rush',
    line: 'One corridor, endless Credits, zero brakes.',
    body: 'Steer the glowing vault door, hoover up Credits, and thread the orange Risk Zones for a 3× payout. Chain wins across different games afterwards to raise your combo multiplier.',
    reward: { credits: 25 },
    mood: 'cheer',
    action: 'game',
  },
  {
    id: 'friends',
    title: 'Bring someone loud',
    line: 'Friends make everything better — and slightly more chaotic.',
    body: 'Add a member by username, send Credits instantly without ever sharing a card number, fire off a challenge, or open a private room for up to 13 players.',
    reward: { credits: 20, liberals: 2 },
    mood: 'happy',
    action: 'friends',
  },
  {
    id: 'liberals',
    title: 'Grow your Liberals',
    line: 'The green stuff. Earned, never bought.',
    body: 'Liberals come from playing, exploring, gardening and being a good human in multiplayer. They build your level, unlock FINBPlatinum, and make your card look suspiciously premium.',
    reward: { liberals: 6 },
    mood: 'think',
    action: 'liberals',
  },
  {
    id: 'ready',
    title: 'The floor is yours',
    line: 'Guide complete. Take the welcome bundle.',
    body: `Daily login pays ${formatCredits(ECONOMY.dailyBase)} Credits with streak bonuses at 7, 14, 30 and 60 days. Referrals pay you ${ECONOMY.referralReferrer} and your linked friend ${ECONOMY.referralJoiner}. Seasons rotate every 14 days with double-Credit weekends.`,
    reward: { credits: 35, liberals: 2 },
    mood: 'cheer',
  },
];

export function Onboarding({ onClose }: { onClose?: () => void }) {
  const api = useFinb();
  const [index, setIndex] = useState(0);
  const step = STEPS[index];
  const progress = ((index + 1) / STEPS.length) * 100;

  useEffect(() => {
    sfx.tap();
  }, [index]);

  const advance = (skip = false) => {
    if (step.reward.credits || step.reward.liberals) {
      api.setOnboardingStep(index + 1, { credits: step.reward.credits, liberals: step.reward.liberals, id: step.id });
    }
    sfx.good();
    if (skip || index === STEPS.length - 1) {
      api.finishOnboarding();
      api.celebrate();
      onClose?.();
      return;
    }
    setIndex(value => value + 1);
  };

  const jump = (action: Step['action']) => {
    if (action === 'card') api.navigate('card');
    if (action === 'friends') api.navigate('friends');
    if (action === 'liberals') api.navigate('rewards');
    if (action === 'game') api.openGame('vault-rush');
  };

  return (
    <div className="fixed inset-0 z-[170] grid place-items-center overflow-y-auto bg-[radial-gradient(circle_at_50%_20%,rgba(255,107,0,.22),rgba(7,10,24,.96)_60%)] p-3 backdrop-blur-xl sm:p-6">
      <Panel glow="lime" className="w-full max-w-4xl overflow-hidden p-0">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <div className="flex items-center gap-2">
            <Badge tone="flame">FIRST VISIT GUIDE</Badge>
            <Badge tone="lime">{`STEP ${index + 1} / ${STEPS.length}`}</Badge>
          </div>
          <button onClick={() => advance(true)} className="font-mono text-[10px] tracking-[0.2em] text-white/50 underline hover:text-lime-300">
            SKIP GUIDE
          </button>
        </div>

        <div className="grid gap-5 p-4 sm:p-6 md:grid-cols-[210px_1fr]">
          <div className="flex flex-col items-center gap-3">
            <Mascot mood={step.mood} wave={step.mood === 'cheer'} size={150} />
            <MascotBubble tone={index % 2 ? 'lime' : 'flame'}>{step.line}</MascotBubble>
            <div className="w-full">
              <div className="label mb-1">GUIDE PROGRESS</div>
              <Meter value={progress} max={100} />
            </div>
            <div className="flex flex-wrap justify-center gap-1.5">
              {STEPS.map((item, position) => (
                <span
                  key={item.id}
                  className={`h-2 w-2 rounded-full ${position < index ? 'bg-lime-500' : position === index ? 'bg-flame-500' : 'bg-white/20'}`}
                />
              ))}
            </div>
          </div>

          <div className="flex flex-col">
            <AnimatePresence mode="wait">
              <motion.div key={step.id} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex-1">
                <div className="label text-flame-400">{`STEP ${index + 1} · ${step.id.toUpperCase()}`}</div>
                <h2 className="mt-1 text-2xl text-cream-100 sm:text-3xl">{step.title}</h2>
                <p className="mt-3 text-sm leading-relaxed text-white/70">{step.body}</p>

                {step.action === 'card' && (
                  <div className="mt-4 grid gap-2 sm:grid-cols-3">
                    {CARD_TIERS.slice(0, 3).map(tier => (
                      <div key={tier.id} className="jelly-flat p-3">
                        <div className="font-mono text-[11px] text-lime-300">{tier.name}</div>
                        <div className="mt-1 text-[11px] text-white/55">{tier.requirement}</div>
                      </div>
                    ))}
                  </div>
                )}
                {step.action === 'liberals' && (
                  <div className="mt-4 grid gap-2 sm:grid-cols-3">
                    {[
                      { icon: '🌱', label: 'Garden', copy: 'Harvest crystals on a timer.' },
                      { icon: '🎯', label: 'Perfect strikes', copy: 'Green-window forge hits chain LP.' },
                      { icon: '🤝', label: 'Social play', copy: 'Rooms, tips and challenges pay LP.' },
                    ].map(item => (
                      <div key={item.label} className="jelly-flat p-3">
                        <div className="text-lg">{item.icon}</div>
                        <div className="mt-1 text-xs font-semibold text-cream-100">{item.label}</div>
                        <div className="text-[11px] text-white/55">{item.copy}</div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-4">
              <div className="flex flex-wrap items-center gap-2">
                {(step.reward.credits || step.reward.liberals) && (
                  <span className="chip chip-flame">
                    <span>🎁</span>
                    {step.reward.credits ? `+${step.reward.credits} CR` : ''} {step.reward.liberals ? `+${step.reward.liberals} LP` : ''}
                  </span>
                )}
                {step.action && (
                  <button className="btn btn-ghost text-xs" onClick={() => jump(step.action)}>
                    Open it now
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                {index > 0 && (
                  <button className="btn btn-ghost text-xs" onClick={() => setIndex(value => value - 1)}>
                    Back
                  </button>
                )}
                <button className="btn btn-duo" onClick={() => advance(false)}>
                  {index === STEPS.length - 1 ? 'Finish — claim bundle' : 'Next step'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </Panel>
    </div>
  );
}
