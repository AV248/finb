'use client';

import { motion } from 'framer-motion';
import { useFinb } from '@/lib/appCtx';
import { BankCard } from '../BankCard';
import { CARD_TIERS, STOCKS, TEASERS } from '@/lib/catalog';
import { formatCompact, formatCredits, localDayKey, stageLabel } from '@/lib/economy';
import { tierProgress } from '@/lib/store';
import { Badge, Meter, Panel, SectionTitle, StatPill } from '../ui';

function DailyCard() {
  const api = useFinb();
  const today = localDayKey();
  const claimed = api.user.lastDailyClaim === today;
  const nextMilestone = [7, 14, 30, 60].find(day => day > api.user.streak) ?? 60;
  const bonus = { 7: 30, 14: 75, 30: 200, 60: 500 }[nextMilestone as 7 | 14 | 30 | 60];
  return (
    <Panel glow={claimed ? 'lime' : 'flame'} className="flex flex-col gap-3 p-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="label text-flame-400">THE DAILY GOOD THING</div>
          <h3 className="mt-1 text-lg text-cream-100">{claimed ? `Day ${api.user.streak} banked` : 'A small reason to return'}</h3>
        </div>
        <span className={`grid h-12 w-12 place-items-center rounded-full border text-xl ${claimed ? 'border-lime-500/60 bg-lime-500/15' : 'border-flame-500/60 bg-flame-500/15'}`}>
          {claimed ? '✅' : '🎁'}
        </span>
      </div>
      <p className="text-xs text-white/60">
        {claimed
          ? `Come back tomorrow to keep a ${api.user.streak}-day run alive. Next bonus: day ${nextMilestone} → +${bonus} Credits.`
          : 'Collect 10 Credits for today, plus streak bonuses at 7, 14, 30 and 60 days.'}
      </p>
      <Meter value={api.user.streak} max={nextMilestone} />
      <div className="flex items-center justify-between text-[11px] text-white/50">
        <span>STREAK {api.user.streak}</span>
        <span>NEXT: +{bonus} CR ON DAY {nextMilestone}</span>
      </div>
      <button className={`btn ${claimed ? 'btn-ghost' : 'btn-flame'}`} disabled={claimed} onClick={api.claimDaily}>
        {claimed ? 'Already collected ✓' : 'Collect +10 Credits'}
      </button>
    </Panel>
  );
}

