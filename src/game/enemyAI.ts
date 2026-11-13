import { GROUND_ENEMY } from './groundActors';
import { Body, sweepTime } from './collision';
import { Enemy, EnemyMind, EnemyType } from './types';

export interface EnemyCombatProfile {
  ranged: boolean; speed: number; range: number; windup: number; recovery: number; damage: number; bulletSpeed: number;
}
const melee = (speed: number, range: number, windup: number, recovery: number, damage = 13): EnemyCombatProfile =>
  ({ ranged: false, speed, range, windup, recovery, damage, bulletSpeed: 0 });
const shooter = (range: number, windup: number, recovery: number, damage: number, bulletSpeed: number): EnemyCombatProfile =>
  ({ ranged: true, speed: 0, range, windup, recovery, damage, bulletSpeed });
export const ENEMY_COMBAT: Record<EnemyType, EnemyCombatProfile> = {
  mib_gunner: shooter(620, 24, 72, 11, 7.2), sniper: shooter(660, 36, 90, 18, 11),
  turret: shooter(620, 20, 54, 11, 7.2), drone: shooter(620, 24, 70, 12, 6.5), jetpack: shooter(620, 24, 56, 12, 6.5),
  mutant: melee(1.7, 64, 22, 44), mib_shield: melee(1.7, 62, 24, 48, 12),
  cyber_hound: melee(3.8, 64, 18, 36), suit_martial: melee(3.1, 68, 16, 40),
  samurai: melee(3.1, 78, 24, 42, 16), heavy_trooper: melee(1.7, 70, 30, 48, 18),
};
export const ENEMY_STATES = ['patrol', 'alert', 'chase', 'windup', 'attack', 'recover', 'stunned', 'airborne', 'return', 'dead'] as const;
export const ENEMY_ALERT_TICKS = 12;
export const ENEMY_MEMORY_TICKS = 90;
export const isFlyingEnemy = (enemy: Enemy) => enemy.type === 'drone' || enemy.type === 'jetpack';

/** Visibility and projectile checks use the same swept geometry as movement. */
export function terrainHit(body: Body, dx: number, dy: number, solids: Body[]) {
  return solids.reduce<number>((earliest, solid) => Math.min(earliest, sweepTime(body, dx, dy, solid) ?? Infinity), Infinity);
}
export function canSeeBody(source: Body, target: Body, solids: Body[]) {
  const point = { x: source.x + source.w / 2, y: source.y + source.h / 2, w: 1, h: 1 };
  return terrainHit(point, target.x + target.w / 2 - point.x, target.y + target.h / 2 - point.y, solids) === Infinity;
}
export interface EnemyContext {
  player: Body & { facing: number };
  visible: boolean;
  home: number;
  stunned: boolean;
  canFlank: boolean;
  coverFire: boolean;
}
export interface EnemyIntent {
  move: number;
  targetX: number;
  attack: 'shot' | 'melee' | 'flank' | null;
  coverWarning: boolean;
}
function enter(enemy: Enemy, state: EnemyMind['state'], timer = 0) {
  enemy.ai!.state = state; enemy.ai!.timer = timer;
}

