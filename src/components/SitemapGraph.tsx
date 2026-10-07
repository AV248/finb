'use client';

import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { SITEMAP, type SitemapNode } from '@/lib/docs';
import { useFinb } from '@/lib/appCtx';
import { GAME_BY_ID } from '@/lib/catalog';
import { Badge, Panel } from './ui';

const KIND_TONE: Record<SitemapNode['kind'], 'plain' | 'flame' | 'lime' | 'magenta'> = {
  screen: 'flame',
  overlay: 'lime',
  section: 'plain',
  doc: 'magenta',
  system: 'plain',
};

const KIND_GLYPH: Record<SitemapNode['kind'], string> = {
  screen: '🧭',
  overlay: '🕹️',
  section: '▫️',
  doc: '📄',
  system: '⚙️',
};

/**
 * Interactive sitemap: every screen, overlay, section, document and system in
 * one expandable tree — and every node is a live shortcut.
 */
export function SitemapGraph() {
  const api = useFinb();
  const [open, setOpen] = useState<string[]>(() => SITEMAP.slice(0, 3).map(node => node.id));
  const [query, setQuery] = useState('');

  const nodes = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return SITEMAP;
    return SITEMAP.map(node => {
      const self = node.label.toLowerCase().includes(term) || node.blurb.toLowerCase().includes(term);
      const children = (node.children ?? []).filter(child => child.label.toLowerCase().includes(term) || child.blurb.toLowerCase().includes(term));
      if (self) return node;
      if (children.length) return { ...node, children };
      return null;
    }).filter(Boolean) as SitemapNode[];
  }, [query]);

  const activate = (node: SitemapNode) => {
    const game = GAME_BY_ID[node.id];
    if (node.kind === 'screen' && ['home', 'arcade', 'arena', 'friends', 'ranks', 'rewards', 'card', 'more'].includes(node.id)) {
      api.navigate(node.id as never);
      return;
    }
    if (game) {
      if (game.mode === 'multi') api.openRoom(game.id, 8);
      else api.openGame(game.id);
      return;
    }
    const doc = ['guide', 'privacy', 'terms', 'accountability', 'legal', 'support'].find(id => id === node.id);
    if (doc) {
      api.openDocuments(doc);
      return;
    }
    api.toast(`${node.label} — ${node.blurb}`, 'info', KIND_GLYPH[node.kind]);
  };

  return (
    <div className="space-y-3">
      <Panel className="flex flex-wrap items-center gap-3 p-3">
        <span className="grid h-10 w-10 place-items-center rounded-2xl bg-lime-500/15 text-lg">🗺️</span>
        <div className="min-w-0 flex-1">
          <div className="label text-lime-300">INTERACTIVE SITEMAP</div>
          <b className="text-sm text-cream-100">Tap any node to travel there</b>
          <p className="text-[11px] text-white/55">Screens, game overlays, sections, policies and systems — the whole building on one page.</p>
        </div>
        <label className="flex items-center gap-2">
          <span className="label">FILTER</span>
          <input className="field !w-44" value={query} onChange={event => setQuery(event.target.value)} placeholder="vault, privacy, ranks…" />
        </label>
      </Panel>

      <div className="space-y-2.5">
        {nodes.map(node => {
          const expanded = open.includes(node.id) || Boolean(query.trim());
          return (
            <Panel key={node.id} className="overflow-hidden p-0">
              <button
                onClick={() => setOpen(current => (current.includes(node.id) ? current.filter(id => id !== node.id) : [...current, node.id]))}
                className="flex w-full items-center gap-3 p-3 text-left"
                aria-expanded={expanded}
              >
                <span className="grid h-9 w-9 flex-none place-items-center rounded-2xl bg-white/6 text-base">{KIND_GLYPH[node.kind]}</span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <b className="text-sm text-cream-100">{node.label}</b>
                    <Badge tone={KIND_TONE[node.kind]}>{node.kind}</Badge>
                    {node.children?.length ? <span className="font-mono text-[10px] text-white/40">{node.children.length} nodes</span> : null}
                  </span>
                  <span className="mt-0.5 block text-[11px] text-white/55">{node.blurb}</span>
                </span>
                <span className={`flex-none font-mono text-[10px] text-white/45 transition-transform ${expanded ? 'rotate-90' : ''}`}>▶</span>
              </button>

              <AnimatePresence initial={false}>
                {expanded && node.children?.length ? (
                  <motion.div key="children" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <div className="relative ml-6 border-l border-dashed border-white/15 pl-4 pr-3 pb-3">
                      <div className="space-y-1.5">
                        {node.children.map(child => (
                          <button
                            key={child.id}
                            onClick={() => activate(child)}
                            className="group flex w-full items-start gap-2.5 rounded-2xl border border-white/8 bg-white/3 p-2.5 text-left transition hover:border-flame-500/50 hover:bg-flame-500/8"
                          >
                            <span className="mt-0.5 text-xs">{KIND_GLYPH[child.kind]}</span>
                            <span className="min-w-0 flex-1">
                              <span className="flex flex-wrap items-center gap-2">
                                <b className="text-xs text-cream-100">{child.label}</b>
                                <Badge tone={KIND_TONE[child.kind]}>{child.kind}</Badge>
                              </span>
                              <span className="mt-0.5 block text-[10px] text-white/50">{child.blurb}</span>
                            </span>
                            <span className="flex-none font-mono text-[10px] text-lime-300 opacity-0 transition group-hover:opacity-100">OPEN ↗</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </Panel>
          );
        })}
      </div>
    </div>
  );
}
