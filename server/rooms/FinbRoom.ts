/**
 * FINB Arena — authoritative Colyseus room.
 *
 * One room class serves all six multiplayer modes (`finb_heist-party`,
 * `finb_credit-clash`, …). The server owns every number: bags, steals, freezes,
 * votes and payouts. Clients only send intents (`dash`, `tag`, `pass`, `vote`),
 * so a modified client cannot mint Credits.
 *
 * Protocol (matches src/lib/net.ts ColyseusSession exactly):
 *   client → server : 'start' | 'action' {type, ...payload} | 'emote' {symbol}
 *   server → client : 'state'  RoomState snapshot (@4 Hz)
 *                     'event'  RoomEvent  (append to the play-by-play)
 *                     'result' RoomResult (sent individually at the final whistle)
 *
 * The seven-seat practice simulation in src/lib/net.ts mirrors these rules so
 * the game is fully playable offline; keep the two in step when tuning numbers.
 */
import { Room, type Client } from '@colyseus/core';

export type MultiModeId = 'heist-party' | 'credit-clash' | 'hot-potato' | 'team-stock-war' | 'liberals-relay' | 'mafia-bankers';

export const MODES: MultiModeId[] = ['heist-party', 'credit-clash', 'hot-potato', 'team-stock-war', 'liberals-relay', 'mafia-bankers'];

export const MODE_SEATS: Record<MultiModeId, { min: number; max: number; seconds: number }> = {
  'heist-party': { min: 4, max: 13, seconds: 90 },
  'credit-clash': { min: 4, max: 13, seconds: 90 },
  'hot-potato': { min: 3, max: 13, seconds: 90 },
  'team-stock-war': { min: 4, max: 13, seconds: 90 },
  'liberals-relay': { min: 3, max: 8, seconds: 90 },
  'mafia-bankers': { min: 7, max: 13, seconds: 240 },
};

interface Player {
  id: string;
  name: string;
  team: 'orange' | 'green';
  kind: 'human' | 'bot';
  credits: number;
  lp: number;
  score: number;
  frozen: number;
  potato: boolean;
  shield: number;
  cooldown: number;
  role: string;
  alive: boolean;
  emote: string | null;
  status: string;
}

interface RoomEvent {
  id: string;
  kind: 'steal' | 'freeze' | 'pass' | 'boom' | 'crash' | 'surge' | 'collect' | 'vote' | 'system' | 'tip';
  text: string;
  at: number;
  bonus?: number;
  playerId?: string;
}

const BOT_NAMES = [
  'LedgerFox', 'MicaMint', 'OrbitOllie', 'VaultVera', 'NovaKite', 'PipPenny', 'GlassGoblin', 'TallyTiger',
  'BrassBee', 'CoinCactus', 'IsoInterest', 'SproutSage', 'PayoutPia', 'LedgerLark', 'BountyBram',
];

const INSULTS = ['is sprinting for the vault', 'froze two bankers', 'just found a shortcut', 'is hoarding bags', 'called the surge early', 'is definitely plotting'];

const pick = <T,>(items: T[]): T => items[Math.floor(Math.random() * items.length)];

export class FinbRoom extends Room {
  private mode: MultiModeId = 'heist-party';
  private players = new Map<string, Player>(); // sessionId (or bot id) → player
  private sessionToPlayer = new Map<string, string>();
  private events: RoomEvent[] = [];
  private votes: Record<string, number> = {};
  private tickCount = 0;
  private started = false;
  private finished = false;
  private secondsLeft = 0;
  private pot = 0;
  private round = 1;
  private headline = 'Warming up the room.';
  private prompt: { question: string; options: string[]; answer: number } | null = null;

