export interface Body { x: number; y: number; w: number; h: number }

export function overlaps(a: Body, b: Body) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

/** Resolve shallow overlaps; report impossible squeezes instead of looping forever. */
export function depenetrate(body: Body, solids: Body[]) {
  for (let attempt = 0; attempt < 8; attempt++) {
    const solid = solids.find((candidate) => overlaps(body, candidate));
    if (!solid) return true;
    const choices = [
      { axis: 'x' as const, delta: solid.x - body.x - body.w },
      { axis: 'x' as const, delta: solid.x + solid.w - body.x },
      { axis: 'y' as const, delta: solid.y - body.y - body.h },
      { axis: 'y' as const, delta: solid.y + solid.h - body.y },
    ].sort((a, b) => Math.abs(a.delta) - Math.abs(b.delta));
    body[choices[0].axis] += choices[0].delta;
  }
  return !solids.some((solid) => overlaps(body, solid));
}

/** Fraction of a swept AABB's motion at first contact, or null when paths miss. */
export function sweepTime(body: Body, dx: number, dy: number, target: Body): number | null {
  if (overlaps(body, target)) return 0;
  let entry = 0;
  let exit = 1;
  for (const [axis, size, velocity] of [['x', 'w', dx], ['y', 'h', dy]] as const) {
    if (velocity === 0) {
      if (body[axis] + body[size] <= target[axis] || body[axis] >= target[axis] + target[size]) return null;
      continue;
    }
    const a = (target[axis] - body[axis] - body[size]) / velocity;
    const b = (target[axis] + target[size] - body[axis]) / velocity;
    entry = Math.max(entry, Math.min(a, b));
    exit = Math.min(exit, Math.max(a, b));
    if (entry > exit) return null;
  }
  return entry >= 0 && entry <= 1 && exit >= 0 ? entry : null;
}

/** Resolve the nearest solid face crossed along one axis, including thin solids. */
export function moveAgainstSolids(body: Body, delta: number, axis: 'x' | 'y', solids: Body[]) {
  const other = axis === 'x' ? 'y' : 'x';
  const size = axis === 'x' ? 'w' : 'h';
  const otherSize = axis === 'x' ? 'h' : 'w';
  const start = body[axis];
  let end = start + delta;
  let contact: Body | null = null;
  if (delta !== 0) {
    for (const solid of solids) {
      if (body[other] >= solid[other] + solid[otherSize] || body[other] + body[otherSize] <= solid[other]) continue;
      if (delta > 0 && start + body[size] <= solid[axis] + 1e-6 && end + body[size] >= solid[axis]) {
        end = solid[axis] - body[size];
        contact = solid;
      } else if (delta < 0 && start >= solid[axis] + solid[size] - 1e-6 && end <= solid[axis] + solid[size]) {
        end = solid[axis] + solid[size];
        contact = solid;
      }
    }
  }
  body[axis] = end;
  return contact;
}
