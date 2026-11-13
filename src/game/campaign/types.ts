import { BossConfig, CharacterId, StageDefinition } from '../types';

export type SubstageId = `${number}${'A' | 'B' | 'C' | 'D'}`;
export interface CheckpointDefinition { id: string; label: string; x: number; y: number }
export interface ExitDefinition {
  id: string;
  label: string;
  x: number; y: number; w: number; h: number;
  target: SubstageId;
  targetCheckpoint: string;
}
export interface SubstageDefinition extends Omit<StageDefinition, 'boss'> {
  substageId: SubstageId;
  exploration?: { style: 'loop' | 'vertical'; nodes: { id: string; label: string; x: number; y: number; w: number; h: number; requires: string[]; guardIndex?: number }[] };
  boss?: BossConfig;
  exits: ExitDefinition[];
  checkpoints: CheckpointDefinition[];
  entryCheckpoint: string;
}
export interface CampaignStage {
  id: number;
  title: string;
  entry: SubstageId;
  substages: SubstageId[];
  plannedCount: number;
}
export interface PlayerCarry {
  characterId: CharacterId;
  hp: number;
  psyEnergy: number;
  lives: number;
  score: number;
  nextOneUpScore: number;
  wavAmmo: number;
  atkTimer: number;
  jmpTimer: number;
  gstTimer: number;
}

/** In-memory session contract. Browser persistence requires a separate versioned save codec. */
export interface CampaignProgress {
  chapterId: number;
  substageId: SubstageId;
  checkpointId: string;
  visited: SubstageId[];
  player: PlayerCarry;
}
