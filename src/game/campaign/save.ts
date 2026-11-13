import { CHARACTERS } from '../characters';
import { Enemy, EnemyMind, PickupItem } from '../types';
import { ENEMY_COMBAT, ENEMY_STATES } from '../enemyAI';
import { SpawnSnapshot } from '../spawns';
import { CAMPAIGN, getSubstage, SUBSTAGES } from './index';
import { PlayerCarry, SubstageId } from './types';

export const SAVE_VERSION = 1;
export const MAX_SAVE_BYTES = 512 * 1024;
export type ResumeMode = 'playing' | 'continue' | 'game-over' | 'chapter-clear';
export interface AreaSave {
  id: SubstageId;
  tick: number;
  leftAt: number;
  checkpoint: string;
  platforms: { x: number; y: number; broken: boolean; crumbleTimer: number }[];
  props: { id: number; hp: number; broken: boolean }[];
  pickups: PickupItem[];
  arenas: { id: number; cleared: boolean }[];
  enemies: Enemy[];
  spawns: SpawnSnapshot;
}
export interface CampaignSave {
  version: typeof SAVE_VERSION;
  content: string;
  savedAt: number;
  chapterId: number;
  current: SubstageId;
  worldTick: number;
  mode: ResumeMode;
  player: PlayerCarry;
  preferences: { muted: boolean };
  areas: AreaSave[];
}

// Changes to another chapter do not invalidate a compatible current attempt.
export function campaignContentId(chapterId: number) {
  const text = JSON.stringify({ chapter: CAMPAIGN.find((chapter) => chapter.id === chapterId),
    areas: SUBSTAGES.filter((area) => area.id === chapterId) });
  let hash = 2166136261;
  for (let index = 0; index < text.length; index++) hash = Math.imul(hash ^ text.charCodeAt(index), 16777619);
  return `campaign-1-${(hash >>> 0).toString(16)}`;
}

class IncompatibleSave extends Error {}
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('objeto inválido');
  return value as Record<string, unknown>;
}
function number(value: unknown, min = 0, max = 1e12): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) throw new Error('número inválido');
  return value;
}
function integer(value: unknown, min = 0, max = 1e12) {
  const result = number(value, min, max);
  if (!Number.isSafeInteger(result)) throw new Error('inteiro inválido');
  return result;
}
function boolean(value: unknown): boolean {
  if (typeof value !== 'boolean') throw new Error('booleano inválido');
  return value;
}
function string(value: unknown): string {
  if (typeof value !== 'string' || value.length > 128) throw new Error('texto inválido');
  return value;
}
function array(value: unknown, max: number): unknown[] {
  if (!Array.isArray(value) || value.length > max) throw new Error('lista inválida');
  return value;
}
function exactArray(value: unknown, length: number) {
  const result = array(value, length);
  if (result.length !== length) throw new Error('lista incompleta');
  return result;
}
const PICKUP_KINDS = ['heal', 'psy', 'wav', 'atk', 'jmp', 'gst', 'full_heal'] as const;

