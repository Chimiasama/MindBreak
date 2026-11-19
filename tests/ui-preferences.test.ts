import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  readUiPreferences,
  resetUiPreferences,
  resolveShakeMultiplier,
  sanitizeUiPreferences,
  shouldShowTouchControls,
  UI_DEFAULTS,
  UI_SETTINGS_KEY,
  writeUiPreferences,
} from '../src/game/uiPreferences';
import { GameEngine } from '../src/game/engine';
import { sound } from '../src/game/audio';

Object.defineProperty(globalThis, 'window', {
  configurable: true,
  value: { setInterval, clearInterval },
});
afterEach(() => sound.stopMusic());

function memoryStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => {
      map.set(key, value);
    },
    dump: () => map,
  };
}

test('sanitizeUiPreferences clamps numeric bounds and rejects invalid modes', () => {
  const result = sanitizeUiPreferences({
    touchMode: 'invalid-mode',
    touchScale: 99,
    touchOpacity: 0.1,
    touchBottomOffset: -20,
    shakeIntensity: 'ultra',
    reducedFlashes: 'yes',
  });
  assert.deepEqual(result, {
    touchMode: 'auto',
    touchScale: 1.25,
    touchOpacity: 0.45,
    touchBottomOffset: 0,
    shakeIntensity: 'full',
    reducedFlashes: false,
  });

  const lowerBound = sanitizeUiPreferences({
    touchMode: 'hidden',
    touchScale: 0.2,
    touchOpacity: 2.5,
    touchBottomOffset: 120,
    shakeIntensity: 'reduced',
    reducedFlashes: true,
  });
  assert.deepEqual(lowerBound, {
    touchMode: 'hidden',
    touchScale: 0.8,
    touchOpacity: 1,
    touchBottomOffset: 48,
    shakeIntensity: 'reduced',
    reducedFlashes: true,
  });
});

test('uiPreferences persists, reloads, resets, and survives storage errors', () => {
  const store = memoryStorage();
  const saved = writeUiPreferences(
    {
      touchMode: 'always',
      touchScale: 1.15,
      touchOpacity: 0.75,
      touchBottomOffset: 24,
      shakeIntensity: 'off',
      reducedFlashes: true,
    },
    store
  );
  assert.ok(store.dump().has(UI_SETTINGS_KEY));
  assert.deepEqual(readUiPreferences(store), saved);

  const restored = resetUiPreferences(store);
  assert.deepEqual(restored, UI_DEFAULTS);
  assert.deepEqual(readUiPreferences(store), UI_DEFAULTS);

  const brokenStorage = {
    getItem: () => {
      throw new Error('blocked');
    },
    setItem: () => {
      throw new Error('quota');
    },
  };
  assert.deepEqual(readUiPreferences(brokenStorage), UI_DEFAULTS);
  assert.deepEqual(writeUiPreferences(saved, brokenStorage), saved);
});

test('resolveShakeMultiplier maps full, reduced, and off accurately', () => {
  assert.equal(resolveShakeMultiplier('full'), 1);
  assert.equal(resolveShakeMultiplier('reduced'), 0.4);
  assert.equal(resolveShakeMultiplier('off'), 0);
});

test('shouldShowTouchControls respects auto, always, hidden, and active input source', () => {
  assert.equal(shouldShowTouchControls('always', 'keyboard', false), true);
  assert.equal(shouldShowTouchControls('hidden', 'touch', true), false);

  assert.equal(shouldShowTouchControls('auto', null, true), true);
  assert.equal(shouldShowTouchControls('auto', null, false), false);
  assert.equal(shouldShowTouchControls('auto', 'keyboard', true), false);
  assert.equal(shouldShowTouchControls('auto', 'gamepad', true), false);
  assert.equal(shouldShowTouchControls('auto', 'touch', false), true);
});

test('GameEngine respects setVisualAccessibility for shake scaling and reduced flashes', () => {
  const sources: string[] = [];
  const engine = new GameEngine(
    { width: 915, height: 412, getContext: () => ({}) } as any,
    {
      onInputSource: (src) => sources.push(src),
      onHudUpdate() {},
      onStageClear() {},
      onContinueCountdown() {},
      onGameOver() {},
    }
  );
  engine.loadStage(3, 'ren'); // Stage 3 has weather: 'storm'
  engine.setPaused(false);
  const state: any = engine;

  // Off suppresses camera shake completely
  engine.setVisualAccessibility({ shakeScale: 0, reducedFlashes: false });
  state.screenShake(20);
  assert.equal(state.shakeAmount, 0);

  // Reduced scales camera shake proportionally
  engine.setVisualAccessibility({ shakeScale: 0.4, reducedFlashes: false });
  state.screenShake(20);
  assert.equal(state.shakeAmount, 8);

  // Reduced flashes suppresses storm lightning immediately and during updates
  state.lightningAlpha = 0.65;
  engine.setVisualAccessibility({ shakeScale: 1, reducedFlashes: true });
  assert.equal(state.lightningAlpha, 0);
  for (let i = 0; i < 60; i++) state.update();
  assert.equal(state.lightningAlpha, 0);

  // Active input source reporting switches cleanly without duplicate spam
  engine.setKey('right', true, 'keyboard');
  engine.setKey('right', true, 'keyboard');
  engine.queueAction('jump', 'touch');
  engine.queueAction('attack', 'gamepad');
  assert.deepEqual(sources, ['keyboard', 'touch', 'gamepad']);

  engine.stop();
});
