import React, { useCallback, useEffect, useRef, useState } from 'react';
import { CharacterId } from '../game/types';

export type StickKey = 'left' | 'right' | 'up' | 'down';
export type StickDirections = Record<StickKey, boolean>;

export interface StickSample {
  clampedX: number;
  clampedY: number;
  directions: StickDirections;
}

const NEUTRAL_DIRECTIONS: StickDirections = {
  left: false,
  right: false,
  up: false,
  down: false,
};

/**
 * Converts thumbstick displacement (px) into directional keys with deadzone.
 * When `allowUpDiagonal` is false (normal ground/wall platforming), diagonal-up
 * pushes stay horizontal-only so jumping diagonally toward a wall does not
 * inadvertently engage UP / wall-climb against downward gravity.
 * When `allowUpDiagonal` is true (Maya 8-dir flight), all 45° diagonals engage both axes.
 */
export function resolveStickSample(
  dx: number,
  dy: number,
  maxRadius: number,
  allowUpDiagonal = false
): StickSample {
  const safeRadius = Math.max(1, maxRadius);
  const dist = Math.hypot(dx, dy);
  const clampedDist = Math.min(dist, safeRadius);
  const scale = dist > 0 ? clampedDist / dist : 0;
  const clampedX = dx * scale;
  const clampedY = dy * scale;

  // Radial deadzone prevents accidental drift near rest
  if (dist < safeRadius * 0.24) {
    return { clampedX, clampedY, directions: { ...NEUTRAL_DIRECTIONS } };
  }

  const ux = dx / dist;
  const uy = dy / dist;

  if (allowUpDiagonal) {
    return {
      clampedX,
      clampedY,
      directions: {
        left: ux <= -0.36,
        right: ux >= 0.36,
        up: uy <= -0.44,
        down: uy >= 0.44,
      },
    };
  }

  // Platforming mode: dedicated straight-UP cone (top ~40° arc, >=70° elevation)
  // so diagonal-up thumb pushes (0°..69°) stay purely horizontal and never climb walls.
  const pureUp = uy <= -0.94;
  return {
    clampedX,
    clampedY,
    directions: {
      left: !pureUp && ux <= -0.34,
      right: !pureUp && ux >= 0.34,
      up: pureUp,
      down: uy >= 0.62,
    },
  };
}

interface TouchControlsProps {
  characterId: CharacterId;
  psyReady: boolean;
  psyEnergy?: number;
  isFlying?: boolean;
  scale?: number;
  opacity?: number;
  bottomOffset?: number;
  onKey: (key: 'left' | 'right' | 'up' | 'down' | 'jumpHeld', pressed: boolean) => void;
  onJump: () => void;
  onDropDown: () => void;
  onInteract: () => void;
  onAttack: () => void;
  onDash: () => void;
  onPsy: () => void;
  onAssist: () => void;
}