/** One state transition/tick; attack is an entry event, never a continuous overlap effect. */
export function stepEnemyAI(enemy: Enemy, context: EnemyContext): EnemyIntent {
  const profile = ENEMY_COMBAT[enemy.type], flying = isFlyingEnemy(enemy);
  const mind = enemy.ai ??= { state: 'patrol', timer: 0, memory: 0,
    aimX: enemy.x, aimY: enemy.y, facing: enemy.facing, action: profile.ranged ? 'shot' : 'melee' };
  const intent: EnemyIntent = { move: 0, targetX: context.home, attack: null, coverWarning: false };
  enemy.telegraph = 0;
  if (enemy.hp <= 0) { enter(enemy, 'dead'); return intent; }
  if (context.stunned) { enter(enemy, 'stunned', 12); return intent; }
  if (mind.state === 'stunned' && mind.timer > 0) { mind.timer--; return intent; }
  if (enemy.airborne && !flying) { enter(enemy, 'airborne'); return intent; }
  if (mind.state === 'airborne' || mind.state === 'stunned') enter(enemy, 'recover', 12);
  if (Math.abs(enemy.x - context.home) > GROUND_ENEMY.leash && mind.state !== 'return') enter(enemy, 'return');
  if (mind.state === 'return') {
    intent.targetX = context.home;
    if (Math.abs(enemy.x - context.home) <= 16) enter(enemy, 'patrol');
    else intent.move = Math.sign(context.home - enemy.x) * (flying ? 2 : 1.7);
    return intent;
  }
  if (context.visible) {
    mind.memory = ENEMY_MEMORY_TICKS;
    // The attack destination is locked as soon as its preparation starts.
    if (mind.state !== 'windup' && mind.state !== 'attack' && mind.state !== 'recover') {
      mind.aimX = context.player.x + context.player.w / 2;
      mind.aimY = context.player.y + context.player.h / 2;
    }
  } else mind.memory = Math.max(0, mind.memory - 1);
  if (mind.state === 'windup' && !context.visible) { enter(enemy, 'recover', 18); return intent; }
  if (mind.state === 'attack') { enter(enemy, 'recover', profile.recovery); return intent; }
  if (mind.state === 'recover') {
    if (mind.timer > 0) { mind.timer--; return intent; }
    enter(enemy, 'chase');
  }
  if (mind.state === 'windup') {
    enemy.telegraph = 1;
    if (mind.timer > 0) mind.timer--;
    if (mind.timer === 0) { enter(enemy, 'attack', 1); enemy.telegraph = 0; intent.attack = mind.action; }
    return intent;
  }
  if (mind.state === 'patrol') {
    if (context.visible) { enter(enemy, 'alert', ENEMY_ALERT_TICKS); return intent; }
    // Ranged actors keep their firing positions. Others patrol within their authored bounds.
    if (!profile.ranged) {
      if (enemy.x <= context.home - 110) enemy.facing = 1;
      if (enemy.x >= context.home + 110) enemy.facing = -1;
      intent.move = enemy.facing * 0.65;
    }
    return intent;
  }
  if (mind.state === 'alert') {
    if (mind.timer > 0) { mind.timer--; return intent; }
    enter(enemy, 'chase');
  }
  if (!context.visible && mind.memory === 0) {
    enter(enemy, Math.abs(enemy.x - context.home) > 120 ? 'return' : 'patrol');
    return intent;
  }
  const dx = mind.aimX - (enemy.x + enemy.w / 2), dy = mind.aimY - (enemy.y + enemy.h / 2);
  const cooldown = profile.ranged ? 'shootTimer' : 'attackTimer';
  if (context.coverFire && enemy.type === 'mib_gunner' && enemy[cooldown] > 14) {
    enemy[cooldown] = 14; intent.coverWarning = true;
  }
  enemy[cooldown] = Math.max(0, enemy[cooldown] - 1);
  const flank = enemy.type === 'cyber_hound' && context.canFlank && Math.abs(dx) < 280 && enemy[cooldown] <= 20;
  const inRange = profile.ranged ? Math.hypot(dx, dy) <= profile.range : Math.abs(dx) <= profile.range && Math.abs(dy) < 60;
  const guarded = (enemy.type === 'mib_shield' || enemy.type === 'heavy_trooper') && !enemy.shieldBroken;
  const frontReady = !guarded || (dx >= 0 ? 1 : -1) === enemy.facing;
  if (context.visible && frontReady && (flank || inRange && enemy[cooldown] === 0)) {
    mind.action = flank ? 'flank' : profile.ranged ? 'shot' : 'melee';
    if (flank) mind.aimX = context.player.x - context.player.facing * 56;
    mind.facing = mind.aimX >= enemy.x + enemy.w / 2 ? 1 : -1;
    enter(enemy, 'windup', profile.windup);
    enemy.telegraph = 1;
    return intent;
  }
  intent.targetX = mind.aimX;
  if (flying) intent.move = 1; // The flight controller handles the geometric approach.
  else if (!profile.ranged && Math.abs(dx) > profile.range - 12) intent.move = Math.sign(dx) * profile.speed;
  return intent;
}
