'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useFinb } from '@/lib/appCtx';
import { ECONOMY, formatCredits } from '@/lib/economy';
import { ACCOUNT_RULES, PROVIDERS, subjectProblem, type AuthProvider } from '@/lib/identity';
import { CLOUD_ENABLED, claimProviderSlot, sessionProviderSubject, startProviderOAuth } from '@/lib/supabase';
import { sfx } from '@/lib/audio';
import { Badge, Meter, Panel } from './ui';

/**
 * The Link Center: one screen that explains and enforces the account rules.
 *
 *  - guests hold 100 reserved Credits that no action can touch;
 *  - linking Google converts them into 100 usable Credits;
 *  - linking Discord converts them into 300 usable Credits;
 *  - those welcome Credits are spendable everywhere but never transferable;
 *  - one provider account can only ever claim its welcome grant once.
 */
export function LinkCenter({ compact = false }: { compact?: boolean }) {
  const api = useFinb();
  const user = api.user;
  const [handle, setHandle] = useState('');
  const [provider, setProvider] = useState<AuthProvider>('discord');
  const [busy, setBusy] = useState(false);

  const linked = api.provider !== 'guest';
  const spec = PROVIDERS[provider];
  const issue = useMemo(() => (linked ? null : subjectProblem(provider, handle)), [provider, handle, linked]);
  const wallet = api.wallet;

  const runLink = async (door: AuthProvider, subject: string) => {
    if (linked) return;
    if (door === 'guest' || !subject.trim()) return;
    setBusy(true);
    try {
      // When the operator has wired real OAuth, hand off to it; whenever that is
      // unavailable we still record the same dedupe key so the rules hold.
      let clean = subject;
      if (CLOUD_ENABLED) {
        const session = await sessionProviderSubject();
        if (session && session.provider === door) clean = session.subject;
        else if (session?.provider === 'discord' || session?.provider === 'google') clean = session.subject;
        if (!session) {
          const slot = await claimProviderSlot(door as 'google' | 'discord', subject);
          if (slot === 'claimed') {
            api.toast(`That ${PROVIDERS[door].label} account already claimed its welcome grant — linking anyway without extra Credits.`, 'info', 'ℹ️');
          }
        }
      }
      api.linkProvider(door as 'google' | 'discord', clean);
      sfx.reward();
    } finally {
      setBusy(false);
    }
  };

  const tryOAuth = async (door: 'google' | 'discord') => {
    setBusy(true);
    const result = await startProviderOAuth(door);
    setBusy(false);
    if (result.ok && result.url) {
      api.toast(result.message, 'info', '🔐');
      window.location.assign(result.url);
      return;
    }
    api.toast(`${result.message} Handle-based linking still applies every rule.`, 'info', '🔐');
  };

  return (
    <Panel glow={linked ? 'lime' : 'flame'} className={compact ? 'p-4' : 'p-5'}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="label text-flame-400">LINK CENTER</div>
          <h3 className="mt-1 flex items-center gap-2 text-lg text-cream-100">
            {linked ? <span className="text-lime-400">{PROVIDERS[api.provider].glyph}</span> : '👤'}
            {linked ? `${PROVIDERS[api.provider].label} account` : 'Guest account'}
          </h3>
          <p className="mt-1 max-w-xl text-[11px] leading-relaxed text-white/60">
            {linked
              ? `Permanent account${user.providerSubject ? ` · ${user.providerSubject}` : ''}. Guest expiry is cancelled and your username can never be recycled.`
              : `${ACCOUNT_RULES.guestReserve} Credits are reserved on this profile. They stay frozen — unusable for games, markets, businesses or transfers — until you link a provider.`}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          {linked ? <Badge tone="lime">PERMANENT</Badge> : <Badge tone="magenta">GUEST · {api.guestDaysLeft ?? 0}D LEFT</Badge>}
          <span className="font-mono text-[10px] text-white/40">{CLOUD_ENABLED ? 'Cloud identity ready' : 'Local identity'}</span>
        </div>
      </div>

      {/* credit buckets */}
      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <div className="jelly-flat p-3">
          <div className="label text-flame-300">USABLE</div>
          <div className="font-mono text-xl text-cream-100">{formatCredits(wallet.usable)}</div>
          <div className="text-[10px] text-white/45">Spendable in games, markets and businesses.</div>
        </div>
        <div className="jelly-flat p-3">
          <div className="label text-magenta-500">RESERVED</div>
          <div className="font-mono text-xl text-cream-100">{formatCredits(wallet.reserved)}</div>
          <div className="text-[10px] text-white/45">
            {wallet.reserved ? `Unlocks as ${ACCOUNT_RULES.googleWelcome} (Google) or ${ACCOUNT_RULES.discordWelcome} (Discord) on link.` : 'Nothing frozen — your reserve is already released.'}
          </div>
        </div>
        <div className="jelly-flat p-3">
          <div className="label text-lime-300">NOT TRANSFERABLE</div>
          <div className="font-mono text-xl text-cream-100">{formatCredits(wallet.bonus)}</div>
          <div className="text-[10px] text-white/45">Welcome Credits you can spend but never send to anyone.</div>
        </div>
      </div>
      <Meter className="mt-3" value={wallet.usable} max={Math.max(1, wallet.total)} />

      {!linked && (
        <div className="mt-4 space-y-3 rounded-2xl border border-flame-500/30 bg-flame-500/8 p-3">
          <div className="flex flex-wrap gap-1.5">
            {(['google', 'discord'] as const).map(door => (
              <button
                key={door}
                onClick={() => setProvider(door)}
                className={`chip ${provider === door ? (door === 'discord' ? 'chip-flame' : 'chip-lime') : ''}`}
              >
                {PROVIDERS[door].glyph} {PROVIDERS[door].label} · {PROVIDERS[door].welcome} usable
              </button>
            ))}
          </div>
          <p className="text-[11px] leading-relaxed text-white/65">{spec.blurb}</p>

          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              className="field"
              value={handle}
              onChange={event => setHandle(event.target.value)}
              placeholder={provider === 'discord' ? 'your Discord handle' : 'your Google handle'}
              aria-label={`${spec.label} handle`}
            />
            <button className="btn btn-flame whitespace-nowrap" disabled={busy || Boolean(issue)} onClick={() => runLink(provider, handle)}>
              {busy ? 'Linking…' : `Link ${spec.label}`}
            </button>
            <button className="btn btn-ghost whitespace-nowrap" disabled={busy} onClick={() => tryOAuth(provider as 'google' | 'discord')}>
              🔐 Real sign-in
            </button>
          </div>
          {issue && <p className="text-[11px] text-flame-300">{issue}</p>}
          <p className="text-[10px] leading-relaxed text-white/40">
            The handle is the dedupe key: one welcome grant per {spec.label} account, forever. Real OAuth is used automatically when the operator enables the provider on
            this Supabase project — this field is the manual fallback and applies exactly the same rules.
          </p>
        </div>
      )}

      {linked && (
        <div className="mt-4 rounded-2xl border border-lime-500/30 bg-lime-500/8 p-3">
          <p className="text-[11px] leading-relaxed text-white/65">
            Linked accounts are permanent: no 90-day deletion, transfers unlocked, referrals payable. Your welcome grant of {formatCredits(wallet.bonus)} Credits stays
            spendable everywhere and excluded from transfers — earn more Credits in games to send them to friends.
          </p>
        </div>
      )}

      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        {[
          { k: 'GUEST', v: `${ACCOUNT_RULES.guestReserve} reserved`, c: 'text-magenta-500' },
          { k: 'GOOGLE', v: `${ACCOUNT_RULES.googleWelcome} usable`, c: 'text-cyanx-300' },
          { k: 'DISCORD', v: `${ACCOUNT_RULES.discordWelcome} usable`, c: 'text-flame-300' },
        ].map(item => (
          <motion.div key={item.k} whileHover={{ y: -2 }} className="jelly-flat p-2.5">
            <div className="label">{item.k}</div>
            <div className={`font-mono text-sm ${item.c}`}>{item.v}</div>
          </motion.div>
        ))}
      </div>
      <p className="mt-2 text-[10px] leading-relaxed text-white/40">
        Simulation only. No Google or Discord authentication is required to play, no real accounts are verified, and Credits have no monetary value. Referrals pay
        +{ECONOMY.referralReferrer} to the referrer and +{ECONOMY.referralJoiner} to the new linked member.
      </p>
    </Panel>
  );
}
