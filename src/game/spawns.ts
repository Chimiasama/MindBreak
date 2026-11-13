import { Body } from './collision';
import { Enemy, StageDefinition } from './types';
import { RESPAWN } from './tuning';
import { defeatReward } from './rewards';

interface SpawnRecord {
  id: string;
  template: StageDefinition['enemies'][number];
  activeId: number | null;
  generation: number;
  deadAt: number | null;
  farTicks: number;
  armed: boolean;
  repeatable: boolean;
  defeats: number;
}

export interface SpawnSnapshot {
  nextEntityId: number;
  records: Pick<SpawnRecord, 'id' | 'activeId' | 'generation' | 'deadAt' | 'farTicks' | 'armed' | 'defeats'>[];
}

export class SpawnManager {
  private records: SpawnRecord[];
  private nextEntityId = 1;
  private farDistance: number;
  private rewarded = new WeakSet<Enemy>();

  constructor(stage: Pick<StageDefinition, 'id' | 'enemies' | 'boundsWidth' | 'boundsBottom' | 'boundsTop' | 'ambushArenas'>, namespace = String(stage.id)) {
    this.farDistance = Math.min(RESPAWN.farDistance, Math.max(900,
      Math.hypot(stage.boundsWidth, stage.boundsBottom - stage.boundsTop) * 0.5));
    this.records = stage.enemies.map((template, index) => ({
      id: `${namespace}:${index + 1}`,
      template: { ...template },
      activeId: null,
      generation: -1,
      deadAt: null,
      farTicks: 0,
      armed: false,
      defeats: 0,
      // Mandatory encounters never refill or lock an already cleared arena.
      repeatable: !(stage.ambushArenas ?? []).some((arena) =>
        template.x >= arena.minX - 60 && template.x <= arena.maxX + 60),
    }));
  }

  snapshot(): SpawnSnapshot {
    return { nextEntityId: this.nextEntityId, records: this.records.map((record) => ({
      id: record.id, activeId: record.activeId, generation: record.generation,
      deadAt: record.deadAt, farTicks: record.farTicks, armed: record.armed, defeats: record.defeats,
    })) };
  }

  /** Receives a snapshot already checked by the campaign save codec. */
  restore(snapshot: SpawnSnapshot) {
    this.nextEntityId = snapshot.nextEntityId;
    this.records.forEach((record, index) => Object.assign(record, snapshot.records[index]));
    this.rewarded = new WeakSet<Enemy>();
  }

  private materialize(record: SpawnRecord): Enemy {
    const en = record.template;
    record.activeId = this.nextEntityId++;
    record.generation++;
    record.deadAt = null;
    record.armed = false;
    record.farTicks = 0;
    return {
      ...en, id: record.activeId, spawnId: record.id, generation: record.generation,
      vx: 0, vy: 0, airborne: en.type === 'jetpack' || en.type === 'drone', telegraph: 0,
      patrolMinX: en.x - 120, patrolMaxX: en.x + 120,
      turnTimer: 0, targetFacing: en.facing, shieldHits: 0, shieldBroken: false,
      stunTimer: 0, isFlanking: false,
    };
  }

  initial(): Enemy[] {
    return this.records.filter((record) => record.generation < 0).map((record) => this.materialize(record));
  }

  /** Count confirmed player defeats per origin, not mere appearances or hits. */
  claimDefeatReward(enemy: Enemy) {
    if (enemy.hp > 0 || this.rewarded.has(enemy)) return 0;
    this.rewarded.add(enemy);
    const record = this.records.find((spawn) => spawn.id === enemy.spawnId);
    if (!record) return defeatReward(enemy.generation ?? 0);
    const reward = defeatReward(record.defeats);
    record.defeats++;
    return reward;
  }

  noteMissing(alive: Enemy[], tick: number) {
    const liveIds = new Set(alive.filter((enemy) => enemy.hp > 0).map((enemy) => enemy.id));
    for (const record of this.records) {
      if (record.activeId !== null && !liveIds.has(record.activeId)) {
        record.activeId = null;
        record.deadAt = tick;
      }
    }
  }

  advanceAway(ticks: number) {
    const elapsed = Math.max(0, Math.floor(ticks));
    for (const record of this.records) {
      if (record.activeId !== null || record.deadAt === null || !record.repeatable) continue;
      record.deadAt -= elapsed;
      record.farTicks += elapsed;
      if (record.farTicks >= RESPAWN.farTicks) record.armed = true;
    }
  }

  update(player: Body, camera: Body | null, tick: number, alive: Enemy[], solids: Body[], entering = false): Enemy[] {
    this.noteMissing(alive, tick);
    const liveIds = new Set(alive.filter((enemy) => enemy.hp > 0).map((enemy) => enemy.id));
    const spawned: Enemy[] = [];
    for (const record of this.records) {
      if (record.activeId !== null || !record.repeatable || record.deadAt === null) continue;
      const origin = record.template;
      const distance = Math.hypot(player.x - origin.x, player.y - origin.y);
      record.farTicks = distance >= this.farDistance ? record.farTicks + 1 : 0;
      if (record.farTicks >= RESPAWN.farTicks) record.armed = true;
      // Prepare offscreen actors before they enter a large viewport; never pop them in view.
      const activationRadius = camera ? Math.max(RESPAWN.activationRadius,
        camera.w + RESPAWN.cameraMargin, camera.h + RESPAWN.cameraMargin) : RESPAWN.activationRadius;
      const inRange = entering || distance <= activationRadius;
      if (!record.armed || tick - record.deadAt < RESPAWN.minimumDeadTicks ||
          !inRange || distance < RESPAWN.playerSafetyRadius ||
          liveIds.size + spawned.length >= RESPAWN.maxActive) continue;
      const visible = camera && origin.x < camera.x + camera.w + RESPAWN.cameraMargin &&
        origin.x + origin.w > camera.x - RESPAWN.cameraMargin &&
        origin.y < camera.y + camera.h + RESPAWN.cameraMargin &&
        origin.y + origin.h > camera.y - RESPAWN.cameraMargin;
      if (visible || alive.some((enemy) => enemy.hp > 0 && origin.x < enemy.x + enemy.w && origin.x + origin.w > enemy.x &&
        origin.y < enemy.y + enemy.h && origin.y + origin.h > enemy.y) || solids.some((solid) => origin.x < solid.x + solid.w && origin.x + origin.w > solid.x &&
        origin.y < solid.y + solid.h && origin.y + origin.h > solid.y)) continue;
      spawned.push(this.materialize(record));
    }
    return spawned;
  }
}
