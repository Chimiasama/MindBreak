import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { SoundEngine } from '../src/game/audio';
import { AUDIO_SETTINGS_KEY, readAudioPreferences } from '../src/game/audioPreferences';
class Param {
  value = 0;
  setValueAtTime(v: number) { this.value = v; }
  exponentialRampToValueAtTime(v: number) { this.value = v; }
  setTargetAtTime(v: number) { this.value = v; }
}
class Node {
  gain = new Param(); frequency = new Param(); Q = new Param();
  threshold = new Param(); knee = new Param(); ratio = new Param(); attack = new Param(); release = new Param();
  onended?: () => void; targets: Node[] = []; started?: number; stopped = false;
  connect(node: Node) { this.targets.push(node); }
  disconnect() { this.targets = []; }
  start(at = 0) { this.started = at; }
  stop(at?: number) { if (at === undefined) { this.stopped = true; this.onended?.(); } }
}
class Context {
  currentTime = 0; state = 'running'; sampleRate = 48000; destination = new Node(); sources: Node[] = [];
  createGain() { return new Node(); }
  createDynamicsCompressor() { return new Node(); }
  createOscillator() { const n = new Node(); this.sources.push(n); return n; }
  createBufferSource() { return this.createOscillator(); }
  createBiquadFilter() { return new Node(); }
  createBuffer(_: number, count: number) { return { getChannelData: () => new Float32Array(count) }; }
  async resume() { this.state = 'running'; }
  async suspend() { this.state = 'suspended'; }
}
let timers: Map<number, () => void>, storage: Map<string, string>;
beforeEach(() => {
  timers = new Map(); storage = new Map(); let id = 0;
  Object.defineProperty(globalThis, 'window', { configurable: true, value: {
    AudioContext: Context, setInterval(fn: () => void) { timers.set(++id, fn); return id; },
    localStorage: { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => storage.set(key, value) },
  } });
  globalThis.clearInterval = ((id: number) => timers.delete(id)) as any;
});
function fixture() { const sound = new SoundEngine(); sound.init(); return { sound, s: sound as any, ctx: (sound as any).ctx as Context }; }
function poll() { for (const fn of timers.values()) fn(); }
test('audio buses isolate sliders, master mute preserves preferences and values survive restart', () => {
  const { sound, s } = fixture(); sound.setVolume('music', 0.25); sound.setVolume('sfx', 0.5); sound.setVolume('voice', 0.4);
  assert.equal(s.buses.music.gain.value, 0.25); assert.equal(s.buses.sfx.gain.value, 0.5); assert.equal(s.buses.voice.gain.value, 0.4);
  sound.setMuted(true); assert.equal(s.masterGain.gain.value, 0); sound.setMuted(false); assert.equal(s.masterGain.gain.value, 0.7);
  const fresh = new SoundEngine(); assert.deepEqual(fresh.getVolumes(), sound.getVolumes());
  sound.setVolume('master', 2); assert.equal(sound.getVolumes().master, 1);
  sound.setVolume('sfx', NaN); assert.equal(sound.getVolumes().sfx, 0.5);
});
test('audio clock scheduling uses future times, avoids duplicate polls and skips long timer stalls', () => {
  const { sound, ctx } = fixture(); sound.startMusic('electro_funk');
  assert.ok(ctx.sources.every((n) => n.started === 0.02));
  const initial = ctx.sources.length; poll(); poll(); assert.equal(ctx.sources.length, initial);
  ctx.currentTime = 0.1; poll(); assert.ok(ctx.sources.slice(initial).every((n) => Math.abs(n.started! - 0.155) < 1e-8));
  const before = ctx.sources.length; ctx.currentTime = 10; poll();
  assert.ok(ctx.sources.length - before <= 4); assert.ok(ctx.sources.slice(before).every((n) => n.started! >= 10.02)); sound.stopMusic();
});
test('mute advances musical phase; pause cancels queued music and resumes the pending step', () => {
  const { sound, s, ctx } = fixture(); sound.startMusic('electro_funk');
  sound.setMuted(true); ctx.currentTime = 0.1; poll(); assert.equal(s.step, 2);
  sound.setMuted(false); assert.equal(s.step, 2);
  sound.pauseMusic(); assert.equal(s.step, 1); assert.equal(timers.size, 0); assert.ok(ctx.sources.every((n) => n.stopped));
  sound.startMusic('electro_funk'); assert.equal(s.step, 2); assert.equal(timers.size, 1); sound.stopMusic();
});
test('music, effects and synthesized voice route to separate buses, with bounded voices and background cancellation', () => {
  const { sound, s, ctx } = fixture(); sound.startMusic('electro_funk');
  assert.ok(ctx.sources[0].targets[0].targets.includes(s.buses.music));
  sound.sfxJump(); assert.ok(ctx.sources.at(-1)!.targets[0].targets.includes(s.buses.sfx));
  sound.playVoiceShout('maya'); assert.ok([...s.nodes.values()].includes('voice'));
  for (let i = 0; i < 100; i++) sound.sfxShoot(); assert.equal(s.nodes.size, 48);
  sound.suspend(); assert.equal(s.nodes.size, 0); assert.equal(ctx.state, 'suspended'); assert.equal(timers.size, 0);
  sound.startMusic('electro_funk'); assert.equal(ctx.state, 'running'); sound.stopMusic();
});
test('denied/corrupt audio storage falls back and never blocks volume changes', () => {
  assert.equal(readAudioPreferences({ getItem() { throw Error('denied'); } }).muted, false);
  assert.equal(readAudioPreferences({ getItem: () => 'bad JSON' }).volumes.master, 0.7);
  storage.set(AUDIO_SETTINGS_KEY, JSON.stringify({ volumes: { music: -5, master: 'bad' }, muted: true }));
  const sound = new SoundEngine(); assert.equal(sound.getVolumes().music, 0); assert.equal(sound.getVolumes().master, 0.7); assert.equal(sound.isMuted(), true);
  Object.defineProperty(window, 'localStorage', { get() { throw Error('denied'); } });
  assert.doesNotThrow(() => sound.setVolume('sfx', 0.2));
});
