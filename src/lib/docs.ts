/** Documentation, policies and the interactive sitemap tree. */

export interface DocSection {
  id: string;
  title: string;
  kicker: string;
  body: Array<{ type: 'h' | 'p' | 'list' | 'callout' | 'code'; text: string; items?: string[] }>;
}

export const DOC_SECTIONS: DocSection[] = [
  {
    id: 'guide',
    title: 'Documentation',
    kicker: 'START HERE',
    body: [
      { type: 'p', text: 'FINB — Fake International Bank (FINB ESTD. 2024, Platinum edition) is a fictional, installable game-bank simulation. Credits, Liberals, cards, shares, businesses and heists are game systems inside this app. They are not money, not investments, and not financial products.' },
      { type: 'h', text: '1. Create your account' },
      { type: 'list', text: 'Three doors, all free. Every new profile is minted with a 100 Credit welcome reserve:', items: ['Guest — you appear as Guest_[username]. The 100 Credits are reserved: visible on your card but frozen, unable to buy anything, play anything or be sent anywhere. The profile is deleted after 90 days unless you link.', 'Google — linking converts the reserved 100 Credits into 100 usable Credits, one time only. The account becomes permanent.', 'Discord — linking converts the reserve into 300 usable Credits (the 100 reserve plus a 200 top-up), one time only, and the account becomes permanent.', 'One welcome grant per provider account, forever: the (provider, handle) pair is recorded, so replaying the same Google or Discord account never mints a second grant.'] },
      { type: 'h', text: 'How the credits behave' },
      { type: 'list', text: 'Two rules cover the whole system:', items: ['Welcome Credits — the 100/300 from linking — can be used for anything inside the simulation: games, markets, businesses, card cosmetics. They can never be transferred to another member and can never be tipped away.', 'Earned Credits, Liberals and everything you win from games, missions, referrals and daily rewards are yours to spend or send. Transfers only ever come out of the earned balance.'] },
      { type: 'callout', text: 'This build does not perform Google authentication. A "linked" profile is a device-local claim record, not a verified Google identity.' },
      { type: 'h', text: '2. Your card' },
      { type: 'p', text: 'Every member receives a unique fictional card with its own number, CVV, expiry, holder name and tier. Reveal, copy, freeze and reissue are game controls. No issuer, acquirer, network or checkout exists, and these details can never authorise a real payment.' },
      { type: 'h', text: '3. Ways to earn' },
      { type: 'list', text: 'The floor is generous:', items: ['Daily login — 10 Credits, plus streak bonuses at 7 (+30), 14 (+75), 30 (+200) and 60 (+500) days.', 'Solo games — Vault Rush, Stock Surge, Credit Forge, Daily Heist, Liberals Garden, Cipher Vault, Ticker Sniper, Interest Ladder.', '2–13 player rooms — Bank Heist Party, Credit Clash Arena, Hot Potato Vault, Team Stock War, Liberals Relay, Mafia Bankers.', 'Market Lab — simulated shares, plus small businesses that accrue Credits while the app is closed.', 'Combo multipliers — chaining wins across different games raises your payout up to 3×.', 'Daily and weekly challenges, friend challenges, spectator tips, referrals and seasonal events.'] },
      { type: 'h', text: '4. Liberals' },
      { type: 'p', text: 'Liberals (LP) are achievement points earned by playing, exploring, gardening and being sociable. The name is intentionally playful and carries no political meaning anywhere in this product. Liberals are not transferable and have no cash value.' },
      { type: 'h', text: '5. Card hierarchy' },
      { type: 'list', text: 'Tiers move live as your balance and standing change:', items: ['FINBRegular — every new member', 'FINBBass — 1,300+ Credits', 'FINBGold — 100,000+ Credits', 'FINBMe — holds a live top-10 seat by Credits', 'FINBPlatinum — invited members (25+ Liberals and a seasonal run)', 'FINBSeries — highest authority, granted by Code Cabinet codes'] },
      { type: 'h', text: '6. Multiplayer' },
      { type: 'p', text: 'Arena rooms seat 2–13 players. When the bundled authoritative server (Colyseus) is configured, humans share a room in real time. Without that server the app seats AI floor members so every mode stays playable and reviewable — the lobby always tells you which of the two you are in.' },
      { type: 'h', text: '7. Install it like an app' },
      { type: 'p', text: 'FINB ships as a Progressive Web App. Use your browser’s "Install" or "Add to Home Screen" action for a full-screen, offline-capable app shell.' },
      { type: 'code', text: 'npm run dev      # local app on http://localhost:5173\nnpm run server   # optional Colyseus authoritative rooms on :2567\nnpm test         # economy, card-tier and mission rule tests' },
    ],
  },
  {
    id: 'privacy',
    title: 'Privacy Policy',
    kicker: 'LAST UPDATED · PLATINUM EDITION',
    body: [
      { type: 'h', text: 'The short version' },
      { type: 'p', text: 'This build stores your game profile in your own browser. There is no FINB analytics account, advertising network, tracker or data broker in the app you are holding.' },
      { type: 'h', text: 'What is stored, and where' },
      { type: 'list', text: 'Stored locally in your browser (localStorage key finb-platinum-v2):', items: ['username, account door (guest/Google/Discord), link status, avatar seed', 'Credits (usable, reserved and welcome-grant buckets), Liberals, card credentials, holdings, businesses, missions, achievements, streaks', 'friends, transfers, challenges, private rooms, activity feed', 'settings such as sound preference and onboarding progress'] },
      { type: 'p', text: 'When Supabase is configured, a minimal subset (username, Credits, Liberals, card tier, streak, provider, aggregate stats) is mirrored to that backend so leaderboards and friend feeds can be shared, together with Row Level Security policies that restrict writes to the owning identity. A separate append-only ledger, provider_claims, stores one row per Google/Discord account that banked its welcome grant — the primary key on (provider, subject_id) is what makes the one-grant rule hold across devices. It holds no personal data beyond the handle you linked.' },
      { type: 'h', text: 'What we never collect' },
      { type: 'list', text: 'By design:', items: ['no real payment details, bank credentials or card numbers', 'no passwords, one-time codes or Google credentials', 'no precise location, contacts, camera or microphone access', 'no advertising identifiers'] },
      { type: 'h', text: 'Your controls' },
      { type: 'list', text: 'You stay in charge:', items: ['Delete a profile any time in More → Account, which erases its local records immediately', 'Clear site data in your browser to remove everything FINB stored', 'Export the local database as JSON from More → Account'] },
      { type: 'h', text: 'Children and regions' },
      { type: 'p', text: 'FINB is a cartoon money game with no gambling, no purchases and no cash prizes. Where local law requires a higher age for social features, a deploying operator must add appropriate age gating before launch. No personal data is sold or shared for marketing.' },
    ],
  },
  {
    id: 'terms',
    title: 'Terms & Conditions',
    kicker: 'FICTIONAL SERVICES AGREEMENT',
    body: [
      { type: 'h', text: '1. Acceptance' },
      { type: 'p', text: 'By creating a profile you accept these terms. If you do not accept them, do not use the app.' },
      { type: 'h', text: '2. What FINB is' },
      { type: 'p', text: 'FINB is an entertainment product — a simulation of a bank inside a game. Credits, Liberals, cards, shares, businesses and multiplayer pots are fictional in-app values. Nothing in the app constitutes banking, custody, payment processing, brokerage, investment advice, lending or gambling.' },
      { type: 'h', text: '3. No monetary value' },
      { type: 'p', text: 'Credits and Liberals cannot be bought, sold, cashed out, transferred outside the simulation, or redeemed for anything of value. They may be adjusted, reset or removed at any time as part of balancing the game.' },
      { type: 'h', text: '4. Your account' },
      { type: 'list', text: 'Rules of the floor:', items: ['Choose a username that is lawful and not impersonating a real person or brand', 'Guest profiles expire after 90 days unless linked; linking is what makes the account permanent', 'Welcome grants (100 Google / 300 Discord) are spendable but never transferable, and one provider account can only claim them once', 'Do not attempt to break, overload, or reverse-engineer the multiplayer server', 'Do not harass other players; emote and vote systems are for fun only'] },
      { type: 'h', text: '5. Availability' },
      { type: 'p', text: 'The app is provided "as is" without warranties of uninterrupted availability, data durability or fitness for a particular purpose. Local progress can be lost if you clear your browser storage.' },
      { type: 'h', text: '6. Limitation of liability' },
      { type: 'p', text: 'To the maximum extent permitted by law, the operator is not liable for indirect or consequential loss arising from use of this entertainment product, including lost local game progress or virtual items.' },
      { type: 'h', text: '7. Changes' },
      { type: 'p', text: 'Game rules, reward tables, card tiers, seasons and these terms may change as the product develops. Material changes will be surfaced in-app.' },
    ],
  },
  {
    id: 'accountability',
    title: 'Accountability Statement',
    kicker: 'HOW WE BEHAVE',
    body: [
      { type: 'h', text: 'Separating the game from real finance' },
      { type: 'p', text: 'Every screen that could be mistaken for a real financial product carries an in-game disclosure. Cards say "not a payment card". Markets say "simulation, not financial advice". Multiplayer says whether you are playing humans or AI. Where a claim cannot be verified, we do not make it.' },
      { type: 'h', text: 'Fairness' },
      { type: 'list', text: 'What we commit to:', items: ['Published reward values match what the app actually pays (there is a test suite for it)', 'Multiplayer roles are assigned by server-side randomness, never by purchase', 'No paid advantage: there are no purchases at all', 'Leaderboards label simulated floor members clearly', 'Bots never pretend to be real humans in live rooms'] },
      { type: 'h', text: 'Data honesty' },
      { type: 'p', text: 'We do not claim security properties the offline build does not have. Browser storage is readable by anyone with access to the device. Players must not enter real credentials or financial details anywhere in FINB — the app never asks for them.' },
      { type: 'h', text: 'Accessibility and respect' },
      { type: 'p', text: 'The interface ships with keyboard-reachable controls, reduced-motion support, high-contrast text over the neon world, and a touch-first layout. Reports of inaccessible or distressing content are treated as bugs.' },
      { type: 'h', text: 'Support and escalation' },
      { type: 'p', text: 'Support alias: CNAME cs. In this build that alias is a label for the support channel rather than a live inbox; a deploying operator must connect a monitored address before public launch and publish response targets.' },
    ],
  },
  {
    id: 'legal',
    title: 'Name, Concept & Legal Protection',
    kicker: 'RIGHTS NOTICE',
    body: [
      { type: 'h', text: 'Ownership' },
      { type: 'p', text: 'The FINB name, "Fake International Bank" word mark, "FINB ESTD. 2024" lockup, Platinum edition identity, card tier names (FINBRegular, FINBBass, FINBGold, FINBMe, FINBPlatinum, FINBSeries), the Vault Rush / Credit Forge / Liberals Garden / Mafia Bankers game names, the mascot, copy, artwork and code in this repository are original works. Copyright and other rights in them are asserted by their author from the moment of creation, whether or not formal registration has been completed.' },
      { type: 'h', text: 'Protection without registration' },
      { type: 'p', text: 'Copyright protection arises automatically on fixation of an original work under the Berne Convention and most national laws. Trade-mark rights in many jurisdictions also arise through genuine use in commerce, before or without registration. The absence of a registration certificate therefore does not mean the work is unprotected. Registrations are pursued separately as commercial rollout requires.' },
      { type: 'h', text: 'Prohibited uses' },
      { type: 'list', text: 'Without prior written permission, you must not:', items: ['copy, clone or rebrand the app, its game systems or its distinctive look and feel', 'use the FINB name or confusingly similar marks in apps, tokens, financial products or domains', 'present a modified copy as an official FINB release', 'extract artwork, copy or code for use in another product or for AI training data', 'imply affiliation, endorsement or partnership that does not exist'] },
      { type: 'h', text: 'Honest disclosure' },
      { type: 'p', text: 'FINB is not registered as a bank, money-services business, payment institution, broker, exchange or investment adviser anywhere, and it does not offer those services. It has no depositors, no customer funds and no real financial counterparties. Nothing here is legal advice; a deploying operator must obtain local counsel for trade-mark clearance, consumer, data-protection and financial-promotion compliance before public commercial launch.' },
      { type: 'h', text: 'Enforcement' },
      { type: 'p', text: 'Rights holders may pursue takedown notices, platform complaints, domain disputes and civil remedies for unauthorised copying or passing off. If you believe FINB infringes your rights, contact the support channel first: CNAME cs.' },
    ],
  },
  {
    id: 'support',
    title: 'Support',
    kicker: 'CNAME · CS',
    body: [
      { type: 'h', text: 'How to reach a human' },
      { type: 'p', text: 'Support alias for this project: CNAME cs.' },
      { type: 'callout', text: 'Status: the alias is configured as a label in this build. No DNS CNAME record, mailbox or ticket system is live yet. A deploying operator must point it at a monitored inbox before public launch.' },
      { type: 'h', text: 'Fast answers' },
      { type: 'list', text: 'Common questions:', items: ['Lost progress? It lives in this browser’s localStorage — clearing site data erases it. Use More → Account to export a JSON backup first.', 'Card number not working? It is fictional. It will never work at a checkout, ATM or bank.', 'No live players in a room? Configure NEXT_PUBLIC_COLYSEUS_URL, or keep playing the practice lobby — the AI seats are labelled.', 'Want FINBSeries? Enter FINB-SERIES-0001 in Card Studio → Code Cabinet.', 'Refund requests: there is nothing to refund. FINB takes no payments.'] },
      { type: 'h', text: 'Bug reports that help most' },
      { type: 'list', text: 'Include:', items: ['What you tapped, what you expected, what happened', 'Game or screen name and your tier', 'Device and browser version', 'Whether the room said Practice lobby or Live room'] },
    ],
  },
];

