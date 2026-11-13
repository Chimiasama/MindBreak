import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { GameEngine } from '../src/game/engine';
import { sound } from '../src/game/audio';
import { SWINGS } from '../src/game/combat';
Object.defineProperty(globalThis, 'window', { configurable: true, value: { setInterval, clearInterval } });
afterEach(() => sound.stopMusic());
function fixture() {
  const engine = new GameEngine({ width: 915, height: 412, getContext: () => ({}) } as unknown as HTMLCanvasElement,
    { onHudUpdate() {}, onStageClear() {}, onContinueCountdown() {}, onGameOver() {} });
  engine.loadStage(1, 'ren'); engine.setPaused(false); const s: any = engine;
  s.platforms = [{ x: 0, y: 600, w: 5000, h: 500, type: 'solid' }];
  s.enemies = []; s.props = []; s.pickups = []; s.ceilingPipes = []; s.ambushArenas = []; s.boss.active = false;
  s.spawns.update = () => []; s.updateEnemies = () => {};
  Object.assign(s.player, { x: 500, y: 544, vx: 0, vy: 0, grounded: true, facing: 1, invulnTimer: 0 });
  const enemy = { id: 1, type: 'mutant', x: 545, y: 544, w: 34, h: 56, hp: 1000, maxHp: 1000,
    vx: 0, vy: 0, facing: -1, airborne: false, shootTimer: 0, attackTimer: 0, telegraph: 0 };
  s.enemies.push(enemy);
  const tick = (n = 1) => { for (let i = 0; i < n; i++) { s.hitstop = 0; s.update(); } };
  return { engine, s, enemy, tick };
}
test('three timed presses produce two cuts then a launcher, each with exactly one impact', () => {
  const { engine, s, enemy, tick } = fixture();
  for (let i = 0; i < 3; i++) {
    const hp = enemy.hp; enemy.airborne = false;
    engine.triggerAttack(); assert.equal(s.player.comboStep, i);
    assert.equal(hp - enemy.hp, i === 2 ? 38 : 26);
    assert.equal(enemy.vy, i === 2 ? -11.5 : -3.5);
    const once = enemy.hp; tick(SWINGS[i].totalTicks); assert.equal(enemy.hp, once);
  }
  engine.triggerAttack(); assert.equal(s.player.comboStep, 0); engine.stop();
});
test('waiting beyond the link window restarts the first cut independently of the hit counter', () => {
  const { engine, s, tick } = fixture(); engine.triggerAttack(); tick(36);
  assert.ok(s.player.comboHits > 0); engine.triggerAttack(); assert.equal(s.player.comboStep, 0); engine.stop();
});
test('only the last six recovery ticks buffer one extra press; holding does not repeat', () => {
  const { engine, s, enemy, tick } = fixture(); engine.triggerAttack(); engine.triggerAttack(); tick(11);
  assert.equal(s.player.comboStep, 0); assert.equal(enemy.hp, 974);
  engine.triggerAttack(); tick(5); engine.triggerAttack(); engine.triggerAttack(); tick(6);
  assert.equal(s.player.comboStep, 2); assert.equal(enemy.hp, 910);
  tick(50); assert.equal(enemy.hp, 910); engine.stop();
});
test('damage, pause and rescue discard queued attacks; damage and rescue reset the chain', () => {
  for (const mode of ['damage', 'pause', 'rescue']) {
    const { engine, s, enemy, tick } = fixture(); engine.triggerAttack(); tick(5); engine.triggerAttack();
    if (mode === 'damage') s.damagePlayer(1, 0);
    else if (mode === 'pause') { engine.setPaused(true); engine.setPaused(false); }
    else s.recoverPlayer();
    const hp = enemy.hp; tick(20); assert.equal(enemy.hp, hp);
    if (mode !== 'pause') { engine.triggerAttack(); assert.equal(s.player.comboStep, 0); }
    engine.stop();
  }
});
test('visual slash ends before recovery; late entrants are not hit by a stale attack', () => {
  const { engine, s, enemy, tick } = fixture(); enemy.x = 800; engine.triggerAttack();
  tick(6); assert.equal(s.player.slashing, false); assert.equal(s.player.slashTimer, 5);
  enemy.x = 545; tick(5); assert.equal(enemy.hp, 1000); engine.stop();
});
test('solid cover protects enemies, props and hostile shots from a melee strike', () => {
  const { engine, s, enemy } = fixture();
  s.platforms.push({ x: 538, y: 400, w: 2, h: 200, type: 'wall' });
  const prop = { id: 1, x: 550, y: 550, w: 20, h: 30, hp: 50, kind: 'crate', broken: false }; s.props = [prop];
  const bullet = { x: 550, y: 560, w: 10, h: 6, vx: -8, vy: 0, damage: 10, color: '#fff', fromPlayer: false }; s.bullets = [bullet];
  engine.triggerAttack(); assert.equal(enemy.hp, 1000); assert.equal(prop.hp, 50); assert.equal(bullet.fromPlayer, false); engine.stop();
});

test('all heroes reserve their bonus for the third strike; an aerial finisher cannot launch from the floor', () => {
  for (const [hero, damage] of [['ren', 26], ['maya', 22], ['leon', 35]] as const) {
    const { engine, s, enemy, tick } = fixture(); engine.switchCharacter(hero);
    for (let i = 0; i < 2; i++) {
      const hp = enemy.hp; engine.triggerAttack(); assert.equal(hp - enemy.hp, damage); tick(11);
      assert.equal(s.leonFlameZone, null);
    }
    s.player.grounded = false; const hp = enemy.hp; engine.triggerAttack();
    assert.equal(hp - enemy.hp, damage + 12); assert.notEqual(enemy.vy, -11.5);
    assert.equal(!!s.leonFlameZone, hero === 'leon'); engine.stop();
  }
});
