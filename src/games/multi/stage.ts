'use client';

import type { ComponentType } from 'react';
import type { MultiModeId, RoomSession, RoomState } from '@/lib/net';

export interface StageProps {
  state: RoomState;
  session: RoomSession;
}

export type StageComponent = ComponentType<StageProps>;

/** Shared bits every stage reuses so the six rooms still feel like one building. */
export const TEAM_TINT = {
  orange: { text: 'text-flame-300', chip: 'chip-flame', hex: '#FF6B00' },
  green: { text: 'text-lime-300', chip: 'chip-lime', hex: '#00C853' },
} as const;

export function seatClass(player: RoomState['players'][number], you: RoomState['you']) {
  if (player.id === you.id) return 'border-lime-400/70 bg-lime-500/12';
  if (player.frozen > 0) return 'border-cyanx-400/50 bg-cyanx-400/10';
  if (!player.alive) return 'border-white/8 bg-white/3 opacity-45';
  return player.team === 'orange' ? 'border-flame-500/40 bg-flame-500/8' : 'border-lime-500/40 bg-lime-500/8';
}
