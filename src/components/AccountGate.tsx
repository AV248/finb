'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { createAccount, deleteLocalProfile, getDatabase, resumePlayer, USERNAME_PATTERN, useDatabase } from '@/lib/store';
import { formatCredits, timeAgo } from '@/lib/economy';
import { ACCOUNT_RULES, PROVIDERS, PROVIDER_ORDER, subjectProblem, type AuthProvider } from '@/lib/identity';
import { sfx } from '@/lib/audio';
import { Mascot, MascotBubble } from './Mascot';
import { Badge, Panel } from './ui';

/**
 * Entry gate: create the first profile on this device, or jump back into one
 * that already exists. No e-mail, no password, no server round-trip.
 */
export function AccountGate() {
  const db = useDatabase();
  const [username, setUsername] = useState('');
  const [provider, setProvider] = useState<AuthProvider>('guest');
  const [handle, setHandle] = useState('');
  const [error, setError] = useState<string | null>(null);

  const spec = PROVIDERS[provider];
  const needsHandle = provider !== 'guest';
  const handleIssue = needsHandle ? subjectProblem(provider, handle) : null;
  const ready = USERNAME_PATTERN.test(username) && !handleIssue;

  const create = () => {
    const result = createAccount({
      username,
      provider,
      providerSubject: needsHandle ? handle : undefined,
    });
    if (!result.ok) {
      setError(result.message);
      sfx.bad();
      return;
    }
    setError(null);
    sfx.reward();
  };

  return (
    <main className="relative mx-auto grid min-h-dvh w-full max-w-5xl place-items-center px-4 py-10">
      <div className="grid w-full gap-5 lg:grid-cols-[1.05fr_.95fr]">
        <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[linear-gradient(140deg,#FF6B00,#00C853)] text-xl font-black text-navy-900">F</span>
            <div>
              <b className="block text-sm tracking-wide text-cream-100">FINB</b>
              <span className="font-mono text-[9px] uppercase tracking-[0.3em] text-white/45">ESTD. 2024 · PLATINUM</span>
            </div>
            <Badge tone="lime">FAKE INTERNATIONAL BANK</Badge>
          </div>

          <h1 className="text-3xl leading-[1.05] text-cream-100 sm:text-5xl">
            The bank that pays you for <span className="aberrate text-flame-400">playing</span>.
          </h1>
          <p className="max-w-xl text-sm text-white/65">
            Earn Credits in eight solo cabinets and six 2–13 player party rooms. Grow Liberals for achievements, unlock six fictional card
            tiers, and send Credits to friends instantly. Everything is a simulation — nothing here is real money and no card works at any
            real checkout.
          </p>

          <div className="flex items-center gap-3">
            <Mascot mood="happy" wave size={104} />
            <MascotBubble tone="flame">
              Pick a username and I will mint your FINBRegular card. It takes about four seconds — I am very efficient at make-believe.
            </MascotBubble>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              { label: 'GUEST RESERVE', value: `${ACCOUNT_RULES.guestReserve} cr` },
              { label: 'GOOGLE LINK', value: `${ACCOUNT_RULES.googleWelcome} cr` },
              { label: 'DISCORD LINK', value: `${ACCOUNT_RULES.discordWelcome} cr` },
              { label: 'PLAYERS PER ROOM', value: '2–13' },
            ].map(item => (
              <div key={item.label} className="jelly-flat px-3 py-2">
                <div className="label">{item.label}</div>
                <div className="font-mono text-sm text-lime-300">{item.value}</div>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} className="space-y-3">
          <Panel glow="flame" className="p-4">
            <div className="label text-flame-400">OPEN AN ACCOUNT</div>
            <h2 className="mt-1 text-xl text-cream-100">Claim your permanent username</h2>
            <p className="mt-1 text-[11px] text-white/55">3–16 characters · letters, numbers and underscores · permanent and unique on this device.</p>

            <div className="mt-3 space-y-2">
              <div>
                <span className="label">CHOOSE YOUR DOOR</span>
                <div className="mt-1.5 grid gap-2 sm:grid-cols-3">
                  {PROVIDER_ORDER.map(door => {
                    const option = PROVIDERS[door];
                    const active = provider === door;
                    return (
                      <motion.button
                        key={door}
                        type="button"
                        onClick={() => {
                          setProvider(door);
                          setError(null);
                        }}
                        whileHover={{ y: -3 }}
                        whileTap={{ scale: 0.98 }}
                        className={`relative overflow-hidden rounded-2xl border p-2.5 text-left transition ${
                          active ? 'border-flame-400/70 bg-flame-500/12 neon-edge-flame' : 'border-white/10 bg-white/4 hover:border-white/25'
                        }`}
                        aria-pressed={active}
                      >
                        <div className={`absolute -right-6 -top-6 h-16 w-16 rounded-full bg-gradient-to-br ${option.tint} to-transparent blur-lg`} />
                        <div className="relative text-base">{option.glyph}</div>
                        <b className="relative mt-1 block text-[11px] text-cream-100">{option.label}</b>
                        <span className="relative mt-0.5 block font-mono text-[10px] text-lime-300">
                          {door === 'guest' ? `${option.welcome} reserved` : `${option.welcome} usable`}
                        </span>
                        <span className="relative mt-0.5 block text-[9px] leading-snug text-white/45">
                          {door === 'guest' ? 'Unlock by linking later' : option.permanent ? 'Permanent account' : ''}
                        </span>
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              <label className="block">
                <span className="label">USERNAME</span>
                <input
                  className="field mt-1"
                  value={username}
                  onChange={event => {
                    setUsername(event.target.value.replace(/\s/g, ''));
                    setError(null);
                  }}
                  onKeyDown={event => event.key === 'Enter' && create()}
                  placeholder="VaultVera"
                  autoComplete="off"
                  maxLength={16}
                />
              </label>
              {username && !USERNAME_PATTERN.test(username) && (
                <p className="text-[11px] text-flame-300">Usernames need at least 3 characters — letters, numbers or underscores only.</p>
              )}

              {needsHandle && (
                <label className="block">
                  <span className="label">{spec.label.toUpperCase()} HANDLE</span>
                  <input
                    className="field mt-1"
                    value={handle}
                    onChange={event => {
                      setHandle(event.target.value);
                      setError(null);
                    }}
                    placeholder={provider === 'discord' ? 'your_discord_handle' : 'your_google_handle'}
                    autoComplete="off"
                  />
                  <span className="mt-1 block text-[10px] leading-relaxed text-white/40">
                    One welcome grant per {spec.label} account, ever. The handle is the key we dedupe on, so a replayed handle adds no Credits.
                  </span>
                </label>
              )}
              {handleIssue && <p className="text-[11px] text-flame-300">{handleIssue}</p>}
              {error && <p className="text-[11px] text-flame-300">{error}</p>}
              <button className="btn btn-flame w-full" onClick={create} disabled={!ready}>
                {provider === 'guest' ? '🏦 Create my guest account' : `${spec.glyph} Create account with ${spec.label}`}
              </button>
              <p className="text-[10px] leading-relaxed text-white/40">
                {provider === 'guest' ? (
                  <>
                    You are creating a <b className="text-white/60">guest account</b> shown as Guest_{username || 'you'}. Guests hold{' '}
                    {ACCOUNT_RULES.guestReserve} reserved Credits that cannot be spent on anything, and the profile is deleted after {ACCOUNT_RULES.guestTtlDays} days
                    unless you link. Linking Google turns the reserve into {ACCOUNT_RULES.googleWelcome} usable Credits; Discord into {ACCOUNT_RULES.discordWelcome}.
                  </>
                ) : (
                  <>
                    A <b className="text-white/60">{spec.label}</b> account is permanent — no 90-day deletion. It arrives with{' '}
                    {spec.welcome} usable Credits added once. Welcome Credits can be spent anywhere but never transferred to another account.
                  </>
                )}
              </p>
            </div>
          </Panel>

          {db.players.length > 0 && (
            <Panel className="p-4">
              <div className="label text-lime-400">PROFILES ON THIS DEVICE</div>
              <div className="mt-2 space-y-2">
                {db.players.map(player => (
                  <div key={player.id} className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/4 p-2.5">
                    <span className="grid h-8 w-8 place-items-center rounded-xl bg-[linear-gradient(140deg,#FF6B00,#00C853)] text-[11px] font-black text-navy-900">
                      {player.username.slice(0, 2).toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <b className="block truncate text-xs text-cream-100">{player.username}</b>
                      <span className="text-[10px] text-white/45">
                        {PROVIDERS[player.provider ?? 'guest'].glyph} {formatCredits(player.credits)} usable
                        {(player.lockedCredits ?? 0) > 0 ? ` · ${formatCredits(player.lockedCredits)} reserved` : ''} · seen {timeAgo(player.lastSeenAt)}
                      </span>
                    </div>
                    <button
                      className="btn btn-ghost-lime !px-2.5 !py-1 text-[10px]"
                      onClick={() => {
                        resumePlayer(player.id);
                        sfx.good();
                      }}
                    >
                      Open
                    </button>
                    <button
                      className="btn btn-ghost !px-2.5 !py-1 text-[10px]"
                      onClick={() => {
                        if (window.confirm(`Wipe ${player.username} from this device? The local backup is the only copy.`)) deleteLocalProfile(player.id);
                      }}
                      aria-label={`Delete ${player.username}`}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-[10px] text-white/40">Switching profiles never merges balances — each username keeps its own vault.</p>
            </Panel>
          )}

          <p className="text-[10px] leading-relaxed text-white/40">
            FINB is a fictional simulation built for entertainment, learning and bragging rights. It is not a bank, holds no real money, issues no
            real cards and connects to no payment network. Profiles live in this browser only; cloud sync is optional and off by default.
            {getDatabase().players.length === 0 ? ' Back up your data from The Bank → Data anytime.' : ''}
          </p>
        </motion.div>
      </div>
    </main>
  );
}
