import React from 'react';
import { RotateCcw } from 'lucide-react';
import {
  ShakeIntensity,
  TouchVisibilityMode,
  UI_DEFAULTS,
  UiPreferences,
} from '../game/uiPreferences';

interface GameplaySettingsProps {
  preferences: UiPreferences;
  onChange: (next: UiPreferences) => void;
  onReset: () => void;
  compact?: boolean;
}

const TOUCH_MODE_OPTIONS: { value: TouchVisibilityMode; label: string }[] = [
  { value: 'auto', label: 'Automático' },
  { value: 'always', label: 'Sempre' },
  { value: 'hidden', label: 'Ocultos' },
];

const SHAKE_OPTIONS: { value: ShakeIntensity; label: string }[] = [
  { value: 'full', label: 'Completo' },
  { value: 'reduced', label: 'Reduzido' },
  { value: 'off', label: 'Desligado' },
];

export const GameplaySettings: React.FC<GameplaySettingsProps> = ({
  preferences,
  onChange,
  onReset,
  compact = false,
}) => {
  const update = <K extends keyof UiPreferences>(key: K, value: UiPreferences[K]) => {
    onChange({ ...preferences, [key]: value });
  };

  const isDefault =
    preferences.touchMode === UI_DEFAULTS.touchMode &&
    preferences.touchScale === UI_DEFAULTS.touchScale &&
    preferences.touchOpacity === UI_DEFAULTS.touchOpacity &&
    preferences.touchBottomOffset === UI_DEFAULTS.touchBottomOffset &&
    preferences.shakeIntensity === UI_DEFAULTS.shakeIntensity &&
    preferences.reducedFlashes === UI_DEFAULTS.reducedFlashes;

  return (
    <details className="my-3 rounded-lg border border-slate-700 bg-slate-950/70 p-3 text-sm text-slate-200">
      <summary className="cursor-pointer min-h-[44px] content-center font-bold">
        Controles na tela e acessibilidade
      </summary>

      <div className="space-y-4 pt-3">
        {/* Touch Controls Visibility */}
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="font-semibold text-slate-100">Exibição dos botões de toque</span>
            <span className="text-xs text-slate-400">
              {preferences.touchMode === 'auto'
                ? 'Oculta ao usar teclado/controle; volta no toque'
                : preferences.touchMode === 'always'
                  ? 'Sempre visíveis durante o jogo'
                  : 'Ocultos até reativar no topo da tela'}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {TOUCH_MODE_OPTIONS.map((option) => {
              const active = preferences.touchMode === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => update('touchMode', option.value)}
                  className={`min-h-[44px] rounded-lg border px-2 py-2 text-xs font-bold transition ${
                    active
                      ? 'border-cyan-400 bg-cyan-500/20 text-cyan-200'
                      : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-500'
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Touch Layout Sliders */}
        <div className={`grid gap-3 ${compact ? 'grid-cols-1' : 'sm:grid-cols-3'}`}>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-slate-200">
              Tamanho dos botões · {Math.round(preferences.touchScale * 100)}%
            </span>
            <input
              aria-label="Tamanho dos botões de toque"
              type="range"
              min="80"
              max="125"
              step="5"
              className="h-8 w-full accent-cyan-400"
              value={Math.round(preferences.touchScale * 100)}
              onChange={(e) => update('touchScale', Number(e.target.value) / 100)}
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-slate-200">
              Opacidade · {Math.round(preferences.touchOpacity * 100)}%
            </span>
            <input
              aria-label="Opacidade dos botões de toque"
              type="range"
              min="45"
              max="100"
              step="5"
              className="h-8 w-full accent-cyan-400"
              value={Math.round(preferences.touchOpacity * 100)}
              onChange={(e) => update('touchOpacity', Number(e.target.value) / 100)}
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-slate-200">
              Altura inferior · +{preferences.touchBottomOffset}px
            </span>
            <input
              aria-label="Altura inferior dos botões de toque"
              type="range"
              min="0"
              max="48"
              step="4"
              className="h-8 w-full accent-cyan-400"
              value={preferences.touchBottomOffset}
              onChange={(e) => update('touchBottomOffset', Number(e.target.value))}
            />
          </label>
        </div>

        {/* Visual Accessibility */}
        <div className="space-y-3 border-t border-slate-800 pt-3">
          <div className="space-y-2">
            <span className="block font-semibold text-slate-100">Tremor de câmera</span>
            <div className="grid grid-cols-3 gap-2">
              {SHAKE_OPTIONS.map((option) => {
                const active = preferences.shakeIntensity === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={active}
                    onClick={() => update('shakeIntensity', option.value)}
                    className={`min-h-[44px] rounded-lg border px-2 py-2 text-xs font-bold transition ${
                      active
                        ? 'border-pink-400 bg-pink-500/20 text-pink-200'
                        : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-500'
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-slate-100">Reduzir flashes de luz</div>
              <div className="text-xs text-slate-400">
                Suaviza relâmpagos na tempestade e clarões intensos de combate.
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={preferences.reducedFlashes}
              onClick={() => update('reducedFlashes', !preferences.reducedFlashes)}
              className={`min-h-[44px] min-w-[92px] rounded-lg border px-3 py-2 text-xs font-bold transition ${
                preferences.reducedFlashes
                  ? 'border-cyan-400 bg-cyan-500/25 text-cyan-100'
                  : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-500'
              }`}
            >
              {preferences.reducedFlashes ? 'Ativado' : 'Desativado'}
            </button>
          </div>
        </div>

        {/* Reset button */}
        <div className="flex justify-end border-t border-slate-800 pt-3">
          <button
            type="button"
            disabled={isDefault}
            onClick={onReset}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-200 hover:border-cyan-400 disabled:cursor-not-allowed disabled:opacity-45 transition"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Restaurar padrão
          </button>
        </div>
      </div>
    </details>
  );
};