function MissionList({ cycle }: { cycle: 'daily' | 'weekly' }) {
  const api = useFinb();
  const missions = cycle === 'daily' ? api.dailyMissions : api.weeklyMissions;
  return (
    <div className="space-y-2">
      {missions.map(mission => {
        const done = mission.progress >= mission.goal;
        return (
          <div key={mission.id} className={`jelly-flat flex items-center gap-3 p-3 ${done && !mission.claimed ? 'neon-edge-lime' : ''}`}>
            <span className="grid h-9 w-9 flex-none place-items-center rounded-full bg-white/6 text-sm">{done ? '🏁' : mission.cycle === 'daily' ? '📅' : '🗓️'}</span>
            <div className="min-w-0 flex-1">
              <b className="block truncate text-xs text-cream-100">{mission.title}</b>
              <span className="text-[11px] text-white/50">{mission.hint}</span>
              <Meter className="mt-1.5" height="h-1.5" value={mission.progress} max={mission.goal} />
            </div>
            <div className="flex-none text-right">
              <div className="font-mono text-[11px] text-flame-300">+{mission.credits} cr</div>
              <div className="font-mono text-[11px] text-lime-300">+{mission.liberals} lp</div>
              <button
                className={`mt-1 rounded-full px-2.5 py-1 font-mono text-[10px] tracking-wide ${mission.claimed ? 'bg-white/8 text-white/40' : done ? 'bg-lime-500 text-navy-900' : 'bg-white/8 text-white/45'}`}
                disabled={!done || mission.claimed}
                onClick={() => api.claimMission(mission.id)}
              >
                {mission.claimed ? 'CLAIMED' : done ? 'CLAIM' : `${Math.min(mission.progress, mission.goal)}/${mission.goal}`}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Teasers() {
  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
      {TEASERS.map((teaser, index) => (
        <motion.div
          key={teaser.id}
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: index * 0.05 }}
          className="jelly-flat group relative overflow-hidden p-3"
        >
          <div className={`absolute -right-6 -top-6 h-20 w-20 rounded-full bg-gradient-to-br ${teaser.tint} to-transparent blur-xl`} />
          <div className="label text-lime-300">{teaser.kicker}</div>
          <b className="mt-1 block text-sm text-cream-100">{teaser.name}</b>
          <p className="mt-1 text-[11px] leading-snug text-white/55">{teaser.copy}</p>
          <div className="mt-3 flex items-center justify-between">
            <Badge>🔒 {teaser.eta}</Badge>
            <span className="font-mono text-[10px] text-flame-300 opacity-0 transition group-hover:opacity-100">SOON ↗</span>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

export function HomeScreen() {
  const api = useFinb();
  const { user, db } = api;
  const tier = CARD_TIERS.find(item => item.id === user.card.tier) ?? CARD_TIERS[0];
  const progress = tierProgress(user);
  const quote = db.market.quotes.NVA;
  const trend = quote ? ((quote.price - quote.previous) / quote.previous) * 100 : 0;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const season = db.season;
  const activity = user.activity.slice(0, 6);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="label text-flame-400">PRIVATE CLIENT · ESTD. 2024</div>
          <h1 className="mt-1 text-3xl leading-[1.03] text-cream-100 sm:text-4xl">
            {greeting}, <span className="aberrate">{user.username.replace(/^Guest_/, '')}</span>
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge tone="flame">{tier.name}</Badge>
            <Badge tone="lime">{stageLabel(user)}</Badge>
            {user.linked ? <Badge>🔗 PLAY GAMES LINKED</Badge> : <Badge>👤 GUEST · {api.guestDaysLeft ?? 0}D LEFT</Badge>}
            {user.combo.multiplier > 1 && <Badge tone="magenta">🔥 COMBO ×{user.combo.multiplier.toFixed(2)}</Badge>}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatPill label="CREDITS" value={formatCompact(user.credits)} sub="spendable in-game" tone="flame" />
          <StatPill label="LIBERALS" value={formatCompact(user.liberals)} sub={`level ${Math.floor(user.liberals / 25) + 1}`} tone="lime" />
          <StatPill label="RECORD" value={`${user.stats.gamesWon}/${user.stats.gamesPlayed}`} sub="wins / rounds" />
        </div>
      </div>

      {season && (
        <Panel glow="flame" className="flex flex-wrap items-center justify-between gap-3 p-3">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-flame-500/20 text-lg">🎊</span>
            <div>
              <div className="label text-lime-300">SEASONAL EVENT · LIVE</div>
              <b className="text-sm text-cream-100">{season.name} · ×{season.multiplier} Credits</b>
              <div className="text-[11px] text-white/55">{season.tagline}</div>
            </div>
          </div>
          <div className="text-right text-[11px] text-white/55">
            <div className="font-mono">ENDS {new Date(season.endsAt).toLocaleDateString()}</div>
            <div className="font-mono text-lime-300">EXCLUSIVE COSMETIC DROPS</div>
          </div>
        </Panel>
      )}

      <div className="grid gap-4 lg:grid-cols-[1.25fr_1fr_1fr]">
        <Panel glow="flame" className="relative overflow-hidden p-5">
          <div className="label text-flame-400">AVAILABLE TO PLAY</div>
          <div className="mt-1 font-mono text-4xl font-bold text-cream-100 chroma sm:text-5xl">
            {formatCredits(user.credits)}
            <small className="ml-2 text-base text-lime-400">cr</small>
          </div>
          <div className="mt-2 flex items-center gap-2 text-[11px] text-white/55">
            <span className="chip">SIMULATED POINTS · NO CASH VALUE</span>
          </div>
          <div className="mt-4">
            <div className="flex items-center justify-between text-[11px] text-white/55">
              <span>PATH TO {progress.next.toUpperCase()}</span>
              <span>{progress.percent}%</span>
            </div>
            <Meter className="mt-1" value={progress.percent} max={100} />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button className="btn btn-flame" onClick={() => api.openGame('vault-rush')}>
              ▶ Quick run
            </button>
            <button className="btn btn-ghost-lime" onClick={() => api.openRoom('heist-party', 8)}>
              🎉 8-player heist
            </button>
            <button className="btn btn-ghost" onClick={() => api.navigate('arcade')}>
              All games
            </button>
          </div>
          <span className="absolute -right-8 -top-10 h-32 w-32 rounded-full bg-lime-500/20 blur-3xl" />
        </Panel>

        <Panel className="p-4">
          <SectionTitle kicker="YOUR CARD" title={tier.name} action={<button className="font-mono text-[10px] tracking-wide text-lime-300" onClick={() => api.navigate('card')}>STUDIO ↗</button>} />
          <BankCard player={user} revealed={false} size="mini" />
          <div className="mt-3 flex items-center justify-between text-[11px] text-white/50">
            <span>{user.card.frozen ? '◌ FROZEN IN GAME' : '✳ ACTIVE'}</span>
            <span className="font-mono">{tier.requirement}</span>
          </div>
        </Panel>

        <DailyCard />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel className="p-4">
          <SectionTitle kicker="TODAY’S CHALLENGES" title="Three small missions" sub="Refreshed every day, same for everyone." />
          <MissionList cycle="daily" />
        </Panel>
        <Panel className="p-4">
          <SectionTitle kicker="THIS WEEK" title="Two big missions" sub="Weekly challenges pay out heavily." />
          <MissionList cycle="weekly" />
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <Panel className="p-4">
          <SectionTitle
            kicker="THE FICTIONAL EXCHANGE"
            title="Market now"
            action={<button className="font-mono text-[10px] tracking-wide text-lime-300" onClick={() => api.navigate('arena')}>ARENA ↗</button>}
          />
          <div className="space-y-2">
            {STOCKS.slice(0, 4).map(stock => {
              const q = db.market.quotes[stock.symbol];
              const change = q ? ((q.price - q.previous) / q.previous) * 100 : 0;
              return (
                <div key={stock.symbol} className="flex items-center gap-3">
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-white/6 font-mono text-[10px] text-cream-100">{stock.symbol}</span>
                  <div className="min-w-0 flex-1">
                    <b className="block truncate text-xs text-cream-100">{stock.name}</b>
                    <span className="text-[10px] text-white/45">{stock.sector} · random-walk price feed</span>
                  </div>
                  <div className="w-24">
                    <Meter value={Math.min(100, (q?.price ?? 1) / 3)} max={100} height="h-1.5" />
                  </div>
                  <div className="w-24 text-right">
                    <b className="font-mono text-xs text-cream-100">{formatCredits(q?.price, 2)}</b>
                    <div className={`font-mono text-[10px] ${change >= 0 ? 'text-lime-400' : 'text-flame-400'}`}>
                      {change >= 0 ? '+' : ''}
                      {change.toFixed(2)}%
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-[11px] text-white/40">Ticker NVA {formatCredits(quote?.price, 2)} cr ({trend >= 0 ? '+' : ''}{trend.toFixed(2)}%). Simulation only — no real securities, no advice.</p>
        </Panel>

        <Panel className="p-4">
          <SectionTitle
            kicker="YOUR LEDGER"
            title="Recent movement"
            action={<button className="font-mono text-[10px] tracking-wide text-lime-300" onClick={() => api.navigate('rewards')}>REWARDS ↗</button>}
          />
          {activity.length === 0 ? (
            <div className="jelly-flat grid place-items-center gap-1 py-8 text-center">
              <span className="text-2xl">◌</span>
              <b className="text-xs text-cream-100">Nothing yet</b>
              <span className="text-[11px] text-white/50">Claim the daily reward or start a run.</span>
            </div>
          ) : (
            <div className="space-y-1.5">
              {activity.map(event => (
                <div key={event.id} className="flex items-center gap-3 border-b border-white/6 pb-1.5 last:border-0">
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-white/6 text-xs">
                    {{ game: '🎮', reward: '🎁', trade: '📈', business: '🏪', transfer: '↔️', referral: '🧧', achievement: '🏅', social: '🤝', card: '💳', season: '🎊' }[event.kind]}
                  </span>
                  <div className="min-w-0 flex-1">
                    <b className="block truncate text-xs text-cream-100">{event.title}</b>
                    <span className="font-mono text-[10px] text-white/40">{new Date(event.at).toLocaleTimeString()}</span>
                  </div>
                  {event.amount !== null && (
                    <b className={`font-mono text-xs ${event.amount >= 0 ? 'text-lime-400' : 'text-flame-400'}`}>
                      {event.amount >= 0 ? '+' : '−'}
                      {formatCompact(Math.abs(event.amount))}
                    </b>
                  )}
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>

      <div>
        <SectionTitle kicker="BEYOND THE VAULT" title="Coming soon" sub="Tap a module for the peek." />
        <Teasers />
      </div>
    </div>
  );
}
