import type { MultiModeId } from '@/lib/net';
import type { StageComponent } from './stage';
import { HeistPartyStage } from './HeistParty';
import { CreditClashStage } from './CreditClash';
import { HotPotatoStage } from './HotPotato';
import { TeamStockWarStage } from './TeamStockWar';
import { LiberalsRelayStage } from './LiberalsRelay';
import { MafiaBankersStage } from './MafiaBankers';

export { seatClass, TEAM_TINT } from './stage';
export type { StageProps, StageComponent } from './stage';

/** One distinctive arena per multiplayer mode, keyed by the Colyseus room id. */
export const MULTI_STAGES: Record<MultiModeId, StageComponent> = {
  'heist-party': HeistPartyStage,
  'credit-clash': CreditClashStage,
  'hot-potato': HotPotatoStage,
  'team-stock-war': TeamStockWarStage,
  'liberals-relay': LiberalsRelayStage,
  'mafia-bankers': MafiaBankersStage,
};
