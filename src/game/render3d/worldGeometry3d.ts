import * as THREE from 'three';
import type {
  CeilingPipe,
  DestructibleProp,
  PickupItem,
  Platform,
  StagePalette,
} from '../types';
import {
  WORLD_UNIT,
  addCelOutline,
  getProceduralTexture,
  makeToonMaterial,
  worldX,
  worldY,
} from './materials';

export interface PlatformVisual3D {
  group: THREE.Group;
  source: Platform;
  conveyorTex?: THREE.CanvasTexture | null;
  laserBeamMesh?: THREE.Mesh;
  acidMesh?: THREE.Mesh;
}

export interface PropVisual3D {
  group: THREE.Group;
  source: DestructibleProp;
  starMesh?: THREE.Mesh;
  wasBroken: boolean;
}

export interface DebrisShard3D {
  mesh: THREE.Mesh;
  vx: number;
  vy: number;
  vz: number;
  rx: number;
  ry: number;
  rz: number;
  life: number;
}

export function buildPlatform3D(
  plat: Platform,
  pal: StagePalette,
  stageId: number,
  maxAnisotropy: number
): PlatformVisual3D {
  const group = new THREE.Group();
  const wU = plat.w * WORLD_UNIT;
  const hU = plat.h * WORLD_UNIT;
  const cx = (plat.x + plat.w / 2) * WORLD_UNIT;
  const cy = -(plat.y + plat.h / 2) * WORLD_UNIT;
  group.position.set(cx, cy, 0);

  if (plat.gateId) {
    const tex = getProceduralTexture(
      'bricks',
      plat.breakNode ? '#64748b' : '#b45309',
      '#fbbf24',
      maxAnisotropy
    );
    const clonedTex = tex ? tex.clone() : null;
    if (clonedTex) {
      clonedTex.repeat.set(Math.max(1, wU / 1.5), Math.max(1, hU / 1.5));
      clonedTex.needsUpdate = true;
    }
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(wU, hU, 2.7),
      makeToonMaterial('#ffffff', { map: clonedTex })
    );
    body.castShadow = true;
    body.receiveShadow = true;
    addCelOutline(body, 1.02);
    group.add(body);

    const barMat = makeToonMaterial('#fbbf24', { emissive: '#f59e0b', emissiveIntensity: 0.45 });
    const count = Math.max(2, Math.floor(hU / 0.6));
    for (let i = 0; i < count; i++) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(wU + 0.08, 0.14, 2.82), barMat);
      bar.position.y = -hU / 2 + ((i + 0.5) / count) * hU;
      group.add(bar);
    }
    return { group, source: plat };
  }

  if (plat.type === 'acid') {
    const isCryo = stageId === 7;
    const baseHex = isCryo ? '#0c4a6e' : '#16a34a';
    const topHex = isCryo ? '#38bdf8' : '#86efac';
    const vatMat = makeToonMaterial(baseHex, {
      emissive: baseHex,
      emissiveIntensity: 0.55,
      transparent: true,
      opacity: 0.88,
    });
    const body = new THREE.Mesh(new THREE.BoxGeometry(wU, hU, 3.0), vatMat);
    group.add(body);

    const crestMat = makeToonMaterial(topHex, {
      emissive: topHex,
      emissiveIntensity: 0.95,
    });
    const crest = new THREE.Mesh(new THREE.BoxGeometry(wU, 0.16, 3.06), crestMat);
    crest.position.y = hU / 2 - 0.08;
    group.add(crest);
    return { group, source: plat, acidMesh: crest };
  }

  if (plat.type === 'laser_gate') {
    const postMat = new THREE.MeshStandardMaterial({ color: '#334155', roughness: 0.35, metalness: 0.75 });
    for (const yOff of [hU / 2 - 0.12, -hU / 2 + 0.12]) {
      const cap = new THREE.Mesh(new THREE.BoxGeometry(wU + 0.18, 0.24, 2.6), postMat);
      cap.position.y = yOff;
      group.add(cap);
    }
    const beamMat = new THREE.MeshBasicMaterial({
      color: '#ff0055',
      transparent: true,
      opacity: 0.9,
    });
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, Math.max(0.2, hU - 0.24), 8), beamMat);
    group.add(beam);
    return { group, source: plat, laserBeamMesh: beam };
  }

  if (plat.type === 'conveyor') {
    const tex = getProceduralTexture('conveyor', '#334155', '#facc15', maxAnisotropy);
    const beltTex = tex ? tex.clone() : null;
    if (beltTex) {
      beltTex.repeat.set(Math.max(1, wU / 1.6), 1);
      beltTex.needsUpdate = true;
    }
    const deck = new THREE.Mesh(
      new THREE.BoxGeometry(wU, hU, 2.6),
      new THREE.MeshStandardMaterial({
        color: '#ffffff',
        map: beltTex,
        roughness: 0.45,
        metalness: 0.55,
      })
    );
    deck.castShadow = true;
    deck.receiveShadow = true;
    group.add(deck);

    const railMat = makeToonMaterial('#fb923c', { emissive: '#ea580c', emissiveIntensity: 0.35 });
    const rail = new THREE.Mesh(new THREE.BoxGeometry(wU + 0.06, 0.12, 2.68), railMat);
    rail.position.y = -hU / 2 + 0.06;
    group.add(rail);

    const rollerMat = new THREE.MeshStandardMaterial({ color: '#94a3b8', roughness: 0.25, metalness: 0.8 });
    for (const xSide of [-wU / 2 + 0.12, wU / 2 - 0.12]) {
      const roller = new THREE.Mesh(new THREE.CylinderGeometry(hU * 0.48, hU * 0.48, 2.7, 10), rollerMat);
      roller.rotation.x = Math.PI / 2;
      roller.position.x = xSide;
      group.add(roller);
    }
    return { group, source: plat, conveyorTex: beltTex };
  }

  // Brick walls & narrow solid columns (so walls look clearly 3D & wall-kickable!)
  if (plat.type === 'wall' || (plat.type === 'solid' && plat.h > 48 && plat.w < 260)) {
    const tex = getProceduralTexture('bricks', pal.platformFill, pal.platformStroke, maxAnisotropy);
    const brickTex = tex ? tex.clone() : null;
    if (brickTex) {
      brickTex.repeat.set(Math.max(1, wU / 1.4), Math.max(1, hU / 1.4));
      brickTex.needsUpdate = true;
    }
    const wallMesh = new THREE.Mesh(
      new THREE.BoxGeometry(wU, hU, 2.85),
      makeToonMaterial('#ffffff', { map: brickTex })
    );
    wallMesh.castShadow = true;
    wallMesh.receiveShadow = true;
    addCelOutline(wallMesh, 1.015);
    group.add(wallMesh);

    const cornice = new THREE.Mesh(
      new THREE.BoxGeometry(wU + 0.1, 0.16, 2.95),
      makeToonMaterial(pal.platformStroke)
    );
    cornice.position.y = hU / 2 - 0.08;
    group.add(cornice);
    return { group, source: plat };
  }

  // Broad asphalt roadbeds & urban slabs
  if (plat.type === 'solid' && plat.h >= 60 && plat.w >= 260) {
    const tex = getProceduralTexture('asphalt', pal.platformFill, pal.accentNeon, maxAnisotropy);
    const roadTex = tex ? tex.clone() : null;
    if (roadTex) {
      roadTex.repeat.set(Math.max(1, wU / 2.8), Math.max(1, hU / 2.2));
      roadTex.needsUpdate = true;
    }
    const slab = new THREE.Mesh(
      new THREE.BoxGeometry(wU, hU, 3.6),
      makeToonMaterial('#ffffff', { map: roadTex })
    );
    slab.receiveShadow = true;
    group.add(slab);

    // Concrete curb along top edge for crisp 2.5D depth silhouette
    const curb = new THREE.Mesh(
      new THREE.BoxGeometry(wU, 0.24, 3.68),
      makeToonMaterial('#334155')
    );
    curb.position.y = hU / 2 - 0.12;
    curb.receiveShadow = true;
    group.add(curb);

    const trim = new THREE.Mesh(
      new THREE.BoxGeometry(wU, 0.07, 3.72),
      makeToonMaterial(pal.platformStroke, { emissive: pal.accentNeon, emissiveIntensity: 0.28 })
    );
    trim.position.y = hU / 2 - 0.035;
    group.add(trim);
    return { group, source: plat };
  }

  // Elevated metal girders, moving platforms & crumbling construction trusses
  const isCrumble = plat.type === 'crumble';
  const baseHex = isCrumble ? '#78350f' : pal.platformFill;
  const strokeHex = isCrumble ? '#facc15' : pal.platformStroke;
  const tex = getProceduralTexture('metal', baseHex, strokeHex, maxAnisotropy);
  const beamTex = tex ? tex.clone() : null;
  if (beamTex) {
    beamTex.repeat.set(Math.max(1, wU / 1.5), 1);
    beamTex.needsUpdate = true;
  }

  const girder = new THREE.Mesh(
    new THREE.BoxGeometry(wU, hU, 2.35),
    new THREE.MeshStandardMaterial({
      color: '#ffffff',
      map: beamTex,
      roughness: 0.35,
      metalness: 0.65,
    })
  );
  girder.castShadow = true;
  girder.receiveShadow = true;
  group.add(girder);

  const topFlange = new THREE.Mesh(
    new THREE.BoxGeometry(wU + 0.08, Math.min(0.16, hU * 0.35), 2.5),
    makeToonMaterial(strokeHex, {
      emissive: isCrumble ? '#f59e0b' : pal.accentNeon,
      emissiveIntensity: isCrumble ? 0.4 : 0.22,
    })
  );
  topFlange.position.y = hU / 2 - Math.min(0.08, hU * 0.175);
  group.add(topFlange);

  return { group, source: plat };
}

