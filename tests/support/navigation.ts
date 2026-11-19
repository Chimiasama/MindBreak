import assert from 'node:assert/strict';
import { CHARACTERS } from '../../src/game/characters';
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
  function run(from: any, move: Move & { wallKick?: boolean }, replay = false) {
    if (!replay) restore(from);
    const samples: { x: number; y: number }[] = [];
    let still = 0, lastX = state.player.x;
    for (let t = 0; t < 190; t++) {
      const p = state.player;
      let targetX = move.x;
      if (move.wallKick && p.onWall !== 0 && !p.grounded) {
        if (p.onWall !== p.lastWallSide && p.y + p.h > goal.y + 12) engine.queueAction('jump');
      }
      if (state.wallKickLock > 0 || (move.wallKick && p.lastWallSide !== 0 && !p.grounded && p.y + p.h > goal.y + 12 && p.onWall === 0)) {
        targetX = p.lastWallSide === 1 ? p.x - 160 : p.x + 160;
      }
      const dx = targetX - p.x;
      engine.setKey('left', dx < -5); engine.setKey('right', dx > 5);
      if (!move.wallKick && move.jump >= 0 && (t === 0 || (t === move.jump && p.doubleJump && p.onWall === 0))) engine.queueAction('jump');
      if (move.wallKick && (t === 0 || (p.onWall === 0 && p.doubleJump && ((p.lastWallSide === 0 && t === 14) || (p.lastWallSide !== 0 && p.vy > 0 && p.y + p.h > goal.y + 4))))) engine.queueAction('jump');
      engine.setKey('jumpHeld', false);
      if (p.hangingCeiling) {
        const pipe = p.hangingPipe;
        const nearTarget = Math.abs(move.x - p.x) < 18;
        const atRightEdge = pipe && move.x > pipe.x + pipe.w - p.w - 6 && p.x >= pipe.x + pipe.w - p.w - 16;
        const atLeftEdge = pipe && move.x < pipe.x + 6 && p.x <= pipe.x + 14;
        if (nearTarget || atRightEdge || atLeftEdge) {
          if (goal.y + goal.h < p.y + p.h + 10) engine.queueAction('jump');
          else engine.triggerDropDown();
        }
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
  let answer: (Move & { wallKick?: boolean })[] | undefined;
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
    for (const pipe of (state.ceilingPipes ?? [])) {
      const rise = current.p.y + current.p.h - pipe.y;
      if (rise > 320 || rise < -160) continue;
      for (const x of [pipe.x + 12, pipe.x + pipe.w - current.p.w - 12, Math.max(pipe.x + 12, Math.min(pipe.x + pipe.w - current.p.w - 12, goal.x))])
        if (x >= 10 && x < state.stage.boundsWidth - 40 && Math.abs(x - current.p.x) < 640) destinations.add(x);
    }
    for (const p of solids) {
      const rise = current.p.y + current.p.h - p.y;
      if (rise > 380 / state.stage.gravityScale || rise < -500 || p.w < 45) continue;
      const a = p.x + 6, b = p.x + p.w - current.p.w - 6;
      for (const x of [a, b, Math.max(a, Math.min(b, goal.x))])
        if (x >= 10 && x < state.stage.boundsWidth - 40 && Math.abs(x - current.p.x) < 540) destinations.add(x);
    }
    const wallTargets = new Set<number>();
    for (const w of solids) if (w.type === 'wall' && Math.abs(w.x - current.p.x) < 360) {
      if (w.x > current.p.x) wallTargets.add(w.x + 16);
      else wallTargets.add(w.x + w.w - 16);
    }
    for (const x of destinations) if (Math.abs(x - current.p.x) < 320) wallTargets.add(x);
    const heroProfile = CHARACTERS[state.characterId as keyof typeof CHARACTERS];
    const jumpTimings = heroProfile?.canPsyJump ? [-1, 0, 12, 22] : [-1, 0];
    const dedupedDestinations: number[] = [];
    const seenDestBuckets = new Set<number>();
    const addDest = (x: number) => {
      if (Math.abs(x - current.p.x) < 8 || x < 10 || x > state.stage.boundsWidth - 40 || Math.abs(x - current.p.x) > 640) return;
      const bucket = Math.round(x / 12);
      if (seenDestBuckets.has(bucket)) return;
      seenDestBuckets.add(bucket);
      dedupedDestinations.push(x);
    };
    addDest(goal.x);
    for (const x of [...destinations].sort((a, b) => Math.abs(a - goal.x) - Math.abs(b - goal.x))) addDest(x);
    for (const x of dedupedDestinations) {
      for (const jump of jumpTimings) {
        const move = { x, jump }, result = run(current.p, move);
        if (!result) continue;
        if (isGoal(result.p)) { answer = [...current.path, move]; break; }
        const cost = current.cost + result.samples.length * 4 + (jump >= 0 ? 10 : 0);
        if ((visited.get(key(result.p)) ?? Infinity) <= cost || (pending.get(key(result.p)) ?? Infinity) <= cost) continue;
        pending.set(key(result.p), cost);
        open.push({ p: result.p, path: [...current.path, move], cost });
      }
      if (answer) break;
    }
    if (answer) break;
    if (heroProfile?.canWallJump && goal.y + goal.h < current.p.y + current.p.h - 30 && wallTargets.size > 0) {
      for (const x of wallTargets) {
        if (x < 10 || x > state.stage.boundsWidth - 40 || Math.abs(x - current.p.x) < 8) continue;
        const move = { x, jump: 0, wallKick: true }, result = run(current.p, move);
        if (!result) continue;
        if (isGoal(result.p)) { answer = [...current.path, move]; break; }
        const cost = current.cost + result.samples.length * 4 + 8;
        if ((visited.get(key(result.p)) ?? Infinity) <= cost || (pending.get(key(result.p)) ?? Infinity) <= cost) continue;
        pending.set(key(result.p), cost);
        open.push({ p: result.p, path: [...current.path, move], cost });
      }
      if (answer) break;
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
