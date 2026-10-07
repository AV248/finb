'use client';

import { useState } from 'react';
import { useFinb } from '@/lib/appCtx';
import { ACHIEVEMENTS, CARD_COSMETICS } from '@/lib/catalog';
import { ECONOMY, formatCredits, levelFor, localDayKey } from '@/lib/economy';
import { Badge, Icon, Meter, Panel, ScreenHeader, SectionTitle } from '../ui';

const MILESTONES = [
  { days: 7, bonus: 30, glyph: '◒' },
  { days: 14, bonus: 75, glyph: '✳' },
  { days: 30, bonus: 200, glyph: '◇' },
  { days: 60, bonus: 500, glyph: '✦' },
];

export function RewardsScreen() {
  const api = useFinb();
  const { user, db } = api;
  const [code, setCode] = useState('');
  const level = levelFor(user.liberals);
  const today = localDayKey();
  const claimed = user.lastDailyClaim === today;
  const earned = ACHIEVEMENTS.filter(item => user.achievements.includes(item.id));
  const season = db.season;

  return (
    <div className="space-y-5">
      <ScreenHeader
        eyebrow="REWARDS · LIBERALS HQ"
        title={<>The <span className="aberrate">green</span> side of the ledger</>}
        sub="Liberals are earned by playing, exploring and being a decent human in multiplayer. Never bought, never transferred."
        right={
          <div className="flex flex-wrap gap-2">
            <Badge tone="lime">LEVEL {level.level}</Badge>
            <Badge tone="flame">{formatCredits(user.liberals)} LP LIFETIME</Badge>
          </div>
        }
      />

      <Panel glow="lime" className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-[220px] flex-1">
            <div className="label text-lime-300">LIBERALS LEVEL</div>
            <div className="font-mono text-3xl text-cream-100">{level.level}</div>
            <Meter className="mt-2" value={level.into} max={level.span} />
            <div className="mt-1 text-[11px] text-white/50">
              {level.span - level.into} LP to level {level.level + 1} · level 2 unlocks the FINBPlatinum invitation at 25 LP
            </div>
          </div>
          <div className="grid flex-1 gap-2 sm:grid-cols-3">
            {[
              { icon: '🎮', label: 'From games', value: `${user.stats.gamesPlayed} rounds played` },
              { icon: '🌱', label: 'Garden', value: `${user.cosmetics.includes('sprout') ? 'Blooming' : 'Not planted yet'}` },
              { icon: '🤝', label: 'Social', value: `${user.friends.length} friends · ${user.stats.tipsGiven} tips` },
            ].map(item => (
              <div key={item.label} className="jelly-flat p-3">
                <div className="text-base">{item.icon}</div>
                <div className="label mt-1">{item.label}</div>
                <div className="text-[11px] text-cream-100">{item.value}</div>
              </div>
            ))}
          </div>
        </div>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <Panel className="p-4">
          <SectionTitle kicker="LOGIN STREAK" title="The daily appearance fee" sub="Paid to you, every local calendar day." />
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="font-mono text-2xl text-cream-100">DAY {user.streak}</div>
              <div className="text-[11px] text-white/55">{claimed ? 'Collected today. See you tomorrow.' : 'Ready to collect — 10 Credits plus milestones.'}</div>
            </div>
            <button className={`btn ${claimed ? 'btn-ghost' : 'btn-flame'}`} disabled={claimed} onClick={api.claimDaily}>
              {claimed ? 'Collected ✓' : 'Collect +10 cr'}
            </button>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {MILESTONES.map(item => {
              const reached = user.streak >= item.days;
              return (
                <div key={item.days} className={`jelly-flat p-3 text-center ${reached ? 'neon-edge-lime' : ''}`}>
                  <div className="text-lg text-lime-300">{item.glyph}</div>
                  <div className="mt-1 font-mono text-[10px] text-white/55">DAY {item.days}</div>
                  <div className="font-mono text-sm text-flame-300">+{item.bonus}</div>
                  <div className="mt-1 text-[10px] text-white/45">{reached ? 'reached' : `${item.days - user.streak} to go`}</div>
                </div>
              );
            })}
          </div>
        </Panel>

        <Panel className="p-4">
          <SectionTitle kicker="REFERRALS" title="Bring a friend, both get paid" sub={`You earn ${ECONOMY.referralReferrer} Credits; your linked friend earns ${ECONOMY.referralJoiner}.`} />
          <div className="jelly-flat flex items-center justify-between gap-3 p-3">
            <div>
              <div className="label">YOUR INVITE CODE</div>
              <b className="font-mono text-lg text-cream-100">{user.referralCode}</b>
            </div>
            <button className="btn btn-lime" onClick={() => api.toast(`Invite code ${user.referralCode} copied to your clipboard.`, 'good', '🧧')}>
              Copy code
            </button>
          </div>
          <div className="mt-3 flex gap-2">
            <input className="field" value={code} onChange={event => setCode(event.target.value.toUpperCase())} placeholder="FINB-XXXXXX" maxLength={20} />
            <button className="btn btn-flame" disabled={user.referralClaimed} onClick={() => { api.claimReferral(code); setCode(''); }}>
              {user.referralClaimed ? 'Claimed' : 'Claim'}
            </button>
          </div>
          <p className="mt-2 text-[11px] text-white/45">
            Claiming requires a linked profile and resolves against codes on this device (plus real invites when Supabase is configured).
          </p>
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel className="p-4">
          <SectionTitle kicker="ACHIEVEMENTS" title={`${earned.length} of ${ACHIEVEMENTS.length} earned`} />
          <div className="grid gap-2 sm:grid-cols-2">
            {ACHIEVEMENTS.map(item => {
              const has = user.achievements.includes(item.id);
              return (
                <div key={item.id} className={`jelly-flat flex items-center gap-3 p-3 ${has ? 'neon-edge-lime' : 'opacity-70'}`}>
                  <span className={`grid h-9 w-9 place-items-center rounded-full text-base ${has ? 'bg-lime-500/20' : 'bg-white/6'}`}>{item.glyph}</span>
                  <div className="min-w-0 flex-1">
                    <b className="block truncate text-xs text-cream-100">{item.name}</b>
                    <span className="text-[10px] text-white/50">{item.copy}</span>
                  </div>
                  <span className="font-mono text-[10px] text-lime-300">{has ? 'EARNED' : `+${item.liberals} LP`}</span>
                </div>
              );
            })}
          </div>
        </Panel>

        <div className="space-y-4">
          <Panel className="p-4">
            <SectionTitle kicker="SEASON STATUS" title={season?.name ?? 'Between seasons'} sub={season?.tagline} />
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="flame">×{season?.multiplier ?? 1.5} CREDIT MULTIPLIER</Badge>
              <Badge tone="lime">ENDS {season ? new Date(season.endsAt).toLocaleDateString() : '—'}</Badge>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {CARD_COSMETICS.map(item => (
                <div key={item.id} className={`jelly-flat flex items-center gap-3 p-3 ${user.cosmetics.includes(item.id) ? 'neon-edge-lime' : ''}`}>
                  <span className="h-8 w-8 flex-none rounded-lg border border-white/20" style={{ background: item.css }} />
                  <div className="min-w-0">
                    <b className="block truncate text-xs text-cream-100">{item.name}</b>
                    <span className="text-[10px] text-white/50">{user.cosmetics.includes(item.id) ? 'Unlocked' : item.unlock}</span>
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel className="p-4">
            <SectionTitle kicker="COMBO ENGINE" title="Chaining wins pays more" sub="Win in DIFFERENT games within six hours to raise the multiplier." />
            <div className="flex items-center justify-between">
              <div className="font-mono text-3xl text-flame-300">×{user.combo.multiplier.toFixed(2)}</div>
              <div className="text-right text-[11px] text-white/55">
                <div>STREAK {user.combo.streak}</div>
                <div>BEST {user.combo.best}</div>
                <div>CAP ×{ECONOMY.comboMax}</div>
              </div>
            </div>
            <Meter className="mt-3" value={user.combo.streak} max={20} />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {['vault-rush', 'stock-surge', 'credit-forge', 'daily-heist', 'liberals-garden'].map(id => (
                <button key={id} className="chip hover:border-flame-500/60" onClick={() => api.openGame(id)}>
                  {id.replace(/-/g, ' ')} ↗
                </button>
              ))}
            </div>
            <p className="mt-2 flex items-center gap-1.5 text-[11px] text-white/45">
              <Icon name="bolt" className="h-3.5 w-3.5 text-flame-400" /> Last game: {user.combo.lastGameId ?? 'none yet'}
            </p>
          </Panel>
        </div>
      </div>
    </div>
  );
}