export interface SitemapNode {
  id: string;
  label: string;
  kind: 'screen' | 'overlay' | 'section' | 'doc' | 'system';
  blurb: string;
  children?: SitemapNode[];
}

export const SITEMAP: SitemapNode[] = [
  {
    id: 'home',
    label: 'Lobby',
    kind: 'screen',
    blurb: 'Balance, card preview, season banner, missions and live activity.',
    children: [
      { id: 'card-preview', label: 'Card preview', kind: 'section', blurb: 'Your current tier card with reveal and freeze controls.' },
      { id: 'daily', label: 'Daily reward', kind: 'section', blurb: '10 Credits per day plus 7/14/30/60-day streak bonuses.' },
      { id: 'missions', label: 'Challenges', kind: 'section', blurb: 'Three daily and two weekly challenges, refreshed deterministically.' },
      { id: 'teasers', label: 'Coming soon shelf', kind: 'section', blurb: 'Loan · Community · Integrity · Codes · The Great Liberals Game.' },
    ],
  },
  {
    id: 'arcade',
    label: 'Play Floor',
    kind: 'screen',
    blurb: 'Eight solo games with progression, combos and juice.',
    children: [
      { id: 'vault-rush', label: 'Vault Rush', kind: 'overlay', blurb: 'Phaser 3 endless runner with Risk Zone 3× multipliers.' },
      { id: 'stock-surge', label: 'Stock Surge', kind: 'overlay', blurb: 'Bubble market, 3-second decisions, boom combos.' },
      { id: 'credit-forge', label: 'Credit Forge', kind: 'overlay', blurb: 'Timing strikes in the green window, chain perfects for Liberals.' },
      { id: 'daily-heist', label: 'Daily Heist', kind: 'overlay', blurb: 'Loadout, guards, vault, extraction — new floor every day.' },
      { id: 'liberals-garden', label: 'Liberals Garden', kind: 'overlay', blurb: 'Plant, water, harvest crystals; pests and weather included.' },
      { id: 'quick-games', label: 'Cipher Vault · Ticker Sniper · Interest Ladder', kind: 'overlay', blurb: 'Three fast literacy games for short sessions.' },
    ],
  },
  {
    id: 'arena',
    label: 'Arena',
    kind: 'screen',
    blurb: '2–13 player rooms with Find-A-Friend matchmaking.',
    children: [
      { id: 'heist-party', label: 'Bank Heist Party', kind: 'overlay', blurb: 'Robbers vs Bankers, 90 seconds, raining power-ups.' },
      { id: 'credit-clash', label: 'Credit Clash Arena', kind: 'overlay', blurb: 'Free-for-all with Market Crash events.' },
      { id: 'hot-potato', label: 'Hot Potato Vault', kind: 'overlay', blurb: 'Pass, block, force-pass. Hold it and you pay.' },
      { id: 'team-stock-war', label: 'Team Stock War', kind: 'overlay', blurb: 'Two houses, micro-challenges, biggest surge wins.' },
      { id: 'liberals-relay', label: 'Liberals Relay', kind: 'overlay', blurb: 'Runner plus interference from team-mates.' },
      { id: 'mafia-bankers', label: 'Mafia Bankers', kind: 'overlay', blurb: 'Social deduction with drain, discuss and vote rounds.' },
    ],
  },
  {
    id: 'friends',
    label: 'Friends Zone',
    kind: 'screen',
    blurb: 'Add by username, transfer instantly, challenge, emote, spectate.',
    children: [
      { id: 'circle', label: 'Your circle', kind: 'section', blurb: 'Presence, favourite pinning and emote reactions.' },
      { id: 'transfers', label: 'Instant transfers', kind: 'section', blurb: 'Username-only routing, no card numbers needed.' },
      { id: 'rooms', label: 'Private rooms', kind: 'section', blurb: 'Invite codes, chat and mode selection.' },
      { id: 'spectate', label: 'Spectator lounge', kind: 'section', blurb: 'Watch a live lobby and tip good plays.' },
    ],
  },
  { id: 'ranks', label: 'Leaderboards', kind: 'screen', blurb: 'Live standings by Credits and Liberals, global and friends-only.' },
  { id: 'rewards', label: 'Rewards', kind: 'screen', blurb: 'Streaks, challenges, achievements, referrals and season status.' },
  { id: 'card', label: 'Card Studio', kind: 'screen', blurb: 'Reveal, freeze, reissue, tier ladder, cosmetics and the Code Cabinet.' },
  {
    id: 'more',
    label: 'More',
    kind: 'screen',
    blurb: 'Documentation, policies, sitemap, account and support.',
    children: [
      ...DOC_SECTIONS.map(section => ({ id: `doc-${section.id}`, label: section.title, kind: 'doc' as const, blurb: section.kicker })),
      { id: 'sitemap', label: 'Interactive sitemap', kind: 'section', blurb: 'This map — every screen, overlay and system.' },
      { id: 'account', label: 'Account', kind: 'section', blurb: 'Switch profile, export data, delete profile, cloud status.' },
    ],
  },
  {
    id: 'system',
    label: 'Core systems',
    kind: 'system',
    blurb: 'Cross-cutting systems that power every screen.',
    children: [
      { id: 'economy', label: 'Credits & Liberals', kind: 'system', blurb: 'The two currencies, medals and payout rules.' },
      { id: 'combo', label: 'Combo multipliers', kind: 'system', blurb: 'Cross-game win chains up to 3×.' },
      { id: 'season', label: 'Seasonal events', kind: 'system', blurb: 'Rotating 14-day events with exclusive cosmetics.' },
      { id: 'cloud', label: 'Supabase adapter', kind: 'system', blurb: 'Optional cloud sync, standings and friend feeds.' },
      { id: 'server', label: 'Colyseus server', kind: 'system', blurb: 'Authoritative 2–13 player rooms.' },
      { id: 'pwa', label: 'PWA layer', kind: 'system', blurb: 'Manifest, service worker and installable shell.' },
    ],
  },
];
