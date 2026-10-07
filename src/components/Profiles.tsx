'use client';

import { motion } from 'framer-motion';
import { deleteLocalProfile, resumePlayer, useDatabase } from '@/lib/store';
import { formatCredits, levelFor, timeAgo } from '@/lib/economy';
import { sfx } from '@/lib/audio';
import { Badge, EmptyState, Panel } from './ui';

/** Multi-profile switcher for one device: every username keeps its own vault. */
export function ProfilesOverlay({ onClose }: { onClose: () => void }) {
  const db = useDatabase();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[96] grid place-items-center bg-navy-950/85 p-3 backdrop-blur-md sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Profiles on this device"
    >
      <motion.div initial={{ y: 30, scale: 0.98 }} animate={{ y: 0, scale: 1 }} exit={{ y: 20 }} className="glass neon-edge-flame w-full max-w-2xl overflow-hidden rounded-4xl">
        <div className="flex items-center justify-between gap-3 border-b border-white/10 p-4">
          <div>
            <div className="label text-flame-400">LOCAL PROFILES</div>
            <b className="text-sm text-cream-100">{db.players.length} on this device</b>
          </div>
          <button className="btn btn-ghost !px-3 !py-1.5 text-[11px]" onClick={onClose}>
            ✕ Close
          </button>
        </div>

        <div className="max-h-[70vh] space-y-3 overflow-y-auto p-4 scrollbar-none">
          {db.players.length === 0 ? (
            <EmptyState glyph="🧑‍💼" title="No profiles yet" hint="Create a username from the welcome screen to open a vault." />
          ) : (
            db.players.map(player => {
              const active = player.id === db.currentId;
              const level = levelFor(player.liberals);
              return (
                <Panel key={player.id} glow={active ? 'lime' : 'none'} className="flex flex-wrap items-center gap-3 p-3">
                  <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[linear-gradient(140deg,#FF6B00,#00C853)] text-sm font-black text-navy-900">
                    {player.username.slice(0, 2).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <b className="truncate text-sm text-cream-100">{player.username}</b>
                      {active && <Badge tone="lime">ACTIVE</Badge>}
                      {!player.linked && <Badge tone="magenta">GUEST</Badge>}
                      {player.onboarded && <Badge tone="flame">GUIDED</Badge>}
                    </div>
                    <div className="mt-0.5 flex flex-wrap gap-3 text-[11px] text-white/55">
                      <span className="font-mono">¢ {formatCredits(player.credits)}</span>
                      <span className="font-mono">🌿 {player.liberals}</span>
                      <span>LVL {level.level}</span>
                      <span>card {player.card.tier}</span>
                      <span>seen {timeAgo(player.lastSeenAt)}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {!active && (
                      <button
                        className="btn btn-ghost-lime !px-3 !py-1.5 text-[11px]"
                        onClick={() => {
                          resumePlayer(player.id);
                          sfx.good();
                          onClose();
                        }}
                      >
                        Switch
                      </button>
                    )}
                    <button
                      className="btn btn-ghost !px-3 !py-1.5 text-[11px]"
                      onClick={() => {
                        if (window.confirm(`Wipe ${player.username}? This device is the only copy of that vault.`)) {
                          deleteLocalProfile(player.id);
                          sfx.bad();
                        }
                      }}
                    >
                      🧽 Wipe
                    </button>
                  </div>
                </Panel>
              );
            })
          )}

          <div className="jelly-flat p-3 text-[11px] text-white/55">
            Profiles are stored in this browser only. Use <b className="text-cream-100">The Bank → Data</b> to export a JSON backup before clearing site data,
            switching devices or wiping a profile — deleted vaults cannot be recovered from FINB.
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
