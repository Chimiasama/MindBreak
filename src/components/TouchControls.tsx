import React from 'react';
import { CharacterId } from '../game/types';

interface TouchControlsProps {
  characterId: CharacterId;
  psyReady: boolean;
  onKey: (key: 'left' | 'right' | 'up' | 'down' | 'jumpHeld', pressed: boolean) => void;
  onJump: () => void;
  onDropDown: () => void;
  onAttack: () => void;
  onDash: () => void;
  onPsy: () => void;
  onAssist: () => void;
}

export const TouchControls: React.FC<TouchControlsProps> = ({
  characterId,
  psyReady,
  onKey,
  onJump,
  onDropDown,
  onAttack,
  onDash,
  onPsy,
  onAssist,
}) => {
  const assistLabel =
    characterId === 'ren'
      ? 'ASSIST: MAYA'
      : characterId === 'maya'
        ? 'ASSIST: LEON'
        : 'ASSIST: REN';

  const bindHold = (key: 'left' | 'right' | 'up' | 'down', extraDown?: () => void) => ({
    onPointerDown: (e: React.PointerEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.currentTarget.setPointerCapture?.(e.pointerId);
      onKey(key, true);
      extraDown?.();
    },
    onPointerUp: (e: React.PointerEvent<HTMLButtonElement>) => {
      e.preventDefault();
      onKey(key, false);
    },
    onPointerCancel: (e: React.PointerEvent<HTMLButtonElement>) => {
      e.preventDefault();
      onKey(key, false);
    },
    onLostPointerCapture: () => onKey(key, false),
  });

  const bindTap = (action: () => void, releaseJump?: boolean) => ({
    onPointerDown: (e: React.PointerEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.currentTarget.setPointerCapture?.(e.pointerId);
      action();
    },
    onPointerUp: (e: React.PointerEvent<HTMLButtonElement>) => {
      e.preventDefault();
      if (releaseJump) onKey('jumpHeld', false);
    },
    onPointerCancel: (e: React.PointerEvent<HTMLButtonElement>) => {
      e.preventDefault();
      if (releaseJump) onKey('jumpHeld', false);
    },
    onLostPointerCapture: () => { if (releaseJump) onKey('jumpHeld', false); },
  });

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex items-end justify-between px-3 sm:px-6"
      style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
    >
      {/* Left Thumb: Ergonomic 4-Way D-Pad (includes ▲ for Active Wall Climb & Maya 8-Dir Flight) */}
      <div className="pointer-events-auto grid grid-cols-3 grid-rows-3 gap-1.5 touch-game-control">
        <div />
        <button
          type="button"
          aria-label="Escalar parede ou voar para cima"
          {...bindHold('up')}
          className="flex h-12 w-12 items-center justify-center rounded-xl border-2 border-cyan-400/80 bg-slate-950/75 font-display text-lg font-bold text-white shadow-lg active:scale-90 active:bg-cyan-500/40"
        >
          ▲
        </button>
        <div />

        <button
          type="button"
          aria-label="Mover para esquerda"
          {...bindHold('left')}
          className="flex h-12 w-12 items-center justify-center rounded-xl border-2 border-cyan-400/80 bg-slate-950/75 font-display text-lg font-bold text-white shadow-lg active:scale-90 active:bg-cyan-500/40"
        >
          ◀
        </button>
        <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-slate-800/70 bg-slate-950/40 text-[10px] font-mono text-slate-500">
          D-PAD
        </div>
        <button
          type="button"
          aria-label="Mover para direita"
          {...bindHold('right')}
          className="flex h-12 w-12 items-center justify-center rounded-xl border-2 border-cyan-400/80 bg-slate-950/75 font-display text-lg font-bold text-white shadow-lg active:scale-90 active:bg-cyan-500/40"
        >
          ▶
        </button>

        <div />
        <button
          type="button"
          aria-label="Agachar, descer do cano ou voar para baixo"
          {...bindHold('down', onDropDown)}
          className="flex h-12 w-12 items-center justify-center rounded-xl border-2 border-cyan-400/70 bg-slate-950/75 font-display text-lg font-bold text-white shadow-lg active:scale-90 active:bg-cyan-500/40"
        >
          ▼
        </button>
        <div />
      </div>

      {/* Right Thumb: Ergonomic Arcade 2x2 + Assist Bar */}
      <div className="pointer-events-auto grid grid-cols-2 gap-2 touch-game-control">
        <button
          type="button"
          aria-label="Chamar Assistente"
          {...bindTap(onAssist)}
          className="col-span-2 flex h-11 items-center justify-center rounded-xl border border-amber-400/85 bg-slate-950/80 px-3 font-display text-xs font-bold tracking-wide text-amber-300 shadow-lg active:scale-95 active:bg-amber-500/35"
        >
          {assistLabel}
        </button>

        <button
          type="button"
          aria-label="Poder Psíquico ou Overdrive"
          {...bindTap(onPsy)}
          className={`flex h-13 w-14 items-center justify-center rounded-xl border-2 font-display text-xs font-bold shadow-lg active:scale-90 ${
            psyReady
              ? 'border-fuchsia-400 bg-fuchsia-600/85 text-white active:bg-fuchsia-500'
              : 'border-purple-500/80 bg-slate-950/80 text-purple-200 active:bg-purple-500/40'
          }`}
        >
          {psyReady ? 'ULTRA' : 'PSY'}
        </button>

        <button
          type="button"
          aria-label="Dash ou Rasteira"
          {...bindTap(onDash)}
          className="flex h-13 w-14 items-center justify-center rounded-xl border-2 border-blue-400/85 bg-slate-950/80 font-display text-xs font-bold text-blue-100 shadow-lg active:scale-90 active:bg-blue-500/40"
        >
          DASH
        </button>

        <button
          type="button"
          aria-label="Golpe Psíquico"
          {...bindTap(onAttack)}
          className="flex h-13 w-14 items-center justify-center rounded-xl border-2 border-pink-500 bg-slate-950/80 font-display text-xs font-bold text-pink-100 shadow-lg active:scale-90 active:bg-pink-500/45"
        >
          GOLPE
        </button>

        <button
          type="button"
          aria-label="Pular, Wall-Kick, Vault ou Voar (Maya)"
          {...bindTap(onJump, true)}
          className="flex h-13 w-14 items-center justify-center rounded-xl border-2 border-cyan-400 bg-slate-950/80 font-display text-xs font-bold text-cyan-100 shadow-lg active:scale-90 active:bg-cyan-500/45"
        >
          PULO
        </button>
      </div>
    </div>
  );
};
