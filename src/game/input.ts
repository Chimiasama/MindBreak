export type InputKey = 'left' | 'right' | 'up' | 'down' | 'jumpHeld';
export type InputSource = 'keyboard' | 'touch' | 'gamepad';
export type GameAction = 'jump' | 'attack' | 'dash' | 'psy' | 'assist';
type Keys = Record<InputKey, boolean>;
export const KEY_BINDINGS: Record<string, InputKey> = {
  ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
  ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', Space: 'jumpHeld',
};

export class KeyboardState {
  private held = new Set<string>();
  set(code: string, pressed: boolean): { key: InputKey; pressed: boolean } | null {
    const key = KEY_BINDINGS[code];
    if (!key) return null;
    if (pressed) this.held.add(code);
    else this.held.delete(code);
    return { key, pressed: [...this.held].some((heldCode) => KEY_BINDINGS[heldCode] === key) };
  }
}
const empty = (): Keys => ({ left: false, right: false, up: false, down: false, jumpHeld: false });

/** Device state is combined so an idle gamepad never erases keyboard or touch. */
export class GameInput {
  readonly keys = empty();
  private sources: Record<InputSource, Keys> = { keyboard: empty(), touch: empty(), gamepad: empty() };
  private actions: { action: GameAction; source: InputSource }[] = [];

  enqueue(action: GameAction, source: InputSource = 'keyboard') {
    if (this.actions.length < 16 && !this.actions.some((item) => item.action === action && item.source === source)) {
      this.actions.push({ action, source });
    }
  }

  drain() {
    return this.actions.splice(0);
  }

  set(source: InputSource, key: InputKey, pressed: boolean) {
    this.sources[source][key] = pressed;
    this.keys[key] = Object.values(this.sources).some((keys) => keys[key]);
  }

  clear(source?: InputSource) {
    this.actions = source ? this.actions.filter((item) => item.source !== source) : [];
    for (const name of (source ? [source] : Object.keys(this.sources)) as InputSource[]) {
      for (const key of Object.keys(this.keys) as InputKey[]) this.set(name, key, false);
    }
  }
}
