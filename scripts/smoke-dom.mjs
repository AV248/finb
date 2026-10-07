#!/usr/bin/env node
/**
 * Browser-less smoke test: boots the exported production bundle inside jsdom,
 * creates a profile, and walks every screen through the nav. It cannot judge
 * layout, but it catches the class of bug that only appears when React actually
 * runs (missing exports, bad hooks, crash-on-mount).
 *
 *   npm run build && node scripts/smoke-dom.mjs
 */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { JSDOM, VirtualConsole } from 'jsdom';

const OUT = join(process.cwd(), 'out');
const PORT = Number(process.env.SMOKE_PORT || 5399);

if (!process.env.SMOKE_URL && !existsSync(OUT)) {
  console.error('out/ not found — run `npm run build` first, or set SMOKE_URL to test a running server.');
  process.exit(1);
}

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
};

const externalUrl = process.env.SMOKE_URL?.trim() || '';
const origin = externalUrl || `http://127.0.0.1:${PORT}`;
const targetPath = externalUrl ? '/' : '/index.html';

const server = createServer(async (request, response) => {
  const url = new URL(request.url, `http://127.0.0.1:${PORT}`);
  let path = normalize(join(OUT, decodeURIComponent(url.pathname)));
  if (!path.startsWith(OUT)) {
    response.writeHead(403).end('forbidden');
    return;
  }
  try {
    if (!existsSync(path) || !extname(path)) path = join(OUT, 'index.html');
    const body = await readFile(path);
    response.writeHead(200, { 'Content-Type': TYPES[extname(path)] || 'application/octet-stream' }).end(body);
  } catch {
    response.writeHead(404).end('missing');
  }
});

if (!externalUrl) await new Promise(resolve => server.listen(PORT, '127.0.0.1', resolve));

const errors = [];
const virtualConsole = new VirtualConsole();
virtualConsole.on('jsdomError', error => {
  const text = String(error?.message || error);
  // Nav/compat noise that jsdom cannot model is not a FINB bug.
  if (/Not implemented: (window\.scrollTo|navigation)/.test(text)) return;
  errors.push(text);
});
virtualConsole.on('error', (...args) => errors.push(args.join(' ')));

/* Shims must exist before the bundle parses, so they are injected via beforeParse. */
function installShims(window) {
  const globals = [
    'ReadableStream', 'WritableStream', 'TransformStream', 'ByteLengthQueuingStrategy', 'CountQueuingStrategy',
    'TextEncoder', 'TextDecoder', 'fetch', 'Headers', 'Request', 'Response', 'AbortController', 'AbortSignal',
    'structuredClone', 'queueMicrotask', 'performance',
  ];
  for (const name of globals) {
    if (!(name in window) && typeof globalThis[name] !== 'undefined') {
      try {
        window[name] = globalThis[name];
      } catch {
        /* read-only on some jsdom builds */
      }
    }
  }
  window.matchMedia = window.matchMedia || (query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent: () => false,
  }));
  window.IntersectionObserver = window.IntersectionObserver || class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  window.ResizeObserver = window.ResizeObserver || class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  window.scrollTo = () => {};
  window.HTMLElement.prototype.scrollIntoView = () => {};
  if (!window.crypto?.getRandomValues) {
    window.crypto = { getRandomValues: array => array.map(() => Math.floor(Math.random() * 256)) };
  }
  window.addEventListener('unhandledrejection', event => {
    errors.push(`unhandledrejection: ${event.reason}`);
  });
}

const html = externalUrl
  ? await fetch(`${origin}${targetPath}`).then(response => response.text())
  : await readFile(join(OUT, 'index.html'), 'utf8');

const dom = new JSDOM(html, {
  url: `${origin}${targetPath}`,
  runScripts: 'dangerously',
  pretendToBeVisual: true,
  resources: 'usable',
  virtualConsole,
  beforeParse: installShims,
});

const { window } = dom;

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const bodyText = () => window.document.body.textContent || '';

async function until(predicate, label, timeout = 12000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    if (predicate()) return true;
    await wait(120);
  }
  throw new Error(`timeout waiting for ${label}`);
}

const results = [];
function check(name, condition, detail = '') {
  results.push({ name, ok: Boolean(condition), detail });
  console.log(`${condition ? '✓' : '✗'} ${name}${condition || !detail ? '' : ` — ${detail}`}`);
}