  async onCreate(options: { mode?: MultiModeId | string; players?: number; username?: string } = {}) {
    const requested = (options.mode as MultiModeId) ?? (this.roomName.replace(/^finb_/, '') as MultiModeId);
    this.mode = MODES.includes(requested) ? requested : 'heist-party';
    const config = MODE_SEATS[this.mode];
    const seats = Math.max(config.min, Math.min(config.max, Number(options.players) || config.min));
    this.maxClients = seats;

    for (let index = 0; index < seats; index += 1) {
      const botId = `bot-${index}-${Math.random().toString(36).slice(2, 7)}`;
      this.players.set(botId, {
        id: botId,
        name: BOT_NAMES[index % BOT_NAMES.length],
        team: index % 2 === 0 ? 'orange' : 'green',
        kind: 'bot',
        credits: 120,
        lp: 0,
        score: 0,
        frozen: 0,
        potato: false,
        shield: 0,
        cooldown: 0,
        role: 'member',
        alive: true,
        emote: null,
        status: pick(INSULTS),
      });
    }
    this.round = 1;
    this.headline = this.mode === 'mafia-bankers' ? 'Roles are being dealt secretly.' : `${seats} seats opening. The pot fills at the bell.`;
    this.log('system', `${seats}-seat ${this.mode} room created. Bots are holding seats until humans arrive.`);

    this.onMessage('start', () => this.begin());
    this.onMessage('action', (client, message: { type?: string } & Record<string, unknown>) => this.applyAction(client, message));
    this.onMessage('emote', (client, message: { symbol?: string }) => {
      const player = this.playerFor(client);
      if (!player) return;
      player.emote = String(message?.symbol ?? '🟠').slice(0, 4);
      this.clock.setTimeout(() => {
        player.emote = null;
      }, 1600);
      this.broadcast('state', this.stateSnapshot());
    });
  }

  onAuth(_client: Client, options: { username?: string } = {}) {
    const username = String(options?.username ?? '').trim();
    if (!username) throw new Error('A username is required to take a seat.');
    if (username.length > 24) throw new Error('Username too long.');
    return { username, joinedAt: Date.now() };
  }

  onJoin(client: Client, options: { username?: string } = {}) {
    const username = String(options?.username ?? 'Member').slice(0, 24);
    // Claim a bot seat so the room always honours the requested seat count.
    const botSeat = [...this.players.entries()].find(([, player]) => player.kind === 'bot');
    const player: Player = botSeat
      ? { ...botSeat[1], id: client.sessionId, name: username, kind: 'human', emote: null, status: 'ready' }
      : {
          id: client.sessionId,
          name: username,
          team: 'orange',
          kind: 'human',
          credits: 120,
          lp: 0,
          score: 0,
          frozen: 0,
          potato: false,
          shield: 0,
          cooldown: 0,
          role: 'member',
          alive: true,
          emote: null,
          status: 'ready',
        };
    if (botSeat) this.players.delete(botSeat[0]);
    this.players.set(client.sessionId, player);
    this.sessionToPlayer.set(client.sessionId, client.sessionId);
    if (this.mode === 'mafia-bankers') this.assignMafiaRoles();
    // Give the client a moment to register its message handlers before the
    // first snapshot lands, otherwise the join payload is dropped with a warning.
    this.clock.setTimeout(() => {
      this.log('system', `${username} took a seat (${this.players.size} in the room).`);
      client.send('state', this.stateSnapshot(client.sessionId));
      this.broadcast('state', this.stateSnapshot());
    }, 250);
  }

  onLeave(client: Client) {
    const player = this.playerFor(client);
    if (!player) return;
    // Hand the seat to a bot so the room keeps its seat count mid-match.
    player.kind = 'bot';
    player.status = pick(INSULTS);
    player.id = `bot-${client.sessionId.slice(0, 6)}`;
    this.players.delete(client.sessionId);
    this.players.set(player.id, player);
    this.sessionToPlayer.delete(client.sessionId);
    this.log('system', `${player.name} left the floor — a practice member filled in.`);
    this.broadcast('state', this.stateSnapshot());
  }

  /* ------------------------------------------------------------------ *
   * Match control
   * ------------------------------------------------------------------ */
  private begin() {
    if (this.started) return;
    this.started = true;
    this.secondsLeft = MODE_SEATS[this.mode].seconds;
    this.pot = this.players.size * 45;
    this.headline = 'The bell has rung.';
    this.log('system', `Match started with ${this.players.size} players. Pot: ${this.pot} Credits.`);
    if (this.mode === 'mafia-bankers') this.assignMafiaRoles();
    if (this.mode === 'heist-party') this.assignHeistRoles();
    const holder = pick([...this.players.values()]);
    holder.potato = true;
    this.broadcast('state', this.stateSnapshot());
    this.setSimulationInterval(() => this.tick(), 250);
  }

