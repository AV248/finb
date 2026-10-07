'use client';

import { createContext, useContext } from 'react';
import type { Database, Mission, Player, RewardBundle, StandingRow } from './types';
import type { GameDef } from './catalog';
import type { GameResult, ResolvedResult } from './store';

export type ScreenId = 'home' | 'arcade' | 'arena' | 'friends' | 'ranks' | 'rewards' | 'card' | 'more';

export interface FinbApi {
  db: Database;
  user: Player;
  standings: StandingRow[];
  screen: ScreenId;
  navigate: (screen: ScreenId) => void;
  toast: (text: string, tone?: 'good' | 'bad' | 'info', icon?: string) => void;
  celebrate: () => void;
  refresh: () => void;
  openGame: (gameId: string) => void;
  openRoom: (modeId: string, seats: number) => void;
  spectrum: (modeId: string) => void;
  claimDaily: () => void;
  claimMission: (id: string) => void;
  addFriend: (username: string) => Promise<void> | void;
  removeFriend: (id: string) => void;
  transfer: (to: string, amount: number, note: string) => void;
  tip: (username: string, amount: number) => void;
  challenge: (username: string, gameId: string, target: number) => void;
  resolveChallenge: (id: string, score: number) => void;
  createRoom: (name: string, mode: string) => void;
  chatRoom: (code: string, text: string) => void;
  toggleFavourite: (id: string) => void;
  setEmote: (id: string, emote: string) => void;
  buyBusiness: (id: string, name: string, cost: number, yieldPerMinute: number) => void;
  runBusiness: (id: string) => void;
  trade: (symbol: string, quantity: number, side: 'buy' | 'sell') => void;
  linkPlayGames: (tag: string) => void;
  claimReferral: (code: string) => void;
  redeemSeries: (code: string) => void;
  toggleFreeze: () => void;
  reissueCard: () => void;
  finishGame: (result: GameResult) => ResolvedResult;
  openDocuments: (section?: string) => void;
  openSitemap: () => void;
  switchProfile: () => void;
  openGuide: () => void;
  exportData: () => void;
  deleteProfile: () => void;
  setOnboardingStep: (step: number, reward?: { credits?: number; liberals?: number; id?: string }) => void;
  finishOnboarding: () => void;
  reward: (bundle: RewardBundle) => void;
  games: GameDef[];
  dailyMissions: Mission[];
  weeklyMissions: Mission[];
  soundOn: boolean;
  toggleSound: () => void;
  cloudEnabled: boolean;
  liveServerEnabled: boolean;
  guestDaysLeft: number | null;
}

const Ctx = createContext<FinbApi | null>(null);

export const FinbContext = Ctx;

export function useFinb(): FinbApi {
  const value = useContext(Ctx);
  if (!value) throw new Error('useFinb must be used inside the FINB app shell');
  return value;
}
