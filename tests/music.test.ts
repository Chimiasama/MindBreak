import test from 'node:test';
import assert from 'node:assert/strict';
import { MusicScene, SCORES, CHAPTER_SCORES, ScoreId, scoreFor, scoreNotes } from '../src/game/music';
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
  for (let chapter = 1; chapter <= 8; chapter++) {
    assert.equal(scoreFor({ ...district, chapter }), CHAPTER_SCORES[chapter-1][0]);
    assert.equal(scoreFor({ ...district, chapter, boss: true }), CHAPTER_SCORES[chapter-1][1]);
  }
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

test('all 19 scores are bounded complete loops and every note tail fits its bar including swing and trap delays',()=>{
 for(const id of Object.keys(SCORES) as ScoreId[]){
  const meta=SCORES[id],scene:MusicScene={chapter:meta.chapter,sector:`${meta.chapter}B`,boss:meta.kind==='boss',phase:2,tension:true};
  let events=0;const unit=60/meta.bpm/4;
  for(let step=0;step<meta.steps;step++){
   const notes=scoreNotes(id,step,scene);events+=notes.length;
   assert.deepEqual(notes,scoreNotes(id,step+meta.steps,scene));assert.ok(notes.length<=10,`${id}: voice density`);
   for(const n of notes){assert.ok(Number.isFinite(n.frequency)&&n.frequency>=0&&n.frequency<4000);assert.ok(n.volume>0&&n.volume<=0.12);assert.ok(n.duration>0);assert.ok(step%16*unit+(n.delay??0)+n.duration<=16*unit+1e-8,`${id} tail at ${step}`);}
  }
  assert.ok(events>0);assert.equal(meta.steps,meta.bars*16);
 }
});
test('new stage/boss themes have distinct written musical material and all bosses gain second-phase density',()=>{
 const signatures=new Set<string>();
 for(const pair of CHAPTER_SCORES)for(const id of pair){
  const meta=SCORES[id],scene:MusicScene={chapter:meta.chapter,sector:`${meta.chapter}B`,boss:meta.kind==='boss',phase:1,tension:false};
  const phrase=Array.from({length:64},(_,s)=>scoreNotes(id,s,scene).map(n=>[n.instrument,n.frequency,n.delay??0]));
  signatures.add(JSON.stringify(phrase));
  if(scene.boss){const count=(phase:1|2)=>Array.from({length:meta.steps},(_,s)=>scoreNotes(id,s,{...scene,phase})).flat().length;assert.ok(count(2)>count(1),id);}
 }
 assert.equal(signatures.size,16);
 assert.equal(scoreFor({...district,chapter:0,flow:'menu'}),'menu');assert.equal(scoreFor({...district,flow:'victory'}),'victory');assert.equal(scoreFor({...district,flow:'game_over'}),'game_over');
});
