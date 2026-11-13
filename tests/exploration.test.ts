import test from 'node:test';
import assert from 'node:assert/strict';
import { SpawnManager } from '../src/game/spawns';
import { STAGES } from '../src/game/stages';
import { depenetrate, overlaps, sweepTime } from '../src/game/collision';
import { GameInput, KeyboardState } from '../src/game/input';
import { StageDefinition } from '../src/game/types';

const player = (x: number, y = 644) => ({ x, y, w: 32, h: 56 });
const offscreen = { x: 2000, y: 0, w: 400, h: 800 };
function setup(arena = false) {
  const stage: StageDefinition = { ...STAGES[0], enemies: [STAGES[0].enemies[0]],
    ambushArenas: arena ? [{ id: 1, minX: 300, maxX: 600, triggerX: 300, active: false, cleared: false }] : [] };
  const manager = new SpawnManager(stage);
  const initial = manager.initial();
  return { manager, initial };
}
function arm(manager: SpawnManager) {
  for (let tick = 0; tick <= 300; tick++) manager.update(player(3000), offscreen, tick, [], []);
}

test('ordinary enemies return only after long absence, cooldown and safe offscreen return', () => {
  const { manager, initial } = setup();
  arm(manager);
  assert.equal(manager.update(player(1100), offscreen, 500, [], []).length, 0);
  const spawned = manager.update(player(1100), offscreen, 1000, [], []);
  assert.equal(spawned.length, 1);
  assert.equal(spawned[0].spawnId, initial[0].spawnId);
  assert.notEqual(spawned[0].id, initial[0].id);
  assert.equal(spawned[0].generation, 1);
  assert.equal(manager.update(player(1100), offscreen, 1001, spawned, []).length, 0);
});

test('short distance or brief absence never arms respawn', () => {
  const { manager } = setup();
  for (let tick = 0; tick <= 1200; tick++) manager.update(player(1400), offscreen, tick, [], []);
  assert.equal(manager.update(player(1100), offscreen, 1500, [], []).length, 0);
  for (let tick = 1501; tick < 1600; tick++) manager.update(player(3000), offscreen, tick, [], []);
  assert.equal(manager.update(player(1100), offscreen, 1700, [], []).length, 0);
});

test('respawn waits when visible, too close, inside solids, or at active population cap', () => {
  const { manager, initial } = setup(); arm(manager);
  assert.equal(manager.update(player(1100), { x: 0, y: 0, w: 1280, h: 900 }, 1000, [], []).length, 0);
  assert.equal(manager.update(player(500), offscreen, 1001, [], []).length, 0);
  assert.equal(manager.update(player(1100), offscreen, 1002, [], [{ x: 400, y: 600, w: 100, h: 100 }]).length, 0);
  const crowded = Array.from({ length: 24 }, (_, i) => ({ ...initial[0], id: 100 + i }));
  assert.equal(manager.update(player(1100), offscreen, 1003, crowded, []).length, 0);
  assert.equal(manager.update(player(1100), offscreen, 1004, [], []).length, 1);
});

test('arena enemies never respawn after death', () => {
  const { manager } = setup(true); arm(manager);
  assert.equal(manager.update(player(1100), offscreen, 2000, [], []).length, 0);
});

test('a living enemy is never duplicated even if the player leaves and returns', () => {
  const { manager, initial } = setup();
  for (let tick = 0; tick < 1000; tick++) manager.update(player(3000), offscreen, tick, initial, []);
  assert.equal(manager.update(player(1100), offscreen, 2000, initial, []).length, 0);
  assert.equal(manager.initial().length, 0);
});

test('vertical absence also qualifies; horizontal position alone is not used', () => {
  const { manager } = setup();
  for (let tick = 0; tick <= 300; tick++) manager.update(player(430, -2000), offscreen, tick, [], []);
  assert.equal(manager.update(player(1100), offscreen, 1000, [], []).length, 1);
});

test('keyboard aliases remain held until both physical keys are released', () => {
  const keyboard = new KeyboardState();
  keyboard.set('KeyA', true); keyboard.set('ArrowLeft', true);
  assert.deepEqual(keyboard.set('KeyA', false), { key: 'left', pressed: true });
  assert.deepEqual(keyboard.set('ArrowLeft', false), { key: 'left', pressed: false });
});

test('actions are queued once per source and consumed once; pause clears pending actions', () => {
  const input = new GameInput();
  input.enqueue('jump', 'touch'); input.enqueue('jump', 'touch');
  assert.equal(input.drain().length, 1); assert.equal(input.drain().length, 0);
  input.enqueue('psy'); input.clear(); assert.equal(input.drain().length, 0);
});

test('swept projectiles detect crossed enemies and reject shots in a different lane', () => {
  const bullet = { x: 0, y: 30, w: 10, h: 5 };
  const enemy = { x: 100, y: 0, w: 30, h: 60 };
  assert.equal(sweepTime(bullet, 200, 0, enemy), 0.45);
  assert.equal(sweepTime({ ...bullet, y: 100 }, 200, 0, enemy), null);
  assert.equal(sweepTime({ ...bullet, x: 200 }, -200, 0, enemy), 0.35);
});

test('initial penetration resolves while impossible squeeze is reported', () => {
  const floor = { x: 0, y: 100, w: 300, h: 50 };
  const body = { x: 100, y: 50, w: 32, h: 56 };
  assert.equal(depenetrate(body, [floor]), true);
  assert.equal(overlaps(body, floor), false);
  const squeezed = { x: 100, y: 50, w: 32, h: 56 };
  const ceiling = { x: 0, y: 0, w: 300, h: 60 };
  assert.equal(depenetrate(squeezed, [floor, ceiling]), false);
});
