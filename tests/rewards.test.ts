import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { defeatReward } from '../src/game/rewards';
import { SpawnManager } from '../src/game/spawns';
import { STAGES } from '../src/game/stages';

const player = (x: number) => ({ x, y: 644, w: 32, h: 56 });
const camera = { x: 2000, y: 0, w: 400, h: 800 };
function setup() {
  const manager = new SpawnManager({ ...STAGES[0], enemies: [STAGES[0].enemies[0]], ambushArenas: [] });
  return { manager, enemy: manager.initial()[0] };
}

test('defeat reward decays 1000 → 500 → 50 → 0 and rejects invalid counters', () => {
  assert.deepEqual([0, 1, 2, 3, 4, 1000].map(defeatReward), [1000, 500, 50, 0, 0, 0]);
  for (const counter of [-1, 0.5, NaN, Infinity]) assert.equal(defeatReward(counter), 0);
});

test('successive player defeats of the same spawn receive diminishing rewards', () => {
  const { manager, enemy } = setup();
  let current = enemy;
  let tick = 0;
  const earned: number[] = [];
  for (let defeat = 0; defeat < 5; defeat++) {
    current.hp = 0;
    earned.push(manager.claimDefeatReward(current));
    assert.equal(manager.claimDefeatReward(current), 0, 'same death cannot pay twice');
    const start = tick;
    for (; tick < start + 1000; tick++) manager.update(player(3000), camera, tick, [], []);
    const respawned = manager.update(player(1100), camera, tick++, [], []);
    assert.equal(respawned.length, 1);
    current = respawned[0];
  }
  assert.deepEqual(earned, [1000, 500, 50, 0, 0]);
});

test('a disappearance without a confirmed kill does not consume the first defeat reward', () => {
  const { manager, enemy } = setup();
  assert.equal(manager.claimDefeatReward(enemy), 0, 'living targets never pay');
  for (let tick = 0; tick < 1000; tick++) manager.update(player(3000), camera, tick, [], []);
  const respawned = manager.update(player(1100), camera, 1000, [], [])[0];
  assert.equal(respawned.generation, 1);
  respawned.hp = 0;
  assert.equal(manager.claimDefeatReward(respawned), 1000);
});

test('each spawn has its own reward history', () => {
  const manager = new SpawnManager({ ...STAGES[0], ambushArenas: [] });
  const enemies = manager.initial();
  enemies[0].hp = 0; enemies[1].hp = 0;
  assert.equal(manager.claimDefeatReward(enemies[0]), 1000);
  assert.equal(manager.claimDefeatReward(enemies[1]), 1000);
});

test('score and next-life numbers are absent from all rendered app screens', () => {
  const app = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
  assert.doesNotMatch(app, /hud\.score\.toLocaleString|hud\.nextOneUpScore\.toLocaleString|PTS|1-UP em/);
});
