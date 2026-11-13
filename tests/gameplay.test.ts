import test from 'node:test';
import assert from 'node:assert/strict';
import { FixedStepClock } from '../src/game/simulation';
import { GameInput } from '../src/game/input';
import { moveAgainstSolids } from '../src/game/collision';
import { GameEngine } from '../src/game/engine';

// Minimal platform adapter: these tests exercise simulation, not browser rendering/audio.
Object.defineProperty(globalThis, 'window', { configurable: true, value: { setInterval, clearInterval } });
function fixture(onStageClear = () => {}, onPauseRequest?: () => void) {
  const canvas = { width: 1280, height: 800, getContext: () => ({ imageSmoothingEnabled: false }) } as unknown as HTMLCanvasElement;
  const engine = new GameEngine(canvas, { onHudUpdate() {}, onStageClear, onPauseRequest, onContinueCountdown() {}, onGameOver() {} });
  engine.loadStage(1, 'ren');
  engine.setPaused(false);
  // TypeScript private fields remain ordinary properties at runtime; keep test access local.
  const state: any = engine;
  return { engine, state };
}

for (const hz of [30, 60, 120, 144]) {
  test(`one second at ${hz} Hz executes 60 simulation updates`, () => {
    const clock = new FixedStepClock();
    let ticks = 0;
    for (let frame = 0; frame <= hz; frame++) clock.advance(frame * 1000 / hz, () => { ticks++; });
    assert.equal(ticks, 60);
  });
}

test('long interruption is bounded to six steps; reset discards paused time', () => {
  const clock = new FixedStepClock(); let ticks = 0;
  clock.advance(0, () => {});
  clock.advance(10_000, () => { ticks++; });
  assert.equal(ticks, 6);
  clock.reset(); clock.advance(20_000, () => { ticks++; });
  assert.equal(ticks, 6);
});

test('pausing during catch-up stops subsequent updates', () => {
  const clock = new FixedStepClock(); let ticks = 0;
  clock.advance(0, () => {});
  clock.advance(100, () => { ticks++; return false; });
  assert.equal(ticks, 1);
});

test('idle/disconnected gamepad does not erase other device holds', () => {
  const input = new GameInput();
  input.set('keyboard', 'right', true);
  input.set('gamepad', 'right', false);
  input.set('touch', 'jumpHeld', true);
  input.clear('gamepad');
  assert.equal(input.keys.right, true);
  assert.equal(input.keys.jumpHeld, true);
  input.clear();
  assert.ok(Object.values(input.keys).every((value) => !value));
});

test('releasing one device preserves another device holding the same action', () => {
  const input = new GameInput();
  input.set('keyboard', 'left', true); input.set('touch', 'left', true);
  input.set('keyboard', 'left', false); assert.equal(input.keys.left, true);
  input.set('touch', 'left', false); assert.equal(input.keys.left, false);
});

test('swept fall lands on a thin platform even when the end position is below it', () => {
  const body = { x: 10, y: 0, w: 32, h: 56 };
  const platform = { x: 0, y: 100, w: 200, h: 1 };
  assert.equal(moveAgainstSolids(body, 500, 'y', [platform]), platform);
  assert.equal(body.y, 44);
});

test('sweep chooses nearest face regardless of platform order', () => {
  for (const reverse of [false, true]) {
    const body = { x: 0, y: 10, w: 32, h: 56 };
    const walls = [{ x: 100, y: 0, w: 1, h: 200 }, { x: 200, y: 0, w: 1, h: 200 }];
    moveAgainstSolids(body, 400, 'x', reverse ? walls.reverse() : walls);
    assert.equal(body.x, 68);
  }
});

test('upward and leftward sweeps stop at the correct solid face', () => {
  const body = { x: 100, y: 100, w: 32, h: 56 };
  moveAgainstSolids(body, -200, 'y', [{ x: 0, y: 20, w: 200, h: 10 }]);
  assert.equal(body.y, 30);
  moveAgainstSolids(body, -200, 'x', [{ x: 20, y: 0, w: 10, h: 200 }]);
  assert.equal(body.x, 30);
});

