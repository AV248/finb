'use client';

import { useMemo, useState } from 'react';
import { useFinb } from '@/lib/appCtx';
import { buildStandings, formatCompact, formatCredits } from '@/lib/economy';
import { Badge, Panel, ScreenHeader, SectionTitle } from '../ui';

export function RanksScreen() {
  const api = useFinb();
  const [metric, setMetric] = useState<'credits' | 'liberals'>('credits');
  const [scope, setScope] = useState<'global' | 'friends'>('global');

  const rows = useMemo(() => {
    const all = buildStandings(api.db.players, api.db.currentId, api.user.friends.map(friend => friend.username));
    const sorted = [...all].sort((a, b) => (metric === 'credits' ? b.credits - a.credits || b.liberals - a.liberals : b.liberals - a.liberals || b.credits - a.credits));
    return scope === 'friends' ? sorted.filter(row => row.isYou || row.isFriend) : sorted;
  }, [api.db.players, api.db.currentId, api.user.friends, metric, scope]);

  const yourRank = rows.findIndex(row => row.isYou) + 1;
  const podium = rows.slice(0, 3);

  return (
    <div className="space-y-5">
      <ScreenHeader
        eyebrow="LEADERBOARDS · LIVE"
        title={<>Where you <span className="aberrate">stand</span></>}
        sub="Standings move in real time: local profiles plus a simulated floor membership that re-ranks every day."
        right={
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-full border border-white/12 bg-white/5 p-1">
              {(['credits', 'liberals'] as const).map(item => (
                <button
                  key={item}
                  onClick={() => setMetric(item)}
                  className={`rounded-full px-3 py-1 font-mono text-[10px] tracking-wide ${metric === item ? 'bg-gradient-to-r from-flame-500 to-lime-500 text-navy-900' : 'text-white/60'}`}
                >
                  {item.toUpperCase()}
                </button>
              ))}
            </div>
            <div className="flex rounded-full border border-white/12 bg-white/5 p-1">
              {(['global', 'friends'] as const).map(item => (
                <button
                  key={item}
                  onClick={() => setScope(item)}
                  className={`rounded-full px-3 py-1 font-mono text-[10px] tracking-wide ${scope === item ? 'bg-white/15 text-cream-100' : 'text-white/60'}`}
                >
                  {item.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        {podium.map((row, index) => (
          <Panel key={row.id} glow={index === 0 ? 'flame' : index === 1 ? 'lime' : 'none'} className="relative overflow-hidden p-4">
            <span className={`absolute -right-6 -top-8 h-24 w-24 rounded-full blur-2xl ${index === 0 ? 'bg-flame-500/30' : index === 1 ? 'bg-lime-500/25' : 'bg-cyanx-400/20'}`} />
            <div className="flex items-center justify-between">
              <span className="font-mono text-3xl font-black text-cream-100 chroma">#{index + 1}</span>
              <span className="text-2xl">{['🥇', '🥈', '🥉'][index]}</span>
            </div>
            <b className="mt-2 block truncate text-sm text-cream-100">{row.username}</b>
            <div className="text-[11px] text-white/55">{row.simulated ? 'Simulated floor member' : row.linked ? 'Linked member' : 'Guest member'}</div>
            <div className="mt-2 font-mono text-lg text-flame-300">{metric === 'credits' ? `${formatCompact(row.credits)} cr` : `${formatCompact(row.liberals)} LP`}</div>
            <button className="btn btn-ghost mt-3 w-full !py-1.5 text-[11px]" onClick={() => api.tip(row.username, 10)}>
              Tip 10 cr
            </button>
          </Panel>
        ))}
      </div>

      <Panel className="p-4">
        <SectionTitle
          kicker={scope === 'global' ? 'ALL MEMBERS' : 'YOUR CIRCLE'}
          title={`${rows.length} ranked`}
          action={<Badge tone="lime">{yourRank > 0 ? `YOU: #${yourRank}` : 'UNRANKED'}</Badge>}
        />
        <div className="space-y-1">
          {rows.slice(0, 40).map((row, index) => (
            <div
              key={row.id}
              className={`flex items-center gap-3 rounded-xl px-2 py-2 transition ${row.isYou ? 'bg-lime-500/10 neon-edge-lime' : 'hover:bg-white/5'}`}
            >
              <span className={`w-9 font-mono text-sm ${index === 0 ? 'text-flame-400' : index < 3 ? 'text-lime-300' : 'text-white/45'}`}>
                {String(index + 1).padStart(2, '0')}
              </span>
              <span className="grid h-8 w-8 place-items-center rounded-full bg-[linear-gradient(140deg,#ff6b00,#00c853)] font-mono text-[10px] font-bold text-navy-900">
                {row.username.slice(0, 2).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <b className="flex items-center gap-1.5 truncate text-xs text-cream-100">
                  {row.username}
                  {row.isYou && <span className="chip chip-lime">YOU</span>}
                  {row.isFriend && !row.isYou && <span className="chip">FRIEND</span>}
                </b>
                <span className="text-[10px] text-white/45">
                  {row.online ? '● online' : '○ offline'} · {row.status} · {row.tier}
                </span>
              </div>
              <div className="text-right">
                <b className="font-mono text-xs text-cream-100">{metric === 'credits' ? formatCredits(row.credits) : formatCredits(row.liberals)}</b>
                <div className="font-mono text-[10px] text-white/45">{metric === 'credits' ? 'credits' : 'liberals'}</div>
              </div>
              {!row.isYou && (
                <button className="rounded-full border border-white/12 px-2 py-1 font-mono text-[10px] text-white/60 hover:border-lime-500/50 hover:text-lime-300" onClick={() => api.addFriend(row.username)}>
                  + ADD
                </button>
              )}
            </div>
          ))}
        </div>
        <p className="mt-3 text-[11px] text-white/40">
          Simulated floor members are labelled and are not real people. With Supabase configured, real profiles join this same board.
        </p>
      </Panel>
    </div>
  );
}
