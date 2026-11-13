import { Body, depenetrate, moveAgainstSolids, overlaps } from './collision';
import { Enemy, Platform } from './types';

export const GROUND_ENEMY = {
  gravity: 0.6,
  terminalVelocity: 22,
  leash: 700,
  detectionRadius: 660,
  safeDrop: 32,
  edgeMargin: 6,
};
export type PlatformDeltas = ReadonlyMap<Platform, { x: number; y: number }>;
export const enemySolids = (platforms: Platform[]) => platforms.filter((platform) =>
  !platform.broken && platform.type !== 'acid' && platform.type !== 'laser_gate');

/** Ground intent needs a floor at the leading foot; physical knockback remains unconstrained. */
export function hasSafeFooting(body: Body, delta: number, platforms: Platform[]) {
  const x = delta < 0 ? body.x + delta - GROUND_ENEMY.edgeMargin : body.x + body.w + delta + GROUND_ENEMY.edgeMargin;
  const feet = body.y + body.h;
  const landing = platforms.filter((platform) => !platform.broken &&
    platform.x <= x && platform.x + platform.w >= x &&
    platform.y >= feet - 4 && platform.y <= feet + GROUND_ENEMY.safeDrop)
    .sort((a, b) => a.y - b.y)[0];
  if (!landing || landing.type === 'acid' || landing.type === 'laser_gate') return false;
  const next = { ...body, x: body.x + delta };
  return !platforms.some((platform) => !platform.broken &&
    (platform.type === 'acid' || platform.type === 'laser_gate') && overlaps(next, platform));
}

export function enemyHome(enemy: Enemy) {
  return ((enemy.patrolMinX ?? enemy.x - 120) + (enemy.patrolMaxX ?? enemy.x + 120)) / 2;
}

/** Same swept solver as the player, including transport and conveyors. No rewards are issued here. */
export function moveGroundEnemy(enemy: Enemy, solids: Platform[],
  gravityScale: number, deltas?: PlatformDeltas) {
  if (!enemy.airborne && enemy.vy >= 0 && deltas) {
    const support = solids.find((platform) => {
      const delta = deltas.get(platform);
      if (!delta) return false;
      const previous = { ...platform, x: platform.x - delta.x, y: platform.y - delta.y };
      return Math.abs(enemy.y + enemy.h - previous.y) < 1 &&
        enemy.x + enemy.w > previous.x && enemy.x < previous.x + previous.w;
    });
    if (support) {
      const delta = deltas.get(support)!;
      const obstacles = solids.filter((platform) => platform !== support);
      moveAgainstSolids(enemy, delta.x, 'x', obstacles);
      moveAgainstSolids(enemy, delta.y, 'y', obstacles);
    }
  }
  if (!depenetrate(enemy, solids)) {
    enemy.vx = enemy.vy = 0;
    return false;
  }
  if (moveAgainstSolids(enemy, enemy.vx, 'x', solids)) enemy.vx = 0;
  enemy.vy = Math.min(GROUND_ENEMY.terminalVelocity, enemy.vy + GROUND_ENEMY.gravity * gravityScale);
  const falling = enemy.vy > 0;
  const support = moveAgainstSolids(enemy, enemy.vy, 'y', solids) as Platform | null;
  enemy.airborne = !(support && falling);
  if (support) {
    enemy.vy = 0;
    if (falling && support.type === 'conveyor' && support.conveyorSpeed) {
      moveAgainstSolids(enemy, support.conveyorSpeed, 'x', solids);
    }
  }
  return true;
}