export function buildCeilingPipe3D(cp: CeilingPipe, pipeColor: string, maxAnisotropy: number): THREE.Group {
  const group = new THREE.Group();
  const wU = cp.w * WORLD_UNIT;
  const r = Math.max(0.18, (cp.h * WORLD_UNIT) / 2);
  group.position.set((cp.x + cp.w / 2) * WORLD_UNIT, -(cp.y + cp.h / 2) * WORLD_UNIT, 0);

  const tex = getProceduralTexture('pipe', '#334155', pipeColor, maxAnisotropy);
  const pipeTex = tex ? tex.clone() : null;
  if (pipeTex) {
    pipeTex.repeat.set(Math.max(1, wU / 1.5), 1);
    pipeTex.needsUpdate = true;
  }

  const mat = new THREE.MeshStandardMaterial({
    color: '#ffffff',
    map: pipeTex,
    roughness: 0.3,
    metalness: 0.78,
  });
  const cylinder = new THREE.Mesh(new THREE.CylinderGeometry(r, r, wU, 10), mat);
  cylinder.rotation.z = Math.PI / 2;
  cylinder.castShadow = true;
  group.add(cylinder);

  const collarMat = makeToonMaterial(pipeColor);
  const collarSpacing = 2.0;
  const count = Math.max(1, Math.floor(wU / collarSpacing));
  for (let i = 0; i <= count; i++) {
    const xPos = -wU / 2 + (i + 0.5) * (wU / (count + 1));
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.24, r * 1.24, 0.18, 10), collarMat);
    collar.rotation.z = Math.PI / 2;
    collar.position.x = xPos;
    group.add(collar);
  }
  return group;
}

