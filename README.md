# FINB — Fake International Bank

**FINB ESTD. 2024 · Platinum edition.** A fictional, installable game-bank PWA: earn **Credits**, grow **Liberals**, climb six card tiers, and play 2–13 player party rooms. Built to feel like a native app, not a website.

> **Simulation notice.** FINB is not a bank. It holds no real money, issues no real cards, performs no card processing or payments, has no Google authentication, and provides no legal protection. Credits and Liberals are game points with no cash value. All "floor members" you meet are simulated. Guest profiles expire after 90 days unless linked. This is disclosed in-app too (Documentation → Privacy → Terms → Accountability → Support).

---

## Stack

| Layer | Choice |
| --- | --- |
| App | Next.js 15 (App Router) · React 19 · TypeScript 5.9 |
| Styling | Tailwind CSS v4 (`@theme` tokens) + custom jelly/neon layer |
| Motion | Framer Motion 12 |
| Games | Phaser 3 (Vault Rush) + canvas/DOM cabinets |
| Cloud (optional) | Supabase (Auth · Postgres · Realtime) with RLS |
| Multiplayer (optional) | Colyseus `@colyseus/core` 0.18 authoritative rooms, `@colyseus/sdk` client |
| PWA | Hand-written service worker, manifest, generated icons (sharp) |
| Tests | `tsx --test` unit suites + a jsdom boot/smoke harness + a live two-client room check |

Everything works **offline by default**. Cloud services are opt-in through environment variables, and the UI always tells the player which mode it is in (`Offline device build` vs `Cloud linked`, `Practice seats` vs `Live room`).

---

## Quick start

```bash
npm install
npm run dev            # http://localhost:5173  (binds 0.0.0.0 for LAN/dev-proxy use)
```

Other scripts:

```bash
npm run build          # static production export → out/
npm start              # serve out/ on :5173 (static, SPA fallback)
npm run typecheck      # tsc --noEmit
npm test               # economy, tier, store, multiplayer and content rules
npm run smoke          # build first, then boots out/ in jsdom and walks the app
npm run server         # optional Colyseus arena on ws://0.0.0.0:2567
npm run test:live      # with the server running: two clients, one room, real result
npm run icons          # regenerate public/icons/* from the vector brand mark
```

Create `.env.local` from `.env.example` to switch on Supabase and/or Colyseus.

---

## What is in the box

### Account and economy

- Guest or linked profiles; guests display as `Guest_[username]` and are pruned after **90 days**.
- Linking a Play Games tag pays a one-time **+100 Credits** (device-local claim — no Google sign-in is performed).
- Daily login **+10 Credits**, with streak bonuses at 7 (**+30**), 14 (**+75**), 30 (**+200**) and 60 (**+500**) days.
- Referrals: referrer **+100**, new linked member **+200**.
- Combo multipliers: chaining wins **across different games** inside a 6-hour window raises payouts up to **×3**.
- Daily (3) and weekly (2) challenges, friend challenges, spectator tips, and 14-day seasons with **double-Credit weekends**.

### Card hierarchy

`FINBRegular` → `FINBBass` (1,300+ Credits) → `FINBGold` (100,000+ Credits) → `FINBMe` (live top-10 by Credits) → `FINBPlatinum` (invitation: 25+ Liberals or an operator invite) → `FINBSeries` (code-granted highest authority). Cards carry fictional number/CVV/expiry/holder and can be revealed, frozen and reissued.

### Games

**Solo (8):** Vault Rush (Phaser endless runner with 3× Risk Zones), Stock Surge (bubble market, Market Boom combos), Credit Forge (green-window timing, tiers, auto-miners), Daily Heist (a floor that reseeds every day, loadouts, stars), Liberals Garden (plant/water/harvest, pests, weather), Cipher Vault, Ticker Sniper, Interest Ladder.

**Multiplayer (6, 2–13 players):** Bank Heist Party, Credit Clash Arena, Hot Potato Vault, Team Stock War, Liberals Relay Race, Mafia Bankers — with Find-A-Friend matchmaking, emotes and a shared pot.

