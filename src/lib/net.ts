/**
 * FINB Arena transport.
 *
 * The same `RoomSession` contract is implemented twice:
 *   1. ColyseusSession — authoritative server rooms (server/index.ts). Used automatically
 *      when NEXT_PUBLIC_COLYSEUS_URL is configured, giving true 2–13 player multiplayer.
 *   2. PracticeSession — a deterministic local simulation with 12 AI members so every mode
 *      is fully playable, reviewable and testable without a server (the default build).
 *
 * UI code only touches this file, so switching to live play is a one-line env change.
 */
import { ECONOMY, clamp } from './economy';
import { GAMES } from './catalog';

export type MultiModeId = 'heist-party' | 'credit-clash' | 'hot-potato' | 'team-stock-war' | 'liberals-relay' | 'mafia-bankers';

export interface RoomPlayer {
  id: string;
  name: string;
  team: 'orange' | 'green';
  kind: 'you' | 'bot' | 'human';
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

export interface RoomEvent {
  id: string;
  kind: 'steal' | 'freeze' | 'pass' | 'boom' | 'crash' | 'surge' | 'collect' | 'vote' | 'system' | 'tip';
  text: string;
  at: number;
  bonus?: number;
  playerId?: string;
}

export interface RoomState {
  mode: MultiModeId;
  phase: 'lobby' | 'playing' | 'round-end' | 'finished';
  secondsLeft: number;
  round: number;
  totalRounds: number;
  pot: number;
  headline: string;
  players: RoomPlayer[];
  events: RoomEvent[];
  you: RoomPlayer;
  leaderboard: RoomPlayer[];
  prompt?: { question: string; options: string[]; answer: number } | null;
  votes?: Record<string, number>;
  live?: boolean;
  botCount: number;
  humanCount: number;
}

export interface RoomResult {
  won: boolean;
  credits: number;
  liberals: number;
  title: string;
  message: string;
  placement: number;
  players: number;
}

export interface RoomSession {
  readonly mode: MultiModeId;
  readonly live: boolean;
  subscribe(listener: (state: RoomState) => void): () => void;
  start(): void;
  action(type: string, payload?: Record<string, unknown>): void;
  emote(symbol: string): void;
  leave(): void;
  onResult(listener: (result: RoomResult) => void): () => void;
}

const BOT_NAMES = [
  'LedgerFox', 'MicaMint', 'OrbitOllie', 'VaultVera', 'NovaKite', 'PipPenny', 'GlassGoblin', 'TallyTiger',
  'BrassBee', 'CoinCactus', 'IsoInterest', 'SproutSage',
];
const EMOTES = ['🟠', '🟢', '😱', '🕶️', '🎉', '😭', '🤝', '🔥'];
const INSULTS = ['is sprinting for the vault', 'froze two bankers', 'just found a shortcut', 'is hoarding bags', 'called the surge early', 'is definitely plotting'];

function pick<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function shuffle<T>(items: T[]): T[] {
  return [...items].sort(() => Math.random() - 0.5);
}

export function modeMeta(mode: MultiModeId) {
  const game = GAMES.find(item => item.id === mode);
  return game ?? GAMES[0];
}

export function seatCount(mode: MultiModeId, requested: number): number {
  const game = modeMeta(mode);
  return clamp(requested, game.minPlayers, game.maxPlayers);
}

/* ------------------------------------------------------------------ *
 * Practice session — authoritative local simulation with AI members.
 * ------------------------------------------------------------------ */
export class PracticeSession implements RoomSession {
  readonly mode: MultiModeId;
  readonly live = false;
  private state: RoomState;
  private listeners = new Set<(state: RoomState) => void>();
  private resultListeners = new Set<(result: RoomResult) => void>();
  private timer: ReturnType<typeof setInterval> | null = null;
  private tickCount = 0;
  private youId = 'you';
  private resolve: ((result: RoomResult) => void) | null = null;

