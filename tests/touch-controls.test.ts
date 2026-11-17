import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { resolveStickSample } from '../src/components/TouchControls';
import { GameEngine } from '../src/game/engine';
import { sound } from '../src/game/audio';

Object.defineProperty(globalThis, 'window', {
  configurable: true,
  value: { setInterval, clearInterval },
});
afterEach(() => sound.stopMusic());

const MAX_R = 48;

test('deadzone inside 24% radius remains neutral on all directions', () => {
  for (const [dx, dy] of [
    [0, 0],
    [6, 0],
    [-8, 5],
    [0, -10],
    [7, 7],
  ]) {
    const sample = resolveStickSample(dx, dy, MAX_R);
    assert.deepEqual(sample.directions, {
      left: false,
      right: false,
      up: false,
      down: false,
    });
    assert.ok(Math.abs(sample.clampedX - dx) < 1e-6);
    assert.ok(Math.abs(sample.clampedY - dy) < 1e-6);
  }
});

test('cardinal directions activate only the intended axis', () => {
  assert.deepEqual(resolveStickSample(36, 0, MAX_R).directions, {
    left: false,
    right: true,
    up: false,
    down: false,
  });
  assert.deepEqual(resolveStickSample(-36, 0, MAX_R).directions, {
    left: true,
    right: false,
    up: false,
    down: false,
  });
  assert.deepEqual(resolveStickSample(0, -36, MAX_R).directions, {
    left: false,
    right: false,
    up: true,
    down: false,
  });
  assert.deepEqual(resolveStickSample(0, 36, MAX_R).directions, {
    left: false,
    right: false,
    up: false,
    down: true,
  });
});

test('slight horizontal thumb wobble (+/-22 deg) avoids accidental crouch or interact', () => {
  const angle = (22 * Math.PI) / 180;
  const r = 40;
  for (const signX of [1, -1]) {
    for (const signY of [1, -1]) {
      const sample = resolveStickSample(signX * Math.cos(angle) * r, signY * Math.sin(angle) * r, MAX_R);
      assert.equal(sample.directions.right, signX > 0);
      assert.equal(sample.directions.left, signX < 0);
      assert.equal(sample.directions.up, false);
      assert.equal(sample.directions.down, false);
    }
  }
});

test('platforming mode keeps 45-deg upward diagonals horizontal-only to prevent diagonal wall climbing', () => {
  const d = 34;
  assert.deepEqual(resolveStickSample(d, -d, MAX_R, false).directions, {
    left: false,
    right: true,
    up: false,
    down: false,
  });
  assert.deepEqual(resolveStickSample(-d, -d, MAX_R, false).directions, {
    left: true,
    right: false,
    up: false,
    down: false,
  });
  // Downward 45-deg diagonals still support crouch-slide and pipe drop
  assert.deepEqual(resolveStickSample(d, d, MAX_R, false).directions, {
    left: false,
    right: true,
    up: false,
    down: true,
  });
  assert.deepEqual(resolveStickSample(-d, d, MAX_R, false).directions, {
    left: true,
    right: false,
    up: false,
    down: true,
  });
});

test('flight mode engages all four 45-deg diagonals simultaneously for Maya 8-dir flight', () => {
  const d = 34;
  assert.deepEqual(resolveStickSample(d, -d, MAX_R, true).directions, {
    left: false,
    right: true,
    up: true,
    down: false,
  });
  assert.deepEqual(resolveStickSample(d, d, MAX_R, true).directions, {
    left: false,
    right: true,
    up: false,
    down: true,
  });
  assert.deepEqual(resolveStickSample(-d, -d, MAX_R, true).directions, {
    left: true,
    right: false,
    up: true,
    down: false,
  });
  assert.deepEqual(resolveStickSample(-d, d, MAX_R, true).directions, {
    left: true,
    right: false,
    up: false,
    down: true,
  });
});

test('outer drags clamp thumbstick cap to maxRadius while preserving diagonal direction', () => {
  const sample = resolveStickSample(180, -180, MAX_R, true);
  const clampedDist = Math.hypot(sample.clampedX, sample.clampedY);
  assert.ok(Math.abs(clampedDist - MAX_R) < 1e-6);
  assert.deepEqual(sample.directions, {
    left: false,
    right: true,
    up: true,
    down: false,
  });
});