export function buildProp3D(pr: DestructibleProp, maxAnisotropy: number): PropVisual3D {
  const group = new THREE.Group();
  const wU = pr.w * WORLD_UNIT;
  const hU = pr.h * WORLD_UNIT;
  // Grounded bottom-center pivot!
  group.position.set((pr.x + pr.w / 2) * WORLD_UNIT, -(pr.y + pr.h) * WORLD_UNIT, 0);

  if (pr.kind === 'chest') {
    const baseMat = makeToonMaterial('#d97706');
    const goldMat = makeToonMaterial('#fde047', { emissive: '#eab308', emissiveIntensity: 0.5 });
    const base = new THREE.Mesh(new THREE.BoxGeometry(wU, hU * 0.65, wU * 0.85), baseMat);
    base.position.y = hU * 0.325;
    base.castShadow = true;
    addCelOutline(base, 1.04);
    group.add(base);

    const lid = new THREE.Mesh(new THREE.CylinderGeometry(wU * 0.42, wU * 0.42, wU, 8, 1, false, 0, Math.PI), baseMat);
    lid.rotation.z = Math.PI / 2;
    lid.rotation.y = Math.PI / 2;
    lid.position.y = hU * 0.65;
    addCelOutline(lid, 1.04);
    group.add(lid);

    const band = new THREE.Mesh(new THREE.BoxGeometry(wU + 0.06, 0.14, wU * 0.9), goldMat);
    band.position.y = hU * 0.64;
    group.add(band);

    const starMesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.18, 0), goldMat);
    starMesh.position.y = hU + 0.35;
    group.add(starMesh);
    return { group, source: pr, starMesh, wasBroken: !!pr.broken };
  }

  if (pr.kind === 'car') {
    const bodyMat = makeToonMaterial('#dc2626');
    const cabinMat = makeToonMaterial('#0f172a', { emissive: '#38bdf8', emissiveIntensity: 0.25 });
    const wheelMat = makeToonMaterial('#111827');
    const rimMat = makeToonMaterial('#94a3b8');

    const chassis = new THREE.Mesh(new THREE.BoxGeometry(wU, hU * 0.52, wU * 0.52), bodyMat);
    chassis.position.y = hU * 0.36;
    chassis.castShadow = true;
    addCelOutline(chassis, 1.03);
    group.add(chassis);

    const cabin = new THREE.Mesh(new THREE.BoxGeometry(wU * 0.54, hU * 0.38, wU * 0.46), cabinMat);
    cabin.position.set(-wU * 0.04, hU * 0.76, 0);
    addCelOutline(cabin, 1.04);
    group.add(cabin);

    for (const wx of [-wU * 0.3, wU * 0.3]) {
      for (const wz of [-wU * 0.26, wU * 0.26]) {
        const tire = new THREE.Mesh(new THREE.CylinderGeometry(hU * 0.22, hU * 0.22, 0.14, 10), wheelMat);
        tire.rotation.x = Math.PI / 2;
        tire.position.set(wx, hU * 0.22, wz);
        group.add(tire);
        const hub = new THREE.Mesh(new THREE.CylinderGeometry(hU * 0.1, hU * 0.1, 0.16, 8), rimMat);
        hub.rotation.x = Math.PI / 2;
        hub.position.set(wx, hU * 0.22, wz);
        group.add(hub);
      }
    }

    const headLight = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.14, wU * 0.44),
      makeToonMaterial('#fef08a', { emissive: '#facc15', emissiveIntensity: 1.1 })
    );
    headLight.position.set(wU * 0.5, hU * 0.4, 0);
    group.add(headLight);
    return { group, source: pr, wasBroken: !!pr.broken };
  }

  if (pr.kind === 'vending') {
    const cabinet = new THREE.Mesh(
      new THREE.BoxGeometry(wU, hU, wU * 0.9),
      makeToonMaterial('#0284c7')
    );
    cabinet.position.y = hU / 2;
    cabinet.castShadow = true;
    addCelOutline(cabinet, 1.04);
    group.add(cabinet);

    const screen = new THREE.Mesh(
      new THREE.BoxGeometry(wU * 0.72, hU * 0.55, wU * 0.94),
      makeToonMaterial('#a5f3fc', { emissive: '#22d3ee', emissiveIntensity: 0.9 })
    );
    screen.position.y = hU * 0.6;
    group.add(screen);

    const slot = new THREE.Mesh(new THREE.BoxGeometry(wU * 0.7, hU * 0.14, wU * 0.95), makeToonMaterial('#0f172a'));
    slot.position.y = hU * 0.18;
    group.add(slot);
    return { group, source: pr, wasBroken: !!pr.broken };
  }

  if (pr.kind === 'pillar') {
    const stoneMat = makeToonMaterial('#cbd5e1');
    const capMat = makeToonMaterial('#94a3b8');
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(wU * 0.38, wU * 0.42, hU * 0.84, 10), stoneMat);
    shaft.position.y = hU * 0.5;
    shaft.castShadow = true;
    addCelOutline(shaft, 1.04);
    group.add(shaft);
    for (const yOff of [hU * 0.06, hU * 0.94]) {
      const cap = new THREE.Mesh(new THREE.BoxGeometry(wU, hU * 0.12, wU), capMat);
      cap.position.y = yOff;
      group.add(cap);
    }
    return { group, source: pr, wasBroken: !!pr.broken };
  }

  if (pr.kind === 'terminal') {
    const desk = new THREE.Mesh(new THREE.BoxGeometry(wU, hU * 0.62, wU * 0.8), makeToonMaterial('#1e293b'));
    desk.position.y = hU * 0.31;
    desk.castShadow = true;
    addCelOutline(desk, 1.04);
    group.add(desk);
    const mon = new THREE.Mesh(
      new THREE.BoxGeometry(wU * 0.8, hU * 0.42, 0.14),
      makeToonMaterial('#22d3ee', { emissive: '#06b6d4', emissiveIntensity: 1.0 })
    );
    mon.position.set(0, hU * 0.8, -0.08);
    mon.rotation.x = -0.25;
    group.add(mon);
    return { group, source: pr, wasBroken: !!pr.broken };
  }

  // Default: destructible cargo crate (box + bevel brackets)
  const crateTex = getProceduralTexture('crate', '#b45309', '#78350f', maxAnisotropy);
  const crate = new THREE.Mesh(
    new THREE.BoxGeometry(wU, hU, Math.max(wU, 1.05)),
    makeToonMaterial('#ffffff', { map: crateTex })
  );
  crate.position.y = hU / 2;
  crate.castShadow = true;
  crate.receiveShadow = true;
  addCelOutline(crate, 1.04);
  group.add(crate);

  const strap = new THREE.Mesh(
    new THREE.BoxGeometry(wU + 0.06, 0.12, Math.max(wU, 1.05) + 0.06),
    makeToonMaterial('#f59e0b', { emissive: '#b45309', emissiveIntensity: 0.2 })
  );
  strap.position.y = hU * 0.5;
  group.add(strap);

  return { group, source: pr, wasBroken: !!pr.broken };
}