test('non-overlapping lane does not collide with a remote platform', () => {
  const body = { x: 300, y: 0, w: 32, h: 56 };
  assert.equal(moveAgainstSolids(body, 200, 'y', [{ x: 0, y: 100, w: 100, h: 10 }]), null);
  assert.equal(body.y, 200);
});

test('pause blocks attacks, powers, jumps and test character switching', () => {
  const { engine, state } = fixture();
  engine.setPaused(true);
  engine.triggerAttack(); engine.triggerPsy(); engine.triggerJump(); engine.triggerAssist(); engine.switchCharacter();
  assert.equal(state.player.slashTimer, 0);
  assert.equal(state.player.psyEnergy, 65);
  assert.equal(state.player.vy, 0);
  assert.equal(state.characterId, 'ren');
  engine.stop();
});

test('test character switch remains available without the old 10 HP healing exploit', () => {
  const { engine, state } = fixture(); state.player.hp = 1;
  engine.switchCharacter('maya'); assert.equal(state.player.hp, 1);
  engine.switchCharacter('leon'); assert.equal(state.player.hp, 1);
  assert.equal(state.characterId, 'leon'); engine.stop();
});

test('loading a stage and pausing clear every held input', () => {
  const { engine, state } = fixture();
  engine.setKey('right', true); engine.setKey('jumpHeld', true, 'touch');
  engine.loadStage(2, 'ren');
  assert.ok(Object.values(state.keys).every((value) => !value));
  engine.setPaused(false); engine.setKey('left', true); engine.setPaused(true);
  assert.equal(state.keys.left, false); engine.stop();
});

test('wall kick preserves outward motion against a held inward direction', () => {
  const { engine, state } = fixture();
  state.enemies = []; state.boss.active = false; state.platforms = []; state.ceilingPipes = [];
  state.player.x = 500; state.player.y = 200; state.player.onWall = 1;
  engine.setKey('right', true); engine.triggerJump(); state.update();
  assert.ok(state.player.vx < 0); assert.ok(state.player.vy < 0); engine.stop();
});

test('player lands on solid ground and resets the aerial jump', () => {
  const { engine, state } = fixture();
  state.enemies = []; state.boss.active = false; state.ceilingPipes = [];
  state.platforms = [{ x: 0, y: 200, w: 1000, h: 1, type: 'solid' }];
  Object.assign(state.player, { x: 500, y: 140, vy: 100, grounded: false, doubleJump: false });
  state.update();
  assert.equal(state.player.y, 144); assert.equal(state.player.grounded, true);
  assert.equal(state.player.doubleJump, true); engine.stop();
});

test('boss defeat freezes gameplay and emits exactly one completion callback', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let callbacks = 0; const { engine, state } = fixture(() => { callbacks++; });
  state.damageBoss(10_000); state.damageBoss(10_000);
  assert.equal(state.paused, true);
  t.mock.timers.tick(1200); assert.equal(callbacks, 1); engine.stop();
});

test('old boss completion callback cannot complete a newly loaded stage', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let callbacks = 0; const { engine, state } = fixture(() => { callbacks++; });
  state.damageBoss(10_000); engine.loadStage(2, 'ren');
  t.mock.timers.tick(1200); assert.equal(callbacks, 0); engine.stop();
});

test('a rider follows a moving platform without slipping through its rising surface', () => {
  const { engine, state } = fixture();
  state.enemies = []; state.boss.active = false; state.ceilingPipes = [];
  const platform = { x: 400, y: 200, w: 300, h: 18, type: 'moving', originX: 400, originY: 200, moveAxis: 'y', moveRange: 50, moveSpeed: 0.03 };
  state.platforms = [platform]; state.standingPlatform = platform;
  Object.assign(state.player, { x: 500, y: 144, vy: 0, grounded: true });
  for (let i = 0; i < 120; i++) {
    state.update();
    assert.ok(Math.abs(state.player.y + state.player.h - platform.y) < 1e-6);
    assert.equal(state.player.grounded, true);
  }
  engine.stop();
});

