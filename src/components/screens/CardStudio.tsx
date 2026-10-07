'use client';

import { useState } from 'react';
import { useFinb } from '@/lib/appCtx';
import { BankCard } from '../BankCard';
import { CARD_COSMETICS, CARD_TIERS, PLATINUM_LIBERAL_REQUIREMENT } from '@/lib/catalog';
import { formatCredits, guestDaysLeft, topTen } from '@/lib/economy';
import { tierProgress } from '@/lib/store';
import { Badge, Icon, Meter, Panel, ScreenHeader, SectionTitle } from '../ui';

export function CardStudioScreen() {
  const api = useFinb();
  const { user, db } = api;
  const [revealed, setRevealed] = useState(false);
  const [code, setCode] = useState('');
  const progress = tierProgress(user);
  const liveTopTen = topTen(db.players, db.currentId);
  const inTopTen = liveTopTen.some(row => row.id === user.id);
  const days = guestDaysLeft(user);

  const copy = async (label: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      api.toast(`${label} copied.` , 'good', '📋');
    } catch {
      api.toast('Clipboard blocked by the browser — reveal and copy manually.', 'bad');
    }
  };

  return (
    <div className="space-y-5">
      <ScreenHeader
        eyebrow="CARD STUDIO · PLATINUM EDITION"
        title={<>It looks the <span className="aberrate">part</span></>}
        sub="A unique fictional card with reveal, freeze and reissue controls. No issuer, no network, no real payments — ever."
        right={<Badge tone="flame">NOT A PAYMENT CARD</Badge>}
      />

      <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
        <Panel glow="flame" className="p-5">
          <BankCard player={user} revealed={revealed} onReveal={() => { setRevealed(value => !value); }} />
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button className="btn btn-flame" onClick={() => setRevealed(value => !value)}>
              {revealed ? 'Hide details' : 'Reveal details'}
            </button>
            <button className={`btn ${user.card.frozen ? 'btn-lime' : 'btn-ghost'}`} onClick={api.toggleFreeze}>
              {user.card.frozen ? 'Unfreeze in game' : 'Freeze in game'}
            </button>
            <button className="btn btn-ghost-lime" onClick={api.reissueCard}>
              Reissue credentials
            </button>
          </div>
          <p className="mt-3 text-[11px] text-white/45">
            “Freeze” is a game-state toggle: it changes how the card renders and how it is described in your ledger. It has no relationship to a real
            card network, and copy actions are disabled until you reveal.
          </p>
        </Panel>

        <div className="space-y-4">
          <Panel className="p-4">
            <SectionTitle kicker="TIER LADDER" title={CARD_TIERS.find(tier => tier.id === user.card.tier)?.name ?? 'FINBRegular'} sub={CARD_TIERS.find(tier => tier.id === user.card.tier)?.blurb} />
            <Meter value={progress.percent} max={100} />
            <div className="mt-1 flex items-center justify-between text-[11px] text-white/55">
              <span>NEXT: {progress.next}</span>
              <span>{progress.percent}%</span>
            </div>
            <div className="mt-3 space-y-1.5">
              {CARD_TIERS.map(tier => {
                const active = tier.id === user.card.tier;
                const unlocked =
                  tier.id === 'regular' ||
                  (tier.id === 'bass' && user.credits >= 1300) ||
                  (tier.id === 'gold' && user.credits >= 100000) ||
                  (tier.id === 'me' && inTopTen) ||
                  (tier.id === 'platinum' && user.liberals >= PLATINUM_LIBERAL_REQUIREMENT) ||
                  (tier.id === 'series' && user.seriesGranted);
                return (
                  <div key={tier.id} className={`jelly-flat flex items-center gap-3 p-2.5 ${active ? 'neon-edge-lime' : ''}`}>
                    <span className="h-7 w-11 flex-none rounded-md border border-white/20" style={{ background: tier.gradient }} />
                    <div className="min-w-0 flex-1">
                      <b className="block truncate font-mono text-[11px] text-cream-100">{tier.name}</b>
                      <span className="text-[10px] text-white/50">{tier.requirement}</span>
                    </div>
                    <span className={`font-mono text-[10px] ${unlocked ? 'text-lime-300' : 'text-white/35'}`}>{active ? 'ACTIVE' : unlocked ? 'ELIGIBLE' : 'LOCKED'}</span>
                  </div>
                );
              })}
            </div>
            {inTopTen && <p className="mt-2 text-[11px] text-lime-300">You currently hold a live top-10 seat — FINBMe is personalised to you while it lasts.</p>}
          </Panel>

          <Panel className="p-4">
            <SectionTitle kicker="CREDENTIALS" title="The numbers, readable" sub="Copy is only enabled after reveal." />
            <div className="space-y-2">
              {[
                { label: 'CARD NUMBER', value: revealed ? user.card.number : `•••• •••• •••• ${user.card.number.replace(/\D/g, '').slice(-4)}` },
                { label: 'CVV', value: revealed ? user.card.cvv : '•••' },
                { label: 'EXPIRY', value: revealed ? user.card.expiry : '••/••' },
                { label: 'SERIAL', value: user.card.serial },
                { label: 'HOLDER', value: user.card.holder },
              ].map(item => (
                <div key={item.label} className="jelly-flat flex items-center justify-between gap-3 px-3 py-2">
                  <span className="label">{item.label}</span>
                  <div className="flex items-center gap-2">
                    <b className="font-mono text-xs text-cream-100">{item.value}</b>
                    <button
                      className="rounded-full border border-white/12 px-2 py-1 font-mono text-[10px] text-white/60 hover:border-lime-500/50 hover:text-lime-300 disabled:opacity-40"
                      disabled={!revealed && item.label !== 'SERIAL' && item.label !== 'HOLDER'}
                      onClick={() => copy(item.label.toLowerCase(), item.value)}
                    >
                      COPY
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel className="p-4">
          <SectionTitle kicker="COSMETICS" title="Card overlays" sub="Unlocked by playing, never purchased." />
          <div className="grid gap-2 sm:grid-cols-2">
            {CARD_COSMETICS.map(item => {
              const owned = user.cosmetics.includes(item.id);
              return (
                <div key={item.id} className={`jelly-flat flex items-center gap-3 p-3 ${owned ? 'neon-edge-lime' : 'opacity-65'}`}>
                  <span className="h-9 w-9 flex-none rounded-lg border border-white/20" style={{ background: item.css }} />
                  <div className="min-w-0">
                    <b className="block truncate text-xs text-cream-100">{item.name}</b>
                    <span className="text-[10px] text-white/50">{owned ? 'Applied to your card' : item.unlock}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>

        <Panel className="p-4">
          <SectionTitle kicker="CODE CABINET" title="Highest authority, one code away" sub="The Code Cabinet is a coming-soon module, but Series grants already work." />
          <div className="flex gap-2">
            <input className="field font-mono" value={code} onChange={event => setCode(event.target.value.toUpperCase())} placeholder="FINB-XXXX-XXXX" />
            <button className="btn btn-duo" onClick={() => { api.redeemSeries(code); setCode(''); }}>
              Redeem
            </button>
          </div>
          <div className="mt-3 space-y-2 text-[11px] text-white/55">
            <p className="flex items-start gap-2">
              <Icon name="lock" className="mt-0.5 h-3.5 w-3.5 flex-none text-flame-400" />
              FINBSeries is the highest authority tier: special treatment, priority seating in rooms, and the loudest card on the floor.
            </p>
            <p className="flex items-start gap-2">
              <Icon name="spark" className="mt-0.5 h-3.5 w-3.5 flex-none text-lime-400" />
              FINBPlatinum unlocks automatically at {PLATINUM_LIBERAL_REQUIREMENT} Liberals. FINBMe follows the live top ten by Credits.
            </p>
            {days !== null && (
              <p className="flex items-start gap-2">
                <Icon name="shield" className="mt-0.5 h-3.5 w-3.5 flex-none text-cyanx-400" />
                Guest profile: {days} days until it expires. Link a Play Games tag to keep it forever and claim the {formatCredits(100)} Credit welcome award.
              </p>
            )}
          </div>
        </Panel>
      </div>
    </div>
  );
}
