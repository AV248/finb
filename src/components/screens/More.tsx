'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useFinb } from '@/lib/appCtx';
import { LinkCenter } from '../LinkCenter';
import { PROVIDERS } from '@/lib/identity';
import { DOC_SECTIONS } from '@/lib/docs';
import { STOCKS, TEASERS } from '@/lib/catalog';
import { formatCompact, formatCredits, timeAgo } from '@/lib/economy';
import { CLOUD_ENABLED, CLOUD_MODE_LABEL } from '@/lib/supabase';
import { COLYSEUS_URL } from '@/lib/net';
import { Badge, Meter, Panel, ScreenHeader, SectionTitle, StatPill } from '../ui';
import { SitemapGraph } from '../SitemapGraph';

export type MoreView = {
  view: 'hub' | 'docs' | 'sitemap' | 'legal' | 'account' | 'data' | 'market' | 'support';
  section?: string;
};

const SHOPS = [
  { id: 'coffee', name: 'Ember Coffee Cart', cost: 250, yieldPerMinute: 4 },
  { id: 'arcade', name: 'Penny’s Arcade Corner', cost: 600, yieldPerMinute: 9 },
  { id: 'vault', name: 'Mini Vault Kiosk', cost: 1400, yieldPerMinute: 21 },
];

const TABS: { id: MoreView['view']; label: string; glyph: string }[] = [
  { id: 'hub', label: 'Hub', glyph: '🏦' },
  { id: 'market', label: 'Market Lab', glyph: '📈' },
  { id: 'docs', label: 'Documentation', glyph: '📘' },
  { id: 'sitemap', label: 'Sitemap', glyph: '🗺️' },
  { id: 'legal', label: 'Legal', glyph: '⚖️' },
  { id: 'support', label: 'Support', glyph: '🎧' },
  { id: 'account', label: 'Account', glyph: '🧑‍💼' },
  { id: 'data', label: 'Data', glyph: '🗄️' },
];

export function MoreScreen({ view, onChange }: { view: MoreView; onChange: (view: MoreView) => void }) {
  const api = useFinb();

  return (
    <div className="space-y-4">
      <ScreenHeader
        eyebrow="THE BANK · BACK OFFICE"
        title={<>Everything behind the <span className="aberrate">counter</span></>}
        sub="Documentation, the interactive sitemap, our policies, support, the Market Lab and every device-data control in one place."
        right={
          <div className="flex flex-col items-end gap-1">
            <Badge tone={CLOUD_ENABLED ? 'lime' : 'plain'}>{CLOUD_MODE_LABEL.toUpperCase()}</Badge>
            <Badge tone={COLYSEUS_URL ? 'lime' : 'flame'}>{COLYSEUS_URL ? 'LIVE ROOMS READY' : 'PRACTICE ROOMS'}</Badge>
          </div>
        }
      />

      <div className="flex flex-wrap gap-1.5">
        {TABS.map(tab => (
          <button key={tab.id} className={`chip ${view.view === tab.id ? 'chip-flame' : ''}`} onClick={() => onChange({ view: tab.id })}>
            <span className="mr-1">{tab.glyph}</span>
            {tab.label}
          </button>
        ))}
      </div>

      <motion.div key={view.view} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.24 }}>
        {view.view === 'hub' && <Hub onChange={onChange} />}
        {view.view === 'market' && <MarketLab />}
        {view.view === 'docs' && <Docs section={view.section} onSection={section => onChange({ view: 'docs', section })} />}
        {view.view === 'sitemap' && <SitemapGraph />}
        {view.view === 'legal' && <Legal />}
        {view.view === 'support' && <Support />}
        {view.view === 'account' && <Account />}
        {view.view === 'data' && <DataVault />}
      </motion.div>

      <p className="text-[10px] leading-relaxed text-white/35">
        FINB — Fake International Bank · FINB ESTD. 2024 · Platinum edition · {api.user.username} · everything on this floor is fictional.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ hub */