function emptyRoom() {
  const result = fixture(); const { state } = result;
  state.enemies = []; state.boss.active = false; state.ceilingPipes = [];
  state.platforms = [{ x: 0, y: 200, w: 1000, h: 20, type: 'solid' }];
  Object.assign(state.player, { x: 500, y: 144, vy: 0, grounded: true });
  return result;
}

test('queued input takes effect at the next simulation tick, not at the input event', () => {
  const { engine, state } = emptyRoom();
  engine.queueAction('jump'); assert.equal(state.player.vy, 0);
  state.update(); assert.ok(state.player.vy < 0); engine.stop();
});

test('coyote jump preserves the aerial jump shortly after walking off an edge', () => {
  const { engine, state } = emptyRoom();
  state.coyoteTicks = 4; state.player.grounded = false;
  engine.queueAction('jump'); state.update();
  assert.equal(state.player.doubleJump, true);
  assert.ok(state.player.vy < -11); engine.stop();
});

test('buffered jump fires on landing without creating unlimited jumps', () => {
  const { engine, state } = emptyRoom();
  Object.assign(state.player, { y: 140, vy: 5, grounded: false, doubleJump: false });
  engine.queueAction('jump'); state.update();
  assert.equal(state.player.grounded, true);
  state.update(); assert.ok(state.player.vy < 0);
  assert.equal(state.jumpBuffer, 0); engine.stop();
});

test('expired coyote window consumes the normal aerial jump instead', () => {
  const { engine, state } = emptyRoom();
  Object.assign(state.player, { y: 50, grounded: false, doubleJump: true });
  state.coyoteTicks = 0; engine.queueAction('jump'); state.update();
  assert.equal(state.player.doubleJump, false); engine.stop();
});

test('reappeared enemies reward persistence on defeat, not on each hit', () => {
  const { engine, state } = emptyRoom();
  const target = { ...STAGE_ENEMY(), id: 99, hp: 100, maxHp: 100, x: 500, y: 100, generation: 1 };
  state.hitEnemy(target, 20, 0, 0);
  assert.equal(state.player.score, 0); assert.equal(state.player.lives, 3);
  state.hitEnemy(target, 100, 0, 0);
  assert.equal(state.player.score, 500);
  engine.stop();
});

test('psy burst accepts its actual cost of 25 focus', () => {
  const { engine, state } = emptyRoom(); state.player.psyEnergy = 25;
  engine.triggerPsy(); assert.equal(state.player.psyEnergy, 0); engine.stop();
});

test('Leon weak-bullet armor prevents multiple damage events in the same window', () => {
  const { engine, state } = emptyRoom(); engine.switchCharacter('leon'); state.player.invulnTimer = 0;
  state.damagePlayer(10, 5, false, true); state.damagePlayer(10, 5, false, true);
  assert.equal(state.player.hp, 143); assert.equal(state.player.vx, 0); engine.stop();
});

test('non-piercing projectile hits only the first crossed enemy', () => {
  const { engine, state } = emptyRoom();
  const template = { ...STAGE_ENEMY(), hp: 100, maxHp: 100, y: 144, vy: 0, vx: 0, airborne: false, telegraph: 0, shootTimer: 999, attackTimer: 999 };
  state.enemies = [{ ...template, x: 650, id: 1 }, { ...template, x: 700, id: 2 }];
  state.bullets = [{ x: 600, y: 160, w: 10, h: 5, vx: 200, vy: 0, damage: 20, color: '#fff', fromPlayer: true }];
  state.update();
  assert.equal(state.enemies[0].hp, 80); assert.equal(state.enemies[1].hp, 100);
  engine.stop();
});

function STAGE_ENEMY() {
  return { type: 'mib_gunner', w: 32, h: 56, facing: -1 };
}

