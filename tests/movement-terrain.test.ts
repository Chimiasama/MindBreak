import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { sound } from '../src/game/audio';
import { GameEngine } from '../src/game/engine';
import { FixedStepClock } from '../src/game/simulation';
import { CHARACTERS } from '../src/game/characters';
import { MOVEMENT_PROFILES, horizontalVelocity } from '../src/game/movement';
import { enemySolids, hasSafeFooting, moveGroundEnemy } from '../src/game/groundActors';
import { CharacterId, Enemy, Platform } from '../src/game/types';
import { overlaps } from '../src/game/collision';

Object.defineProperty(globalThis, 'window', { configurable: true, value: { setInterval, clearInterval } });
afterEach(() => sound.stopMusic());
const floor: Platform = { x: -100, y: 600, w: 10200, h: 500, type: 'solid' };
function actor(x = 50, y = 544): Enemy {
  return { id: 1, type: 'mutant', x, y, w: 34, h: 56, hp: 50, maxHp: 50,
    vx: 0, vy: 0, airborne: false, facing: 1, shootTimer: 9999, attackTimer: 9999,
    telegraph: 0, patrolMinX: x - 120, patrolMaxX: x + 120 };
}
function fixture(hero: CharacterId = 'ren') {
  const engine = new GameEngine({ width: 1280, height: 720, getContext: () => ({}) } as unknown as HTMLCanvasElement,
    { onHudUpdate() {}, onStageClear() {}, onContinueCountdown() {}, onGameOver() {} });
  engine.loadStage(1, hero); engine.setPaused(false);
  const state: any = engine;
  state.stage = { ...state.stage, boundsWidth: 10000, boundsBottom: 1400, windForce: 0 };
  state.platforms = [{ ...floor }]; state.ceilingPipes = []; state.enemies = [];
  state.spawns.update = () => []; state.ambushArenas = []; state.boss.active = false;
  Object.assign(state.player, { x: 1000, y: 544, grounded: true, vx: 0, vy: 0, invulnTimer: 100000 });
  return { engine, state };
}

for (const hero of ['ren', 'maya', 'leon'] as const) {
  test(`${hero} accelerates in three ticks, reverses and brakes without input overshoot`, () => {
    const speed = CHARACTERS[hero].speed, profile = MOVEMENT_PROFILES[hero];
    let velocity = horizontalVelocity(0, 1, speed, profile, true, false);
    assert.ok(velocity > 0 && velocity < speed);
    for (let tick = 1; tick < 3; tick++) velocity = horizontalVelocity(velocity, 1, speed, profile, true, false);
    assert.equal(velocity, speed);
    for (let tick = 0; tick < 5; tick++) velocity = horizontalVelocity(velocity, -1, speed, profile, true, false);
    assert.equal(velocity, -speed);
    for (let tick = 0; tick < 3; tick++) velocity = horizontalVelocity(velocity, 0, speed, profile, true, false);
    assert.equal(velocity, 0);
    for (let tick = 0; tick < 20; tick++) velocity = horizontalVelocity(velocity, 0, speed, profile, true, false);
    assert.equal(velocity, 0);
  });

  test(`${hero} keeps the measured jump envelope after acceleration changes`, () => {
    const baseline = { ren: [115.9, 220.4, 38, 193.696, 313.2, 54],
      maya: [112.1, 193.8, 38, 188.242, 275.4, 54], leon: [101.25, 169.2, 36, 172.01, 244.4, 52] }[hero];
    for (const double of [false, true]) {
      const { engine, state } = fixture(hero);
      engine.setKey('right', true);
      for (let tick = 0; tick < 12; tick++) state.update();
      const start = state.player.x;
      engine.queueAction('jump');
      let apex = 0, ticks = 0;
      do {
        if (double && ticks === 13) engine.queueAction('jump');
        engine.setKey('jumpHeld', false); state.update();
        apex = Math.max(apex, 600 - state.player.y - state.player.h); ticks++;
      } while (!state.player.grounded && ticks < 200);
      const offset = double ? 3 : 0;
      assert.ok(Math.abs(apex - baseline[offset]) < 0.001);
      assert.ok(Math.abs(state.player.x - start - baseline[offset + 1]) < 0.001);
      assert.equal(ticks, baseline[offset + 2]); engine.stop();
    }
  });
}

test('acceleration, reversal and jumping produce identical results at 30/60/120/144 Hz', () => {
  const snapshots: number[][] = [];
  for (const hz of [30, 60, 120, 144]) {
    const { engine, state } = fixture(); let tick = 0;
    const clock = new FixedStepClock();
    for (let frame = 0; frame <= hz * 2; frame++) clock.advance(frame * 1000 / hz, () => {
      if (tick === 0) engine.setKey('right', true);
      if (tick === 15) engine.queueAction('jump');
      if (tick === 45) { engine.setKey('right', false); engine.setKey('left', true); }
      if (tick === 75) engine.setKey('left', false);
      state.update(); tick++;
    });
    assert.equal(tick, 120);
    const p = state.player; snapshots.push([p.x, p.y, p.vx, p.vy]); engine.stop();
  }
  for (const snapshot of snapshots) assert.deepEqual(snapshot, snapshots[0]);
});