  constructor(mode: MultiModeId, public username: string, players = 8) {
    this.mode = mode;
    const seats = seatCount(mode, players) - 1;
    const bots: RoomPlayer[] = shuffle(BOT_NAMES)
      .slice(0, seats)
      .map((name, index) => ({
        id: `bot-${index}`,
        name,
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
      }));
    const you: RoomPlayer = {
      id: this.youId,
      name: username,
      team: 'orange',
      kind: 'you',
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
    this.state = {
      mode,
      phase: 'lobby',
      secondsLeft: 0,
      round: 1,
      totalRounds: mode === 'mafia-bankers' ? 3 : 1,
      pot: 0,
      headline: this.headlineFor(mode),
      players: [you, ...bots],
      events: [],
      you,
      leaderboard: [],
      prompt: null,
      votes: {},
      live: false,
      botCount: bots.length,
      humanCount: 1,
    };
    if (mode === 'mafia-bankers') this.assignMafiaRoles();
    if (mode === 'heist-party') this.assignHeistRoles();
    this.refreshLeaderboard();
  }

  private assignMafiaRoles() {
    const players = this.state.players;
    const corrupt = Math.max(1, Math.round((players.length - 1) / 3));
    const shuffled = shuffle(players.map(player => player.id));
    shuffled.forEach((id, index) => {
      const player = players.find(item => item.id === id);
      if (!player) return;
      player.role = index < corrupt ? 'corrupt-banker' : 'auditor';
    });
    const you = players.find(player => player.id === this.youId) as RoomPlayer;
    this.state.you = you;
    this.state.headline = you.role === 'corrupt-banker' ? 'You are a Corrupt Banker. Drain quietly.' : 'You are an Auditor. Find the leak.';
  }

  private assignHeistRoles() {
    const players = this.state.players;
    shuffle(players.map(player => player.id)).forEach((id, index) => {
      const player = players.find(item => item.id === id);
      if (!player) return;
      player.role = index % 2 === 0 ? 'robber' : 'banker';
      player.team = player.role === 'robber' ? 'orange' : 'green';
    });
    const you = players.find(player => player.id === this.youId) as RoomPlayer;
    this.state.you = you;
    this.state.headline = you.role === 'robber' ? 'Robber: snatch the bags, dodge the drones.' : 'Banker: freeze every robber you can reach.';
  }

  private headlineFor(mode: MultiModeId) {
    switch (mode) {
      case 'heist-party':
        return 'Bags are dropping in 3…';
      case 'credit-clash':
        return 'Free-for-all. Tag anyone. Trust nobody.';
      case 'hot-potato':
        return 'Pass the vault. Do not hold it.';
      case 'team-stock-war':
        return 'Push your ticker above theirs.';
      case 'liberals-relay':
        return 'Run the lane, collect the crystals.';
      default:
        return 'Round one. Watch everyone.';
    }
  }

  subscribe(listener: (state: RoomState) => void) {
    this.listeners.add(listener);
    listener(this.snapshot());
    return () => this.listeners.delete(listener);
  }

  onResult(listener: (result: RoomResult) => void) {
    this.resultListeners.add(listener);
    return () => this.resultListeners.delete(listener);
  }

  private snapshot(): RoomState {
    return { ...this.state, players: this.state.players.map(player => ({ ...player })), events: [...this.state.events] };
  }

  private emit() {
    const snapshot = this.snapshot();
    this.listeners.forEach(listener => listener(snapshot));
  }

  private log(kind: RoomEvent['kind'], text: string, playerId?: string, bonus?: number) {
    this.state.events = [{ id: `${Date.now()}-${Math.random()}`, kind, text, at: Date.now(), playerId, bonus }, ...this.state.events].slice(0, 24);
  }

  private refreshLeaderboard() {
    this.state.leaderboard = [...this.state.players].sort((a, b) => b.credits + b.lp * 4 - (a.credits + a.lp * 4));
  }

  start() {
    if (this.timer) return;
    this.state.phase = 'playing';
    this.state.secondsLeft = this.mode === 'mafia-bankers' ? 240 : this.mode === 'hot-potato' ? 90 : 90;
    this.state.pot = this.state.players.length * 45;
    this.log('system', `${this.state.players.length} players seated. Pot: ${this.state.pot} Credits.`);
    this.timer = setInterval(() => this.tick(), 250);
    this.emit();
  }

  private tick() {
    this.tickCount += 1;
    const state = this.state;
    state.secondsLeft = Math.max(0, state.secondsLeft - 0.25);
    const you = state.players.find(player => player.id === this.youId) as RoomPlayer;
    state.you = you;
    state.players.forEach(player => {
      player.cooldown = Math.max(0, player.cooldown - 0.25);
      player.frozen = Math.max(0, player.frozen - 0.25);
      player.shield = Math.max(0, player.shield - 0.25);
      if (player.frozen > 0) player.status = 'frozen in place';
    });

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

    this.refreshLeaderboard();
    if (state.secondsLeft <= 0 && state.phase === 'playing') this.finish();
    this.emit();
  }

  /* ---------------- mode rules ---------------- */
  private tickHeist() {
    const state = this.state;
    const robbers = state.players.filter(player => player.role === 'robber' && player.frozen <= 0);
    const bankers = state.players.filter(player => player.role === 'banker' && player.frozen <= 0);
    robbers.forEach(robber => {
      if (Math.random() < (robber.kind === 'you' ? 0.34 : 0.42)) {
        const bag = 12 + Math.round(Math.random() * 22);
        robber.credits += bag;
        robber.score += 1;
        if (robber.kind === 'you') this.log('collect', `Bag secured: +${bag} Credits.`, robber.id, bag);
      }
    });
    bankers.forEach(banker => {
      if (Math.random() < (banker.kind === 'you' ? 0.3 : 0.4)) {
        const target = pick(robbers.filter(player => player.shield <= 0)) ?? null;
        if (target) {
          target.frozen = 3;
          banker.score += 1;
          if (banker.kind === 'you') this.log('freeze', `Drone lock: ${target.name} frozen for 3s.`, target.id);
          if (target.kind === 'you') this.log('freeze', `${banker.name} froze you for 3 seconds.`, banker.id);
        }
      }
    });
    if (this.tickCount % 24 === 0) {
      const lucky = pick(state.players);
      lucky.shield = 6;
      this.log('surge', `Power-up drop: ${lucky.name} grabbed a temporary shield.`, lucky.id);
    }
  }

  private tickClash() {
    const state = this.state;
    const active = state.players.filter(player => player.frozen <= 0 && player.alive);
    active.forEach(player => {
      if (Math.random() < (player.kind === 'you' ? 0.2 : 0.3)) {
        const targets = active.filter(other => other.id !== player.id && other.shield <= 0);
        const target = targets.length ? pick(targets) : null;
        if (!target) return;
        const stolen = Math.round(target.credits * 0.14);
        if (stolen <= 0) return;
        target.credits -= stolen;
        player.credits += stolen;
        player.score += 1;
        if (player.kind === 'you') this.log('steal', `Siphoned ${stolen} Credits from ${target.name}.`, target.id, stolen);
        else if (target.kind === 'you') this.log('steal', `${player.name} tagged you for ${stolen} Credits.`, player.id, -stolen);
      }
    });
    if (this.tickCount % 48 === 0) {
      state.players.forEach(player => {
        if (player.shield <= 0) player.credits = Math.round(player.credits * 0.5);
      });
      this.log('crash', 'Market Crash! Everyone without a shield lost half their Credits.');
    }
    state.players.forEach(player => {
      if (player.credits <= 0) player.alive = false;
    });
  }

  private tickPotato() {
    const state = this.state;
    if (this.tickCount % 8 === 0) {
      const holders = state.players.filter(player => player.potato);
      const holder = holders[0] ?? pick(state.players);
      state.players.forEach(player => (player.potato = false));
      const candidates = state.players.filter(player => player.id !== holder.id && !player.potato);
      const next = pick(candidates);
      holder.potato = false;
      next.potato = true;
      holder.status = `passed to ${next.name}`;
      this.log('pass', `${holder.name} passed the vault to ${next.name}.`, next.id);
      if (Math.random() < 0.22) {
        const boomPlayer = next;
        const payment = Math.round(boomPlayer.credits * 0.3);
        boomPlayer.credits -= payment;
        const others = state.players.filter(player => player.id !== boomPlayer.id);
        const share = Math.round(payment / Math.max(1, others.length));
        others.forEach(player => (player.credits += share));
        this.log('boom', `💥 The vault detonated on ${boomPlayer.name}. Pot split ${share} Credits each.`, boomPlayer.id);
        if (boomPlayer.kind === 'you') this.log('boom', 'You held it. The room thanks you for your Credits.');
      }
    }
  }

  private tickStockWar() {
    const state = this.state;
    const orange = state.players.filter(player => player.team === 'orange');
    const green = state.players.filter(player => player.team === 'green');
    [...orange, ...green].forEach(player => {
      if (Math.random() < (player.kind === 'you' ? 0.16 : 0.26)) {
        const gain = 6 + Math.round(Math.random() * 14);
        player.score += gain;
        this.log('surge', `${player.name} pushed the ticker +${gain}.`, player.id, gain);
      }
    });
    const orangeScore = orange.reduce((total, player) => total + player.score, 0);
    const greenScore = green.reduce((total, player) => total + player.score, 0);
    state.headline = `Orange ${orangeScore} — Green ${greenScore}`;
    if (orangeScore > greenScore) state.players.forEach(player => (player.credits = player.team === 'orange' ? 150 + Math.round(orangeScore / 6) : 90));
    else state.players.forEach(player => (player.credits = player.team === 'green' ? 150 + Math.round(greenScore / 6) : 90));
  }

  private tickRelay() {
    const state = this.state;
    const runners = state.players.filter(player => player.role !== 'trapper');
    state.players.forEach(player => {
      if (Math.random() < (player.kind === 'you' ? 0.3 : 0.38)) {
        const crystals = 1 + Math.round(Math.random() * 2);
        player.lp += crystals;
        player.score += crystals;
        if (player.kind === 'you') this.log('collect', `Picked up ${crystals} Liberal crystal${crystals > 1 ? 's' : ''}.`, player.id, crystals);
      }
    });
    if (this.tickCount % 40 === 0 && runners.length) {
      const target = pick(runners);
      target.frozen = 2;
      this.log('freeze', `${target.name} hit a rival trap and slowed down.`, target.id);
    }
  }

  private tickMafia() {
    const state = this.state;
    const corrupt = state.players.filter(player => player.role === 'corrupt-banker');
    const auditors = state.players.filter(player => player.role === 'auditor');
    if (state.round <= 3) {
      corrupt.forEach(player => {
        const drain = 18 + Math.round(Math.random() * 22);
        state.pot = Math.max(0, state.pot - drain);
        player.credits += drain;
        if (player.kind === 'you') this.log('steal', `You drained ${drain} Credits from the shared vault.`, player.id, drain);
      });
      auditors.forEach(player => {
        if (Math.random() < 0.3) {
          player.lp += 2;
          player.score += 2;
          if (player.kind === 'you') this.log('collect', 'Investigation point earned (+2 LP).', player.id);
        }
      });
    }
  }

  /* ---------------- player actions ---------------- */
  action(type: string, payload: Record<string, unknown> = {}) {
    const state = this.state;
    const you = state.players.find(player => player.id === this.youId) as RoomPlayer;
    switch (type) {
      case 'dash': {
        if (this.mode === 'heist-party' && you.role === 'robber' && you.cooldown <= 0 && you.frozen <= 0) {
          const bag = 16 + Math.round(Math.random() * 26);
          you.credits += bag;
          you.score += 1;
          you.cooldown = 1.2;
          this.log('collect', `Perfect dash: +${bag} Credits.`, you.id, bag);
        }
        break;
      }
      case 'drone': {
        if (this.mode === 'heist-party' && you.role === 'banker' && you.cooldown <= 0) {
          const targets = state.players.filter(player => player.role === 'robber' && player.shield <= 0);
          const target = targets.length ? targets.reduce((best, player) => (player.credits > best.credits ? player : best), targets[0]) : null;
          if (target) {
            target.frozen = 3;
            you.cooldown = 2;
            you.score += 1;
            this.log('freeze', `Drone locked onto ${target.name}. Frozen 3s.`, target.id);
          }
        }
        break;
      }
      case 'tag': {
        if (this.mode === 'credit-clash' && you.cooldown <= 0 && you.frozen <= 0) {
          const targets = state.players.filter(player => player.id !== you.id && player.shield <= 0 && player.credits > 0);
          const target = targets.length ? targets.reduce((best, player) => (player.credits > best.credits ? player : best), targets[0]) : null;
          if (target) {
            const stolen = Math.round(target.credits * 0.18);
            target.credits -= stolen;
            you.credits += stolen;
            you.score += 1;
            you.cooldown = 1.4;
            this.log('steal', `Big tag on ${target.name}: +${stolen} Credits.`, target.id, stolen);
          }
        }
        break;
      }
      case 'shield': {
        if (you.cooldown <= 0) {
          you.shield = 8;
          you.cooldown = 6;
          this.log('surge', 'Shield engaged for 8 seconds.', you.id);
        }
        break;
      }
      case 'pass': {
        if (this.mode === 'hot-potato' && you.potato) {
          const target = pick(state.players.filter(player => player.id !== you.id));
          state.players.forEach(player => (player.potato = false));
          target.potato = true;
          this.log('pass', `You flicked the vault to ${target.name}.`, target.id);
        }
        break;
      }
      case 'force-pass': {
        if (this.mode === 'hot-potato' && you.potato && you.cooldown <= 0) {
          const target = pick(state.players.filter(player => player.id !== you.id));
          state.players.forEach(player => (player.potato = false));
          target.potato = true;
          target.frozen = 1.5;
          you.cooldown = 8;
          this.log('pass', `Forced a pass to ${target.name} — they cannot move for 1.5s.`, target.id);
        }
        break;
      }
      case 'block': {
        if (this.mode === 'hot-potato') {
          you.shield = 6;
          you.cooldown = 6;
          this.log('surge', 'Block ready: the next boom will bounce off you.', you.id);
        }
        break;
      }
      case 'pusher': {
        if (this.mode === 'team-stock-war') {
          const gain = 10 + Math.round(Math.random() * 16);
          you.score += gain;
          you.cooldown = 0.8;
          this.log('surge', `You pushed your team's ticker +${gain}.`, you.id, gain);
        }
        break;
      }
      case 'trap': {
        if (this.mode === 'liberals-relay' && you.cooldown <= 0) {
          const targets = state.players.filter(player => player.id !== you.id && player.team !== you.team);
          const target = targets.length ? pick(targets) : null;
          if (target) {
            target.frozen = 3;
            you.cooldown = 4;
            this.log('freeze', `Trap dropped on ${target.name}'s lane.`, target.id);
          }
        }
        break;
      }
      case 'boost': {
        if (this.mode === 'liberals-relay' && you.cooldown <= 0) {
          you.lp += 3;
          you.score += 3;
          you.cooldown = 3;
          this.log('collect', 'Boost placed: +3 Liberals for your lane.', you.id, 3);
        }
        break;
      }
      case 'answer': {
        const prompt = state.prompt;
        if (!prompt) break;
        const choice = Number(payload.choice ?? -1);
        const correct = choice === prompt.answer;
        if (this.mode === 'team-stock-war') {
          const gain = correct ? 40 : 8;
          you.score += gain;
          this.log('surge', correct ? `Micro-challenge won: +${gain} for your team.` : 'Missed the micro-challenge — small consolation.', you.id, gain);
        } else if (this.mode === 'hot-potato') {
          you.cooldown = correct ? 0 : 4;
          you.lp += correct ? 2 : 0;
          this.log('collect', correct ? 'Timing window opened.' : 'Wrong button — cooldown increased.', you.id);
        }
        state.prompt = null;
        break;
      }
      case 'vote': {
        if (this.mode === 'mafia-bankers') {
          const targetId = String(payload.targetId ?? '');
          const target = state.players.find(player => player.id === targetId);
          if (!target) break;
          state.votes = { ...(state.votes ?? {}), [you.id]: 1 };
          const corrupt = target.role === 'corrupt-banker';
          const swing = Math.random() < 0.62;
          if (corrupt && swing) {
            target.alive = false;
            you.score += 5;
            you.credits += 120;
            this.log('vote', `The board voted out ${target.name} — a Corrupt Banker. +120 Credits to you.`, target.id, 120);
          } else {
            you.credits -= 40;
            this.log('vote', `The board voted with you but ${target.name} was clean. −40 Credits, and a lot of eye contact.`, target.id, -40);
          }
          state.round = Math.min(3, state.round + 1);
          if (state.round === 2) state.headline = 'Round 2: the leak is still open.';
          if (state.round === 3) state.headline = 'Final round: one more vote.';
        }
        break;
      }
      case 'emote': {
        you.emote = String(payload.symbol ?? '🟠');
        setTimeout(() => {
          you.emote = null;
          this.emit();
        }, 1600);
        break;
      }
      default:
        break;
    }
    this.refreshLeaderboard();
    this.emit();
  }

  emote(symbol: string) {
    this.action('emote', { symbol });
  }

  private finish() {
    const state = this.state;
    state.phase = 'finished';
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    const you = state.players.find(player => player.id === this.youId) as RoomPlayer;
    const ordered = [...state.players].sort((a, b) => b.credits + b.lp * 4 - (a.credits + a.lp * 4));
    const placement = ordered.findIndex(player => player.id === this.youId) + 1;
    const winner = ordered[0];
    const potShare = Math.max(0, Math.round(state.pot * ECONOMY.sharedPotRate));
    const base =
      this.mode === 'heist-party'
        ? Math.max(0, you.credits - 120)
        : this.mode === 'credit-clash'
          ? Math.max(0, you.credits - 120)
          : this.mode === 'hot-potato'
            ? Math.max(0, Math.round(potShare / Math.max(1, placement)))
            : this.mode === 'team-stock-war'
              ? Math.round(you.score * 1.4)
              : this.mode === 'liberals-relay'
                ? you.lp * 15
                : Math.round(you.credits * 0.6);
    const won = placement === 1 || (this.mode === 'mafia-bankers' && you.role === 'corrupt-banker' && you.alive === false ? false : placement <= Math.ceil(ordered.length / 3));
    const result: RoomResult = {
      won,
      credits: Math.min(900, Math.max(20, Math.round(base + (won ? 120 : 0)))),
      liberals: Math.max(1, Math.round(you.lp + you.score / 2 + (won ? 6 : 2))),
      placement,
      players: state.players.length,
      title: `${modeMeta(this.mode).title} · ${placement === 1 ? '1st place' : `#${placement} of ${state.players.length}`}`,
      message:
        placement === 1
          ? `Room won. ${winner.name === you.name ? 'You' : winner.name} led ${state.players.length} players to the bell.`
          : `${winner.name} took the room. You finished ${placement} of ${state.players.length} — the practice floor pays either way.`,
    };
    this.resultListeners.forEach(listener => listener(result));
    this.emit();
  }

  leave() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.listeners.clear();
    this.resultListeners.clear();
  }