### Bank systems

Live leaderboards (global + friends), friends zone with instant transfers, challenges, private rooms and a shared feed, spectator mode with tipping, Market Lab (simulated shares), Vault Ventures (small businesses that accrue while away), spectator-safe seasonal cosmetics, and the Coming Soon shelf: **Loan · Community · Integrity · Codes · The Great Liberals Game**.

### Production pages

Interactive Sitemap · full Documentation · Privacy Policy · Terms & Conditions · Accountability Statement · Support (alias **CNAME cs**, marked honestly as a label rather than a live inbox in this build).

---

## PWA

`public/manifest.webmanifest` + `public/sw.js` (network-first navigations, cache-first immutable assets, offline fallback) + generated icons in `public/icons/`. Install from Chrome/Edge ("Install") or iOS Safari ("Add to Home Screen"). Manifest shortcuts deep-link to `/?screen=arcade|arena|rewards|card`.

Since the app is a static export, security headers live in `public/_headers` (Netlify/Cloudflare Pages style) instead of `next.config.ts`:

```
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
X-Frame-Options: SAMEORIGIN
Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()
```

---

## Enabling live multiplayer (optional)

```bash
npm run server                    # ws://0.0.0.0:2567, six rooms
NEXT_PUBLIC_COLYSEUS_URL=ws://your-host:2567    # in .env.local
npm run test:live                 # verifies two humans share a room and both get a result
```

The server is authoritative: clients send intents (`dash`, `tag`, `pass`, `vote`, …) and the server owns every number, so a modified client cannot mint Credits. Without the URL, the same six modes run against practice seats so nothing is ever dead.

## Enabling cloud sync (optional)

1. Apply `supabase/schema.sql` (tables + Row Level Security + `leaderboard` view).
2. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
3. Optionally seed a fictional ladder and verify policies:

```bash
SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… node scripts/seed-supabase.mjs   # dev/CI only
NEXT_PUBLIC_SUPABASE_URL=… NEXT_PUBLIC_SUPABASE_ANON_KEY=… node scripts/test-supabase.mjs
```

The browser only ever holds the **anon** key; writes are scoped to `auth.uid()` by RLS (anonymous sessions are used when no social provider is configured). The service role key is required *only* by the seeding script and must never be shipped or committed.

---

## Project map

```
src/app/            layout (metadata, manifest, theme) + page (provider + PWA boot)
src/lib/            economy, catalog, store (localStorage vault), net (rooms), supabase,
                    docs (policies + sitemap data), audio, FinbProvider (app shell)
src/components/     UI kit, mascot, effects, onboarding, card, GameModal, sitemap,
                    AccountGate, TopBar, AppNav, Spectator, Profiles, InstallPrompt
src/components/screens/   Home · Arcade · Arena · Friends · Ranks · Rewards · CardStudio · More
src/games/          solo cabinets + games/multi/* stages
server/             Colyseus arena (rooms/FinbRoom.ts) — optional
supabase/           schema.sql
scripts/            icons, jsdom smoke, live room check, Supabase helpers
tests/              economy · store · net/content rules
```

## Verification status

- `npm run typecheck` — clean.
- `npm test` — 34 passing (economy values, tier ladder, store flows, multiplayer contract, docs/sitemap/content).
- `npm run build` — static export, ~110 kB first-load JS for the app route.
- `npm run smoke` — jsdom boot: hydration, account creation, onboarding, all eight screens, a solo cabinet, a multiplayer room, docs/sitemap and card controls.
- `npm run test:live` — two real clients joined one Colyseus room and both received results.

Not verified in this environment: real-device rendering, Lighthouse scores and touch gestures (no browser available here). Layout quality on device is the one thing worth eyeballing before a public launch.

## Legal & support

Support alias **CNAME cs** — recorded in Documentation, the Accountability Statement and the sitemap. In this build it is a label, not a connected mailbox; a deploying operator must point it at a monitored inbox (and publish response targets) before a public launch. FINB is fictional entertainment: no real banking, no payment processing, no investment advice, no gambling, and no purchases of any kind.