  private finish() {
    if (this.finished) return;
    this.finished = true;
    this.setSimulationInterval(undefined);
    const players = [...this.players.values()];
    const ordered = [...players].sort((a, b) => b.credits + b.lp * 4 - (a.credits + a.lp * 4));
    const potShare = Math.round(this.pot * 0.55);
    for (const [sessionId, player] of this.players) {
      const placement = ordered.findIndex(item => item.id === player.id) + 1;
      const base =
        this.mode === 'heist-party' || this.mode === 'credit-clash'
          ? Math.max(0, player.credits - 120)
          : this.mode === 'hot-potato'
            ? Math.round(potShare / Math.max(1, placement))
            : this.mode === 'team-stock-war'
              ? Math.round(player.score * 1.4)
              : this.mode === 'liberals-relay'
                ? player.lp * 15
                : Math.round(player.credits * 0.6);
      const won = placement === 1 || placement <= Math.ceil(ordered.length / 3);
      const result = {
        won,
        credits: Math.min(900, Math.max(20, Math.round(base + (won ? 120 : 0)))),
        liberals: Math.max(1, Math.round(player.lp + player.score / 2 + (won ? 6 : 2))),
        placement,
        players: players.length,
        title: `${this.mode} · ${placement === 1 ? '1st place' : `#${placement} of ${players.length}`}`,
        message:
          placement === 1
            ? `Room won with ${players.length} players on the floor.`
            : `${ordered[0].name} took the room. You finished ${placement} of ${players.length}.`,
      };
      const client = this.clients.find(item => item.sessionId === sessionId);
      if (client) client.send('result', result);
    }
    this.broadcast('state', this.stateSnapshot());
  }

  /* ------------------------------------------------------------------ *
   * Simulation
   * ------------------------------------------------------------------ */
  private tick() {
    if (this.finished) return;
    this.tickCount += 1;
    this.secondsLeft = Math.max(0, this.secondsLeft - 0.25);
    for (const player of this.players.values()) {
      player.cooldown = Math.max(0, player.cooldown - 0.25);
      player.frozen = Math.max(0, player.frozen - 0.25);
      player.shield = Math.max(0, player.shield - 0.25);
      if (player.frozen > 0) player.status = 'frozen in place';
    }

    switch (this.mode) {
      case 'heist-party':
        this.tickHeist();
        break;
      case 'credit-clash':
        this.tickClash();
        break;
      case 'hot-potato':
        this.tickPotato();
        break;
      case 'team-stock-war':
        this.tickStockWar();
        break;
      case 'liberals-relay':
        this.tickRelay();
        break;
      default:
        this.tickMafia();
        break;
    }

    if (this.tickCount % 2 === 0) this.broadcast('state', this.stateSnapshot());
    if (this.secondsLeft <= 0) this.finish();
  }

  private tickHeist() {
    const players = [...this.players.values()];
    const robbers = players.filter(player => player.role === 'robber' && player.frozen <= 0);
    const bankers = players.filter(player => player.role === 'banker' && player.frozen <= 0);
    for (const robber of robbers) {
      if (Math.random() < (robber.kind === 'human' ? 0.3 : 0.42)) {
        const bag = 12 + Math.round(Math.random() * 22);
        robber.credits += bag;
        robber.score += 1;
      }
    }
    for (const banker of bankers) {
      if (Math.random() < (banker.kind === 'human' ? 0.26 : 0.4)) {
        const target = robbers.filter(player => player.shield <= 0)[0];
        if (target) {
          target.frozen = 3;
          banker.score += 1;
          this.log('freeze', `${banker.name} froze ${target.name} for 3s.`, target.id);
        }
      }
    }
    if (this.tickCount % 24 === 0) {
      const lucky = pick(players);
      lucky.shield = 6;
      this.log('surge', `Power-up drop: ${lucky.name} grabbed a temporary shield.`, lucky.id);
    }
  }

