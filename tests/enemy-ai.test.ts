import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { sound } from '../src/game/audio';
import { GameEngine } from '../src/game/engine';
import { ENEMY_COMBAT, stepEnemyAI, canSeeBody, EnemyContext } from '../src/game/enemyAI';
import { Enemy, EnemyType } from '../src/game/types';
import { decodeCampaignSave } from '../src/game/campaign/save';
Object.defineProperty(globalThis, 'window', { configurable: true, value: { setInterval, clearInterval } });
afterEach(() => sound.stopMusic());
function actor(type: EnemyType = 'mutant', x = 950): Enemy {
  return { id: 1, type, x, y: 544, w: 34, h: 56, hp: 100, maxHp: 100, vx: 0, vy: 0, facing: 1,
    airborne: false, telegraph: 0, shootTimer: 0, attackTimer: 0, patrolMinX: x - 120, patrolMaxX: x + 120 };
}
function context(enemy: Enemy): EnemyContext {
  return { player: { x: enemy.x + 48, y: 544, w: 32, h: 56, facing: 1 },
    visible: true, home: enemy.x, stunned: false, canFlank: false, coverFire: false };
}
function fixture() {
  const engine = new GameEngine({ width: 1280, height: 720, getContext: () => ({}) } as unknown as HTMLCanvasElement,
    { onHudUpdate() {}, onStageClear() {}, onContinueCountdown() {}, onGameOver() {} });
  engine.loadStage(1, 'ren'); engine.setPaused(false);
  const state: any = engine;
  state.stage = { ...state.stage, boundsWidth: 10000, boundsBottom: 1400, windForce: 0 };
  state.platforms = [{ x: -100, y: 600, w: 10200, h: 500, type: 'solid' }];
  state.ceilingPipes = []; state.enemies = []; state.spawns.update = () => [];
  state.boss.active = false; state.ambushArenas = [];
  Object.assign(state.player, { x: 1000, y: 544, grounded: true, vx: 0, vy: 0, invulnTimer: 0 });
  return { engine, state };
}
function prepare(enemy: Enemy, action: 'melee' | 'shot' = 'melee') {
  enemy.ai = { state: 'windup', timer: 1, memory: 90, aimX: 1016, aimY: 572, facing: 1, action };
}

test('all eleven archetypes alert, telegraph, attack once and leave a recovery window', () => {
  for (const type of Object.keys(ENEMY_COMBAT) as EnemyType[]) {
    const enemy = actor(type), c = context(enemy), profile = ENEMY_COMBAT[type];
    stepEnemyAI(enemy, c); assert.equal(enemy.ai!.state, 'alert');
    for (let tick = 0; tick < 30 && String(enemy.ai!.state) !== 'windup'; tick++) stepEnemyAI(enemy, c);
    assert.equal(enemy.ai!.state, 'windup'); assert.equal(enemy.telegraph, 1);
    for (let tick = 1; tick < profile.windup; tick++) assert.equal(stepEnemyAI(enemy, c).attack, null);
    assert.equal(stepEnemyAI(enemy, c).attack, profile.ranged ? 'shot' : 'melee');
    assert.equal(enemy.ai!.state, 'attack');
    assert.equal(stepEnemyAI(enemy, c).attack, null); assert.equal(enemy.ai!.state, 'recover');
    for (let tick = 0; tick < profile.recovery; tick++) assert.equal(stepEnemyAI(enemy, c).attack, null);
  }
});

test('preparation locks its aim and orientation, allowing a player to dodge behind the attacker', () => {
  const { engine, state } = fixture(); const enemy = actor(); prepare(enemy);
  state.enemies = [enemy]; state.player.x = 940;
  state.updateEnemies(); assert.equal(state.player.hp, 100);
  assert.equal(enemy.facing, 1); assert.equal(enemy.ai!.aimX, 1016); engine.stop();
});

test('hidden targets cancel preparation; short memory follows the last observed location', () => {
  const enemy = actor(), c = context(enemy);
  for (let tick = 0; tick < 40 && enemy.ai?.state !== 'windup'; tick++) stepEnemyAI(enemy, c);
  const aim = enemy.ai!.aimX;
  c.visible = false; c.player.x += 500;
  stepEnemyAI(enemy, c); assert.equal(enemy.ai!.state, 'recover');
  assert.equal(enemy.ai!.aimX, aim);
  enemy.x += 300;
  for (let tick = 0; tick < 150 && String(enemy.ai!.state) !== 'return'; tick++) stepEnemyAI(enemy, c);
  assert.equal(enemy.ai!.state, 'return');
  const x = enemy.x; assert.ok(stepEnemyAI(enemy, c).move < 0); assert.equal(enemy.x, x);
});

test('stun/airborne/death interrupt attack preparation without emitting another hit', () => {
  const enemy = actor(), c = context(enemy); prepare(enemy);
  c.stunned = true; assert.equal(stepEnemyAI(enemy, c).attack, null); assert.equal(enemy.ai!.state, 'stunned');
  c.stunned = false; enemy.airborne = true;
  for (let tick = 0; tick < 15; tick++) assert.equal(stepEnemyAI(enemy, c).attack, null);
  assert.equal(enemy.ai!.state, 'airborne');
  enemy.airborne = false; stepEnemyAI(enemy, c); assert.equal(enemy.ai!.state, 'recover');
  enemy.hp = 0; stepEnemyAI(enemy, c); assert.equal(enemy.ai!.state, 'dead');
});

