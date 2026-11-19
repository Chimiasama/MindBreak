export type TouchVisibilityMode = 'auto' | 'always' | 'hidden';
export type ShakeIntensity = 'full' | 'reduced' | 'off';
export type ActiveInputSource = 'touch' | 'keyboard' | 'gamepad';

export interface UiPreferences {
  touchMode: TouchVisibilityMode;
  touchScale: number;
  touchOpacity: number;
  touchBottomOffset: number;
  shakeIntensity: ShakeIntensity;
  reducedFlashes: boolean;
}

export const UI_SETTINGS_KEY = 'mindbreak.ui.v1';

export const UI_DEFAULTS: Readonly<UiPreferences> = Object.freeze({
  touchMode: 'auto',
  touchScale: 1,
  touchOpacity: 0.9,
  touchBottomOffset: 0,
  shakeIntensity: 'full',
  reducedFlashes: false,
});

const TOUCH_MODES: ReadonlySet<string> = new Set(['auto', 'always', 'hidden']);
const SHAKE_MODES: ReadonlySet<string> = new Set(['full', 'reduced', 'off']);

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function sanitizeUiPreferences(raw: unknown): UiPreferences {
  const result: UiPreferences = { ...UI_DEFAULTS };
  if (!raw || typeof raw !== 'object') return result;
  const candidate = raw as Record<string, unknown>;

  if (typeof candidate.touchMode === 'string' && TOUCH_MODES.has(candidate.touchMode)) {
    result.touchMode = candidate.touchMode as TouchVisibilityMode;
  }
  if (typeof candidate.touchScale === 'number' && Number.isFinite(candidate.touchScale)) {
    result.touchScale = Math.round(clamp(candidate.touchScale, 0.8, 1.25) * 100) / 100;
  }
  if (typeof candidate.touchOpacity === 'number' && Number.isFinite(candidate.touchOpacity)) {
    result.touchOpacity = Math.round(clamp(candidate.touchOpacity, 0.45, 1) * 100) / 100;
  }
  if (typeof candidate.touchBottomOffset === 'number' && Number.isFinite(candidate.touchBottomOffset)) {
    result.touchBottomOffset = Math.round(clamp(candidate.touchBottomOffset, 0, 48));
  }
  if (typeof candidate.shakeIntensity === 'string' && SHAKE_MODES.has(candidate.shakeIntensity)) {
    result.shakeIntensity = candidate.shakeIntensity as ShakeIntensity;
  }
  if (typeof candidate.reducedFlashes === 'boolean') {
    result.reducedFlashes = candidate.reducedFlashes;
  }

  return result;
}

export function readUiPreferences(storage?: Pick<Storage, 'getItem'> | null): UiPreferences {
  try {
    const store = storage === undefined ? globalThis.localStorage : storage;
    const raw = store?.getItem(UI_SETTINGS_KEY);
    if (!raw) return { ...UI_DEFAULTS };
    return sanitizeUiPreferences(JSON.parse(raw));
  } catch {
    return { ...UI_DEFAULTS };
  }
}

export function writeUiPreferences(
  prefs: UiPreferences,
  storage?: Pick<Storage, 'setItem'> | null
): UiPreferences {
  const sanitized = sanitizeUiPreferences(prefs);
  try {
    const store = storage === undefined ? globalThis.localStorage : storage;
    store?.setItem(UI_SETTINGS_KEY, JSON.stringify(sanitized));
  } catch {
    // Storage is optional (private mode / quota exceeded); gameplay keeps running.
  }
  return sanitized;
}

export function resetUiPreferences(storage?: Pick<Storage, 'setItem'> | null): UiPreferences {
  return writeUiPreferences({ ...UI_DEFAULTS }, storage);
}

export function resolveShakeMultiplier(intensity: ShakeIntensity): number {
  if (intensity === 'off') return 0;
  if (intensity === 'reduced') return 0.4;
  return 1;
}

export function shouldShowTouchControls(
  mode: TouchVisibilityMode,
  lastInputSource: ActiveInputSource | null,
  hasTouchCapability: boolean
): boolean {
  if (mode === 'always') return true;
  if (mode === 'hidden') return false;
  if (lastInputSource === 'touch') return true;
  if (lastInputSource === 'keyboard' || lastInputSource === 'gamepad') return false;
  return hasTouchCapability;
}
