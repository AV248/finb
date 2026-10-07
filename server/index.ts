/**
 * FINB Arena server — authoritative Colyseus rooms for 2–13 player modes.
 *
 *   npm run server            # ws://0.0.0.0:2567
 *   PORT=3000 npm run server
 *
 * Point the PWA at it with NEXT_PUBLIC_COLYSEUS_URL (see .env.example). Without
 * that variable the app plays the same six modes against practice seats, so the
 * build never depends on this process.
 *
 * Security: the server is authoritative and stateless across restarts. It stores
 * no personal data, accepts only usernames, and is meant to sit behind TLS
 * (wss://) with a reverse proxy in production.
 */
import { Server } from '@colyseus/core';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { FinbRoom, MODES, MODE_SEATS } from './rooms/FinbRoom.ts';

const port = Number(process.env.PORT || 2567);
const hostname = process.env.HOST || '0.0.0.0';

const transport = new WebSocketTransport({
  pingInterval: 8000,
  pingMaxRetries: 3,
});

const gameServer = new Server({ transport });

for (const mode of MODES) {
  const seats = MODE_SEATS[mode];
  // One room class, one definition per mode: finb_<mode> matches the client's
  // joinOrCreate call in src/lib/net.ts.
  gameServer.define(`finb_${mode}`, FinbRoom, { mode }).filterBy(['mode']);
  console.log(`  ✓ finb_${mode.padEnd(16)} ${seats.min}–${seats.max} seats · ${seats.seconds}s rounds`);
}

gameServer.onShutdown(() => {
  console.log('[FINB] arena shutting down — rooms closed cleanly.');
});

await gameServer.listen(port, hostname);
console.log(`\nFINB arena listening on ws://${hostname}:${port}`);
console.log('Set NEXT_PUBLIC_COLYSEUS_URL to this address to enable live multiplayer.\n');
