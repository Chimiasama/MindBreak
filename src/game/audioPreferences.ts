export type AudioBus = 'music' | 'sfx' | 'voice';
export type AudioVolumes = { master: number } & Record<AudioBus, number>;
export const AUDIO_DEFAULTS: AudioVolumes = { master: 0.7, music: 0.75, sfx: 1, voice: 0.8 };
export const AUDIO_SETTINGS_KEY = 'mindbreak.audio.v1';
export interface AudioPreferences { volumes: AudioVolumes; muted: boolean }
export function readAudioPreferences(storage?: Pick<Storage, 'getItem'>): AudioPreferences {
  const defaults = { volumes: { ...AUDIO_DEFAULTS }, muted: false };
  try {
    const raw = JSON.parse(storage?.getItem(AUDIO_SETTINGS_KEY) ?? 'null');
    if (!raw || typeof raw !== 'object') return defaults;
    for (const key of Object.keys(AUDIO_DEFAULTS) as (keyof AudioVolumes)[]) {
      const value = raw.volumes?.[key];
      if (typeof value === 'number' && Number.isFinite(value)) defaults.volumes[key] = Math.max(0, Math.min(1, value));
    }
    defaults.muted = raw.muted === true;
  } catch { /* Storage is optional; audio must remain available. */ }
  return defaults;
}