  private tickClash() {
    const players = [...this.players.values()];
    const active = players.filter(player => player.frozen <= 0 && player.alive);
    for (const player of active) {
      if (Math.random() < (player.kind === 'human' ? 0.18 : 0.3)) {
        const targets = active.filter(other => other.id !== player.id && other.shield <= 0 && other.credits > 0);
        const target = targets.length ? pick(targets) : null;
        if (!target) continue;
        const stolen = Math.round(target.credits * 0.14);
        if (stolen <= 0) continue;
        target.credits -= stolen;
        player.credits += stolen;
        player.score += 1;
        this.log('steal', `${player.name} siphoned ${stolen} Credits from ${target.name}.`, target.id, stolen);
      }
    }
    if (this.tickCount % 48 === 0) {
      for (const player of players) if (player.shield <= 0) player.credits = Math.round(player.credits * 0.5);
      this.log('crash', 'Market Crash! Everyone without a shield lost half their Credits.');
    }
    for (const player of players) if (player.credits <= 0) player.alive = false;
  }

  private tickPotato() {
    const players = [...this.players.values()];
    if (this.tickCount % 8 !== 0) return;
    const holder = players.find(player => player.potato) ?? pick(players);
    const candidates = players.filter(player => player.id !== holder.id);
    const next = pick(candidates);
    for (const player of players) player.potato = false;
    next.potato = true;
    this.log('pass', `${holder.name} passed the vault to ${next.name}.`, next.id);
    if (Math.random() < 0.22) {
      const payment = Math.round(next.credits * 0.3);
      next.credits -= payment;
      const others = players.filter(player => player.id !== next.id);
      const share = Math.round(payment / Math.max(1, others.length));
      for (const player of others) player.credits += share;
      this.log('boom', `The vault detonated on ${next.name}. Pot split ${share} Credits each.`, next.id);
    }
  }

  private tickStockWar() {
    const players = [...this.players.values()];
    for (const player of players) {
      if (Math.random() < (player.kind === 'human' ? 0.14 : 0.26)) {
        const gain = 6 + Math.round(Math.random() * 14);
        player.score += gain;
        if (player.kind === 'human') this.log('surge', `Your side pushed the ticker +${gain}.`, player.id, gain);
      }
    }
    const orange = players.filter(player => player.team === 'orange');
    const green = players.filter(player => player.team === 'green');
    const orangeScore = orange.reduce((total, player) => total + player.score, 0);
    const greenScore = green.reduce((total, player) => total + player.score, 0);
    this.headline = `Orange ${orangeScore} — Green ${greenScore}`;
    if (this.tickCount % 40 === 0) {
      this.prompt = {
        question: 'Which of these compounds interest?',
        options: ['A savings balance', 'A fixed fee', 'A coin flip', 'An unpaid invoice'],
        answer: 0,
      };
      this.log('surge', 'Micro-challenge live: answer for 40 points.');
    }
  }

  private tickRelay() {
    const players = [...this.players.values()];
    for (const player of players) {
      if (Math.random() < (player.kind === 'human' ? 0.28 : 0.38)) {
        const crystals = 1 + Math.round(Math.random() * 2);
        player.lp += crystals;
        player.score += crystals;
      }
    }
    if (this.tickCount % 40 === 0) {
      const target = pick(players);
      target.frozen = 2;
      this.log('freeze', `${target.name} hit a rival trap and slowed down.`, target.id);
    }
  }

  private tickMafia() {
    const players = [...this.players.values()];
    const corrupt = players.filter(player => player.role === 'corrupt-banker' && player.alive);
    for (const player of corrupt) {
      const drained = 30 + Math.round(Math.random() * 40);
      player.credits += drained;
      player.score += 2;
    }
    if (this.tickCount % 120 === 0) {
      this.headline = `Round ${Math.min(3, this.round)}: the auditors are comparing ledgers.`;
      this.prompt = {
        question: 'A transfer was logged at 03:14 with no memo. Who signed it?',
        options: ['The night clerk', 'The vault drone', 'An unknown terminal', 'The board itself'],
        answer: 2,
      };
      this.votes = {};
      this.log('system', 'Vote window open. Board vote resolved by majority.');
    }
    if (this.tickCount % 200 === 0 && this.tickCount > 0) {
      const target = pick(players.filter(player => player.alive));
      target.alive = false;
      const caught = target.role === 'corrupt-banker';
      this.round = Math.min(3, this.round + 1);
      this.log(
        'vote',
        `${target.name} was voted out — ${caught ? 'a Corrupt Banker, confirmed' : 'an innocent Auditor'}.`,
        target.id,
      );
    }
  }

