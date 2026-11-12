import { CharacterId, MusicGenre } from './types';

class SoundEngine {
  private ctx: AudioContext | null = null;
  private bgmTimer: number | null = null;
  private step = 0;
  private currentGenre: MusicGenre = 'electro_funk';
  private muted = false;
  private masterGain: GainNode | null = null;

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.muted ? 0 : 0.7;
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  setMuted(mute: boolean) {
    this.muted = mute;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(mute ? 0 : 0.7, this.ctx.currentTime, 0.02);
    }
  }

  isMuted() {
    return this.muted;
  }

  startMusic(genre: MusicGenre) {
    this.init();
    this.currentGenre = genre;
    this.stopMusic();

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

    this.step = 0;
    this.bgmTimer = window.setInterval(() => this.tickBGM(), tempoMs[genre]);
  }

  stopMusic() {
    if (this.bgmTimer !== null) {
      clearInterval(this.bgmTimer);
      this.bgmTimer = null;
    }
  }

  private tickBGM() {
    if (!this.ctx || !this.masterGain || this.muted || this.ctx.state !== 'running') return;

    const s = this.step;
    this.step++;

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
      this.playOsc(bassFreq, t.wave, 0.11, 0.085);
    }

    if (s % 2 === 0) {
      this.playOsc(58, 'sine', 0.08, 0.17, 28);
    }
    if (s % 4 === 2) {
      this.playNoise(0.07, 0.075);
    }

    const leadFreq = t.lead[Math.floor(s / 2) % t.lead.length];
    if (leadFreq > 0 && s % 2 === 0) {
      this.playOsc(leadFreq, t.leadWave, 0.14, 0.045);
    }
  }

  private playOsc(freq: number, type: OscillatorType, duration: number, vol = 0.14, endFreq?: number) {
    if (!this.ctx || !this.masterGain || this.muted) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);
      if (endFreq !== undefined) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), now + duration);
      }
      gain.gain.setValueAtTime(vol, now);
      gain.gain.exponentialRampToValueAtTime(0.0005, now + duration);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + duration);
    } catch {
      // Ignore transient Web Audio errors
    }
  }

  private playNoise(duration: number, vol = 0.1) {
    if (!this.ctx || !this.masterGain || this.muted) return;
    try {
      const sampleCount = Math.floor(this.ctx.sampleRate * duration);
      const buffer = this.ctx.createBuffer(1, sampleCount, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < sampleCount; i++) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / sampleCount);
      }
      const src = this.ctx.createBufferSource();
      src.buffer = buffer;
      const gain = this.ctx.createGain();
      gain.gain.value = vol;
      src.connect(gain);
      gain.connect(this.masterGain);
      src.start();
    } catch {
      // Ignore
    }
  }

  /** Dual-formant synthesized anime voice shout for Ren (sharp), Maya (ethereal), Leon (guttural) */
  playVoiceShout(charId: CharacterId) {
    if (!this.ctx || !this.masterGain || this.muted) return;
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
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.21);
    } catch {
      // Ignore
    }
  }

  sfxJump() {
    this.playOsc(300, 'triangle', 0.13, 0.16, 540);
  }
  sfxDoubleJump() {
    this.playOsc(480, 'sine', 0.16, 0.18, 860);
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
  sfxSlash() {
    this.playOsc(760, 'sawtooth', 0.1, 0.18, 220);
  }
  sfxHit() {
    this.playOsc(170, 'square', 0.14, 0.22, 65);
  }
  sfxBlock() {
    this.playOsc(210, 'square', 0.12, 0.2, 160);
  }
  sfxGuardCrush() {
    this.playOsc(280, 'square', 0.12, 0.25, 90);
    setTimeout(() => this.playOsc(580, 'sawtooth', 0.2, 0.24, 140), 70);
  }
  sfxDeflect() {
    this.playOsc(980, 'sine', 0.11, 0.24, 1540);
  }
  sfxShoot() {
    this.playOsc(440, 'square', 0.08, 0.11, 180);
  }
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
  sfxOverdrive() {
    this.playOsc(120, 'sawtooth', 0.6, 0.3, 660);
    setTimeout(() => this.playOsc(880, 'square', 0.35, 0.24, 220), 180);
  }
  sfxPickup() {
    this.playOsc(520, 'sine', 0.15, 0.18, 920);
  }
  sfxOneUp() {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((n, idx) => {
      setTimeout(() => this.playOsc(n, 'square', 0.12, 0.18), idx * 75);
    });
  }
  sfxAlarm() {
    this.playOsc(880, 'square', 0.18, 0.18, 660);
  }
  sfxStageClear() {
    const notes = [440, 554.4, 659.2, 880];
    notes.forEach((n, idx) => {
      setTimeout(() => this.playOsc(n, 'triangle', 0.24, 0.22), idx * 110);
    });
  }
}

export const sound = new SoundEngine();
