import { MusicScene, ScoreId, SCORES, scoreNotes, MusicNote } from './music';
import { SOUND_CUES, SoundCue } from './soundEffects';
/** Authoring-only auditions; no preview renderer is imported by the app. */
export function renderMusicPreview(id: ScoreId, scene: MusicScene): Promise<AudioBuffer> {
  const score = SCORES[id], unit = 60 / score.bpm / 4;
  const events = Array.from({length:score.steps},(_,step)=>scoreNotes(id,step,scene).map(note=>({at:step*unit+(note.delay??0),note}))).flat();
  return renderTimeline(events,score.steps*unit,0.7*0.75);
}
export function renderEffectsPreview(cues: SoundCue[]): Promise<AudioBuffer> {
  const events: {at:number;note:MusicNote}[]=[];let cursor=0.02;
  for(const cue of cues){const definition=SOUND_CUES[cue];
    for(const e of definition.events) events.push({at:cursor+e.delay,note:{instrument:e.noise?'snare':'lead',frequency:e.frequency??0,wave:e.wave??'sine',duration:e.duration,volume:e.volume,endFrequency:e.endFrequency}});
    cursor+=Math.max(...definition.events.map(e=>e.delay+e.duration))+0.25;
  }
  return renderTimeline(events,cursor+0.15,0.7);
}
async function renderTimeline(events:{at:number;note:MusicNote}[],duration:number,level:number):Promise<AudioBuffer> {
  const ctx = new OfflineAudioContext(1, Math.ceil(duration * 44100), 44100);
  const master = ctx.createGain(); master.gain.value = level;
  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = -8; limiter.knee.value = 8; limiter.ratio.value = 12;
  limiter.attack.value = 0.003; limiter.release.value = 0.15;
  master.connect(limiter); limiter.connect(ctx.destination);
  const noises = new Map<number, AudioBuffer>();
  for (const {at,note} of events) {
    const gain = ctx.createGain(); gain.connect(master);
    if (note.instrument === 'hat' || note.instrument === 'snare') {
      const count = Math.floor(ctx.sampleRate * note.duration);
      let buffer = noises.get(count);
      if (!buffer) {
        buffer = ctx.createBuffer(1, count, ctx.sampleRate); const data = buffer.getChannelData(0); let seed = 713;
        for (let i = 0; i < count; i++) {
          seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
          data[i] = (seed / 0x100000000 * 2 - 1) * Math.min(1, i / (ctx.sampleRate * 0.002)) * (1 - i / count);
        }
        noises.set(count, buffer);
      }
      const source = ctx.createBufferSource(); source.buffer = buffer;
      gain.gain.value = note.volume; source.connect(gain); source.start(at);
    } else {
      const source = ctx.createOscillator(); source.type = note.wave;
      source.frequency.setValueAtTime(note.frequency, at);
      if (note.endFrequency !== undefined) source.frequency.exponentialRampToValueAtTime(note.endFrequency, at + note.duration);
      gain.gain.setValueAtTime(0.0005, at); gain.gain.linearRampToValueAtTime(note.volume, at + Math.min(0.005, note.duration / 4));
      gain.gain.exponentialRampToValueAtTime(0.0005, at + note.duration);
      source.connect(gain); source.start(at); source.stop(at + note.duration);
    }
  }
  return ctx.startRendering();
}
export function encodePreviewWav(buffer: AudioBuffer) {
  const samples = buffer.getChannelData(0), bytes = new ArrayBuffer(44 + samples.length * 2), view = new DataView(bytes);
  const label = (offset: number, value: string) => [...value].forEach((c, i) => view.setUint8(offset + i, c.charCodeAt(0)));
  label(0, 'RIFF'); view.setUint32(4, bytes.byteLength - 8, true); label(8, 'WAVE'); label(12, 'fmt ');
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, buffer.sampleRate, true); view.setUint32(28, buffer.sampleRate * 2, true);
  view.setUint16(32, 2, true); view.setUint16(34, 16, true); label(36, 'data'); view.setUint32(40, samples.length * 2, true);
  samples.forEach((sample, i) => view.setInt16(44 + i * 2, Math.round(Math.max(-1, Math.min(1, sample)) * (sample < 0 ? 32768 : 32767)), true));
  return bytes;
}