test('a thrown body damages the same target only once across consecutive contacts', () => {
  const { engine, state } = emptyRoom();
  state.enemies = [{ ...STAGE_ENEMY(), id: 50, x: 600, y: 144, w: 200, hp: 500, maxHp: 500,
    vx: 0, vy: 0, airborne: false, shootTimer: 999, attackTimer: 999 }];
  state.thrownEnemies = [{ x: 600, y: 144, w: 32, h: 56, vx: 1, damage: 70, color: '#fff', hitIds: new Set() }];
  for (let i = 0; i < 8; i++) { state.hitstop = 0; state.update(); }
  assert.equal(state.enemies[0].hp, 430); engine.stop();
});

test('overdrive has the same gameplay reach on portrait and desktop viewports', () => {
  const hits: number[] = [];
  for (const width of [390, 1920]) {
    const { engine, state } = emptyRoom(); state.canvas.width = width;
    state.enemies = [{ ...STAGE_ENEMY(), id: 70, x: 1000, y: 144, hp: 500, maxHp: 500 }];
    state.player.psyEnergy = 100; engine.triggerPsy(); hits.push(state.enemies[0].hp); engine.stop();
  }
  assert.deepEqual(hits, [390, 390]);
});

test('gamepad pause button can be observed while simulation is paused and fires on edges', (t) => {
  let presses = 0; let connected = true;
  const buttons = Array.from({ length: 16 }, () => ({ pressed: false }));
  const original = Object.getOwnPropertyDescriptor(navigator, 'getGamepads');
  Object.defineProperty(navigator, 'getGamepads', { configurable: true,
    value: () => connected ? [{ connected: true, axes: [0, 0], buttons }] : [] });
  t.after(() => { if (original) Object.defineProperty(navigator, 'getGamepads', original); else delete (navigator as any).getGamepads; });
  const { engine, state } = fixture(() => {}, () => { presses++; });
  engine.setPaused(true); buttons[9].pressed = true;
  state.pollGamepadPause(); state.pollGamepadPause(); assert.equal(presses, 1);
  buttons[9].pressed = false; state.pollGamepadPause();
  buttons[9].pressed = true; state.pollGamepadPause(); assert.equal(presses, 2);
  engine.setPaused(false); connected = false; state.pollGamepadPause();
  assert.equal(state.paused, true); assert.equal(presses, 3); engine.stop();
});

test('idle gamepad preserves a keyboard jump hold after action polling', (t) => {
  const original = Object.getOwnPropertyDescriptor(navigator, 'getGamepads');
  Object.defineProperty(navigator, 'getGamepads', { configurable: true,
    value: () => [{ connected: true, axes: [0, 0], buttons: [] }] });
  t.after(() => { if (original) Object.defineProperty(navigator, 'getGamepads', original); else delete (navigator as any).getGamepads; });
  const { engine, state } = emptyRoom(); engine.setKey('jumpHeld', true);
  state.pollGamepad(); assert.equal(state.keys.jumpHeld, true); engine.stop();
});

test('earned hidden score can still grant a life and is not capped per stage', () => {
  const { engine, state } = emptyRoom();
  state.player.score = 14900;
  state.player.nextOneUpScore = 15000;
  const target = { ...STAGE_ENEMY(), id: 99, hp: 10, maxHp: 100, x: 500, y: 100, generation: 1 };
  state.hitEnemy(target, 20, 0, 0);
  assert.equal(state.player.score, 15400);
  assert.equal(state.player.lives, 4);
  assert.equal(state.player.nextOneUpScore, 30000);
  engine.stop();
});

test('telekinetic capture counts as a single defeated enemy for progression', () => {
  const { engine, state } = emptyRoom();
  state.enemies = [{ ...STAGE_ENEMY(), id: 100, hp: 100, maxHp: 100, x: 550, y: 144, generation: 0 }];
  engine.triggerPsy();
  assert.equal(state.enemies.length, 0);
  assert.equal(state.player.score, 1000);
  assert.equal(state.thrownEnemies.length, 1);
  engine.stop();
});