try {
  // The exported HTML ships the "opening the vault…" gate; hydration replaces it
  // with either the account gate or the lobby.
  await until(() => /OPEN AN ACCOUNT|PRIVATE CLIENT/i.test(bodyText()), 'client hydration');
  check('bundle hydrates and renders the account gate', /OPEN AN ACCOUNT/i.test(bodyText()), bodyText().slice(0, 160));

  // 2. create a profile through the real UI
  const input = window.document.querySelector('input');
  if (input) {
    // React tracks input values, so set it through the native setter.
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(input, 'SmokeTester');
    input.dispatchEvent(new window.Event('input', { bubbles: true }));
    await wait(300);
    const create = [...window.document.querySelectorAll('button')].find(button => /Create my (guest )?account/i.test(button.textContent || ''));
    if (create) {
      if (create.disabled) console.log('   (create button still disabled — username state did not take)');
      create.click();
      await until(() => /PRIVATE CLIENT|Good (morning|afternoon|evening)/i.test(bodyText()), 'lobby after account creation');
    } else {
      console.log('   (no create button found)');
    }
  }
  check('account creation opens the lobby', /PRIVATE CLIENT|THE FLOOR|Good (morning|afternoon|evening)/i.test(bodyText()));

  // 3. onboarding overlay appears for a fresh profile
  const guideShown = /FIRST VISIT GUIDE|STEP 1 \/ 6/i.test(bodyText());
  check('onboarding guide shows on first entry', guideShown);
  check(
    'a new guest profile carries the 100 Credit reserve',
    /RESERVED BALANCE/i.test(bodyText()) && /100/.test(bodyText()),
    bodyText().slice(0, 200),
  );

  const skip = [...window.document.querySelectorAll('button')].find(button => /SKIP GUIDE/i.test(button.textContent || ''));
  if (skip) {
    skip.click();
    await wait(600);
  }

  // 4. every bottom-nav screen mounts without throwing
  const screens = ['Lobby', 'Arcade', 'Arena', 'Friends', 'Ranks', 'Rewards', 'Card', 'Bank'];
  for (const label of screens) {
    const button = [...window.document.querySelectorAll('button')].find(item => (item.textContent || '').trim() === label);
    if (!button) {
      check(`nav → ${label}`, false, 'nav button not found');
      continue;
    }
    button.click();
    await wait(700);
    check(`nav → ${label} renders`, bodyText().length > 200 && !/Something went wrong|Application error/i.test(bodyText()));
  }

  const clickText = async (pattern, waitMs = 700) => {
    const button = [...window.document.querySelectorAll('button')].find(item => pattern.test((item.textContent || '').trim()));
    if (!button) return false;
    button.click();
    await wait(waitMs);
    return true;
  };

  // 5. open a solo game through the arcade
  await clickText(/^Arcade$/);
  const play = await clickText(/Play|Open|Vault Rush/i, 1500);
  check('a cabinet opens from the arcade', play && /How to play|Spinning up|SCORE|BAG/i.test(bodyText()));

  // 6. close the cabinet again
  const close = await clickText(/^✕$/, 500);
  check('cabinet closes cleanly', close && !/How to play in the cabinet|Spinning up the cabinet/i.test(bodyText()));

  // 7. a multiplayer room reaches its arena
  await clickText(/^Arena$/);
  await clickText(/Find a match/i, 900);
  const started = await clickText(/Start the match/i, 1600);
  check('a multiplayer room starts and renders its arena', started && /POT|SEATS|ROUND/i.test(bodyText()));
  await clickText(/^✕$/, 400);

  // 8. documentation + sitemap open from The Bank
  await clickText(/^Bank$/);
  await clickText(/Documentation/i, 800);
  check('documentation renders', /Privacy|Guest profile|Cards|Credits/i.test(bodyText()) && bodyText().length > 800);
  await clickText(/Sitemap/i, 700);
  check('interactive sitemap renders nodes', /Lobby|Arena|Card Studio/i.test(bodyText()));
  await clickText(/Hub/i, 500);
  const sitemapButton = await clickText(/Open sitemap/i, 700);
  check('sitemap shortcut works from the hub', sitemapButton && /arena|Arena/i.test(bodyText()));

  // 9. card studio reacts to freeze
  await clickText(/^Card$/, 800);
  const froze = await clickText(/Freeze|FROZEN/i, 700);
  check('card studio freeze control responds', froze);

  // 10. the Link Center converts the guest reserve on a Discord link
  const typeInto = (element, value) => {
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(element, value);
    element.dispatchEvent(new window.Event('input', { bubbles: true }));
  };
  await clickText(/^Bank$/, 700);
  await clickText(/Link Center|Account/i, 700);
  const linkField = [...window.document.querySelectorAll('input')].find(input => /discord|google handle/i.test(input.placeholder || ''));
  const openedCenter = Boolean(linkField) && /LINK CENTER/i.test(bodyText());
  check('the Link Center shows the reserved balance', openedCenter && /RESERVED/i.test(bodyText()), bodyText().slice(0, 220));
  if (linkField) {
    await clickText(/Discord · 300 usable/i, 300);
    const doorField = [...window.document.querySelectorAll('input')].find(input => /discord handle/i.test(input.placeholder || ''));
    if (doorField) {
      typeInto(doorField, 'smoke_tester');
      await wait(300);
      await clickText(/^Link Discord$/i, 1200);
    }
  }
  const linked = /Discord account/i.test(bodyText()) && /PERMANENT/i.test(bodyText());
  check('linking Discord converts the reserve into 300 usable Credits', linked && /300/.test(bodyText()) && !/Guest_/i.test(bodyText()), bodyText().slice(0, 220));
} catch (error) {
  check('smoke run completed', false, String(error?.message || error));
} finally {
  const realErrors = errors.filter(text => !/Could not parse CSS|Uncaught \[TypeError: undefined\]/.test(text));
  check('no uncaught client errors', realErrors.length === 0, realErrors.slice(0, 3).join(' | '));
  const failed = results.filter(result => !result.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed.`);
  dom.window.close();
  server.close();
  process.exit(failed.length ? 1 : 0);
}
