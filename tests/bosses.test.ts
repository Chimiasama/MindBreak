import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { sound } from '../src/game/audio';
import { GameEngine } from '../src/game/engine';
import { STAGES } from '../src/game/stages';
import { CHARACTERS } from '../src/game/characters';
import { BOSS_PATTERNS, BOSS_MOVES, bossBodies, bossShots, bossWarnings, moveBoss, stepBoss } from '../src/game/bosses';
import { BossRuntime, CharacterId } from '../src/game/types';
import { overlaps } from '../src/game/collision';
Object.defineProperty(globalThis, 'window', { configurable: true, value: { setInterval, clearInterval } });
afterEach(() => sound.stopMusic());
function fixture(chapter = 1, hero: CharacterId = 'ren') {
  const engine = new GameEngine({ width: 1280, height: 720, getContext: () => ({}) } as unknown as HTMLCanvasElement,
    { onHudUpdate() {}, onStageClear() {}, onContinueCountdown() {}, onGameOver() {} });
  engine.loadStage(chapter, hero); engine.setPaused(false);
  const state: any = engine;
  state.stage = { ...state.stage, goalX: 1800, boundsWidth: 2400, boundsTop: -400, boundsBottom: 1000, gravityScale: 1, windForce: 0 };
  state.platforms = [{ x: -100, y: 600, w: 2600, h: 400, type: 'solid' }];
  state.ceilingPipes = []; state.enemies = []; state.spawns.update = () => []; state.ambushArenas = [];
  Object.assign(state.player, { x: 1600, y: 544, vx: 0, vy: 0, grounded: true, invulnTimer: 100000 });
  Object.assign(state.boss, { x: 1800, y: 600 - state.boss.h, active: true, triggered: true,
    twinX: 2000, twinY: 600 - state.boss.h, mind: undefined, vx: 0, vy: 0 });
  return { engine, state };
}

for (const stage of STAGES) {
  test(`${stage.boss.behavior} has an exclusive two-phase pattern, preparation and recovery`, () => {
    const { engine, state } = fixture(stage.id); const boss: BossRuntime = state.boss;
    const pattern = BOSS_PATTERNS[boss.behavior][1];
    const fired: string[] = [];
    for (let tick = 0; tick < 1000 && fired.length < 2; tick++) {
      const before = boss.mind?.state, result = stepBoss(boss, state.player);
      if (before === 'recover') assert.equal(result.fire, null);
      if (result.started) { assert.equal(boss.telegraph, 1); assert.ok(boss.mind!.timer >= 18); }
      if (result.fire) fired.push(result.fire);
    }
    // Plasma is an explicitly repeated pulse; all other attacks emit once at entry.
    assert.equal(fired[0], pattern[0]);
    if (pattern[0] !== 'plasma_burst') assert.equal(fired[1], pattern[1]);
    boss.phase = 2; const result = stepBoss(boss, state.player);
    assert.equal(result.fire, null); assert.equal(boss.mind!.state, 'recover');
    assert.equal(boss.shieldActive, false);
    assert.notDeepEqual(BOSS_PATTERNS[boss.behavior][1], BOSS_PATTERNS[boss.behavior][2]);
    engine.stop();
  });
}

test('all eight phase-one pattern sequences differ instead of sharing a generic special', () => {
  assert.equal(new Set(Object.values(BOSS_PATTERNS).map((pattern) => pattern[1].join(','))).size, 8);
});

test('boss preparation locks its aim/facing and shows the committed target before firing', () => {
  const { engine, state } = fixture(4); const boss: BossRuntime = state.boss;
  stepBoss(boss, state.player); const aim = boss.mind!.aimX, facing = boss.facing;
  state.player.x = 2200;
  for (let tick = 0; tick < 10; tick++) { const result = stepBoss(boss, state.player); assert.equal(result.fire, null); }
  assert.equal(boss.mind!.aimX, aim); assert.equal(boss.facing, facing);
  assert.ok(bossWarnings(boss).length > 0); engine.stop();
});

test('plasma burst has exactly three spaced pulses and acid/mortar shots have gravity', () => {
  const { engine, state } = fixture(7); const boss: BossRuntime = state.boss;
  let pulses = 0;
  do { if (stepBoss(boss, state.player).fire) pulses++; } while (boss.mind!.state !== 'recover');
  assert.equal(pulses, 3);
  for (const attack of ['acid_fan', 'acid_rain', 'mortar'] as const) {
    const bullets = bossShots(boss, attack); assert.ok(bullets.length >= 3);
    assert.ok(bullets.every((shot) => (shot.gravity ?? 0) > 0));
  }
  engine.stop();
});

