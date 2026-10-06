# FINB Platinum — Fake International Bank

FINB is a fictional, browser-based game economy — **not a bank, payment service, brokerage, or real multiplayer network**. It is built as a polished interactive prototype in React and Vite.

## Run locally

```bash
npm install
npm run dev
```

Vite prints the local development URL. To make a production bundle:

```bash
npm run build
npm run preview
npm test
```

## What is playable

- **Profiles:** create a custom guest handle (`Guest_[username]`, zero starting Credits) or a linked-demo handle. Existing local profiles can be resumed or switched between. Unlinked guests are pruned from the browser after 90 days from creation.
- **Play Games demo link:** entering a unique tag simulates linking; there is no Google Play Games OAuth, API request, account verification, or password collection. The first unclaimed tag in this browser receives 100 Credits once. A later guest-to-linked upgrade can claim that same one-time bonus.
- **Platinum game card:** a unique 16-digit fictional number, CVV, expiry, holder, reveal/copy, freeze and reissue controls. It cannot authorize purchases or connect to a card network.
- **Credits & Liberals:** manual daily login claims award 10 Credits; consecutive day 7/14/30/60 bonuses award an additional 30/75/200/500 Credits. Liberals (LP) are non-transferable, non-political achievement points.
- **Eight games:** reaction timing, a four-digit code puzzle, money-literacy quiz, memory sequence, tap sprint, virtual-credit dice game, simulated market forecast, and FAF-style random match. Match opponents may be local profiles or visibly identified simulated floor characters.
- **Market lab:** five random-walk share prices, whole-share buy/sell orders, portfolio basis/P&L, and three small yield-generating business simulations.
- **Social:** local username directory, friends, simulated player leaderboard, username-based Credit transfers, invitation codes and linked-profile referral rewards.
- **In-app papers:** getting-started guide, privacy, accountability, terms, brand/IP note, and support status. The same build includes explicit warnings that this is a simulation.

## Data and privacy

All app profiles, scores, cards, trades, market quotes, referral records, and achievements are stored in the current browser's `localStorage` under `finb-platinum-local-v1`. There is no application server, cross-device sync, encryption, secure authentication, verified identity, or server-side economy. Anyone with access to the browser profile or developer tools may inspect or alter local data. Clearing site data can erase progress. Do not enter a real Google identifier, password, payment detail, or other sensitive information.

A profile marked “linked” is only tagged as linked in this demo; the tag is locally entered and is not verified by Google. The referral directory and random-match lobby are similarly confined to profiles on the same device plus NPC-style simulated players. Credits, Liberals, card data, shares, and business yield have no real-world monetary value.

## Legal and brand notes

The in-app legal pages are user-facing prototype disclosures, **not jurisdiction-specific legal advice or a substitute for legal review**. No trademark or patent registration is claimed. A notice cannot guarantee exclusive rights in a name or a general idea. Copyright treatment, trademark clearance, and patent eligibility depend on the jurisdiction and facts; consult qualified local counsel and perform clearance before any public launch.

“CNAME: cs” is shown as the requested support label only. No CNAME record, support inbox, legal operator, governing-law jurisdiction, or production contact has been configured.

## Before a production launch

1. Choose a hosting/domain operator and publish reviewed privacy, consumer, accessibility, and terms documents for target jurisdictions.
2. Add a real backend, database, authentication, server-side uniqueness, authorization, rate limits, audit logs, abuse prevention, backups, and deletion/retention controls.
3. Integrate Google Play Games using its supported identity flow and verified OAuth configuration; do not accept a typed tag as proof of identity.
4. Decide how public multiplayer, friend discovery, referrals, transfers, and leaderboards will work; validate every balance change server-side and protect against duplicate claims and replay.
5. Do not issue a payment card or handle real funds without licensed partners, payment compliance, security review, and the relevant legal approvals.
6. Review all game mechanics and copy for applicable consumer, gambling, privacy, and financial-promotion rules. Vault 21 is currently virtual-credit-only.
7. Complete name, domain, app-store, and trademark clearance; record authorship/licences for original assets and seek IP counsel.

## Stack

- React + React DOM for interactive, stateful pages and games.
- Vite for the development server and production bundling.
- Plain CSS for the FINB Platinum visual system; no UI or chart library is required.