  /** Test hook: resolve the room immediately. */
  fastForward() {
    this.state.secondsLeft = 0.25;
    this.tick();
  }
}

/* ------------------------------------------------------------------ *
 * Colyseus session — authoritative rooms for genuine 2–13 player play.
 * ------------------------------------------------------------------ */
export class ColyseusSession implements RoomSession {
  readonly live = true;
  private listeners = new Set<(state: RoomState) => void>();
  private resultListeners = new Set<(result: RoomResult) => void>();
  private room: { send: (type: string, message?: unknown) => void; leave: () => void; onMessage: (type: string, cb: (message: unknown) => void) => void; removeAllListeners: () => void } | null = null;
  private state: RoomState;

  constructor(public mode: MultiModeId, private endpoint: string, private username: string, private players: number) {
    this.state = {
      mode,
      phase: 'lobby',
      secondsLeft: 0,
      round: 1,
      totalRounds: mode === 'mafia-bankers' ? 3 : 1,
      pot: 0,
      headline: 'Connecting to the FINB arena…',
      players: [],
      events: [],
      you: {
        id: 'you',
        name: username,
        team: 'orange',
        kind: 'you',
        credits: 0,
        lp: 0,
        score: 0,
        frozen: 0,
        potato: false,
        shield: 0,
        cooldown: 0,
        role: 'member',
        alive: true,
        emote: null,
        status: 'connecting',
      },
      leaderboard: [],
      prompt: null,
      live: true,
      botCount: 0,
      humanCount: 1,
    };
  }