test('a blocked charge cannot cross a one-unit wall and leaves recovery', () => {
  const { engine, state } = fixture(3); const boss: BossRuntime = state.boss;
  stepBoss(boss, state.player); boss.mind!.state = 'active'; boss.mind!.attack = 'charge';
  boss.vx = 200;
  const wall = { x: 1900, y: 0, w: 1, h: 600, type: 'wall' as const };
  moveBoss(boss, [...state.platforms, wall], 1100, 2330, 1, state.player);
  assert.equal(boss.x + boss.w, 1900); assert.equal(overlaps(boss, wall), false);
  assert.equal(boss.mind!.state, 'recover'); engine.stop();
});

test('Cipher exposes a vulnerable recovery and does not reform the shield mid-preparation', () => {
  const { engine, state } = fixture(); const boss: BossRuntime = state.boss;
  stepBoss(boss, state.player); assert.equal(boss.shieldActive, true);
  boss.shieldActive = false; stepBoss(boss, state.player); assert.equal(boss.shieldActive, false);
  for (let tick = 0; tick < 100 && boss.mind!.state !== 'recover'; tick++) stepBoss(boss, state.player);
  assert.equal(boss.shieldActive, false); engine.stop();
});

test('the second twin receives normal melee damage through the shared life pool', () => {
  const { engine, state } = fixture(5); state.player.x = 1950; state.player.facing = 1;
  const hp = state.boss.hp; engine.triggerAttack();
  assert.equal(state.boss.hp, hp - CHARACTERS.ren.attackPower);
  assert.equal(bossBodies(state.boss).length, 2); engine.stop();
});

test('a piercing WAV crossing both twins damages the shared pool once', () => {
  const { engine, state } = fixture(5); state.updateBoss = () => {};
  const hp = state.boss.hp;
  state.bullets = [{ x: 1500, y: 560, w: 12, h: 8, vx: 700, vy: 0, damage: 20, color: '#fff', fromPlayer: true, piercing: true }];
  state.update(); assert.equal(state.boss.hp, hp - 20); engine.stop();
});

test('overlapping twin bodies do not double-count a melee hit or duplicate chapter completion', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const { engine, state } = fixture(5); state.boss.twinX = state.boss.x + 8;
  state.player.x = 1750; state.player.facing = 1;
  let clears = 0; state.callbacks.onStageClear = () => { clears++; };
  const hp = state.boss.hp; engine.triggerAttack(); assert.equal(state.boss.hp, hp - 26);
  state.damageBoss(10000); state.damageBoss(10000); t.mock.timers.tick(1200);
  assert.equal(clears, 1); engine.stop();
});

test('all three heroes can damage every boss body with an ordinary melee hit', () => {
  for (const stage of STAGES) for (const hero of ['ren', 'maya', 'leon'] as const) {
    const { engine, state } = fixture(stage.id, hero);
    state.player.x = 1750; state.player.facing = 1; state.boss.shieldActive = false;
    const hp = state.boss.hp; engine.triggerAttack();
    assert.equal(state.boss.hp, hp - CHARACTERS[hero].attackPower); engine.stop();
  }
});

test('off-world vertical projectiles are discarded instead of accumulating forever', () => {
  const { engine, state } = fixture(); state.updateBoss = () => {};
  state.bullets = [{ x: 1700, y: -1700, w: 12, h: 8, vx: 0, vy: -10, damage: 20, color: '#fff' }];
  state.update(); assert.equal(state.bullets.length, 0); engine.stop();
});

test('all boss patterns remain finite in full simulation without unbounded projectile accumulation', () => {
  for (const stage of STAGES) {
    const { engine, state } = fixture(stage.id);
    for (let tick = 0; tick < 720; tick++) {
      if (tick === 360) state.boss.phase = 2;
      state.update();
      assert.ok([state.boss.x, state.boss.y, state.boss.vx, state.boss.vy].every(Number.isFinite));
      assert.ok(state.bullets.length < 128);
    }
    engine.stop();
  }
});

test('the twin encounter exposes its shared life rule to the HUD', () => {
  const { engine, state } = fixture(5); let snapshot: any;
  state.callbacks.onHudUpdate = (hud: any) => { snapshot = hud; };
  state.emitHud(); assert.equal(snapshot.bossSharedLife, true);
  engine.loadStage(1, 'ren'); assert.equal(snapshot.bossSharedLife, false); engine.stop();
});

test('closing an overlay cannot unpause a terminal transition before its explicit resolution', () => {
  const { engine, state } = fixture();
  for (const flag of ['stageClearTriggered', 'continueTriggered', 'gameOverTriggered']) {
    state[flag] = true; engine.setPaused(false);
    assert.equal(state.paused, true);
    state[flag] = false;
  }
  engine.loadStage(1, 'ren'); engine.setPaused(false); assert.equal(state.paused, false);
  engine.stop();
});