export function buildPickupMesh3D(kind: PickupItem['kind']): THREE.Group {
  const colorMap: Record<PickupItem['kind'], string> = {
    heal: '#22c55e',
    full_heal: '#16a34a',
    psy: '#a855f7',
    wav: '#06b6d4',
    atk: '#ef4444',
    jmp: '#eab308',
    gst: '#c084fc',
  };
  const group = new THREE.Group();
  const c = colorMap[kind];
  const mat = makeToonMaterial(c, { emissive: c, emissiveIntensity: 0.85 });
  const core = new THREE.Mesh(
    kind === 'full_heal' || kind === 'atk'
      ? new THREE.OctahedronGeometry(0.32, 0)
      : new THREE.CylinderGeometry(0.24, 0.24, 0.36, 8),
    mat
  );
  addCelOutline(core, 1.1);
  group.add(core);

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.38, 0.035, 6, 14),
    makeToonMaterial('#ffffff', { emissive: c, emissiveIntensity: 0.6 })
  );
  ring.rotation.x = Math.PI / 2;
  group.add(ring);
  return group;
}

export function propColorForDebris(kind: DestructibleProp['kind']): string {
  if (kind === 'car') return '#dc2626';
  if (kind === 'vending') return '#0284c7';
  if (kind === 'pillar') return '#cbd5e1';
  if (kind === 'chest') return '#f59e0b';
  if (kind === 'terminal') return '#334155';
  return '#b45309';
}

export function positionRectInWorld(
  group: THREE.Object3D,
  x: number,
  y: number,
  w: number,
  h: number
): void {
  group.position.set(worldX(x + w / 2), worldY(y + h / 2), 0);
}
