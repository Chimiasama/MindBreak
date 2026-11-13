import test from 'node:test';
import assert from 'node:assert/strict';
import { MusicScene, SCORES, scoreFor, scoreNotes } from '../src/game/music';
const district: MusicScene = { chapter: 1, sector: '1A', boss: false, phase: 1, tension: false };
test('district and Cipher scores have finite, bounded notes and deterministic complete loops', () => {
  for (const id of ['district', 'cipher'] as const) {
    const scene = { ...district, boss: id === 'cipher' };
    let events = 0;
    for (let step = 0; step < SCORES[id].steps; step++) {
      const notes = scoreNotes(id, step, scene); events += notes.length;
      assert.deepEqual(notes, scoreNotes(id, step + SCORES[id].steps, scene));
      assert.ok(notes.length <= 8);
      for (const note of notes) {
        assert.ok(Number.isFinite(note.frequency) && note.frequency >= 0 && note.frequency < 2000);
        assert.ok(note.duration > 0 && note.duration <= 2); assert.ok(note.volume > 0 && note.volume <= 0.12);
        assert.ok(step % 16 * (60 / SCORES[id].bpm / 4) + note.duration <= 16 * (60 / SCORES[id].bpm / 4), 'voices finish before the next bar');
      }
    }
    assert.ok(events > SCORES[id].steps); assert.equal(scoreFor(scene), id);
  }
});
test('subsector/tension change orchestration without changing the score or harmonic clock', () => {
  const all = (scene: MusicScene) => Array.from({ length: 16 }, (_, s) => scoreNotes('district', s, scene)).flat();
  assert.ok(all({ ...district, sector: '1B' }).length > all(district).length);
  assert.ok(all({ ...district, sector: '1C' }).length > all(district).length);
  assert.ok(all({ ...district, tension: true }).length > all(district).length);
  for (const sector of ['1A', '1B', '1C', '1D']) assert.equal(scoreFor({ ...district, sector }), 'district');
  for (let chapter = 2; chapter <= 8; chapter++) assert.equal(scoreFor({ ...district, chapter, boss: true }), null);
});
test('Cipher second phase adds percussion and countermelody while preserving tempo and duration', () => {
  const events = (phase: 1 | 2) => Array.from({ length: 128 }, (_, s) => scoreNotes('cipher', s, { ...district, boss: true, phase })).flat();
  assert.ok(events(2).length > events(1).length);
  assert.equal(SCORES.district.steps * 60 / SCORES.district.bpm / 4, 32);
  assert.ok(Math.abs(SCORES.cipher.steps * 60 / SCORES.cipher.bpm / 4 - 14.117647) < 0.00001);
});

test('audition WAV has a valid mono PCM header and safely clamps sample amplitudes', async () => {
  const { encodePreviewWav } = await import('../src/game/musicPreview');
  const data = new Float32Array([0, 2, -2, 0.5]);
  const bytes = encodePreviewWav({ sampleRate: 44100, getChannelData: () => data } as unknown as AudioBuffer);
  const view = new DataView(bytes);
  assert.equal(new TextDecoder().decode(bytes.slice(0, 4)), 'RIFF');
  assert.equal(new TextDecoder().decode(bytes.slice(8, 12)), 'WAVE');
  assert.equal(view.getUint16(22, true), 1); assert.equal(view.getUint32(24, true), 44100);
  assert.equal(view.getUint32(40, true), 8); assert.equal(bytes.byteLength, 52);
  assert.equal(view.getInt16(46, true), 32767); assert.equal(view.getInt16(48, true), -32768);
});