  /* ------------------------------------------------------------------ *
   * Player intents (validated server-side)
   * ------------------------------------------------------------------ */
  private applyAction(client: Client, message: { type?: string } & Record<string, unknown>) {
    const player = this.playerFor(client);
    if (!player || !this.started || this.finished) return;
    const type = String(message?.type ?? '');

    switch (type) {
      case 'dash': {
        if (this.mode === 'heist-party' && player.role === 'robber' && player.cooldown <= 0 && player.frozen <= 0) {
          const bag = 16 + Math.round(Math.random() * 26);
          player.credits += bag;
          player.score += 1;
          player.cooldown = 1.2;
          this.log('collect', `Perfect dash from ${player.name}: +${bag} Credits.`, player.id, bag);
        }
        break;
      }
      case 'drone': {
        if (this.mode === 'heist-party' && player.role === 'banker' && player.cooldown <= 0) {
          const targets = [...this.players.values()].filter(item => item.role === 'robber' && item.shield <= 0);
          const target = targets.sort((a, b) => b.credits - a.credits)[0];
          if (target) {
            target.frozen = 3;
            player.cooldown = 2;
            player.score += 1;
            this.log('freeze', `${player.name}'s drone locked onto ${target.name}.`, target.id);
          }
        }
        break;
      }
      case 'tag': {
        if (this.mode === 'credit-clash' && player.cooldown <= 0 && player.frozen <= 0) {
          const targets = [...this.players.values()].filter(item => item.id !== player.id && item.shield <= 0 && item.credits > 0);
          const target = targets.sort((a, b) => b.credits - a.credits)[0];
          if (target) {
            const stolen = Math.round(target.credits * 0.18);
            target.credits -= stolen;
            player.credits += stolen;
            player.score += 1;
            player.cooldown = 1.4;
            this.log('steal', `${player.name} tagged ${target.name} for ${stolen} Credits.`, target.id, stolen);
          }
        }
        break;
      }
      case 'shield': {
        if (player.cooldown <= 0) {
          player.shield = 8;
          player.cooldown = 6;
          this.log('surge', `${player.name} engaged a shield for 8 seconds.`, player.id);
        }
        break;
      }
      case 'pass': {
        if (this.mode === 'hot-potato' && player.potato) this.movePotato(player, false);
        break;
      }
      case 'force-pass': {
        if (this.mode === 'hot-potato' && player.potato && player.cooldown <= 0) this.movePotato(player, true);
        break;
      }
      case 'block': {
        if (this.mode === 'hot-potato') {
          player.shield = 6;
          player.cooldown = 6;
          this.log('surge', `${player.name} braced for the next boom.`, player.id);
        }
        break;
      }
      case 'pusher': {
        if (this.mode === 'team-stock-war' && player.cooldown <= 0) {
          const gain = 10 + Math.round(Math.random() * 16);
          player.score += gain;
          player.cooldown = 0.8;
          this.log('surge', `${player.name} pushed their ticker +${gain}.`, player.id, gain);
        }
        break;
      }
      case 'trap': {
        if (this.mode === 'liberals-relay' && player.cooldown <= 0) {
          const targets = [...this.players.values()].filter(item => item.id !== player.id && item.team !== player.team);
          const target = targets.length ? pick(targets) : null;
          if (target) {
            target.frozen = 3;
            player.cooldown = 4;
            this.log('freeze', `${player.name} trapped ${target.name}'s lane.`, target.id);
          }
        }
        break;
      }
      case 'boost': {
        if (this.mode === 'liberals-relay' && player.cooldown <= 0) {
          player.lp += 3;
          player.score += 3;
          player.cooldown = 3;
          this.log('collect', `${player.name} placed a boost (+3 Liberals).`, player.id, 3);
        }
        break;
      }
      case 'answer': {
        const prompt = this.prompt;
        if (!prompt) break;
        const choice = Number(message.choice ?? -1);
        const correct = choice === prompt.answer;
        if (this.mode === 'team-stock-war') {
          const gain = correct ? 40 : 8;
          player.score += gain;
          this.log('surge', correct ? `${player.name} won the micro-challenge (+${gain}).` : `${player.name} missed the micro-challenge.`, player.id, gain);
        } else {
          player.cooldown = correct ? 0 : 4;
          player.lp += correct ? 2 : 0;
        }
        this.prompt = null;
        break;
      }
      case 'vote': {
        if (this.mode !== 'mafia-bankers') break;
        const target = [...this.players.values()].find(item => item.id === String(message.targetId ?? ''));
        if (!target) break;
        this.votes[player.id] = 1;
        target.alive = false;
        const honest = target.role === 'auditor';
        if (honest) {
          player.credits = Math.max(0, player.credits - 40);
          this.log('vote', `${player.name} voted out ${target.name}, who was clean. −40 Credits.`, target.id, -40);
        } else {
          player.credits += 120;
          player.score += 5;
          this.log('vote', `${player.name} unmasked Corrupt Banker ${target.name}. +120 Credits.`, target.id, 120);
        }
        this.round = Math.min(3, this.round + 1);
        break;
      }
      default:
        break;
    }

    this.broadcast('state', this.stateSnapshot());
  }

