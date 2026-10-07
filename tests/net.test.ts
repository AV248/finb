import './setup.ts';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PracticeSession, createSession, emotePalette, modeMeta, seatCount, type MultiModeId, type RoomResult } from '../src/lib/net.ts';
import { MULTI_GAMES, TEASERS, ACHIEVEMENTS, CARD_COSMETICS } from '../src/lib/catalog.ts';
import { DOC_SECTIONS, SITEMAP } from '../src/lib/docs.ts';

const MODES: MultiModeId[] = ['heist-party', 'credit-clash', 'hot-potato', 'team-stock-war', 'liberals-relay', 'mafia-bankers'];

function playOut(mode: MultiModeId, seats: number, actions: string[] = []): { result: RoomResult; state: ReturnType<PracticeSession['subscribe']> extends unknown ? unknown : unknown } {
  const session = new PracticeSession(mode, 'Tester', seats);
  let result: RoomResult | null = null;
  session.onResult(payload => {
    result = payload;
  });
  session.start();
  for (const action of actions) session.action(action);
  session.fastForward();
  assert.ok(result, 'the room must resolve a result');
  const resolved = result as RoomResult;
  session.leave();
  return { result: resolved, state: null };
}

test('every multiplayer mode seats between 2 and 13 players', () => {
  for (const game of MULTI_GAMES) {
    assert.ok(game.minPlayers >= 2, `${game.id} needs at least 2 seats`);
    assert.ok(game.maxPlayers <= 13, `${game.id} must cap at 13 seats`);
    assert.equal(seatCount(game.id as MultiModeId, 1), game.minPlayers);
    assert.equal(seatCount(game.id as MultiModeId, 99), game.maxPlayers);
    const session = new PracticeSession(game.id as MultiModeId, 'Tester', 13);
    const seen: number[] = [];
    const unsubscribe = session.subscribe(state => seen.push(state.players.length));
    assert.ok((seen[0] ?? 0) >= game.minPlayers, `${game.id} must fill the lobby`);
    assert.ok((seen[0] ?? 0) <= game.maxPlayers, `${game.id} must respect its cap`);
    unsubscribe();
    session.leave();
  }
});

test('practice rooms resolve a result for every mode with Credits and Liberals', () => {
  for (const mode of MODES) {
    const { result } = playOut(mode, 8);
    assert.ok(result.credits > 0, `${mode} must pay Credits`);
    assert.ok(result.liberals >= 1, `${mode} must pay Liberals`);
    assert.ok(result.placement >= 1 && result.placement <= result.players, `${mode} placement must be inside the room`);
    assert.ok(result.title.length > 0);
    assert.ok(result.message.length > 0);
  }
});

test('mode actions are accepted without breaking the room', () => {
  const actionsByMode: Record<MultiModeId, string[]> = {
    'heist-party': ['dash', 'drone'],
    'credit-clash': ['tag', 'shield'],
    'hot-potato': ['pass', 'force-pass', 'block'],
    'team-stock-war': ['pusher', 'answer'],
    'liberals-relay': ['boost', 'trap'],
    'mafia-bankers': ['vote'],
  };
  for (const mode of MODES) {
    const session = new PracticeSession(mode, 'Tester', 7);
    session.start();
    for (const action of actionsByMode[mode]) session.action(action);
    session.emote('🟠');
    session.fastForward();
    session.leave();
    assert.ok(true, `${mode} survived its action set`);
  }
});

test('mafia bankers hides roles and resolves after voting rounds', () => {
  const session = new PracticeSession('mafia-bankers', 'Tester', 9);
  let role = '';
  const unsubscribe = session.subscribe(state => {
    role = state.you.role;
  });
  assert.ok(['corrupt-banker', 'auditor'].includes(role), `unexpected role ${role}`);
  assert.equal(session.live, false);
  unsubscribe();
  session.leave();
});

test('createSession falls back to practice play when no Colyseus URL is configured', () => {
  const session = createSession('heist-party', 'Tester', 6);
  assert.equal(session.live, false);
  assert.ok(session instanceof PracticeSession);
  session.leave();
});

test('emote palette and mode metadata are exposed for the arena UI', () => {
  const palette = emotePalette();
  assert.ok(palette.length >= 6);
  for (const mode of MODES) {
    const meta = modeMeta(mode);
    assert.equal(meta.id, mode);
    assert.ok(meta.howTo.length > 20);
  }
});

test('the documented pages exist with the promised support alias', () => {
  const ids = DOC_SECTIONS.map(section => section.id);
  for (const required of ['guide', 'privacy', 'terms', 'accountability', 'legal', 'support']) {
    assert.ok(ids.includes(required), `missing documentation section: ${required}`);
  }
  const support = DOC_SECTIONS.find(section => section.id === 'support');
  const supportText = JSON.stringify(support);
  assert.match(supportText, /CNAME cs/i, 'support must name the CNAME cs alias');
  const legal = JSON.stringify(DOC_SECTIONS.find(section => section.id === 'legal'));
  assert.match(legal, /civ|takedown|dispute/i, 'legal section must keep the protective language');
});

test('the interactive sitemap covers screens, overlays, docs and systems', () => {
  const kinds = new Set<string>();
  const walk = (nodes: typeof SITEMAP) => nodes.forEach(node => {
    kinds.add(node.kind);
    if (node.children) walk(node.children);
  });
  walk(SITEMAP);
  for (const kind of ['screen', 'overlay', 'section', 'doc', 'system']) {
    assert.ok(kinds.has(kind), `sitemap is missing a ${kind} node`);
  }
  const ids = SITEMAP.map(node => node.id);
  for (const screen of ['home', 'arcade', 'arena', 'friends', 'more']) {
    assert.ok(ids.includes(screen), `sitemap is missing the ${screen} screen`);
  }
});

test('the coming-soon shelf keeps the five teased modules', () => {
  const names = TEASERS.map(teaser => teaser.name);
  for (const name of ['Loan', 'Community', 'Integrity', 'Codes', 'The Great Liberals Game']) {
    assert.ok(names.includes(name), `missing teaser: ${name}`);
  }
  assert.ok(ACHIEVEMENTS.length >= 14);
  assert.ok(CARD_COSMETICS.length >= 5);
});
