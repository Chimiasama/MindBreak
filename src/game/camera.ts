import { Body } from './collision';

/** Reference 1280×720 renders 960×540 world units; resolution never changes this area. */
export function viewportFor(width: number, height: number) {
  const safeWidth = Number.isFinite(width) ? Math.max(1, width) : 1;
  const safeHeight = Number.isFinite(height) ? Math.max(1, height) : 1;
  const worldHeight = 540;
  const zoom = safeHeight / worldHeight;
  return { zoom, width: safeWidth / zoom, height: worldHeight };
}

interface CameraBounds { top: number; bottom: number; width: number }
interface ArenaBounds { minX: number; maxX: number }

export function cameraTarget(player: Body & { facing: number }, view: { width: number; height: number },
  bounds: CameraBounds, arena?: ArenaBounds | null) {
  const minX = arena?.minX ?? 0;
  const maxX = Math.max(minX, (arena?.maxX ?? bounds.width) - view.width);
  // Reserve more space in the direction the player is looking.
  const anchor = player.facing >= 0 ? 0.36 : 0.64;
  return {
    x: Math.max(minX, Math.min(maxX, player.x - view.width * anchor)),
    y: Math.max(bounds.top, Math.min(Math.max(bounds.top, bounds.bottom - view.height),
      player.y + player.h - view.height * 0.7)),
  };
}

export function followCamera(current: number, target: number) {
  const delta = target - current;
  return Math.abs(delta) <= 8 ? current : current + delta * 0.14;
}