/** Build trusted runtime values from whitelisted fields; never assign parsed objects to entities. */
function decodeArea(raw: unknown, chapterId: number, worldTick: number): AreaSave {
  const area = object(raw);
  const stage = SUBSTAGES.find((stage) => stage.substageId === area.id && stage.id === chapterId);
  if (!stage) throw new IncompatibleSave('setor ausente');
  const tick = integer(area.tick);
  const leftAt = integer(area.leftAt, 0, worldTick);
  const checkpoint = string(area.checkpoint);
  if (!stage.checkpoints.some((point) => point.id === checkpoint)) throw new IncompatibleSave('ponto de apoio ausente');
  const platforms = exactArray(area.platforms, stage.platforms.length).map((value, index) => {
    const p = object(value), base = stage.platforms[index];
    const range = base.type === 'moving' ? base.moveRange ?? 80 : 0;
    const x = number(p.x, base.x - (base.moveAxis === 'x' ? range : 0), base.x + (base.moveAxis === 'x' ? range : 0));
    const y = number(p.y, base.y - (base.moveAxis !== 'x' ? range : 0), base.y + (base.moveAxis !== 'x' ? range : 0));
    const broken = boolean(p.broken), crumbleTimer = integer(p.crumbleTimer, 0, 201);
    if (base.type !== 'crumble' && (broken || crumbleTimer)) throw new Error('plataforma inválida');
    return { x, y, broken, crumbleTimer };
  });
  const props = exactArray(area.props, stage.props.length).map((value, index) => {
    const p = object(value), base = stage.props[index];
    if (p.id !== base.id) throw new Error('objeto desconhecido');
    const hp = number(p.hp, 0, base.hp), broken = boolean(p.broken);
    if (broken !== (hp === 0)) throw new Error('objeto inconsistente');
    return { id: base.id, hp, broken };
  });
  const pickups: PickupItem[] = array(area.pickups, 256).map((value) => {
    const p = object(value);
    const kind = PICKUP_KINDS.find((kind) => kind === p.kind);
    if (!kind) throw new Error('item desconhecido');
    if (p.w !== 22 || p.h !== 22) throw new Error('dimensões de item inválidas');
    return { x: number(p.x, -1e6, 1e6), y: number(p.y, -1e6, 5000), w: 22, h: 22,
      vy: number(p.vy, -1000, 1000), kind,
      ...(p.amount === undefined ? {} : { amount: integer(p.amount, 1, 1000) }) };
  });
  const arenas = exactArray(area.arenas, (stage.ambushArenas ?? []).length).map((value, index) => {
    const a = object(value), base = stage.ambushArenas![index];
    if (a.id !== base.id) throw new Error('arena desconhecida');
    return { id: base.id, cleared: boolean(a.cleared) };
  });
  const spawnData = object(area.spawns);
  const nextEntityId = integer(spawnData.nextEntityId, 1);
  const records = exactArray(spawnData.records, stage.enemies.length).map((value, index) => {
    const r = object(value);
    if (r.id !== `${stage.substageId}:${index + 1}`) throw new Error('origem desconhecida');
    const dormant = stage.enemies[index].deployedBy !== undefined && r.generation === -1;
    const generation = integer(r.generation, dormant ? -1 : 0);
    const activeId = r.activeId === null ? null : integer(r.activeId, 1, nextEntityId - 1);
    const deadAt = r.deadAt === null ? null : integer(r.deadAt, -1e12, tick);
    if (dormant ? activeId !== null || deadAt !== null || r.armed !== false || r.farTicks !== 0 : (activeId === null) === (deadAt === null)) throw new Error('origem inconsistente');
    return { id: string(r.id), generation, activeId, deadAt, farTicks: integer(r.farTicks),
      armed: boolean(r.armed), defeats: integer(r.defeats, 0, generation + 1) };
  });
  const enemies: Enemy[] = array(area.enemies, stage.enemies.length).map((value) => {
    const e = object(value);
    const index = records.findIndex((record) => record.id === e.spawnId);
    if (index < 0) throw new Error('inimigo sem origem');
    const record = records[index], base = stage.enemies[index];
    const id = integer(e.id, 1, nextEntityId - 1);
    if (record.activeId !== id || record.generation !== e.generation) throw new Error('entidade inconsistente');
    const facing = e.facing === -1 ? -1 : e.facing === 1 ? 1 : null;
    const targetFacing = e.targetFacing === -1 ? -1 : e.targetFacing === 1 ? 1 : facing;
    if (facing === null || targetFacing === null) throw new Error('direção inválida');
    let ai: EnemyMind | undefined;
    if (e.ai !== undefined) {
      const raw = object(e.ai);
      const state = ENEMY_STATES.find((state) => state === raw.state);
      const action = (['shot', 'melee', 'flank', 'deploy'] as const).find((action) => action === raw.action);
      if (!state || state === 'dead' || !action || raw.facing !== -1 && raw.facing !== 1) throw new Error('estado de inimigo inválido');
      ai = { state, action, facing: raw.facing, timer: integer(raw.timer, 0, 10000),
        memory: integer(raw.memory, 0, 90), aimX: number(raw.aimX, -1e6, 1e6), aimY: number(raw.aimY, -1e6, 1e6) };
      // Checkpoint restoration never executes an attack prepared for the old player position.
      if (state === 'windup' || state === 'attack') { ai.state = 'recover'; ai.timer = ENEMY_COMBAT[base.type].recovery; }
      // A restored turret must finish recovery without restarting the old burst.
      if (base.type === 'turret' && ai.state === 'recover') ai.timer = Math.min(ai.timer, ENEMY_COMBAT.turret.recovery - 12);
    }
    return { ...base, ...(ai ? { ai } : {}), id, spawnId: record.id, generation: record.generation,
      deployed: base.type === 'turret_engineer' ? boolean(e.deployed ?? false) : false,
      x: number(e.x, -1e6, 1e6), y: number(e.y, -1e6, 1e6),
      hp: number(e.hp, Number.MIN_VALUE, base.maxHp),
      vx: number(e.vx, -10000, 10000), vy: number(e.vy, -10000, 10000),
      facing, targetFacing, airborne: boolean(e.airborne),
      shootTimer: number(e.shootTimer, -1e12), attackTimer: number(e.attackTimer, -1e12),
      telegraph: number(e.telegraph, -1e12),
      shieldHits: integer(e.shieldHits ?? 0), shieldBroken: boolean(e.shieldBroken ?? false),
      stunTimer: number(e.stunTimer ?? 0), turnTimer: number(e.turnTimer ?? 0, -1e12),
      isFlanking: boolean(e.isFlanking ?? false), stealthAlpha: number(e.stealthAlpha ?? 1, 0, 1),
      patrolMinX: base.x - 120, patrolMaxX: base.x + 120 };
  });
  if (new Set(enemies.map((enemy) => enemy.id)).size !== enemies.length ||
    new Set(enemies.map((enemy) => enemy.spawnId)).size !== enemies.length ||
    records.filter((record) => record.activeId !== null).length !== enemies.length) throw new Error('entidades duplicadas ou ausentes');
  return { id: stage.substageId, tick, leftAt, checkpoint, platforms, props, pickups, arenas, enemies,
    spawns: { nextEntityId, records } };
}

