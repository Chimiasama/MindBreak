import { Body, depenetrate, moveAgainstSolids } from './collision';
import { hasSafeFooting } from './groundActors';
import { BossAttack, BossConfig, BossRuntime, Platform } from './types';

export const BOSS_PATTERNS: Record<BossConfig['behavior'], Record<1 | 2, readonly BossAttack[]>> = {
  cipher: { 1: ['daggers', 'lunge'], 2: ['lunge', 'daggers', 'daggers'] },
  valkyrie: { 1: ['sweep', 'dive'], 2: ['dive', 'sweep', 'dive'] },
  goliath: { 1: ['charge', 'shockwave'], 2: ['shockwave', 'charge', 'charge'] },
  arisawa: { 1: ['acid_fan', 'acid_rain'], 2: ['acid_rain', 'acid_fan', 'acid_rain'] },
  twins: { 1: ['crossfire', 'portal'], 2: ['portal', 'crossfire', 'crossfire'] },
  kusanagi: { 1: ['draw_cut', 'blade_fan'], 2: ['draw_cut', 'draw_cut', 'blade_fan'] },
  vane: { 1: ['plasma_burst', 'mortar'], 2: ['mortar', 'plasma_burst', 'plasma_burst'] },
  oswald: { 1: ['orbs', 'eye_beam'], 2: ['eye_beam', 'orbs', 'eye_beam'] },
};
export const BOSS_MOVES: Record<BossAttack, { label: string; windup: number; active: number; recovery: number }> = {
  daggers: { label: 'ADAGAS PSÍQUICAS', windup: 32, active: 1, recovery: 42 },
  lunge: { label: 'AVANÇO CINÉTICO', windup: 30, active: 14, recovery: 48 },
  sweep: { label: 'LÂMINAS DE VENTO', windup: 36, active: 1, recovery: 42 },
  dive: { label: 'MERGULHO', windup: 36, active: 18, recovery: 54 },
  charge: { label: 'INVESTIDA', windup: 40, active: 20, recovery: 58 },
  shockwave: { label: 'ONDA DE CHOQUE', windup: 34, active: 1, recovery: 46 },
  acid_fan: { label: 'NEUROTOXINA', windup: 38, active: 1, recovery: 50 },
  acid_rain: { label: 'CHUVA ÁCIDA', windup: 44, active: 1, recovery: 54 },
  crossfire: { label: 'FOGO CRUZADO', windup: 36, active: 1, recovery: 50 },
  portal: { label: 'PORTAL', windup: 40, active: 1, recovery: 56 },
  draw_cut: { label: 'SAQUE DA KATANA', windup: 28, active: 10, recovery: 50 },
  blade_fan: { label: 'LÂMINAS HF', windup: 32, active: 1, recovery: 42 },
  plasma_burst: { label: 'RAJADA DE PLASMA', windup: 36, active: 18, recovery: 54 },
  mortar: { label: 'BOMBARDEIO', windup: 46, active: 1, recovery: 60 },
  orbs: { label: 'ÓRBITAS ZERO', windup: 42, active: 1, recovery: 52 },
  eye_beam: { label: 'OLHO CÓSMICO', windup: 40, active: 1, recovery: 56 },
};
export const isBossCharge = (attack: BossAttack) => ['lunge', 'charge', 'dive', 'draw_cut'].includes(attack);
export const isFlyingBoss = (boss: BossRuntime) => boss.behavior === 'valkyrie' || boss.behavior === 'oswald';

export function bossBodies(boss: BossRuntime): Body[] {
  return [boss, ...(boss.behavior === 'twins' ? [{ x: boss.twinX ?? boss.x + 120,
    y: boss.twinY ?? boss.y, w: boss.w, h: boss.h }] : [])];
}

