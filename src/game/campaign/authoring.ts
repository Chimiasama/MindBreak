import { STAGES } from '../stages';
import { EnemyType } from '../types';
import { SubstageDefinition, SubstageId } from './types';

/** Shared authoring defaults for new chapters; existing map definitions stay unchanged. */
export function chapterBase(id: number, floor: number) {
  const chapter = STAGES.find((stage) => stage.id === id)!;
  return { id, location: chapter.location, musicLabel: chapter.musicLabel, musicGenre: chapter.musicGenre,
    gravityScale: 1, windForce: 0, boundsTop: -240, boundsBottom: 1100,
    spawnX: 140, spawnY: floor - 56, goalX: 2400, palette: { ...chapter.palette },
    introDialogue: [], outroDialogue: [] };
}
export function enemyAt(type: EnemyType, x: number, floor: number, hp = 60,
  extra: Partial<SubstageDefinition['enemies'][number]> = {}): SubstageDefinition['enemies'][number] {
  const flying = type === 'drone' || type === 'jetpack';
  const h = type === 'drone' ? 22 : type === 'cyber_hound' ? 36 : 56;
  return { type, x, y: flying ? floor - 180 : floor - h,
    w: type === 'drone' ? 22 : type === 'cyber_hound' ? 42 : 34, h, hp, maxHp: hp,
    facing: -1, shootTimer: 100, attackTimer: 70,
    ...(flying ? { originY: floor - 180 } : {}), ...extra };
}
export function exitAt(id: string, label: string, x: number, floor: number, target: SubstageId, targetCheckpoint: string) {
  return { id, label, x, y: floor - 88, w: 56, h: 88, target, targetCheckpoint };
}