  private movePotato(holder: Player, force: boolean) {
    const candidates = [...this.players.values()].filter(player => player.id !== holder.id);
    if (!candidates.length) return;
    const next = pick(candidates);
    for (const player of this.players.values()) player.potato = false;
    next.potato = true;
    if (force) {
      next.frozen = 1.5;
      holder.cooldown = 8;
      this.log('pass', `${holder.name} forced the vault onto ${next.name}.`, next.id);
    } else {
      this.log('pass', `${holder.name} flicked the vault to ${next.name}.`, next.id);
    }
  }

  /* ------------------------------------------------------------------ *
   * Roles, state snapshots and helpers
   * ------------------------------------------------------------------ */
  private assignHeistRoles() {
    const players = [...this.players.values()];
    const shuffled = [...players].sort(() => Math.random() - 0.5);
    shuffled.forEach((player, index) => {
      player.role = index % 2 === 0 ? 'robber' : 'banker';
      player.team = player.role === 'robber' ? 'orange' : 'green';
    });
    this.headline = 'Robbers vs Bankers. Bags are dropping.';
  }

  private assignMafiaRoles() {
    const players = [...this.players.values()];
    const corruptCount = Math.max(1, Math.round((players.length - 1) / 3));
    const shuffled = [...players].sort(() => Math.random() - 0.5);
    shuffled.forEach((player, index) => {
      player.role = index < corruptCount ? 'corrupt-banker' : 'auditor';
      player.status = index < corruptCount ? 'counting the books very carefully' : 'reviewing the ledger';
    });
    this.headline = `${corruptCount} corrupt banker${corruptCount > 1 ? 's' : ''} hidden among ${players.length} seats.`;
  }

  private playerFor(client: Client) {
    return this.players.get(client.sessionId) ?? null;
  }

  private log(kind: RoomEvent['kind'], text: string, playerId?: string, bonus?: number) {
    const event: RoomEvent = { id: `${Date.now()}-${Math.random()}`, kind, text, at: Date.now(), playerId, bonus };
    this.events = [event, ...this.events].slice(0, 24);
    this.broadcast('event', event);
  }

  private stateSnapshot(forSessionId?: string) {
    const players = [...this.players.values()].map(player => ({ ...player }));
    const leaderboard = [...players].sort((a, b) => b.credits + b.lp * 4 - (a.credits + a.lp * 4));
    const you = players.find(player => player.id === forSessionId) ?? players.find(player => player.kind === 'human') ?? players[0];
    return {
      mode: this.mode,
      phase: this.finished ? 'finished' : this.started ? 'playing' : 'lobby',
      secondsLeft: this.secondsLeft || MODE_SEATS[this.mode].seconds,
      round: this.round,
      totalRounds: this.mode === 'mafia-bankers' ? 3 : 1,
      pot: this.pot,
      headline: this.headline,
      players,
      events: this.events,
      you,
      leaderboard,
      prompt: this.prompt,
      votes: this.votes,
      live: true,
      botCount: players.filter(player => player.kind === 'bot').length,
      humanCount: players.filter(player => player.kind === 'human').length,
    };
  }
}

export default FinbRoom;