/** One attack event at entry, except the explicitly spaced three-pulse plasma burst. */
export function stepBoss(boss: BossRuntime, player: Body) {
  const mind = boss.mind ??= { state: 'ready', timer: 0, index: 0, phase: boss.phase,
    attack: BOSS_PATTERNS[boss.behavior][boss.phase][0], aimX: player.x + player.w / 2,
    aimY: player.y + player.h / 2, facing: boss.facing };
  const result: { started: boolean; fire: BossAttack | null } = { started: false, fire: null };
  boss.telegraph = 0;
  if (mind.phase !== boss.phase) {
    mind.phase = boss.phase; mind.state = 'recover'; mind.timer = 45; mind.index = 0;
    boss.vx = 0; if (isFlyingBoss(boss)) boss.vy = 0; boss.shieldActive = false;
    return result;
  }
  if (mind.state === 'ready') {
    const pattern = BOSS_PATTERNS[boss.behavior][boss.phase];
    mind.attack = pattern[mind.index++ % pattern.length];
    mind.aimX = player.x + player.w / 2; mind.aimY = player.y + player.h / 2;
    mind.facing = mind.aimX >= boss.x + boss.w / 2 ? 1 : -1;
    mind.state = 'windup'; mind.timer = Math.max(18, Math.round(BOSS_MOVES[mind.attack].windup * (boss.phase === 2 ? 0.85 : 1)));
    boss.vx = 0; boss.shieldActive = boss.behavior === 'cipher' && boss.phase === 1;
    result.started = true;
  } else if (mind.state === 'windup') {
    if (--mind.timer <= 0) {
      mind.state = 'active'; mind.timer = BOSS_MOVES[mind.attack].active;
      result.fire = mind.attack;
    }
  } else if (mind.state === 'active') {
    if (--mind.timer <= 0) {
      mind.state = 'recover'; mind.timer = Math.max(24, Math.round(BOSS_MOVES[mind.attack].recovery * (boss.phase === 2 ? 0.9 : 1)));
      boss.vx = 0; if (isFlyingBoss(boss)) boss.vy = 0; boss.shieldActive = false;
    } else if (mind.attack === 'plasma_burst' && (BOSS_MOVES.plasma_burst.active - mind.timer) % 6 === 0) result.fire = mind.attack;
  } else if (--mind.timer <= 0) mind.state = 'ready';
  boss.facing = mind.facing;
  boss.telegraph = mind.state === 'windup' ? 1 : 0;
  boss.attackTimer = mind.timer;
  return result;
}

export interface BossShot { x: number; y: number; w: number; h: number; vx: number; vy: number; damage: number; color: string; gravity?: number }
export function bossShots(boss: BossRuntime, attack: BossAttack): BossShot[] {
  const mind = boss.mind!, phase2 = boss.phase === 2;
  const x = boss.x + boss.w / 2, y = boss.y + boss.h * 0.4;
  const angle = Math.atan2(mind.aimY - y, mind.aimX - x);
  const shot = (x: number, y: number, vx: number, vy: number, damage = 14, w = 14, h = 8): BossShot =>
    ({ x, y, vx, vy, w, h, damage, color: boss.accentColor });
  const fan = (offsets: number[], speed: number, damage = 14) => offsets.map((offset) =>
    shot(x, y, Math.cos(angle + offset) * speed, Math.sin(angle + offset) * speed, damage));
  switch (attack) {
    case 'daggers': return fan(phase2 ? [-0.36, -0.18, 0, 0.18, 0.36] : [-0.22, 0, 0.22], 8.5, 15);
    case 'sweep': return [-70, 0, 70].map((lane) => shot(x, mind.aimY + lane, mind.facing * 8, 0, 14, 24, 7));
    case 'shockwave': return [-1, 1].map((side) => shot(x, boss.y + boss.h - 12, side * (phase2 ? 9 : 7), 0, 18, 24, 10));
    case 'acid_fan': return [-2, -1, 0, 1, 2].map((offset) => ({ ...shot(x, boss.y, mind.facing * (5 + offset), -7 + Math.abs(offset), 15, 12, 12), gravity: 0.18 }));
    case 'acid_rain': case 'mortar': return [-120, 0, 120].map((offset) => ({
      ...shot(mind.aimX + offset, mind.aimY - 240, 0, attack === 'mortar' ? 4 : 3, attack === 'mortar' ? 18 : 14, 14, 14), gravity: 0.12 }));
    case 'crossfire': case 'portal': return bossBodies(boss).flatMap((body) => {
      const x = body.x + body.w / 2, y = body.y + body.h / 2;
      const angle = Math.atan2(mind.aimY - y, mind.aimX - x);
      return (phase2 ? [-0.1, 0.1] : [0]).map((offset) => shot(x, y, Math.cos(angle + offset) * 7.5, Math.sin(angle + offset) * 7.5, 15));
    });
    case 'blade_fan': return fan(phase2 ? [-0.3, -0.1, 0.1, 0.3] : [-0.16, 0.16], 9.5, 16);
    case 'plasma_burst': return fan(phase2 ? [-0.08, 0.08] : [0], 9.2, 16);
    case 'orbs': return Array.from({ length: phase2 ? 12 : 8 }, (_, i) => {
      const angle = i * Math.PI * 2 / (phase2 ? 12 : 8);
      return shot(x, y, Math.cos(angle) * 5.5, Math.sin(angle) * 5.5, 15, 12, 12);
    });
    case 'eye_beam': return fan(phase2 ? [-0.14, 0, 0.14] : [0], 12, 20).map((bullet) => ({ ...bullet, w: 32, h: 12 }));
    default: return [];
  }
}

