import { SOUND_CUES, SoundCue } from './soundEffects';
import type { FlowScore } from './music';
import { MusicScene, scoreFor, scoreNotes, sceneKey, SCORES } from './music';
import { CharacterId, MusicGenre } from './types';
import { AudioBus, AudioVolumes, AUDIO_SETTINGS_KEY, readAudioPreferences } from './audioPreferences';

export class SoundEngine {
  private ctx: AudioContext | null = null;
  private bgmTimer: number | null = null;
  private step = 0;
  private currentGenre: MusicGenre = 'electro_funk';
  private muted = false;
  private masterGain: GainNode | null = null;

  private buses: Partial<Record<AudioBus, GainNode>> = {};
  private volumes: AudioVolumes;
  private nodes = new Map<AudioScheduledSourceNode, AudioBus>();
  private priorities = new Map<AudioScheduledSourceNode, number>();
  private lastCue = new Map<SoundCue, number>();
  private nextNoteAt = 0;
  private scheduledSteps: { at: number; step: number; scene: MusicScene | null }[] = [];
  private hasTrack = false;
  private musicScene: MusicScene | null = null;
  private requestedScene: MusicScene | null = null;
  private noiseBuffers = new Map<number, AudioBuffer>();

  setMusicScene(scene: MusicScene) {
    if (sceneKey(scene) !== sceneKey(this.requestedScene)) this.requestedScene = { ...scene };
  }
  getMusicStatus() {
    const score = scoreFor(this.musicScene);
    return { score, title: score ? SCORES[score].title : this.currentGenre, step: this.step,
      scene: this.musicScene ? { ...this.musicScene } : null };
  }

  constructor() {
    let storage: Storage | undefined;
    try { if (typeof window !== 'undefined') storage = window.localStorage; } catch { /* optional */ }
    const prefs = readAudioPreferences(storage);
    this.volumes = prefs.volumes; this.muted = prefs.muted;
  }