function Hub({ onChange }: { onChange: (view: MoreView) => void }) {
  const api = useFinb();
  const db = api.db;
  const cards = [
    { id: 'docs' as const, glyph: '📘', title: 'Documentation', copy: 'How accounts, cards, games, Liberals and multiplayer actually work.', badge: `${DOC_SECTIONS.length} sections` },
    { id: 'sitemap' as const, glyph: '🗺️', title: 'Interactive Sitemap', copy: 'Every screen, overlay, policy and system — all nodes tappable.', badge: 'live graph' },
    { id: 'legal' as const, glyph: '⚖️', title: 'Privacy · Terms · Accountability', copy: 'What we store, what we never collect, and how we hold ourselves accountable.', badge: 'plain language' },
    { id: 'support' as const, glyph: '🎧', title: 'Support', copy: 'Alias CNAME cs, response targets and the honest status of that channel.', badge: 'CNAME cs' },
    { id: 'market' as const, glyph: '📈', title: 'Market Lab', copy: 'Simulated shares and small businesses that tick while the app is closed.', badge: `${STOCKS.length} tickers` },
    { id: 'account' as const, glyph: '🧑‍💼', title: 'Link Center', copy: 'Providers, the reserved welcome balance, referral code, profile switching and the guide.', badge: api.user.linked ? PROVIDERS[api.provider].label.toLowerCase() : `${api.wallet.reserved} reserved` },
    { id: 'data' as const, glyph: '🗄️', title: 'Data Vault', copy: 'Export a JSON backup, wipe a profile, inspect storage and sync state.', badge: 'device-local' },
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map(card => (
          <button key={card.id} onClick={() => onChange({ view: card.id })} className="jelly group p-4 text-left transition hover:neon-edge-flame">
            <div className="flex items-start justify-between">
              <span className="text-2xl">{card.glyph}</span>
              <Badge tone="plain">{card.badge}</Badge>
            </div>
            <b className="mt-2 block text-sm text-cream-100">{card.title}</b>
            <p className="mt-1 text-[11px] leading-relaxed text-white/55">{card.copy}</p>
            <span className="mt-2 block font-mono text-[10px] text-lime-300 opacity-0 transition group-hover:opacity-100">OPEN ↗</span>
          </button>
        ))}
      </div>

      <div className="grid gap-3 lg:grid-cols-[1fr_1fr]">
        <Panel className="p-4">
          <SectionTitle kicker="BANK STATUS" title="The floor right now" />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <StatPill label="MEMBERS" value={`${db.players.length}`} sub="on this device" tone="flame" />
            <StatPill label="FLOOR SEATS" value={`${api.standings.length}`} sub="ranked today" tone="lime" />
            <StatPill label="CLOUD" value={CLOUD_ENABLED ? 'ON' : 'OFF'} sub={CLOUD_ENABLED ? 'Supabase mirrored' : 'device only'} />
            <StatPill label="ROOMS" value={COLYSEUS_URL ? 'LIVE' : 'AI'} sub={COLYSEUS_URL ? 'Colyseus ready' : 'practice seats'} />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button className="btn btn-ghost-lime !px-3 !py-1.5 text-[11px]" onClick={() => api.openSitemap()}>
              🗺️ Open sitemap
            </button>
            <button className="btn btn-ghost !px-3 !py-1.5 text-[11px]" onClick={() => api.openGuide()}>
              🧭 Replay the guide
            </button>
            <button className="btn btn-ghost !px-3 !py-1.5 text-[11px]" onClick={() => api.spectrum('heist-party')}>
              👀 Spectate a room
            </button>
          </div>
        </Panel>

        <Panel className="p-4">
          <SectionTitle kicker="ROADMAP" title="Coming to the floor" sub="Teased, not shipped — nothing below is purchasable." />
          <div className="space-y-2">
            {TEASERS.map(teaser => (
              <div key={teaser.id} className={`jelly-flat flex items-center gap-3 border-transparent bg-gradient-to-r p-2.5 ${teaser.tint}`}>
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/50">{teaser.kicker}</span>
                <b className="text-xs text-cream-100">{teaser.name}</b>
                <span className="ml-auto text-[10px] text-white/45">{teaser.eta}</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ market */
function MarketLab() {
  const api = useFinb();
  const db = api.db;
  const [quantity, setQuantity] = useState(5);

  return (
    <div className="space-y-4">
      <Panel className="p-4">
        <SectionTitle
          kicker="THE FICTIONAL EXCHANGE"
          title="Market Lab"
          sub="Prices follow a seeded random walk refreshed every few seconds. No real securities, no advice, no cash value."
        />
        <div className="space-y-2">
          {STOCKS.map(stock => {
            const quote = db.market.quotes[stock.symbol];
            const change = quote ? ((quote.price - quote.previous) / quote.previous) * 100 : 0;
            const held = api.user.holdings[stock.symbol]?.shares ?? 0;
            return (
              <div key={stock.symbol} className="jelly-flat flex flex-wrap items-center gap-3 p-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/6 font-mono text-[11px] text-cream-100">{stock.symbol}</span>
                <div className="min-w-[140px] flex-1">
                  <b className="block text-xs text-cream-100">{stock.name}</b>
                  <span className="text-[10px] text-white/45">{stock.sector} · held {held}</span>
                </div>
                <div className="w-28">
                  <Meter value={Math.min(100, (quote?.price ?? 1) / 4)} max={100} height="h-1.5" />
                </div>
                <div className="w-24 text-right">
                  <b className="font-mono text-xs text-cream-100">{formatCredits(quote?.price, 2)}</b>
                  <div className={`font-mono text-[10px] ${change >= 0 ? 'text-lime-400' : 'text-flame-400'}`}>
                    {change >= 0 ? '+' : ''}
                    {change.toFixed(2)}%
                  </div>
                </div>
                <div className="flex gap-1.5">
                  <button className="btn btn-ghost-lime !px-2.5 !py-1 text-[10px]" onClick={() => api.trade(stock.symbol, quantity, 'buy')}>
                    Buy {quantity}
                  </button>
                  <button className="btn btn-ghost !px-2.5 !py-1 text-[10px]" onClick={() => api.trade(stock.symbol, quantity, 'sell')} disabled={held === 0}>
                    Sell {Math.min(quantity, held) || 0}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="label">ORDER SIZE</span>
          {[1, 5, 25].map(value => (
            <button key={value} className={`chip ${quantity === value ? 'chip-flame' : ''}`} onClick={() => setQuantity(value)}>
              {value} shares
            </button>
          ))}
          <span className="text-[11px] text-white/45">Trades settle instantly against your Credit balance. Selling returns Credits at the current quote.</span>
        </div>
      </Panel>

      <Panel className="p-4">
        <SectionTitle kicker="VAULT VENTURES" title="Small businesses" sub="Buy a counter, then run it to mint Credits over time — capped so nobody prints money forever." />
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {SHOPS.map(shop => {
            const owned = api.user.businesses.find(business => business.id === shop.id);
            return (
              <div key={shop.id} className="jelly-flat p-3">
                <b className="text-xs text-cream-100">{shop.name}</b>
                <p className="mt-1 text-[11px] text-white/50">
                  {shop.cost} Credits · {shop.yieldPerMinute} cr/min while running
                </p>
                <button
                  className={`btn mt-2 !px-3 !py-1.5 text-[11px] ${owned ? 'btn-ghost-lime' : 'btn-flame'}`}
                  onClick={() => (owned ? api.runBusiness(shop.id) : api.buyBusiness(shop.id, shop.name, shop.cost, shop.yieldPerMinute))}
                  disabled={!owned && api.user.credits < shop.cost}
                >
                  {owned ? '▶ Collect earnings' : 'Buy counter'}
                </button>
              </div>
            );
          })}
        </div>
        {api.user.businesses.length > 0 && (
          <div className="mt-3 space-y-2">
            {api.user.businesses.map(business => (
              <div key={business.id} className="jelly-flat flex flex-wrap items-center gap-3 p-3">
                <span className="text-lg">🏪</span>
                <div className="min-w-[160px] flex-1">
                  <b className="block text-xs text-cream-100">{business.name}</b>
                  <span className="text-[10px] text-white/45">
                    collected {business.lastCollectedAt ? timeAgo(business.lastCollectedAt) : 'never'} · lifetime {formatCompact(business.totalEarned)} cr
                  </span>
                </div>
                <b className="font-mono text-xs text-lime-300">+{business.yieldPerMinute} cr/min</b>
                <button className="btn btn-ghost-lime !px-3 !py-1.5 text-[11px]" onClick={() => api.runBusiness(business.id)}>
                  ▶ Run the counter
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          {Object.entries(api.user.holdings).slice(0, 6).map(([symbol, holding]) => (
            <div key={symbol} className="jelly-flat p-2.5 text-[11px] text-white/65">
              <b className="text-cream-100">{symbol}</b> · {holding.shares} shares
              <div className="text-[10px] text-white/45">avg {formatCredits(holding.basis, 2)}</div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

/* ------------------------------------------------------------------ docs */
function DocBody({ body }: { body: (typeof DOC_SECTIONS)[number]['body'] }) {
  return (
    <div className="space-y-3">
      {body.map((block, index) => {
        if (block.type === 'h') return <h3 key={index} className="pt-1 text-sm text-flame-300">{block.text}</h3>;
        if (block.type === 'p') return <p key={index} className="text-[12px] leading-relaxed text-white/70">{block.text}</p>;
        if (block.type === 'callout')
          return (
            <div key={index} className="rounded-2xl border border-lime-500/40 bg-lime-500/10 p-3 text-[12px] leading-relaxed text-lime-100">
              <span className="mr-1">💡</span>
              {block.text}
            </div>
          );
        if (block.type === 'code')
          return (
            <pre key={index} className="overflow-x-auto rounded-2xl border border-white/10 bg-navy-950/70 p-3 font-mono text-[11px] leading-relaxed text-cyanx-300">
              {block.text}
            </pre>
          );
        return (
          <ul key={index} className="space-y-1.5">
            {block.text && <li className="text-[12px] text-white/70">{block.text}</li>}
            {(block.items ?? []).map(item => (
              <li key={item} className="flex gap-2 text-[12px] leading-relaxed text-white/70">
                <span className="mt-[2px] text-lime-400">▸</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        );
      })}
    </div>
  );
}

function Docs({ section, onSection }: { section?: string; onSection: (id: string) => void }) {
  const current = useMemo(() => DOC_SECTIONS.find(item => item.id === section) ?? DOC_SECTIONS[0], [section]);
  return (
    <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
      <Panel className="h-fit p-3">
        <div className="label text-flame-400">SECTIONS</div>
        <div className="mt-2 space-y-1">
          {DOC_SECTIONS.map(item => (
            <button
              key={item.id}
              onClick={() => onSection(item.id)}
              className={`w-full rounded-2xl px-3 py-2 text-left text-[12px] transition ${
                current.id === item.id ? 'bg-[linear-gradient(120deg,rgba(255,107,0,.22),rgba(0,200,83,.16))] text-cream-100' : 'text-white/60 hover:bg-white/5'
              }`}
            >
              <b className="block">{item.title}</b>
              <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/35">{item.kicker}</span>
            </button>
          ))}
        </div>
      </Panel>
      <Panel className="p-4">
        <div className="label text-lime-400">{current.kicker}</div>
        <h2 className="mt-1 text-xl text-cream-100">{current.title}</h2>
        <div className="mt-3">
          <DocBody body={current.body} />
        </div>
      </Panel>
    </div>
  );
}

/* ------------------------------------------------------------------ legal */
function Legal() {
  const ids = ['privacy', 'terms', 'accountability', 'legal'] as const;
  const sections = DOC_SECTIONS.filter(item => ids.includes(item.id as (typeof ids)[number]));
  const api = useFinb();
  return (
    <div className="space-y-4">
      <Panel glow="flame" className="p-4">
        <div className="label text-flame-400">READ THIS FIRST</div>
        <b className="text-sm text-cream-100">FINB is a fictional simulation, not a financial institution</b>
        <p className="mt-1 text-[12px] leading-relaxed text-white/70">
          No real money, deposits, credit, securities or card processing exist here. Credits and Liberals cannot be bought, sold, cashed out or
          transferred outside the app, and the card shown in Card Studio cannot authorise any real payment. The policies below describe a serious
          product in plain language so you know exactly what this build does and does not do.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button className="btn btn-ghost-lime !px-3 !py-1.5 text-[11px]" onClick={() => api.openDocuments('privacy')}>
            Privacy Policy
          </button>
          <button className="btn btn-ghost-lime !px-3 !py-1.5 text-[11px]" onClick={() => api.openDocuments('terms')}>
            Terms &amp; Conditions
          </button>
          <button className="btn btn-ghost !px-3 !py-1.5 text-[11px]" onClick={() => api.openDocuments('accountability')}>
            Accountability Statement
          </button>
        </div>
      </Panel>
      {sections.map(section => (
        <Panel key={section.id} className="p-4">
          <div className="label text-lime-400">{section.kicker}</div>
          <h2 className="mt-1 text-lg text-cream-100">{section.title}</h2>
          <div className="mt-3">
            <DocBody body={section.body} />
          </div>
        </Panel>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ support */
function Support() {
  const api = useFinb();
  const section = DOC_SECTIONS.find(item => item.id === 'support');
  return (
    <div className="space-y-4">
      <Panel glow="lime" className="p-4">
        <SectionTitle
          kicker="CNAME · CS"
          title="Support channel"
          sub="The support alias for this project is CNAME cs. It is a label in this build, and the honest status is stated below."
        />
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="jelly-flat p-3">
            <div className="label text-lime-300">ALIAS</div>
            <b className="font-mono text-sm text-cream-100">CNAME cs</b>
            <p className="mt-1 text-[11px] text-white/55">Used for support requests, accessibility reports, rights holders and takedown notices.</p>
          </div>
          <div className="jelly-flat p-3">
            <div className="label text-flame-300">STATUS</div>
            <b className="text-sm text-cream-100">Not connected</b>
            <p className="mt-1 text-[11px] text-white/55">No DNS record, mailbox or ticket queue is live. A deploying operator must connect a monitored inbox before launch.</p>
          </div>
          <div className="jelly-flat p-3">
            <div className="label text-cyanx-300">WHAT TO SEND</div>
            <b className="text-sm text-cream-100">Username · device · steps</b>
            <p className="mt-1 text-[11px] text-white/55">Never send card numbers, passwords or Google credentials — FINB never needs them.</p>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button className="btn btn-ghost-lime !px-3 !py-1.5 text-[11px]" onClick={() => api.openDocuments('support')}>
            📘 Support documentation
          </button>
          <button className="btn btn-ghost !px-3 !py-1.5 text-[11px]" onClick={() => api.exportData()}>
            📤 Attach a profile backup
          </button>
        </div>
      </Panel>
      {section && (
        <Panel className="p-4">
          <div className="label text-lime-400">{section.kicker}</div>
          <h2 className="mt-1 text-lg text-cream-100">{section.title}</h2>
          <div className="mt-3">
            <DocBody body={section.body} />
          </div>
        </Panel>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ account */
function Account() {
  const api = useFinb();
  const [code, setCode] = useState('');
  const user = api.user;

  return (
    <div className="space-y-4">
      <Panel className="p-4">
        <SectionTitle
          kicker="ACCOUNT"
          title={user.username}
          sub={`Created ${timeAgo(user.createdAt)} · ${user.linked ? `${PROVIDERS[api.provider].label} linked` : 'guest profile'}`}
        />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <StatPill label="USABLE CR" value={formatCompact(api.wallet.usable)} tone="flame" />
          <StatPill label="RESERVED" value={formatCompact(api.wallet.reserved)} sub={api.wallet.reserved ? 'unlock by linking' : 'nothing frozen'} />
          <StatPill label="LIBERALS" value={formatCompact(user.liberals)} tone="lime" />
          <StatPill label="NOT TRANSFERABLE" value={formatCompact(api.wallet.bonus)} sub="welcome Credits" />
        </div>
        <div className="mt-3">
          <LinkCenter compact />
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="label">REFERRAL CODE FROM A FRIEND</span>
            <div className="mt-1 flex gap-2">
              <input className="field" value={code} onChange={event => setCode(event.target.value)} placeholder="FINB-XXXX" />
              <button className="btn btn-flame" onClick={() => api.claimReferral(code)} disabled={code.trim().length < 4}>
                Claim
              </button>
            </div>
            <span className="mt-1 block text-[10px] text-white/40">Referrals pay the referrer +100 and you +200 once you are linked.</span>
          </label>
        </div>
        <div className="mt-3 rounded-2xl border border-white/10 bg-white/4 p-3">
          <div className="label text-lime-300">YOUR REFERRAL CODE</div>
          <div className="mt-1 flex items-center gap-2">
            <code className="font-mono text-sm text-cream-100">{user.referralCode}</code>
            <button
              className="btn btn-ghost !px-2.5 !py-1 text-[10px]"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(user.referralCode);
                  api.toast('Referral code copied.', 'good', '📋');
                } catch {
                  api.toast('Copy failed — select the code manually.', 'bad', '⚠️');
                }
              }}
            >
              Copy
            </button>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button className="btn btn-ghost-lime !px-3 !py-1.5 text-[11px]" onClick={() => api.switchProfile()}>
            🧑‍💼 Switch profile
          </button>
          <button className="btn btn-ghost !px-3 !py-1.5 text-[11px]" onClick={() => api.openGuide()}>
            🧭 Replay the guide
          </button>
          <button className="btn btn-ghost !px-3 !py-1.5 text-[11px]" onClick={() => api.toggleSound()}>
            {api.soundOn ? '🔊 Sound on' : '🔇 Sound off'}
          </button>
          <button className="btn btn-ghost !px-3 !py-1.5 text-[11px]" onClick={() => api.navigate('card')}>
            💳 Card Studio
          </button>
        </div>
      </Panel>
    </div>
  );
}

/* ------------------------------------------------------------------ data */
function DataVault() {
  const api = useFinb();
  const bytes = useMemo(() => {
    try {
      return new Blob([JSON.stringify(api.db)]).size;
    } catch {
      return 0;
    }
  }, [api.db]);

  return (
    <div className="space-y-4">
      <Panel className="p-4">
        <SectionTitle kicker="DATA VAULT" title="Your records, your device" sub="Everything FINB knows about you lives in this browser unless a deployment explicitly configures Supabase." />
        <div className="grid gap-2 sm:grid-cols-3">
          <StatPill label="LOCAL SIZE" value={`${(bytes / 1024).toFixed(1)} KB`} sub="localStorage finb-platinum-v2" tone="flame" />
          <StatPill label="PROFILES" value={`${api.db.players.length}`} sub="stored locally" tone="lime" />
          <StatPill label="LAST CLOUD SYNC" value={api.db.lastSyncAt ? timeAgo(api.db.lastSyncAt) : 'never'} sub={CLOUD_ENABLED ? 'Supabase configured' : 'offline build'} />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button className="btn btn-duo !px-3 !py-1.5 text-[11px]" onClick={() => api.exportData()}>
            📤 Export JSON backup
          </button>
          <button
            className="btn btn-ghost !px-3 !py-1.5 text-[11px]"
            onClick={() => {
              if (window.confirm('Wipe this profile from the device? Export a backup first — this cannot be undone.')) api.deleteProfile();
            }}
          >
            🧽 Wipe this profile
          </button>
          <button className="btn btn-ghost-lime !px-3 !py-1.5 text-[11px]" onClick={() => api.openDocuments('privacy')}>
            📘 Privacy Policy
          </button>
        </div>
        <ul className="mt-3 space-y-1.5 text-[11px] leading-relaxed text-white/60">
          <li>▸ No passwords, payment details, Google credentials or location data are collected — ever.</li>
          <li>▸ Guests are pruned after 90 days of not being linked; exporting keeps your own copy regardless.</li>
          <li>▸ Clearing browser site data deletes the local vault permanently. FINB cannot restore it.</li>
          <li>▸ Cloud sync, when configured, mirrors a minimal stats subset under Row Level Security.</li>
        </ul>
      </Panel>

      <Panel className="p-4">
        <SectionTitle kicker="ACHIEVEMENT LOG" title="Recent ledger" />
        <div className="max-h-64 space-y-1.5 overflow-y-auto scrollbar-none">
          {api.user.activity.length === 0 && <p className="text-[11px] text-white/50">No activity recorded yet.</p>}
          {api.user.activity.map(event => (
            <div key={event.id} className="flex items-center gap-3 border-b border-white/6 pb-1.5 text-[11px] last:border-0">
              <span className="text-sm">{event.kind === 'game' ? '🎮' : event.kind === 'reward' ? '🎁' : event.kind === 'trade' ? '📈' : event.kind === 'achievement' ? '🏅' : '•'}</span>
              <span className="min-w-0 flex-1 truncate text-cream-100">{event.title}</span>
              <span className="font-mono text-white/40">{new Date(event.at).toLocaleTimeString()}</span>
              {event.amount !== null && (
                <b className={`font-mono ${event.amount >= 0 ? 'text-lime-400' : 'text-flame-400'}`}>
                  {event.amount >= 0 ? '+' : '−'}
                  {formatCompact(Math.abs(event.amount))}
                </b>
              )}
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