test('ground enemy knockback cannot cross a thin wall and fast falling lands on a thin floor', () => {
  const wall: Platform = { x: 100, y: 0, w: 1, h: 600, type: 'wall' };
  const enemy = actor(); enemy.vx = 200; enemy.vy = 100;
  assert.equal(moveGroundEnemy(enemy, enemySolids([floor, wall]), 1), true);
  assert.equal(enemy.x, 66); assert.equal(enemy.y, 544);
  assert.equal(enemy.airborne, false); assert.equal(enemy.vx, 0);
  const thin: Platform = { x: 0, y: 590, w: 300, h: 1, type: 'solid' };
  const falling = actor(40, 520); falling.vy = 100;
  moveGroundEnemy(falling, [thin], 1);
  assert.equal(falling.y, 534); assert.equal(falling.vy, 0);
});

test('an upward enemy impulse hits the underside rather than teleporting onto the roof', () => {
  const enemy = actor(40, 130); enemy.vy = -90; enemy.airborne = true;
  const roof: Platform = { x: 0, y: 90, w: 300, h: 5, type: 'solid' };
  moveGroundEnemy(enemy, [roof], 1);
  assert.equal(enemy.y, 95); assert.equal(enemy.vy, 0); assert.equal(enemy.airborne, true);
});

test('enemies ride moving platforms and conveyor motion stops at solid walls', () => {
  const platform: Platform = { x: 120, y: 280, w: 200, h: 18, type: 'moving' };
  const enemy = actor(140, 244);
  moveGroundEnemy(enemy, [platform], 1, new Map([[platform, { x: 20, y: -20 }]]));
  assert.equal(enemy.x, 160); assert.equal(enemy.y, 224); assert.equal(enemy.airborne, false);
  const belt: Platform = { ...floor, type: 'conveyor', conveyorSpeed: 100 };
  const wall: Platform = { x: 200, y: 400, w: 1, h: 200, type: 'wall' };
  const riding = actor(150);
  moveGroundEnemy(riding, [belt, wall], 1);
  assert.equal(riding.x, 166); assert.equal(overlaps(riding, wall), false);
});

test('the engine passes platform deltas to supported enemies in the same tick', () => {
  const { engine, state } = fixture();
  const platform: Platform = { x: 400, y: 300, w: 200, h: 18, type: 'moving',
    originX: 400, originY: 300, moveAxis: 'x', moveRange: 80, moveSpeed: 0.04 };
  const enemy = actor(440, 244); enemy.type = 'turret';
  state.enemies = [enemy]; state.platforms = [floor, platform];
  state.update();
  assert.ok(Math.abs(enemy.x - 440 - (platform.x - 400)) < 1e-9);
  assert.equal(enemy.y, 244); engine.stop();
});

test('voluntary pursuit stops before a gap, acid or laser gate', () => {
  const ledge: Platform = { x: 0, y: 600, w: 200, h: 200, type: 'solid' };
  assert.equal(hasSafeFooting(actor(160), 4, [ledge]), false);
  for (const type of ['acid', 'laser_gate'] as const) {
    const hazard: Platform = { x: 200, y: 600, w: 200, h: 200, type };
    assert.equal(hasSafeFooting(actor(160), 4, [ledge, hazard]), false);
  }
  const { engine, state } = fixture();
  const enemy = actor(130); state.enemies = [enemy]; state.platforms = [ledge];
  Object.assign(state.player, { x: 350, y: 544 });
  for (let tick = 0; tick < 240; tick++) state.updateEnemies();
  assert.ok(enemy.x > 130 && enemy.x + enemy.w < 200); assert.equal(enemy.y, 544);
  engine.stop();
});

test('normal chasing and stunned knockback both use the solid-wall solver', () => {
  for (const stunned of [false, true]) {
    const { engine, state } = fixture();
    const enemy = actor(50); enemy.stunTimer = stunned ? 30 : 0; enemy.vx = stunned ? 70 : 0;
    const wall: Platform = { x: 100, y: 0, w: 1, h: 600, type: 'wall' };
    state.enemies = [enemy]; state.platforms = [floor, wall]; state.player.x = 160;
    for (let tick = 0; tick < 60; tick++) state.updateEnemies();
    assert.ok(enemy.x > 50); assert.ok(enemy.x + enemy.w <= 100);
    assert.equal(overlaps(enemy, wall), false); engine.stop();
  }
});

test('ground enemies return from beyond their leash without teleporting to the origin', () => {
  const { engine, state } = fixture();
  const enemy = actor(720); enemy.patrolMinX = -120; enemy.patrolMaxX = 120;
  state.enemies = [enemy]; state.player.x = 1000;
  state.updateEnemies(); assert.ok(enemy.x < 720 && enemy.x > 718);
  for (let tick = 0; tick < 600; tick++) state.updateEnemies();
  assert.ok(enemy.x <= 700); engine.stop();
});

test('physical knockback may push an enemy into a pit but never awards an unconfirmed defeat', () => {
  const { engine, state } = fixture();
  const enemy = actor(170); enemy.vx = 80;
  state.enemies = [enemy]; state.platforms = [{ ...floor, x: 0, w: 200 }]; state.player.x = 5000;
  for (let tick = 0; tick < 150; tick++) state.updateEnemies();
  assert.equal(state.enemies.length, 0); assert.equal(state.player.score, 0); engine.stop();
});

test('hound flanking refuses a leap whose destination has no safe floor', () => {
  const { engine, state } = fixture();
  const hound = actor(100); hound.type = 'cyber_hound'; hound.attackTimer = 10;
  const shield = actor(350); shield.id = 2; shield.type = 'mib_shield';
  state.enemies = [hound, shield]; state.platforms = [{ ...floor, x: 0, w: 200 }];
  Object.assign(state.player, { x: 300, y: 544, facing: 1 });
  state.updateEnemies();
  assert.notEqual(hound.isFlanking, true); assert.equal(hound.vx, 0); engine.stop();
});