export type SaveDecodeResult = { status: 'ready'; save: CampaignSave } | { status: 'corrupt' | 'incompatible' };
export function decodeCampaignSave(text: string): SaveDecodeResult {
  try {
    if (text.length > MAX_SAVE_BYTES) throw new Error('arquivo grande demais');
    const root = object(JSON.parse(text));
    if (root.version !== SAVE_VERSION) throw new IncompatibleSave('versão não suportada');
    const chapterId = integer(root.chapterId, 1, 8);
    const chapter = CAMPAIGN.find((chapter) => chapter.id === chapterId)!;
    if (root.content !== campaignContentId(chapterId)) throw new IncompatibleSave('conteúdo alterado');
    const current = chapter.substages.find((id) => id === root.current);
    if (!current) throw new IncompatibleSave('setor ausente');
    const worldTick = integer(root.worldTick);
    const mode = ['playing', 'continue', 'game-over', 'chapter-clear'].find((mode) => mode === root.mode) as ResumeMode | undefined;
    if (!mode) throw new Error('estado inválido');
    const p = object(root.player);
    const characterId = (['ren', 'maya', 'leon'] as const).find((id) => id === p.characterId);
    if (!characterId) throw new Error('herói desconhecido');
    const hp = number(p.hp, 0, CHARACTERS[characterId].maxHp), lives = integer(p.lives);
    if ((mode === 'playing' || mode === 'chapter-clear') && (hp <= 0 || lives < 1) ||
        mode === 'continue' && (hp !== 0 || lives !== 0)) throw new Error('vida inconsistente');
    const score = integer(p.score), nextOneUpScore = integer(p.nextOneUpScore, 15000, 1e15);
    if (nextOneUpScore <= score || nextOneUpScore % 15000 !== 0) throw new Error('progressão inválida');
    const player: PlayerCarry = { characterId, hp, lives, score, nextOneUpScore,
      psyEnergy: number(p.psyEnergy, 0, 100), wavAmmo: integer(p.wavAmmo),
      atkTimer: integer(p.atkTimer, 0, 720), jmpTimer: integer(p.jmpTimer, 0, 900), gstTimer: integer(p.gstTimer, 0, 600) };
    const areas = array(root.areas, chapter.substages.length).map((area) => decodeArea(area, chapterId, worldTick));
    if (!areas.some((area) => area.id === current) || new Set(areas.map((area) => area.id)).size !== areas.length) throw new Error('setores inconsistentes');
    if (mode === 'chapter-clear' && !getSubstage(current).boss) throw new Error('conclusão sem chefe');
    return { status: 'ready', save: { version: SAVE_VERSION, content: campaignContentId(chapterId),
      savedAt: integer(root.savedAt, 0, 1e15), chapterId, current, worldTick, mode, player, areas,
      preferences: { muted: boolean(object(root.preferences).muted) } } };
  } catch (error) {
    return { status: error instanceof IncompatibleSave ? 'incompatible' : 'corrupt' };
  }
}