test('cover fire preserves preparation/recovery and flanking requires an explicitly safe destination', () => {
  const gunner = actor('mib_gunner'), c = context(gunner); c.coverFire = true;
  gunner.ai = { state: 'chase', timer: 0, memory: 90, aimX: 1016, aimY: 572, facing: 1, action: 'shot' };
  gunner.shootTimer = 100;
  assert.equal(stepEnemyAI(gunner, c).coverWarning, true);
  assert.equal(gunner.shootTimer, 13);
  prepare(gunner, 'shot'); gunner.ai!.timer = 12;
  stepEnemyAI(gunner, c); assert.equal(gunner.ai!.timer, 11);
  const hound = actor('cyber_hound'); hound.x -= 100;
  const hc = context(hound); hc.player.x += 100;
  for (let tick = 0; tick < 20; tick++) stepEnemyAI(hound, hc);
  assert.notEqual(hound.ai!.action, 'flank');
  hc.canFlank = true; stepEnemyAI(hound, hc);
  assert.equal(hound.ai!.action, 'flank'); assert.equal(hound.ai!.state, 'windup');
});

test('a shield guard must turn before preparing an attack behind its back', () => {
  const { engine, state } = fixture(); const enemy = actor('mib_shield'); enemy.facing = -1; enemy.turnTimer = 0;
  state.enemies = [enemy];
  for (let tick = 0; tick < 5; tick++) state.updateEnemies();
  assert.equal(enemy.facing, -1); assert.notEqual(enemy.ai!.state, 'windup');
  for (let tick = 0; tick < 50 && String(enemy.ai!.state) !== 'windup'; tick++) state.updateEnemies();
  assert.equal(enemy.facing, 1); assert.equal(enemy.ai!.state, 'windup'); engine.stop();
});

test('guard shove cannot stun through invulnerability/dash and repeated shoves respect stun grace', () => {
  for (const protection of ['invulnerability', 'dash', 'none'] as const) {
    const { engine, state } = fixture(); const enemy = actor('mib_shield'); prepare(enemy); state.enemies = [enemy];
    state.player.invulnTimer = protection === 'invulnerability' ? 30 : 0;
    state.player.isDashing = protection === 'dash';
    state.updateEnemies();
    assert.equal(state.player.hp, protection === 'none' ? 88 : 100);
    assert.equal(state.player.stunTimer, protection === 'none' ? 24 : 0);
    if (protection === 'none') {
      state.player.invulnTimer = 0; state.player.stunTimer = 0;
      prepare(enemy); state.updateEnemies();
      assert.equal(state.player.hp, 76); assert.equal(state.player.stunTimer, 0);
    }
    engine.stop();
  }
});

test('walls hide targets and block hostile projectiles before they reach the player', () => {
  const { engine, state } = fixture(); const enemy = actor(); prepare(enemy);
  state.enemies = [enemy];
  state.platforms.push({ x: 985, y: 0, w: 2, h: 600, type: 'wall' });
  assert.equal(canSeeBody(enemy, state.player, state.platforms), false);
  state.updateEnemies(); assert.equal(state.player.hp, 100); assert.equal(enemy.ai!.state, 'recover');
  state.updateEnemies = () => {};
  state.bullets = [{ x: 700, y: 560, w: 10, h: 6, vx: 400, vy: 0, damage: 11, color: '#fff' }];
  state.update(); assert.equal(state.player.hp, 100); assert.equal(state.bullets.length, 0); engine.stop();
});

test('piercing player shots hit actors before a wall but cannot reach actors behind it', () => {
  const { engine, state } = fixture(); state.updateEnemies = () => {};
  const near = actor('mutant', 120), far = actor('mutant', 240); far.id = 2;
  state.enemies = [near, far];
  state.platforms.push({ x: 200, y: 0, w: 1, h: 600, type: 'wall' });
  state.bullets = [{ x: 50, y: 560, w: 10, h: 6, vx: 300, vy: 0, damage: 20, color: '#fff', fromPlayer: true, piercing: true }];
  state.update(); assert.equal(near.hp, 80); assert.equal(far.hp, 100);
  assert.equal(state.bullets.length, 0); engine.stop();
});

test('a hostile shot hits the player if the player is before the wall in the same sweep', () => {
  const { engine, state } = fixture(); state.updateEnemies = () => {};
  state.platforms.push({ x: 1100, y: 0, w: 1, h: 600, type: 'wall' });
  state.bullets = [{ x: 700, y: 560, w: 10, h: 6, vx: 500, vy: 0, damage: 11, color: '#fff' }];
  state.update(); assert.equal(state.player.hp, 89); assert.equal(state.bullets.length, 0); engine.stop();
});

test('checkpoint saves accept older enemies and validate AI without restoring a surprise attack', () => {
  const { engine, state } = fixture(); engine.startCampaign(1, 'ren');
  const older = engine.captureCampaignSave()!;
  assert.equal(decodeCampaignSave(JSON.stringify(older)).status, 'ready');
  prepare(state.enemies[0]); const saved = engine.captureCampaignSave()!;
  state.enemies[0].ai.timer = 999;
  assert.equal(saved.areas[0].enemies[0].ai!.timer, 1, 'snapshot must not share mutable AI');
  const decoded = decodeCampaignSave(JSON.stringify(saved));
  assert.equal(decoded.status, 'ready');
  if (decoded.status === 'ready') assert.equal(decoded.save.areas[0].enemies[0].ai!.state, 'recover');
  saved.areas[0].enemies[0].ai!.timer = -1;
  assert.equal(decodeCampaignSave(JSON.stringify(saved)).status, 'corrupt'); engine.stop();
});
