import assert from 'node:assert/strict';
import { overlaps } from '../../src/game/collision';
import type { GameEngine } from '../../src/game/engine';
interface Move { x: number; jump: number }
interface Node { p: any; path: Move[]; cost: number }
/** Plan using real engine ticks, then replay the selected controls. No coordinate edits on the accepted route. */
export function navigate(engine: GameEngine, state: any, goal: { x: number; y: number; w: number; h: number }) {
  const original = { ...state.player };
  const terrain = state.platforms.map((p: any) => ({ ...p }));
  const isGoal = (p: any) => p.grounded && overlaps(p, goal);
  if (isGoal(original)) return { jumps: 0, left: 0, right: 0 };
  const solids = terrain.filter((p: any) => !p.broken && p.type !== 'acid' && p.type !== 'laser_gate');
  const baseTick = state.tickCount, baseWorld = state.worldTick, baseCheckpoint = state.checkpointId;
  let failed = false;
  const damage = state.damagePlayer, rescue = state.recoverPlayer;
  state.damagePlayer = () => { failed = true; return false; };
  state.recoverPlayer = () => { failed = true; };
  function restore(p: any) {
    state.tickCount = baseTick; state.worldTick = baseWorld; state.checkpointId = baseCheckpoint;
    Object.assign(state.player, p); state.platforms = terrain.map((q: any) => ({ ...q }));
    state.wallKickLock = 0; state.standingPlatform = null; state.platformDeltas.clear(); state.clearInput();
    state.hitstop = 0; state.superCutinTimer = 0; failed = false;
  }
  function run(from: any, move: Move, replay = false) {
    if (!replay) restore(from);
    const samples: { x: number; y: number }[] = [];
    let still = 0, lastX = state.player.x;
    for (let t = 0; t < 120; t++) {
      const p = state.player, dx = move.x - p.x;
      engine.setKey('left', dx < -5); engine.setKey('right', dx > 5);
      if (move.jump >= 0 && (t === 0 || t === move.jump && p.doubleJump && p.onWall === 0)) engine.queueAction('jump');
      engine.setKey('jumpHeld', false);
      if (p.hangingCeiling && Math.abs(dx) < 12) {
        if (goal.y + goal.h < p.y + p.h - 10) engine.queueAction('jump');
        else engine.triggerDropDown();
      }
      state.hitstop = 0; state.update(); samples.push({ x: p.x, y: p.y });
      if (terrain.some((q: any) => (q.type === 'acid' || q.type === 'laser_gate') && overlaps(p, q))) failed = true;
      if (failed || p.hp <= 0 || p.y > state.stage.boundsBottom || state.paused) return null;
      if (Math.abs(p.x - lastX) < 0.1) still++; else still = 0;
      lastX = p.x;
      if (p.grounded && t > (move.jump >= 0 ? move.jump + 5 : 3) && (Math.abs(move.x - p.x) < 7 || still > 8))
        return { p: { ...p }, samples };
    }
    return null;
  }
  const key = (p: any) => `${Math.round(p.x / 24)}:${Math.round(p.y / 12)}`;
  const heuristic = (p: any) => Math.abs(p.x - goal.x) + Math.abs(p.y - goal.y) * 1.3;
  const open: Node[] = [{ p: original, path: [], cost: 0 }], visited = new Map<string, number>();
  const pending = new Map<string, number>([[key(original), 0]]);
  const seenPoints: any[] = [];
  let answer: Move[] | undefined;
  for (let expanded = 0; open.length && expanded < 5000 && visited.size < 300; expanded++) {
    open.sort((a,b) => a.cost + heuristic(a.p) - b.cost - heuristic(b.p));
    const current = open.shift()!;
    if (isGoal(current.p)) { answer = current.path; break; }
    const k = key(current.p); if ((visited.get(k) ?? Infinity) <= current.cost) continue;
    visited.set(k, current.cost); seenPoints.push(current.p);
    const destinations = new Set<number>([current.p.x - 240, current.p.x + 240, goal.x]);
    for (const p of terrain) if (p.type === 'acid' || p.type === 'laser_gate') {
      for (const x of [p.x - current.p.w - 20, p.x + p.w + 20]) if (Math.abs(x - current.p.x) < 540) destinations.add(x);
    }
    for (const p of solids) {
      const rise = current.p.y + current.p.h - p.y;
      if (rise > 340 / state.stage.gravityScale || rise < -500 || p.w < 45) continue;
      const a = p.x + 6, b = p.x + p.w - current.p.w - 6;
      for (const x of [a, b, Math.max(a, Math.min(b, goal.x))])
        if (x >= 10 && x < state.stage.boundsWidth - 40 && Math.abs(x - current.p.x) < 540) destinations.add(x);
    }
    for (const x of destinations) {
      if (Math.abs(x - current.p.x) < 8 || x < 10 || x > state.stage.boundsWidth - 40 || Math.abs(x-current.p.x)>550) continue;
      for (const jump of [-1, 0, 12, 22]) {
        const move = { x, jump }, result = run(current.p, move);
        if (!result) continue;
        const cost = current.cost + result.samples.length * 4 + (jump >= 0 ? 10 : 0);
        if ((visited.get(key(result.p)) ?? Infinity) <= cost || (pending.get(key(result.p)) ?? Infinity) <= cost) continue;
        pending.set(key(result.p), cost);
        open.push({ p: result.p, path: [...current.path, move], cost });
      }
    }
  }
  restore(original);
  if (!answer && process.env.NAV_DEBUG) console.log('nearest',seenPoints.sort((a,b)=>heuristic(a)-heuristic(b)).slice(0,8).map(p=>[p.x,p.y]));
  assert.ok(answer, `no route (visited ${visited.size}, open ${open.length}) in ${state.stage.substageId} from (${original.x},${original.y}) to (${goal.x},${goal.y})`);
  const metrics = { jumps: 0, left: 0, right: 0 };
  for (const move of answer) {
    const x = state.player.x;
    const result = run(state.player, move, true);
    assert.ok(result, `planned controls failed on replay to ${move.x} with jump ${move.jump} from ${x},${state.player.y}`);
    if (move.jump >= 0) metrics.jumps++;
    metrics.left += Math.max(0, x - state.player.x); metrics.right += Math.max(0, state.player.x - x);
  }
  assert.ok(isGoal(state.player), 'route replay must arrive through actual movement');
  state.damagePlayer = damage; state.recoverPlayer = rescue; state.clearInput();
  return metrics;
}
