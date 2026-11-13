import { SCORES, CHAPTER_SCORES, ARRANGEMENTS, FlowScore, ScoreId } from './musicCatalog';
export { SCORES, CHAPTER_SCORES } from './musicCatalog';
export type { ScoreId, FlowScore } from './musicCatalog';
/** Original procedural scores. MIDI pitches, sixteenth-note grid, four beats/bar. */
export interface MusicScene { chapter: number; sector: string; boss: boolean; phase: 1 | 2; tension: boolean; flow?: FlowScore }
export interface MusicNote {
  instrument: 'bass' | 'lead' | 'pad' | 'kick' | 'snare' | 'hat';
  frequency: number; wave: OscillatorType; duration: number; volume: number; endFrequency?: number; delay?: number;
}
export function scoreFor(scene: MusicScene | null): ScoreId | null {
  if (!scene) return null;
  if (scene.flow) return scene.flow;
  return CHAPTER_SCORES[scene.chapter - 1]?.[scene.boss ? 1 : 0] ?? null;
}
export const sceneKey = (scene: MusicScene | null) => scene ? `${scene.chapter}:${scene.sector}:${scene.boss}:${scene.phase}:${scene.tension}:${scene.flow ?? ''}` : '';
export const midiHz = (note: number) => 440 * 2 ** ((note - 69) / 12);
const DISTRICT_LEAD = [
  [76, 79, 83, 81, 79, 76, 74, 71], [72, 76, 79, 83, 81, 79, 76, 74],
  [79, 83, 86, 83, 81, 79, 78, 74], [78, 81, 86, 84, 81, 78, 76, 74],
  [83, 81, 79, 76, 79, 81, 83, 86], [84, 83, 79, 76, 74, 76, 79, 81],
  [86, 83, 81, 79, 78, 79, 83, 81], [81, 78, 74, 78, 81, 78, 76, 74],
];
const CIPHER_LEAD = [
  [76, 77, 79, 83, 81, 79, 77, 75], [77, 81, 84, 83, 81, 79, 77, 76],
  [72, 76, 79, 83, 79, 77, 76, 72], [71, 75, 78, 83, 81, 78, 75, 71],
  [88, 83, 79, 77, 76, 79, 83, 86], [79, 83, 86, 89, 86, 83, 81, 79],
  [89, 84, 81, 79, 77, 79, 81, 84], [83, 81, 78, 75, 71, 75, 78, 83],
];
/** Pure arrangement shared by live playback, tests and offline audition rendering. */
export function scoreNotes(id: ScoreId, absoluteStep: number, scene: MusicScene): MusicNote[] {
  const score = SCORES[id], step = ((absoluteStep % score.steps) + score.steps) % score.steps;
  const bar = Math.floor(step / 16), beat = step % 16, unit = 60 / score.bpm / 4;
  if (id !== 'district' && id !== 'cipher') return arrangementNotes(id, step, scene);
  const boss = id === 'cipher', intense = scene.tension || boss && scene.phase === 2;
  const sector = scene.sector.slice(-1);
  const root = boss ? [40, 41, 36, 35, 40, 43, 41, 35][bar] : [40, 36, 43, 38][bar % 4];
  const notes: MusicNote[] = [];
  const tone = (instrument: MusicNote['instrument'], midi: number, wave: OscillatorType, ticks: number, volume: number) =>
    notes.push({ instrument, frequency: midiHz(midi), wave, duration: ticks * unit, volume });
  if ([0, 3, 6, 8, 11, 14].includes(beat)) tone('bass', root + (beat === 6 || beat === 14 ? 12 : 0), boss ? 'sawtooth' : 'triangle', 1.5, 0.065);
  if (beat === 0 || beat === 8 || boss && beat === 10 || intense && beat === 14)
    notes.push({ instrument: 'kick', frequency: 100, endFrequency: 35, wave: 'sine', duration: 0.12, volume: 0.12 });
  if (beat === 4 || beat === 12) notes.push({ instrument: 'snare', frequency: 0, wave: 'sine', duration: 0.09, volume: 0.065 });
  const hatGrid = intense || sector === 'B' || boss ? 1 : 2;
  if (beat % hatGrid === 0 && !(sector === 'A' && !boss && bar < 4 && beat % 4 !== 2))
    notes.push({ instrument: 'hat', frequency: 0, wave: 'sine', duration: 0.025, volume: beat % 4 === 2 ? 0.021 : 0.012 });
  if (beat === 0) {
    tone('pad', root + 12, 'sine', 14, 0.022);
    tone('pad', root + 19, 'sine', 14, 0.015);
  }
  if (beat % 2 === 0 && (boss || bar >= 4 || sector !== 'A')) {
    const phrase = boss ? CIPHER_LEAD[bar] : DISTRICT_LEAD[(bar + (bar >= 12 ? 4 : 0)) % 8];
    if (boss || beat !== 14 || bar % 4 === 3) tone('lead', phrase[beat / 2], boss ? 'triangle' : 'sine', 1.7, 0.042);
  }
  if ((sector === 'C' || intense) && beat % 4 === 3) tone('lead', root + [24, 31, 36, 31][Math.floor(beat / 4)], 'triangle', 0.65, 0.022);
  return notes;
}

