import { useState } from 'react';
import { sound } from '../game/audio';
import type { AudioVolumes } from '../game/audioPreferences';
const labels: Record<keyof AudioVolumes, string> = { master: 'Geral', music: 'Música', sfx: 'Efeitos', voice: 'Voz' };
export function AudioSettings() {
  const [volumes, setVolumes] = useState(() => sound.getVolumes());
  return <details className="my-3 rounded-lg border border-slate-700 bg-slate-950/70 p-3 text-sm text-slate-200">
    <summary className="cursor-pointer min-h-[44px] content-center font-bold">Volumes de áudio</summary>
    <div className="grid gap-3 sm:grid-cols-2 pt-3">
      {(Object.keys(labels) as (keyof AudioVolumes)[]).map((bus) => <label key={bus} className="flex flex-col gap-2">
        <span>{labels[bus]} · {Math.round(volumes[bus] * 100)}%</span>
        <input aria-label={`Volume ${labels[bus]}`} type="range" min="0" max="100" step="1"
          className="h-8 w-full accent-cyan-400" value={Math.round(volumes[bus] * 100)}
          onChange={(event) => { sound.init(); sound.setVolume(bus, Number(event.target.value) / 100); setVolumes(sound.getVolumes()); }} />
      </label>)}
    </div>
  </details>;
}
