/** Original procedural scores. MIDI pitches, sixteenth-note grid, four beats/bar. */
export interface MusicScene { chapter: number; sector: string; boss: boolean; phase: 1 | 2; tension: boolean }
export interface MusicNote {
  instrument: 'bass' | 'lead' | 'pad' | 'kick' | 'snare' | 'hat';
  frequency: number; wave: OscillatorType; duration: number; volume: number; endFrequency?: number;
}
export const SCORES = {
  district: { title: 'Circuitos de Fuga', bpm: 120, bars: 16, key: 'Mi menor', steps: 256 },
  cipher: { title: 'Protocolo Cipher', bpm: 136, bars: 8, key: 'Mi frígio / dominante de Si', steps: 128 },
} as const;
export type ScoreId = keyof typeof SCORES;
export const scoreFor = (scene: MusicScene | null): ScoreId | null => scene?.chapter === 1 ? scene.boss ? 'cipher' : 'district' : null;
export const sceneKey = (scene: MusicScene | null) => scene ? `${scene.chapter}:${scene.sector}:${scene.boss}:${scene.phase}:${scene.tension}` : '';
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
