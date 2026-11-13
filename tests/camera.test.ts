import test from 'node:test';
import assert from 'node:assert/strict';
import { viewportFor, cameraTarget, followCamera } from '../src/game/camera';

const body = { x: 1500, y: 400, w: 32, h: 56, facing: 1 };
const bounds = { top: -260, bottom: 980, width: 3350 };

test('matching aspect ratios show the same world area at different resolutions', () => {
  for (const [width, height] of [[1280, 720], [1920, 1080], [960, 540], [2560, 1440]]) {
    const view = viewportFor(width, height);
    assert.equal(view.width, 1600);
    assert.equal(view.height, 900);
    assert.deepEqual(cameraTarget(body, view, bounds), cameraTarget(body, viewportFor(1280, 720), bounds));
  }
});

test('portrait keeps the logical height while framing a narrower horizontal area', () => {
  const view = viewportFor(390, 844);
  assert.equal(view.height, 900);
  assert.ok(view.width < 420 && view.width > 400);
  assert.ok(view.zoom > 0);
});

test('camera anticipates the facing direction and stays within world bounds', () => {
  const view = viewportFor(1280, 720);
  const forward = cameraTarget(body, view, bounds);
  const backward = cameraTarget({ ...body, facing: -1 }, view, bounds);
  assert.ok(forward.x > backward.x);
  assert.equal(cameraTarget({ ...body, x: -100 }, view, bounds).x, 0);
  assert.equal(cameraTarget({ ...body, x: 9000 }, view, bounds).x, bounds.width - view.width);
});

test('small arenas/worlds have valid bounds even when narrower than the viewport', () => {
  const view = viewportFor(1280, 720);
  const target = cameraTarget(body, view, bounds, { minX: 2050, maxX: 2720 });
  assert.equal(target.x, 2050);
  const small = cameraTarget(body, view, { top: 0, bottom: 400, width: 600 });
  assert.equal(small.x, 0); assert.equal(small.y, 0);
});

test('camera deadzone prevents jitter and interpolation approaches without overshoot', () => {
  assert.equal(followCamera(100, 106), 100);
  const moved = followCamera(100, 200);
  assert.equal(moved, 114);
  assert.ok(moved > 100 && moved < 200);
});

test('invalid/minimized viewport dimensions never produce NaN or infinity', () => {
  for (const [width, height] of [[0, 0], [-1, -1], [Infinity, NaN]]) {
    const view = viewportFor(width, height);
    assert.ok(Number.isFinite(view.width) && Number.isFinite(view.zoom) && view.zoom > 0);
  }
});