/** Moving bosses use nearest-face sweeps; a blocked charge opens recovery, never tunnels. */
export function moveBoss(boss: BossRuntime, solids: Platform[], minX: number, maxX: number, gravity: number, player: Body) {
  const flying = isFlyingBoss(boss), mind = boss.mind!;
  if (!flying) {
    const supported = solids.some((solid) => Math.abs(boss.y + boss.h - solid.y) < 1 && boss.x < solid.x + solid.w && boss.x + boss.w > solid.x);
    if (supported && boss.vx && !hasSafeFooting(boss, boss.vx, solids)) {
      boss.vx = 0;
      if (mind.state === 'active') { mind.state = 'recover'; mind.timer = BOSS_MOVES[mind.attack].recovery; }
    }
    boss.vy = Math.min(22, boss.vy + 0.6 * gravity);
  } else if (mind.state !== 'active' || !isBossCharge(mind.attack)) {
    boss.vy = mind.state === 'windup' ? 0 : (player.y - (mind.state === 'recover' ? 20 : 60) - boss.y) * 0.04;
  }
  if (!depenetrate(boss, solids)) { boss.vx = boss.vy = 0; return; }
  const wall = moveAgainstSolids(boss, boss.vx, 'x', solids);
  boss.x = Math.max(minX, Math.min(maxX, boss.x));
  const ceiling = moveAgainstSolids(boss, boss.vy, 'y', solids);
  if (ceiling) boss.vy = 0;
  if (wall || ceiling && flying && mind.state === 'active' && isBossCharge(mind.attack)) {
    boss.vx = 0;
    if (mind.state === 'active') { mind.state = 'recover'; mind.timer = BOSS_MOVES[mind.attack].recovery; boss.shieldActive = false; }
  }
  if (boss.behavior === 'twins') {
    const twin = { x: boss.twinX ?? boss.x + 120, y: boss.twinY ?? boss.y, w: boss.w, h: boss.h };
    boss.twinVy = Math.min(22, (boss.twinVy ?? 0) + 0.6 * gravity);
    depenetrate(twin, solids);
    if (moveAgainstSolids(twin, boss.twinVy, 'y', solids)) boss.twinVy = 0;
    boss.twinX = Math.max(minX, Math.min(maxX, twin.x)); boss.twinY = twin.y;
  }
}

export function bossWarnings(boss: BossRuntime): Body[] {
  const mind = boss.mind;
  if (!mind || mind.state !== 'windup') return [];
  if (mind.attack === 'acid_rain' || mind.attack === 'mortar') return [-120, 0, 120].map((offset) =>
    ({ x: mind.aimX + offset - 20, y: mind.aimY - 24, w: 40, h: 48 }));
  return [{ x: mind.aimX - 24, y: mind.aimY - 24, w: 48, h: 48 }];
}