  getVolumes(): AudioVolumes { return { ...this.volumes }; }
  private persist() {
    try { window.localStorage?.setItem(AUDIO_SETTINGS_KEY, JSON.stringify({ volumes: this.volumes, muted: this.muted })); } catch { /* optional */ }
  }
  setVolume(bus: keyof AudioVolumes, value: number) {
    if (!Number.isFinite(value)) return;
    this.volumes[bus] = Math.max(0, Math.min(1, value));
    this.applyVolumes(); this.persist();
  }
  private applyVolumes() {
    if (!this.ctx || !this.masterGain) return;
    this.masterGain.gain.setTargetAtTime(this.muted ? 0 : this.volumes.master, this.ctx.currentTime, 0.02);
    for (const bus of ['music', 'sfx', 'voice'] as const) this.buses[bus]?.gain.setTargetAtTime(this.volumes[bus], this.ctx.currentTime, 0.02);
  }
  private reserve(priority: number) {
    if (priority < 2 && this.nodes.size >= 40) return false;
    if (this.nodes.size < 48) return true;
    const victim = [...this.priorities.entries()].sort((a,b)=>a[1]-b[1])[0];
    if (!victim || victim[1] >= priority) return false;
    try { victim[0].stop(); } catch { /* already stopped */ }
    victim[0].disconnect(); this.nodes.delete(victim[0]); this.priorities.delete(victim[0]); return true;
  }
  private track(node: AudioScheduledSourceNode, gain: GainNode, bus: AudioBus, priority = 2) {
    this.nodes.set(node, bus); this.priorities.set(node, priority);
    node.onended = () => { this.nodes.delete(node); this.priorities.delete(node); node.disconnect(); gain.disconnect(); };
  }
  playCue(cue: SoundCue) {
    if (!this.ctx || this.ctx.state !== 'running') return false;
    const definition = SOUND_CUES[cue], now = this.ctx.currentTime;
    if (now - (this.lastCue.get(cue) ?? -Infinity) < definition.cooldown || definition.priority < 2 && this.nodes.size >= 40) return false;
    this.lastCue.set(cue, now);
    for (const event of definition.events) {
      if (event.noise) this.playNoise(event.duration,event.volume,now+event.delay,'sfx',definition.priority);
      else this.playOsc(event.frequency!,event.wave!,event.duration,event.volume,event.endFrequency,now+event.delay,'sfx',definition.priority);
    }
    return true;
  }
  isUnlocked() { return this.ctx?.state === 'running'; }
  playFlow(flow: FlowScore) {
    if (this.musicScene?.flow === flow && this.bgmTimer !== null && this.isUnlocked()) return;
    this.startMusic('electro_funk',{ chapter:0, sector:flow, boss:false, phase:1, tension:false, flow });
  }
  private cancelNodes(bus?: AudioBus) {
    for (const [node, channel] of this.nodes) if (!bus || channel === bus) {
      try { node.stop(); } catch { /* already ended */ }
      node.disconnect(); this.nodes.delete(node); this.priorities.delete(node);
    }
  }
  suspend() {
    this.pauseMusic(); this.cancelNodes();
    this.ctx?.suspend().catch(() => {});
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.muted ? 0 : this.volumes.master;
      const limiter = this.ctx.createDynamicsCompressor();
      limiter.threshold.value = -8; limiter.knee.value = 8; limiter.ratio.value = 12;
      limiter.attack.value = 0.003; limiter.release.value = 0.15;
      this.masterGain.connect(limiter); limiter.connect(this.ctx.destination);
      for (const bus of ['music', 'sfx', 'voice'] as const) {
        const gain = this.ctx.createGain(); gain.gain.value = this.volumes[bus];
        gain.connect(this.masterGain); this.buses[bus] = gain;
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  setMuted(mute: boolean) {
    this.muted = mute;
    this.applyVolumes(); this.persist();
  }

  isMuted() {
    return this.muted;
  }

  startMusic(genre: MusicGenre, scene?: MusicScene) {
    if (scene) {
      this.setMusicScene(scene);
      if (scene.flow !== this.musicScene?.flow && (scene.flow || this.musicScene?.flow)) this.stopMusic();
    }
    this.init();
    if (!this.hasTrack || this.currentGenre !== genre) {
      this.stopMusic(); this.currentGenre = genre; this.step = 0; this.hasTrack = true; this.musicScene = this.requestedScene;
    } else this.pauseMusic();

    const tempoMs: Record<MusicGenre, number> = {
      electro_funk: 135,
      dnb_jrock: 105,
      industrial_metal: 120,
      acid_techno: 118,
      electro_swing: 128,
      jp_trap: 132,
      hard_synthwave: 115,
      symphonic_dnb: 102,
    };

    this.nextNoteAt = (this.ctx?.currentTime ?? 0) + 0.02;
    const schedule = () => {
      if (!this.ctx || this.ctx.state !== 'running') return;
      const now = this.ctx.currentTime;
      this.scheduledSteps = this.scheduledSteps.filter((event) => event.at >= now);
      // Timer stalls skip silence instead of compressing missed notes into a burst.
      if (this.nextNoteAt < now) this.nextNoteAt = now + 0.02;
      while (this.nextNoteAt < now + 0.1) {
        // Scene changes are quantized to a bar; changing sector/tension preserves harmony.
        if (this.step % 16 === 0 && sceneKey(this.requestedScene) !== sceneKey(this.musicScene)) {
          if (scoreFor(this.requestedScene) !== scoreFor(this.musicScene)) this.step = 0;
          this.musicScene = this.requestedScene;
        }
        this.scheduledSteps.push({ at: this.nextNoteAt, step: this.step, scene: this.musicScene });
        this.tickBGM(this.nextNoteAt);
        const score = scoreFor(this.musicScene);
        this.nextNoteAt += score ? 60 / SCORES[score].bpm / 4 : tempoMs[this.currentGenre] / 1000;
      }
    };
    schedule();
    this.bgmTimer = window.setInterval(schedule, 25);
  }

  pauseMusic() {
    if (this.bgmTimer !== null) { clearInterval(this.bgmTimer); this.bgmTimer = null; }
    const pending = this.scheduledSteps.find((event) => event.at >= (this.ctx?.currentTime ?? 0));
    if (pending) { this.step = pending.step; this.musicScene = pending.scene; }
    this.scheduledSteps = []; this.cancelNodes('music');
  }

  stopMusic() {
    this.pauseMusic(); this.hasTrack = false; this.step = 0;
  }

  private tickBGM(at: number) {
    if (!this.ctx || !this.masterGain || this.ctx.state !== 'running') return;
    const s = this.step++;
    const score = scoreFor(this.musicScene);
    if (score && this.musicScene) {
      for (const note of scoreNotes(score, s, this.musicScene)) {
        if (note.instrument === 'hat' || note.instrument === 'snare') this.playNoise(note.duration, note.volume, at + (note.delay ?? 0), 'music');
        else this.playOsc(note.frequency, note.wave, note.duration, note.volume, note.endFrequency, at + (note.delay ?? 0), 'music');
      }
      return;
    }

    const tracks: Record<MusicGenre, { bass: number[]; lead: number[]; wave: OscillatorType; leadWave: OscillatorType }> = {
      electro_funk: {
        bass: [98, 98, 116.5, 98, 130.8, 146.8, 116.5, 87.3],
        lead: [392, 0, 466.1, 523.2, 0, 587.3, 466.1, 392],
        wave: 'sawtooth',
        leadWave: 'square',
      },
      dnb_jrock: {
        bass: [110, 110, 164.8, 110, 146.8, 130.8, 196, 146.8],
        lead: [440, 523.2, 659.2, 587.3, 440, 659.2, 783.9, 659.2],
        wave: 'sawtooth',
        leadWave: 'sawtooth',
      },
      industrial_metal: {
        bass: [73.4, 73.4, 82.4, 73.4, 98, 73.4, 87.3, 65.4],
        lead: [293.6, 0, 311.1, 293.6, 220, 0, 261.6, 246.9],
        wave: 'square',
        leadWave: 'sawtooth',
      },
      acid_techno: {
        bass: [65.4, 130.8, 65.4, 98, 65.4, 146.8, 116.5, 65.4],
        lead: [261.6, 311.1, 392, 261.6, 466.1, 392, 311.1, 261.6],
        wave: 'sawtooth',
        leadWave: 'triangle',
      },
      electro_swing: {
        bass: [110, 164.8, 130.8, 196, 146.8, 174.6, 164.8, 130.8],
        lead: [440, 523.2, 659.2, 523.2, 587.3, 698.4, 659.2, 493.8],
        wave: 'triangle',
        leadWave: 'square',
      },
      jp_trap: {
        bass: [82.4, 82.4, 0, 82.4, 110, 98, 82.4, 73.4],
        lead: [329.6, 349.2, 440, 493.8, 659.2, 493.8, 440, 349.2],
        wave: 'sine',
        leadWave: 'triangle',
      },
      hard_synthwave: {
        bass: [92.5, 92.5, 110, 92.5, 138.6, 123.5, 110, 82.4],
        lead: [369.9, 440, 554.3, 493.8, 369.9, 554.3, 659.2, 554.3],
        wave: 'sawtooth',
        leadWave: 'square',
      },
      symphonic_dnb: {
        bass: [110, 110, 130.8, 146.8, 164.8, 146.8, 130.8, 98],
        lead: [440, 659.2, 587.3, 523.2, 659.2, 783.9, 880, 783.9],
        wave: 'sawtooth',
        leadWave: 'triangle',
      },
    };

    const t = tracks[this.currentGenre];
    const bassFreq = t.bass[s % t.bass.length];
    if (bassFreq > 0) {
      this.playOsc(bassFreq, t.wave, 0.11, 0.085, undefined, at, 'music');
    }

    if (s % 2 === 0) {
      this.playOsc(58, 'sine', 0.08, 0.17, 28, at, 'music');
    }
    if (s % 4 === 2) {
      this.playNoise(0.07, 0.075, at, 'music');
    }

    const leadFreq = t.lead[Math.floor(s / 2) % t.lead.length];
    if (leadFreq > 0 && s % 2 === 0) {
      this.playOsc(leadFreq, t.leadWave, 0.14, 0.045, undefined, at, 'music');
    }
  }

  private playOsc(freq: number, type: OscillatorType, duration: number, vol = 0.14, endFreq?: number, at = this.ctx?.currentTime ?? 0, bus: AudioBus = 'sfx', priority = 2) {
    if (!this.ctx || !this.masterGain || this.ctx.state !== 'running' || !this.reserve(priority)) return;
    try {
      const now = at;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);
      if (endFreq !== undefined) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), now + duration);
      }
      gain.gain.setValueAtTime(0.0005, now);
      gain.gain.linearRampToValueAtTime(vol, now + Math.min(0.005, duration / 4));
      gain.gain.exponentialRampToValueAtTime(0.0005, now + duration);
      osc.connect(gain);
      gain.connect(this.buses[bus]!);
      this.track(osc, gain, bus, priority);
      osc.start(now);
      osc.stop(now + duration);
    } catch {
      // Ignore transient Web Audio errors
    }
  }

  private playNoise(duration: number, vol = 0.1, at = this.ctx?.currentTime ?? 0, bus: AudioBus = 'sfx', priority = 2) {
    if (!this.ctx || !this.masterGain || this.ctx.state !== 'running' || !this.reserve(priority)) return;
    try {
      const sampleCount = Math.floor(this.ctx.sampleRate * duration);
      let buffer = this.noiseBuffers.get(sampleCount);
      if (!buffer) {
        buffer = this.ctx.createBuffer(1, sampleCount, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        let seed = 713;
        for (let i = 0; i < sampleCount; i++) {
          seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
          data[i] = (seed / 0x100000000 * 2 - 1) * Math.min(1, i / (this.ctx.sampleRate * 0.002)) * (1 - i / sampleCount);
        }
        this.noiseBuffers.set(sampleCount, buffer);
      }
      const src = this.ctx.createBufferSource();
      src.buffer = buffer;
      const gain = this.ctx.createGain();
      gain.gain.value = vol;
      src.connect(gain);
      gain.connect(this.buses[bus]!);
      this.track(src, gain, bus, priority);
      src.start(at);
    } catch {
      // Ignore
    }
  }

  /** Dual-formant synthesized anime voice shout for Ren (sharp), Maya (ethereal), Leon (guttural) */
  playVoiceShout(charId: CharacterId) {
    if (!this.ctx || !this.masterGain || this.ctx.state !== 'running' || !this.reserve(3)) return;
    try {
      const now = this.ctx.currentTime;
      const baseFreq = charId === 'ren' ? 280 : charId === 'maya' ? 370 : 145;
      const f1Freq = charId === 'ren' ? 880 : charId === 'maya' ? 1150 : 620;
      const f2Freq = charId === 'ren' ? 1950 : charId === 'maya' ? 2400 : 1220;

      const osc = this.ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(baseFreq, now);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.25, now + 0.08);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.85, now + 0.19);

      const f1 = this.ctx.createBiquadFilter();
      f1.type = 'bandpass';
      f1.frequency.setValueAtTime(f1Freq, now);
      f1.Q.value = 5;

      const f2 = this.ctx.createBiquadFilter();
      f2.type = 'bandpass';
      f2.frequency.setValueAtTime(f2Freq, now);
      f2.Q.value = 6;

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.16, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

      osc.connect(f1);
      osc.connect(f2);
      f1.connect(gain);
      f2.connect(gain);
      gain.connect(this.buses.voice!);
      this.track(osc, gain, 'voice', 3);

      osc.start(now);
      osc.stop(now + 0.21);
    } catch {
      // Ignore
    }
  }

  sfxJump() {
    this.playCue('jump');
  }
  sfxDoubleJump() {
    this.playCue('double_jump');
  }
  sfxWallKick() {
    this.playOsc(420, 'triangle', 0.14, 0.2, 740);
  }
  sfxGrabPipe() {
    this.playOsc(540, 'sine', 0.08, 0.14, 620);
  }
  sfxDash() {
    this.playOsc(320, 'sawtooth', 0.14, 0.16, 120);
  }
  sfxSlide() {
    this.playOsc(240, 'sawtooth', 0.16, 0.16, 90);
  }
  sfxSlash(step = 0) { this.playCue(step === 2 ? 'finisher' : step === 1 ? 'return_cut' : 'cut'); }
  sfxHit(material: 'body' | 'metal' | 'boss' = 'body') { this.playCue(material === 'metal' ? 'hit_metal' : material === 'boss' ? 'hit_boss' : 'hit_body'); }
  sfxBlock() {
    this.playOsc(210, 'square', 0.12, 0.2, 160);
  }
  sfxGuardCrush() {
    this.playOsc(280, 'square', 0.12, 0.25, 90);
    this.playOsc(580, 'sawtooth', 0.2, 0.24, 140, (this.ctx?.currentTime ?? 0) + 0.07);
  }
  sfxDeflect() {
    this.playCue('parry');
  }
  sfxShoot(kind: 'gunner' | 'turret' | 'sniper' | 'boss' = 'gunner') { this.playCue(`${kind}_shot`); }
  sfxHurt() {
    this.playOsc(140, 'sawtooth', 0.22, 0.26, 48);
  }
  sfxStun() {
    this.playOsc(220, 'triangle', 0.18, 0.2, 110);
  }
  sfxPsyThrow() {
    this.playOsc(520, 'sawtooth', 0.28, 0.22, 940);
  }
  sfxAssist() {
    this.playOsc(640, 'sine', 0.3, 0.22, 320);
  }
  sfxOverdrive(charId: CharacterId = 'ren') { this.playCue(charId === 'maya' ? 'overdrive_maya' : charId === 'leon' ? 'overdrive_leon' : 'overdrive_ren'); }
  sfxPickup() {
    this.playOsc(520, 'sine', 0.15, 0.18, 920);
  }
  sfxOneUp() {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((n, idx) => {
      this.playOsc(n, 'square', 0.12, 0.18, undefined, (this.ctx?.currentTime ?? 0) + idx * 0.075);
    });
  }
  sfxAlarm() {
    this.playOsc(880, 'square', 0.18, 0.18, 660);
  }
  sfxStageClear() {
    const notes = [440, 554.4, 659.2, 880];
    notes.forEach((n, idx) => {
      this.playOsc(n, 'triangle', 0.24, 0.22, undefined, (this.ctx?.currentTime ?? 0) + idx * 0.11);
    });
  }
}

export const sound = new SoundEngine();