export const TouchControls: React.FC<TouchControlsProps> = ({
  characterId,
  psyReady,
  psyEnergy = 100,
  isFlying = false,
  scale = 1,
  opacity = 0.9,
  bottomOffset = 0,
  onKey,
  onJump,
  onDropDown,
  onInteract,
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

  const stickRef = useRef<HTMLDivElement | null>(null);
  const activePointerIdRef = useRef<number | null>(null);
  const lastPointerPosRef = useRef<{ x: number; y: number } | null>(null);
  const dirsRef = useRef<StickDirections>({ ...NEUTRAL_DIRECTIONS });

  const onKeyRef = useRef(onKey);
  const onInteractRef = useRef(onInteract);
  const onDropDownRef = useRef(onDropDown);
  const allowUpDiagonalRef = useRef(isFlying);
  const scaleRef = useRef(scale);
  onKeyRef.current = onKey;
  onInteractRef.current = onInteract;
  onDropDownRef.current = onDropDown;
  allowUpDiagonalRef.current = isFlying;
  scaleRef.current = Math.max(0.5, scale);

  const [stickState, setStickState] = useState<{
    active: boolean;
    x: number;
    y: number;
    dirs: StickDirections;
  }>({
    active: false,
    x: 0,
    y: 0,
    dirs: { ...NEUTRAL_DIRECTIONS },
  });

  const applyDirections = useCallback((next: StickDirections) => {
    const prev = dirsRef.current;
    (['left', 'right', 'up', 'down'] as const).forEach((key) => {
      if (next[key] !== prev[key] || next[key]) {
        onKeyRef.current(key, next[key]);
      }
    });
    if (next.up && !prev.up) onInteractRef.current();
    if (next.down && !prev.down) onDropDownRef.current();
    dirsRef.current = next;
  }, []);

  const updateStickFromPointer = useCallback(
    (clientX: number, clientY: number) => {
      const el = stickRef.current;
      if (!el) return;
      lastPointerPosRef.current = { x: clientX, y: clientY };
      const rect = el.getBoundingClientRect();
      const safeScale = scaleRef.current;
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const unscaledWidth = el.offsetWidth || rect.width / safeScale;
      const maxRadius = Math.max(32, unscaledWidth * 0.34);
      const sample = resolveStickSample(
        (clientX - centerX) / safeScale,
        (clientY - centerY) / safeScale,
        maxRadius,
        allowUpDiagonalRef.current
      );
      applyDirections(sample.directions);
      setStickState({
        active: true,
        x: sample.clampedX,
        y: sample.clampedY,
        dirs: sample.directions,
      });
    },
    [applyDirections]
  );

  useEffect(() => {
    if (activePointerIdRef.current !== null && lastPointerPosRef.current) {
      updateStickFromPointer(lastPointerPosRef.current.x, lastPointerPosRef.current.y);
    }
  }, [isFlying, updateStickFromPointer]);

  const windowCleanupRef = useRef<(() => void) | null>(null);

  const releaseStick = useCallback(() => {
    activePointerIdRef.current = null;
    lastPointerPosRef.current = null;
    windowCleanupRef.current?.();
    windowCleanupRef.current = null;
    applyDirections({ ...NEUTRAL_DIRECTIONS });
    setStickState({
      active: false,
      x: 0,
      y: 0,
      dirs: { ...NEUTRAL_DIRECTIONS },
    });
  }, [applyDirections]);

  useEffect(
    () => () => {
      windowCleanupRef.current?.();
      windowCleanupRef.current = null;
      const prev = dirsRef.current;
      (['left', 'right', 'up', 'down'] as const).forEach((key) => {
        if (prev[key]) onKeyRef.current(key, false);
      });
    },
    []
  );

  const startWindowTracking = (pointerId: number) => {
    windowCleanupRef.current?.();

    const onWindowMove = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return;
      updateStickFromPointer(ev.clientX, ev.clientY);
    };

    const onWindowEnd = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return;
      releaseStick();
    };

    const onWindowBlur = () => {
      releaseStick();
    };

    window.addEventListener('pointermove', onWindowMove, { passive: true });
    window.addEventListener('pointerup', onWindowEnd);
    window.addEventListener('pointercancel', onWindowEnd);
    window.addEventListener('blur', onWindowBlur);

    windowCleanupRef.current = () => {
      window.removeEventListener('pointermove', onWindowMove);
      window.removeEventListener('pointerup', onWindowEnd);
      window.removeEventListener('pointercancel', onWindowEnd);
      window.removeEventListener('blur', onWindowBlur);
    };
  };

  const handleStickPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (activePointerIdRef.current !== null && activePointerIdRef.current !== e.pointerId) return;
    activePointerIdRef.current = e.pointerId;
    try {
      e.currentTarget.setPointerCapture?.(e.pointerId);
    } catch {
      // Window listeners below remain active even when pointer capture is unavailable
    }
    startWindowTracking(e.pointerId);
    updateStickFromPointer(e.clientX, e.clientY);
  };

  const bindTap = (action: () => void, releaseJump?: boolean) => ({
    onPointerDown: (e: React.PointerEvent<HTMLButtonElement>) => {
      e.preventDefault();
      try {
        e.currentTarget.setPointerCapture?.(e.pointerId);
      } catch {
        // Ignore capture failure on synthetic/touch events
      }
      action();
    },
    onPointerUp: (e: React.PointerEvent<HTMLButtonElement>) => {
      e.preventDefault();
      if (releaseJump) onKeyRef.current('jumpHeld', false);
    },
    onPointerCancel: (e: React.PointerEvent<HTMLButtonElement>) => {
      e.preventDefault();
      if (releaseJump) onKeyRef.current('jumpHeld', false);
    },
    onLostPointerCapture: () => {
      if (releaseJump) onKeyRef.current('jumpHeld', false);
    },
  });

  const { active, x, y, dirs } = stickState;
  const psyAvailable = psyEnergy >= 25;
  const safeOffset = Math.max(0, Math.round(bottomOffset));
  const safeScale = Math.max(0.8, Math.min(1.25, scale));
  const safeOpacity = Math.max(0.45, Math.min(1, opacity));

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex items-end justify-between px-3 sm:px-6 transition-opacity duration-150"
      style={{
        opacity: safeOpacity,
        paddingBottom: `calc(max(1.5rem, env(safe-area-inset-bottom)) + ${safeOffset}px)`,
        paddingLeft: 'max(1.5rem, env(safe-area-inset-left))',
        paddingRight: 'max(1.5rem, env(safe-area-inset-right))',
      }}
    >
      {/* Left Thumb: Simulated 360° Analog Thumbstick (diagonals, climb, drop & 8-dir flight) */}
      <div
        ref={stickRef}
        role="slider"
        aria-label="Alavanca analógica de movimento"
        aria-valuetext={
          [dirs.up && 'cima', dirs.down && 'baixo', dirs.left && 'esquerda', dirs.right && 'direita']
            .filter(Boolean)
            .join('+') || 'centro'
        }
        onPointerDown={handleStickPointerDown}
        onContextMenu={(e) => e.preventDefault()}
        style={{
          transform: `scale(${safeScale})`,
          transformOrigin: 'bottom left',
        }}
        className={`pointer-events-auto relative flex h-32 w-32 sm:h-36 sm:w-36 items-center justify-center rounded-full border-2 bg-slate-950/85 shadow-[0_8px_28px_rgba(2,6,23,0.85)] touch-game-control touch-none select-none transition-colors duration-150 ${
          active ? 'border-cyan-400/90 ring-2 ring-cyan-400/25' : 'border-cyan-500/55'
        }`}
      >
        {/* Inner gate ring & crosshair guides */}
        <div className="pointer-events-none absolute inset-3 rounded-full border border-dashed border-slate-700/80" />
        <div className="pointer-events-none absolute inset-x-5 top-1/2 h-px -translate-y-1/2 bg-slate-800/75" />
        <div className="pointer-events-none absolute inset-y-5 left-1/2 w-px -translate-x-1/2 bg-slate-800/75" />

        {/* Subtle 45-deg diagonal markers */}
        <span className={`pointer-events-none absolute left-5 top-5 h-1.5 w-1.5 rounded-full transition-colors ${dirs.up && dirs.left ? 'bg-cyan-300 shadow-[0_0_6px_#22d3ee]' : 'bg-slate-600/70'}`} />
        <span className={`pointer-events-none absolute right-5 top-5 h-1.5 w-1.5 rounded-full transition-colors ${dirs.up && dirs.right ? 'bg-cyan-300 shadow-[0_0_6px_#22d3ee]' : 'bg-slate-600/70'}`} />
        <span className={`pointer-events-none absolute bottom-5 left-5 h-1.5 w-1.5 rounded-full transition-colors ${dirs.down && dirs.left ? 'bg-cyan-300 shadow-[0_0_6px_#22d3ee]' : 'bg-slate-600/70'}`} />
        <span className={`pointer-events-none absolute bottom-5 right-5 h-1.5 w-1.5 rounded-full transition-colors ${dirs.down && dirs.right ? 'bg-cyan-300 shadow-[0_0_6px_#22d3ee]' : 'bg-slate-600/70'}`} />

        {/* Cardinal directional indicators */}
        <span className={`pointer-events-none absolute top-1.5 left-1/2 -translate-x-1/2 text-[10px] font-bold transition-all ${dirs.up ? 'scale-125 text-cyan-300 drop-shadow-[0_0_6px_rgba(34,211,238,0.9)]' : 'text-slate-500/85'}`}>
          ▲
        </span>
        <span className={`pointer-events-none absolute bottom-1.5 left-1/2 -translate-x-1/2 text-[10px] font-bold transition-all ${dirs.down ? 'scale-125 text-cyan-300 drop-shadow-[0_0_6px_rgba(34,211,238,0.9)]' : 'text-slate-500/85'}`}>
          ▼
        </span>
        <span className={`pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-bold transition-all ${dirs.left ? 'scale-125 text-cyan-300 drop-shadow-[0_0_6px_rgba(34,211,238,0.9)]' : 'text-slate-500/85'}`}>
          ◀
        </span>
        <span className={`pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold transition-all ${dirs.right ? 'scale-125 text-cyan-300 drop-shadow-[0_0_6px_rgba(34,211,238,0.9)]' : 'text-slate-500/85'}`}>
          ▶
        </span>

        {/* Center resting socket dot */}
        <div className="pointer-events-none h-3 w-3 rounded-full bg-slate-800/90 ring-1 ring-slate-600/70" />

        {/* Simulated Thumbstick Cap ("Bolinha") */}
        <div
          className={`pointer-events-none absolute flex h-14 w-14 sm:h-15 sm:w-15 items-center justify-center rounded-full border-2 bg-gradient-to-b from-slate-700 via-slate-900 to-slate-950 ${
            active
              ? 'border-cyan-300 shadow-[0_0_18px_rgba(34,211,238,0.65),inset_0_2px_6px_rgba(255,255,255,0.22)] transition-none'
              : 'border-cyan-400/85 shadow-[0_4px_14px_rgba(0,0,0,0.75),inset_0_2px_4px_rgba(255,255,255,0.14)] transition-transform duration-100 ease-out'
          }`}
          style={{ transform: `translate3d(${x}px, ${y}px, 0)` }}
        >
          <div className={`h-8 w-8 rounded-full border transition-colors ${active ? 'border-cyan-300/70 bg-cyan-500/15' : 'border-slate-600/80 bg-slate-900/80'}`} />
          <div className={`absolute h-2.5 w-2.5 rounded-full transition-colors ${active ? 'bg-cyan-300 shadow-[0_0_8px_#22d3ee]' : 'bg-cyan-500/65'}`} />
        </div>
      </div>

      {/* Right Thumb: Ergonomic Arcade 2x2 + Assist Bar */}
      <div
        onContextMenu={(e) => e.preventDefault()}
        style={{
          transform: `scale(${safeScale})`,
          transformOrigin: 'bottom right',
        }}
        className="pointer-events-auto grid grid-cols-2 gap-2 touch-game-control select-none"
      >
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
          aria-label={psyReady ? 'Overdrive pronto (100 foco)' : 'Poder Psíquico (custa 25 foco)'}
          {...bindTap(onPsy)}
          className={`flex h-13 w-14 flex-col items-center justify-center rounded-xl border-2 font-display leading-none shadow-lg active:scale-90 ${
            psyReady
              ? 'border-fuchsia-400 bg-fuchsia-600/85 text-white active:bg-fuchsia-500'
              : psyAvailable
                ? 'border-purple-500/80 bg-slate-950/80 text-purple-200 active:bg-purple-500/40'
                : 'border-slate-700/80 bg-slate-950/65 text-slate-400'
          }`}
        >
          <span className="text-xs font-bold">{psyReady ? 'ULTRA' : 'PSY'}</span>
          <span className="mt-0.5 font-mono text-[9px] opacity-85">{psyReady ? '100' : '25'}</span>
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