  async connect() {
    try {
      // @colyseus/sdk tracks the @colyseus/core 0.18 server protocol; the older
      // colyseus.js 0.16 client speaks a different seat-reservation shape.
      const { Client } = await import('@colyseus/sdk');
      const client = new Client(this.endpoint);
      const room = await client.joinOrCreate(`finb_${this.mode}`, { username: this.username, players: this.players, mode: this.mode });
      this.room = room as unknown as ColyseusSession['room'];
      this.room?.onMessage('state', message => {
        this.state = { ...(message as RoomState), live: true };
        this.listeners.forEach(listener => listener(this.state));
      });
      this.room?.onMessage('result', message => {
        this.resultListeners.forEach(listener => listener(message as RoomResult));
      });
      this.room?.onMessage('event', message => {
        const event = message as RoomEvent;
        this.state.events = [event, ...this.state.events].slice(0, 24);
        this.listeners.forEach(listener => listener(this.state));
      });
    } catch (error) {
      console.warn('[FINB] Colyseus unavailable, falling back to practice:', (error as Error).message);
      throw error;
    }
  }

  subscribe(listener: (state: RoomState) => void) {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  onResult(listener: (result: RoomResult) => void) {
    this.resultListeners.add(listener);
    return () => this.resultListeners.delete(listener);
  }

  start() {
    this.room?.send('start');
  }

  action(type: string, payload: Record<string, unknown> = {}) {
    this.room?.send('action', { type, ...payload });
  }

  emote(symbol: string) {
    this.room?.send('action', { type: 'emote', symbol });
  }

  leave() {
    this.room?.removeAllListeners();
    this.room?.leave();
    this.listeners.clear();
    this.resultListeners.clear();
  }
}

export const COLYSEUS_URL = process.env.NEXT_PUBLIC_COLYSEUS_URL?.trim() || '';

/** Create the best available session: live server when configured, otherwise practice. */
export function createSession(mode: MultiModeId, username: string, players: number): RoomSession {
  if (COLYSEUS_URL) {
    const session = new ColyseusSession(mode, COLYSEUS_URL, username, players);
    session.connect().catch(() => {
      /* the caller keeps a practice session handy */
    });
    return session;
  }
  return new PracticeSession(mode, username, players);
}

export function emotePalette() {
  return EMOTES;
}
