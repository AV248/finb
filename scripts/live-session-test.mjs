#!/usr/bin/env node
/**
 * Live multiplayer check: two real clients join the same Colyseus room, play a
 * round, and both must receive a result. Requires the arena server:
 *
 *   npm run server &        # ws://127.0.0.1:2567
 *   npm run test:live
 */
import { Client } from '@colyseus/sdk';

const url = process.env.COLYSEUS_URL || 'ws://127.0.0.1:2567';
const mode = 'heist-party';
const a = new Client(url);
const b = new Client(url);

const roomA = await a.joinOrCreate(`finb_${mode}`, { username: 'LiveTesterA', players: 6, mode });
const roomB = await b.joinOrCreate(`finb_${mode}`, { username: 'LiveTesterB', players: 6, mode });
console.log('room id:', roomA.roomId, '| same room:', roomA.roomId === roomB.roomId);

let stateA = null, stateB = null, resultA = null, resultB = null, events = 0;
roomA.onMessage('state', s => { stateA = s; });
roomA.onMessage('result', r => { resultA = r; });
roomA.onMessage('event', () => { events += 1; });
roomB.onMessage('state', s => { stateB = s; });
roomB.onMessage('result', r => { resultB = r; });

await new Promise(r => setTimeout(r, 600));
console.log('seats A:', stateA?.players?.length, 'humans:', stateA?.humanCount, 'bots:', stateA?.botCount);
roomA.send('start');
await new Promise(r => setTimeout(r, 400));
roomA.send('action', { type: 'dash' });
roomA.send('action', { type: 'drone' });
roomB.send('action', { type: 'tag' });
roomA.send('emote', { symbol: '🟠' });
await new Promise(r => setTimeout(r, 900));
console.log('phase:', stateA?.phase, 'secondsLeft:', Math.round(stateA?.secondsLeft ?? 0), 'events:', events);
console.log('A credits:', stateA?.you?.credits, '| B sees A:', stateB?.players.some(p => p.name === 'LiveTesterA'));
console.log('headline:', stateA?.headline);
// fast-forward: shrink the clock
const started = Date.now();
while (!resultA && Date.now() - started < 150000) await new Promise(r => setTimeout(r, 500));
console.log('result A:', resultA && { won: resultA.won, credits: resultA.credits, liberals: resultA.liberals, placement: resultA.placement, players: resultA.players });
if (!resultB) console.log('result B was not delivered');
console.log('result B received:', Boolean(resultB));
await roomA.leave();
await roomB.leave();
process.exit(resultA && resultB ? 0 : 1);