function wallFixture(hero: 'ren' | 'maya' | 'leon') {
  const engine = new GameEngine(
    { width: 915, height: 412, getContext: () => ({}) } as any,
    { onHudUpdate() {}, onStageClear() {}, onContinueCountdown() {}, onGameOver() {} }
  );
  engine.loadStage(1, hero);
  engine.setPaused(false);
  const state: any = engine;
  state.enemies = [];
  state.boss.active = false;
  state.ambushArenas = [];
  state.ceilingPipes = [];
  state.platforms = [
    { x: 0, y: 600, w: 900, h: 100, type: 'solid' },
    { x: 400, y: 100, w: 40, h: 500, type: 'wall' },
  ];
  Object.assign(state.player, {
    x: 400 - state.player.w,
    y: 420,
    vx: 0,
    vy: 0,
    grounded: false,
    onWall: 1,
    facing: 1,
  });
  return { engine, state };
}

test('No hero (Ren, Maya, Leon) can climb a single wall directly on up + inward or pure UP', () => {
  for (const hero of ['ren', 'maya', 'leon'] as const) {
    const { engine, state } = wallFixture(hero);
    const startY = state.player.y;
    engine.setKey('right', true, 'touch');
    engine.setKey('up', true, 'touch');
    for (let i = 0; i < 20; i++) state.update();
    assert.ok(state.player.y > startY, `${hero} must slide down under gravity instead of climbing`);

    // Pure UP on the stick while adjacent to the wall must also slide down, never climb
    state.player.y = startY;
    state.player.vy = 0;
    const pureUp = resolveStickSample(0, -40, MAX_R, false).directions;
    engine.setKey('right', pureUp.right, 'touch');
    engine.setKey('up', pureUp.up, 'touch');
    for (let i = 0; i < 20; i++) state.update();
    assert.ok(state.player.y > startY, `${hero} must slide down on pure UP against a single wall`);
    engine.stop();
  }
});

test('steep 68-deg diagonal stays horizontal and single-wall jump spam never climbs or spawns TROQUE DE PAREDE', () => {
  const rad = (68 * Math.PI) / 180;
  const steep = resolveStickSample(Math.cos(rad) * 40, -Math.sin(rad) * 40, MAX_R, false).directions;
  assert.deepEqual(steep, { left: false, right: true, up: false, down: false });

  const { engine, state } = wallFixture('ren');
  state.player.x = 300;
  state.player.y = 544;
  state.player.grounded = true;
  state.player.onWall = 0;
  engine.setKey('right', steep.right, 'touch');
  engine.setKey('up', steep.up, 'touch');

  for (let t = 0; t < 240; t++) {
    if (t === 0 || t === 12 || t === 26 || t === 40 || t === 56) engine.queueAction('jump', 'touch');
    state.update();
  }
  const hasSwapPopup = state.mangaTexts.some((mt: any) => String(mt.text).includes('TROQUE'));
  assert.equal(hasSwapPopup, false, 'TROQUE DE PAREDE popup must not appear');
  assert.equal(state.player.y, 544, 'player falls back to ground instead of climbing a single wall');
  engine.stop();
});

test('Ren ascends between two opposing walls via alternating wall-kicks', () => {
  const { engine, state } = wallFixture('ren');
  state.platforms = [
    { x: 0, y: 600, w: 900, h: 100, type: 'solid' },
    { x: 220, y: 120, w: 30, h: 400, type: 'wall' },
    { x: 410, y: 200, w: 30, h: 400, type: 'wall' },
    { x: 440, y: 200, w: 200, h: 24, type: 'solid' },
  ];
  Object.assign(state.player, { x: 310, y: 544, vx: 0, vy: 0, grounded: true, onWall: 0, doubleJump: true });
  let wallKicks = 0;
  for (let t = 0; t < 180; t++) {
    const p = state.player;
    if (p.grounded && p.y <= 150 && p.x >= 440) break;
    if (t === 2) {
      engine.setKey('right', true, 'touch');
      engine.queueAction('jump', 'touch');
    } else if (!p.grounded && p.onWall !== 0 && p.onWall !== p.lastWallSide) {
      wallKicks++;
      engine.queueAction('jump', 'touch');
      engine.setKey('right', p.onWall === -1, 'touch');
      engine.setKey('left', p.onWall === 1, 'touch');
    } else if (p.y < 140) {
      engine.setKey('right', true, 'touch');
      engine.setKey('left', false, 'touch');
    }
    engine.setKey('jumpHeld', false, 'touch');
    state.update();
  }
  assert.ok(wallKicks >= 3, `expected >= 3 alternating wall kicks, got ${wallKicks}`);
  assert.ok(state.player.x >= 440 && state.player.y <= 160, 'Ren should top out onto the elevated ledge');
  engine.stop();
});