function arrangementNotes(id: Exclude<ScoreId,'district'|'cipher'>, step: number, scene: MusicScene): MusicNote[] {
  const score = SCORES[id], p = ARRANGEMENTS[id], unit = 60 / score.bpm / 4;
  const bar = Math.floor(step / 16), beat = step % 16, root = p.roots[bar % p.roots.length];
  const boss = score.kind === 'boss', flow = score.kind === 'flow';
  const intense = !flow && (scene.tension || boss && scene.phase === 2), sector = scene.sector.slice(-1);
  const notes: MusicNote[] = [];
  const delay = p.swing && beat % 4 === 2 ? unit * 0.25 : 0;
  const tone = (instrument: MusicNote['instrument'], midi: number, wave: OscillatorType, ticks: number, volume: number) =>
    notes.push({ instrument, frequency: midiHz(midi), wave, duration: ticks * unit, volume, delay });
  if (p.bassBeats.includes(beat)) {
    tone('bass', root + (beat === 6 || beat === 14 ? 12 : 0), p.bass, p.trap ? 2 : 1.35, p.bass === 'sine' ? 0.075 : 0.05);
    if (p.trap) notes[notes.length-1].endFrequency = midiHz(root - 5);
  }
  if (p.kick.includes(beat) || intense && beat === 14) notes.push({ instrument:'kick', frequency:id==='goliath'||id==='kusanagi'?85:100, endFrequency:32, wave:'sine', duration:0.11, volume:0.11 });
  if (p.snare.includes(beat)) notes.push({instrument:'snare',frequency:0,wave:'sine',duration:0.07,volume:0.055,delay});
  const hatGrid = intense || sector === 'B' ? 1 : p.hat;
  if (p.hat && beat % hatGrid === 0) notes.push({instrument:'hat',frequency:0,wave:'sine',duration:0.022,volume:beat%4===2?0.019:0.01,delay});
  if (p.trap && (beat===13 || beat===15)) notes.push({instrument:'hat',frequency:0,wave:'sine',duration:0.015,volume:0.008,delay:unit*0.5});
  if (beat === 0) {
    tone('pad',root+12,'sine',14,0.018);tone('pad',root+19,'sine',14,0.012);
    if (p.padThird) tone('pad',root+12+p.padThird,'triangle',14,0.01);
  }
  const phrase = p.phrases[(bar + (bar >= 8 ? 1 : 0)) % p.phrases.length];
  const leadIndex = Math.floor(beat / 2);
  if (p.leadBeats.includes(beat) && (flow || boss || bar>=4 || sector!=='A') && !(sector==='A' && !boss && !flow && beat===14 && bar%4!==3))
    tone('lead',phrase[leadIndex],p.lead,1.55,p.lead==='square'||p.lead==='sawtooth'?0.025:0.04);
  if (p.duet && intense && beat%4===1) tone('lead',phrase[(leadIndex+5)%8]-12,'triangle',0.65,0.019);
  if ((p.duet || intense || !flow && sector==='C') && beat%4===3)
    tone('lead',p.duet ? phrase[(leadIndex+3)%8]-12 : root+[24,31,36,31][Math.floor(beat/4)],'sine',0.65,0.019);
  return notes;
}
