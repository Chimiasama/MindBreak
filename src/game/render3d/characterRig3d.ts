import * as THREE from 'three';
import type { BossRuntime, CharacterId, Enemy, EnemyType } from '../types';
import { HERO_CLIPS, type HeroPose } from '../heroAnimation';
import { addCelOutline, makeToonMaterial } from './materials';
import {
  ENEMY_SPRITE_KEYFRAMES,
  SPRITE_KEYFRAMES,
  type SkeletonKeyPose,
  blendPoseTargets,
  createNeutralKeyPose,
  interpolateKeyframes,
  sampleSpriteClipAt,
} from './spriteInterpolation';
import {
  type FaceState,
  type FacialExpression,
  type IdleChoreographyResult,
  createNeutralFaceState,
  evaluateHeroIdleChoreography,
  resolveHeroFaceState,
} from './idleChoreography';

export interface FaceRig3D {
  faceRoot: THREE.Group;
  eyeGroupL: THREE.Group;
  eyeGroupR: THREE.Group;
  irisL: THREE.Mesh;
  irisR: THREE.Mesh;
  eyelidL: THREE.Mesh;
  eyelidR: THREE.Mesh;
  lashL: THREE.Mesh;
  lashR: THREE.Mesh;
  browL: THREE.Mesh;
  browR: THREE.Mesh;
  mouthGroup: THREE.Group;
  mouthMesh: THREE.Mesh;
  mouthInner: THREE.Mesh;
  baseEyeY: number;
  baseBrowY: number;
  baseMouthY: number;
}

export interface HumanoidRigParts {
  root: THREE.Group;
  bodyPivot: THREE.Group;
  hips: THREE.Group;
  torso: THREE.Group;
  head: THREE.Group;
  shoulderL: THREE.Group;
  elbowL: THREE.Group;
  shoulderR: THREE.Group;
  elbowR: THREE.Group;
  hipL: THREE.Group;
  kneeL: THREE.Group;
  hipR: THREE.Group;
  kneeR: THREE.Group;
  faceRig?: FaceRig3D;
  weaponGroup?: THREE.Group;
  haloGroup?: THREE.Group;
  shieldMesh?: THREE.Mesh;
  jetFlames?: THREE.Mesh[];
  rotorMesh?: THREE.Mesh;
  turretHead?: THREE.Group;
  turretBarrels?: THREE.Group;
  scarfMeshes?: THREE.Mesh[];
  coatFlaps?: THREE.Mesh[];
  auraMesh?: THREE.Mesh;
  flameAuraMesh?: THREE.Group;
  materials: THREE.Material[];
  baseColors: Map<THREE.Material, THREE.Color>;
  baseEmissive: Map<THREE.Material, THREE.Color>;
  heightUnits: number;
  runPhase: number;
  turnAngle: number;
  lastSlashKey: number;
  activePose?: HeroPose;
  poseBlend?: number;
  prevPoseSnapshot?: SkeletonKeyPose;
  currentPoseState?: SkeletonKeyPose;
  targetPoseBuffer?: SkeletonKeyPose;
  blendedPoseBuffer?: SkeletonKeyPose;
  faceTargetBuffer?: FaceState;
  faceCurrentState?: FaceState;
  currentExpression?: FacialExpression;
  currentIdleSegment?: string;
  wasGrounded?: boolean;
  landingSquash?: number;
  stealthOpacity?: number;
  meditationFactor?: number;
}

export interface HeroRigInput {
  characterId: CharacterId;
  pose: HeroPose;
  frame?: number;
  nextFrame?: number;
  frameAlpha?: number;
  elapsedTicks?: number;
  idleTicks?: number;
  vx: number;
  vy: number;
  facing: 1 | -1;
  onWall: -1 | 0 | 1;
  grounded: boolean;
  isDashing: boolean;
  isSliding: boolean;
  isFlying: boolean;
  slashing: boolean;
  slashTimer: number;
  comboStep: number;
  invulnTimer: number;
  gstTimer: number;
  atkTimer: number;
  flameTimer: number;
  stunTimer: number;
  hp: number;
  tickCount: number;
}

const _stealthShadowColor = new THREE.Color('#090d1a');
const _tmpColor = new THREE.Color();

function cyl(
  rTop: number,
  rBot: number,
  h: number,
  radialSegs: number,
  mat: THREE.Material,
  outline = true,
  outlineThickness = 1.07
): THREE.Mesh {
  const geo = new THREE.CylinderGeometry(rTop, rBot, h, radialSegs, 1);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  if (outline) addCelOutline(mesh, outlineThickness);
  return mesh;
}

function recordMaterials(rig: HumanoidRigParts, root: THREE.Object3D): void {
  const seen = new Set<THREE.Material>();
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh || mesh.userData.isOutline || mesh.userData.isAura || !mesh.material) return;
    const list = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const m of list) {
      if (seen.has(m) || m.userData?.isAuraMaterial) continue;
      seen.add(m);
      rig.materials.push(m);
      const anyMat = m as THREE.MeshToonMaterial;
      if (anyMat.color) rig.baseColors.set(m, anyMat.color.clone());
      if (anyMat.emissive) rig.baseEmissive.set(m, anyMat.emissive.clone());
    }
  });
}

function buildFaceRig3D(opts: {
  w: number;
  s: number;
  skinMat: THREE.Material;
  hairMat: THREE.Material;
  irisColor: string;
}): FaceRig3D {
  const { w, s, skinMat, hairMat, irisColor } = opts;
  const faceRoot = new THREE.Group();
  faceRoot.position.set(0, 0, 0);

  const scleraMat = new THREE.MeshBasicMaterial({ color: '#f8fafc' });
  const irisMat = makeToonMaterial(irisColor, {
    emissive: irisColor,
    emissiveIntensity: 0.45,
  });
  const pupilMat = new THREE.MeshBasicMaterial({ color: '#090d16' });
  const lashMat = new THREE.MeshBasicMaterial({ color: '#0f172a' });
  const browMat = hairMat;
  const mouthMat = new THREE.MeshBasicMaterial({ color: '#4c1d24' });
  const mouthInnerMat = new THREE.MeshBasicMaterial({ color: '#1e0b12' });

  const eyeZ = 0.136 * w;
  const baseEyeY = 0.195 * s;
  const baseBrowY = 0.242 * s;
  const baseMouthY = 0.118 * s;

  const makeEye = (side: -1 | 1) => {
    const eyeGroup = new THREE.Group();
    eyeGroup.position.set(side * 0.056 * w, baseEyeY, eyeZ);

    const sclera = new THREE.Mesh(new THREE.BoxGeometry(0.044 * w, 0.036 * s, 0.016 * w), scleraMat);
    eyeGroup.add(sclera);

    const iris = new THREE.Mesh(new THREE.BoxGeometry(0.024 * w, 0.03 * s, 0.018 * w), irisMat);
    iris.position.set(0, 0, 0.004 * w);
    eyeGroup.add(iris);

    const pupil = new THREE.Mesh(new THREE.BoxGeometry(0.012 * w, 0.014 * s, 0.019 * w), pupilMat);
    pupil.position.set(0, 0, 0.003 * w);
    iris.add(pupil);

    const eyelid = new THREE.Mesh(new THREE.BoxGeometry(0.05 * w, 0.042 * s, 0.024 * w), skinMat);
    eyelid.position.set(0, 0.021 * s, 0.007 * w);
    eyelid.scale.y = 0.05;
    eyeGroup.add(eyelid);

    const lash = new THREE.Mesh(new THREE.BoxGeometry(0.052 * w, 0.009 * s, 0.025 * w), lashMat);
    lash.position.set(0, 0.02 * s, 0.009 * w);
    eyeGroup.add(lash);

    faceRoot.add(eyeGroup);
    return { eyeGroup, iris, eyelid, lash };
  };

  // Remember: in local character +Z forward space, +X is character's left, -X is character's right
  const leftEye = makeEye(1);
  const rightEye = makeEye(-1);

  const browGeo = new THREE.BoxGeometry(0.054 * w, 0.014 * s, 0.022 * w);
  const browL = new THREE.Mesh(browGeo, browMat);
  browL.position.set(0.056 * w, baseBrowY, eyeZ + 0.014 * w);
  faceRoot.add(browL);

  const browR = new THREE.Mesh(browGeo, browMat);
  browR.position.set(-0.056 * w, baseBrowY, eyeZ + 0.014 * w);
  faceRoot.add(browR);

  const mouthGroup = new THREE.Group();
  mouthGroup.position.set(0, baseMouthY, eyeZ + 0.005 * w);
  const mouthMesh = new THREE.Mesh(new THREE.BoxGeometry(0.052 * w, 0.011 * s, 0.014 * w), mouthMat);
  mouthGroup.add(mouthMesh);
  const mouthInner = new THREE.Mesh(new THREE.BoxGeometry(0.042 * w, 0.022 * s, 0.012 * w), mouthInnerMat);
  mouthInner.visible = false;
  mouthGroup.add(mouthInner);
  faceRoot.add(mouthGroup);

  return {
    faceRoot,
    eyeGroupL: leftEye.eyeGroup,
    eyeGroupR: rightEye.eyeGroup,
    irisL: leftEye.iris,
    irisR: rightEye.iris,
    eyelidL: leftEye.eyelid,
    eyelidR: rightEye.eyelid,
    lashL: leftEye.lash,
    lashR: rightEye.lash,
    browL,
    browR,
    mouthGroup,
    mouthMesh,
    mouthInner,
    baseEyeY,
    baseBrowY,
    baseMouthY,
  };
}

/**
 * Applies a facial expression state cleanly if the rig includes a FaceRig3D.
 * Safe no-op when future external models omit facial bone/mesh targets.
 */
export function applyFaceStateToRig(rig: HumanoidRigParts, face: FaceState, dt: number): void {
  const fr = rig.faceRig;
  if (!fr) return;

  if (!rig.faceCurrentState) {
    rig.faceCurrentState = createNeutralFaceState(face.expression);
  }
  const curr = rig.faceCurrentState;
  const lambda = face.expression === 'shout' || face.expression === 'hurt' ? 32 : 20;

  curr.expression = face.expression;
  curr.eyeOpenL = THREE.MathUtils.damp(curr.eyeOpenL, face.eyeOpenL, lambda, dt);
  curr.eyeOpenR = THREE.MathUtils.damp(curr.eyeOpenR, face.eyeOpenR, lambda, dt);
  curr.eyeLookX = THREE.MathUtils.damp(curr.eyeLookX, face.eyeLookX, 24, dt);
  curr.eyeLookY = THREE.MathUtils.damp(curr.eyeLookY, face.eyeLookY, 24, dt);
  curr.browTiltL = THREE.MathUtils.damp(curr.browTiltL, face.browTiltL, lambda, dt);
  curr.browTiltR = THREE.MathUtils.damp(curr.browTiltR, face.browTiltR, lambda, dt);
  curr.browHeightL = THREE.MathUtils.damp(curr.browHeightL, face.browHeightL, lambda, dt);
  curr.browHeightR = THREE.MathUtils.damp(curr.browHeightR, face.browHeightR, lambda, dt);
  curr.mouthOpen = THREE.MathUtils.damp(curr.mouthOpen, face.mouthOpen, lambda, dt);
  curr.mouthWidth = THREE.MathUtils.damp(curr.mouthWidth, face.mouthWidth, lambda, dt);
  curr.mouthCurve = THREE.MathUtils.damp(curr.mouthCurve, face.mouthCurve, lambda, dt);

  rig.currentExpression = face.expression;

  const s = rig.heightUnits / 1.75;
  const applyEye = (
    iris: THREE.Mesh,
    eyelid: THREE.Mesh,
    lash: THREE.Mesh,
    openRaw: number
  ) => {
    const open = Math.min(1.15, Math.max(0.0, openRaw));
    const closedFrac = Math.min(1, Math.max(0.04, 1 - open * 0.92));
    eyelid.scale.y = closedFrac;
    const eyeH = 0.042 * s;
    eyelid.position.y = (0.021 * s) - (closedFrac * eyeH) * 0.5;
    lash.position.y = (0.02 * s) - (closedFrac * eyeH) * 0.92;
    lash.scale.y = open < 0.25 ? 1.45 : 0.95;

    iris.position.x = curr.eyeLookX * 0.01 * s;
    iris.position.y = curr.eyeLookY * 0.008 * s;
    iris.visible = open > 0.14;
  };

  applyEye(fr.irisL, fr.eyelidL, fr.lashL, curr.eyeOpenL);
  applyEye(fr.irisR, fr.eyelidR, fr.lashR, curr.eyeOpenR);

  fr.browL.position.y = fr.baseBrowY + curr.browHeightL * s;
  fr.browR.position.y = fr.baseBrowY + curr.browHeightR * s;
  fr.browL.rotation.z = curr.browTiltL;
  fr.browR.rotation.z = curr.browTiltR;

  fr.mouthGroup.position.y = fr.baseMouthY - curr.mouthOpen * 0.008 * s + curr.mouthCurve * 0.005 * s;
  fr.mouthMesh.scale.x = curr.mouthWidth;
  fr.mouthMesh.scale.y = 0.75 + curr.mouthOpen * 1.9;
  fr.mouthMesh.rotation.z = curr.mouthCurve * 0.16;

  fr.mouthInner.visible = curr.mouthOpen > 0.22;
  if (fr.mouthInner.visible) {
    fr.mouthInner.scale.x = curr.mouthWidth * 0.95;
    fr.mouthInner.scale.y = 0.4 + curr.mouthOpen * 1.45;
  }
}

function createBaseHumanoidRig(opts: {
  heightScale: number;
  widthScale: number;
  chestColor: string;
  trimColor: string;
  pantsColor: string;
  skinColor: string;
  hairColor: string;
  visorColor: string;
  bootColor: string;
  gloveColor: string;
  visorEmissive?: number;
  showFullFace?: boolean;
  irisColor?: string;
}): HumanoidRigParts {
  const s = opts.heightScale;
  const w = opts.widthScale;

  const root = new THREE.Group();
  const bodyPivot = new THREE.Group();
  root.add(bodyPivot);

  const chestMat = makeToonMaterial(opts.chestColor);
  const trimMat = makeToonMaterial(opts.trimColor, {
    emissive: opts.trimColor,
    emissiveIntensity: 0.16,
  });
  const pantsMat = makeToonMaterial(opts.pantsColor);
  const skinMat = makeToonMaterial(opts.skinColor);
  const hairMat = makeToonMaterial(opts.hairColor);
  const bootMat = makeToonMaterial(opts.bootColor);
  const gloveMat = makeToonMaterial(opts.gloveColor);
  const darkDetailMat = makeToonMaterial('#0f172a');
  const visorMat = makeToonMaterial(opts.visorColor, {
    emissive: opts.visorColor,
    emissiveIntensity: opts.visorEmissive ?? 0.85,
  });

  // Hips / Pelvis centered at leg height (0.78 * s)
  const hips = new THREE.Group();
  hips.position.set(0, 0.78 * s, 0);
  bodyPivot.add(hips);

  const pelvis = cyl(0.18 * w, 0.16 * w, 0.16 * s, 8, pantsMat);
  hips.add(pelvis);

  const belt = cyl(0.198 * w, 0.198 * w, 0.068 * s, 8, darkDetailMat);
  belt.position.set(0, 0.06 * s, 0);
  hips.add(belt);

  const beltBuckle = new THREE.Mesh(
    new THREE.BoxGeometry(0.11 * w, 0.065 * s, 0.055 * w),
    trimMat
  );
  beltBuckle.position.set(0, 0.06 * s, 0.185 * w);
  hips.add(beltBuckle);

  // Torso
  const torso = new THREE.Group();
  torso.position.set(0, 0.08 * s, 0);
  hips.add(torso);

  const waist = cyl(0.185 * w, 0.165 * w, 0.14 * s, 8, chestMat);
  waist.position.set(0, 0.07 * s, 0);
  torso.add(waist);

  const chest = cyl(0.245 * w, 0.185 * w, 0.34 * s, 8, chestMat);
  chest.position.set(0, 0.27 * s, 0);
  torso.add(chest);

  const collar = cyl(0.168 * w, 0.215 * w, 0.082 * s, 8, trimMat);
  collar.position.set(0, 0.435 * s, 0);
  torso.add(collar);

  // Head
  const head = new THREE.Group();
  head.position.set(0, 0.48 * s, 0);
  torso.add(head);

  const neck = cyl(0.075 * w, 0.085 * w, 0.1 * s, 7, skinMat);
  neck.position.set(0, 0.04 * s, 0);
  head.add(neck);

  const cranium = cyl(0.158 * w, 0.14 * w, 0.255 * s, 10, skinMat);
  cranium.position.set(0, 0.195 * s, 0);
  head.add(cranium);

  const jaw = cyl(0.136 * w, 0.095 * w, 0.065 * s, 8, skinMat, false);
  jaw.position.set(0, 0.075 * s, 0.015 * w);
  head.add(jaw);

  const hairCap = cyl(0.17 * w, 0.172 * w, 0.115 * s, 9, hairMat);
  hairCap.position.set(0, 0.29 * s, -0.015 * w);
  head.add(hairCap);

  const backHair = cyl(0.162 * w, 0.13 * w, 0.16 * s, 8, hairMat);
  backHair.position.set(0, 0.2 * s, -0.055 * w);
  head.add(backHair);

  let faceRig: FaceRig3D | undefined;
  if (opts.showFullFace) {
    faceRig = buildFaceRig3D({
      w,
      s,
      skinMat,
      hairMat,
      irisColor: opts.irisColor ?? opts.visorColor,
    });
    head.add(faceRig.faceRoot);

    // Forehead headband / pushed-up cyber visor trim so face remains expressive
    const headband = cyl(0.166 * w, 0.166 * w, 0.042 * s, 9, trimMat);
    headband.position.set(0, 0.268 * s, 0.008 * w);
    head.add(headband);
  } else {
    const visor = cyl(0.155 * w, 0.155 * w, 0.065 * s, 8, visorMat, false);
    visor.position.set(0, 0.205 * s, 0.055 * w);
    visor.scale.set(0.95, 1, 0.72);
    head.add(visor);
  }

  // Arms (left = +X in local facing +Z space, right = -X)
  const makeArm = (side: 1 | -1) => {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * 0.275 * w, 0.39 * s, 0);
    torso.add(shoulder);

    const pauldron = cyl(0.098 * w, 0.082 * w, 0.095 * s, 8, trimMat);
    shoulder.add(pauldron);

    const upperArm = cyl(0.072 * w, 0.062 * w, 0.24 * s, 7, chestMat);
    upperArm.position.set(0, -0.12 * s, 0);
    shoulder.add(upperArm);

    const elbow = new THREE.Group();
    elbow.position.set(0, -0.24 * s, 0);
    shoulder.add(elbow);

    const elbowCap = cyl(0.068 * w, 0.068 * w, 0.05 * s, 7, darkDetailMat, false);
    elbow.add(elbowCap);

    const forearm = cyl(0.065 * w, 0.074 * w, 0.23 * s, 7, gloveMat);
    forearm.position.set(0, -0.115 * s, 0);
    elbow.add(forearm);

    const fist = cyl(0.08 * w, 0.072 * w, 0.092 * s, 7, gloveMat);
    fist.position.set(0, -0.24 * s, 0);
    elbow.add(fist);

    return { shoulder, elbow };
  };

  const leftArm = makeArm(1);
  const rightArm = makeArm(-1);

  // Legs
  const makeLeg = (side: 1 | -1) => {
    const hip = new THREE.Group();
    hip.position.set(side * 0.115 * w, -0.03 * s, 0);
    hips.add(hip);

    const thigh = cyl(0.096 * w, 0.078 * w, 0.34 * s, 8, pantsMat);
    thigh.position.set(0, -0.17 * s, 0);
    hip.add(thigh);

    const knee = new THREE.Group();
    knee.position.set(0, -0.34 * s, 0);
    hip.add(knee);

    const kneePad = new THREE.Mesh(
      new THREE.BoxGeometry(0.11 * w, 0.085 * s, 0.07 * w),
      trimMat
    );
    kneePad.position.set(0, 0, 0.068 * w);
    knee.add(kneePad);

    const shin = cyl(0.08 * w, 0.068 * w, 0.31 * s, 8, bootMat);
    shin.position.set(0, -0.155 * s, 0);
    knee.add(shin);

    const bootCuff = cyl(0.088 * w, 0.082 * w, 0.065 * s, 8, trimMat, false);
    bootCuff.position.set(0, -0.07 * s, 0);
    knee.add(bootCuff);

    const bootToe = cyl(0.075 * w, 0.09 * w, 0.11 * s, 7, bootMat);
    bootToe.rotation.x = Math.PI / 2;
    bootToe.position.set(0, -0.33 * s, 0.058 * w);
    knee.add(bootToe);

    return { hip, knee };
  };

  const leftLeg = makeLeg(1);
  const rightLeg = makeLeg(-1);

  const rig: HumanoidRigParts = {
    root,
    bodyPivot,
    hips,
    torso,
    head,
    shoulderL: leftArm.shoulder,
    elbowL: leftArm.elbow,
    shoulderR: rightArm.shoulder,
    elbowR: rightArm.elbow,
    hipL: leftLeg.hip,
    kneeL: leftLeg.knee,
    hipR: rightLeg.hip,
    kneeR: rightLeg.knee,
    faceRig,
    materials: [],
    baseColors: new Map(),
    baseEmissive: new Map(),
    heightUnits: 1.75 * s,
    runPhase: 0,
    turnAngle: 1.18,
    lastSlashKey: 0,
    wasGrounded: true,
    landingSquash: 0,
    stealthOpacity: 1,
    meditationFactor: 0,
  };

  return rig;
}

export function buildHeroRig3D(heroId: CharacterId): HumanoidRigParts {
  if (heroId === 'ren') {
    const rig = createBaseHumanoidRig({
      heightScale: 1.0,
      widthScale: 0.96,
      chestColor: '#1e2538',
      trimColor: '#ff007f',
      pantsColor: '#161d2e',
      skinColor: '#eab897',
      hairColor: '#181c29',
      visorColor: '#00f0ff',
      bootColor: '#101522',
      gloveColor: '#253147',
      showFullFace: true,
      irisColor: '#00f0ff',
    });

    // Asymmetric ninja chest harness & glowing reactor core
    const harnessMat = makeToonMaterial('#0f172a');
    const strap = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.055, 0.34), harnessMat);
    strap.position.set(0, 0.28, 0.01);
    strap.rotation.z = 0.42;
    rig.torso.add(strap);

    const core = cyl(0.052, 0.052, 0.04, 8, makeToonMaterial('#22d3ee', { emissive: '#00f0ff', emissiveIntensity: 1.25 }), false);
    core.rotation.x = Math.PI / 2;
    core.position.set(0.05, 0.3, 0.195);
    rig.torso.add(core);

    // Thigh kunai holster on right leg
    const holster = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.16, 0.09), makeToonMaterial('#334155'));
    holster.position.set(-0.08, -0.16, 0.02);
    rig.hipR.add(holster);

    // Sleek side cyber-scanner lens resting cleanly on left temple (never blocks eyes)
    const scanner = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 0.045, 0.12),
      makeToonMaterial('#00f0ff', { emissive: '#00f0ff', emissiveIntensity: 1.0, transparent: true, opacity: 0.75 })
    );
    scanner.position.set(0.14, 0.25, 0.09);
    rig.head.add(scanner);

    // Ren's spiky ninja hair crown (6 sculpted spikes)
    const hairMat = makeToonMaterial('#181c29');
    for (let i = 0; i < 6; i++) {
      const spike = cyl(0.014, 0.062, 0.21 + (i % 2) * 0.04, 6, hairMat);
      spike.position.set((i - 2.5) * 0.045, 0.34 + (i % 2) * 0.015, -0.06 - (i % 2) * 0.035);
      spike.rotation.x = -0.62 - (i % 2) * 0.18;
      spike.rotation.z = (2.5 - i) * 0.2;
      rig.head.add(spike);
    }

    // Ren's glowing Plasma Cypher Blade with tsuba handguard attached to right forearm
    const bladeGroup = new THREE.Group();
    bladeGroup.position.set(0, -0.22, 0.04);
    const hilt = cyl(0.035, 0.035, 0.18, 6, makeToonMaterial('#334155'));
    hilt.rotation.x = Math.PI / 2;
    bladeGroup.add(hilt);
    const tsuba = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.14, 0.025), makeToonMaterial('#ff007f', { emissive: '#be185d', emissiveIntensity: 0.6 }));
    tsuba.position.set(0, 0, 0.09);
    bladeGroup.add(tsuba);
    const bladeMat = makeToonMaterial('#7ef9ff', {
      emissive: '#00f0ff',
      emissiveIntensity: 1.35,
    });
    const blade = cyl(0.01, 0.055, 0.76, 6, bladeMat, true, 1.09);
    blade.rotation.x = Math.PI / 2;
    blade.position.set(0, 0, 0.44);
    blade.scale.set(0.5, 1, 1.35);
    bladeGroup.add(blade);
    rig.elbowR.add(bladeGroup);
    rig.weaponGroup = bladeGroup;

    // 7-node articulated 3D cylindrical scarf segments trailing off collar
    const scarfMat = makeToonMaterial('#ff007f', {
      emissive: '#be185d',
      emissiveIntensity: 0.45,
    });
    rig.scarfMeshes = [];
    for (let i = 0; i < 7; i++) {
      const t = i / 6;
      const seg = cyl(0.062 - t * 0.03, 0.055 - t * 0.025, 0.22, 6, scarfMat, true, 1.08);
      seg.rotation.x = Math.PI / 2;
      seg.position.set(0, 0.43 - i * 0.03, -0.14 - i * 0.16);
      rig.torso.add(seg);
      rig.scarfMeshes.push(seg);
    }

    // Subtle stealth shadow aura shell (used when meditating invisible/dark)
    const auraMat = new THREE.MeshBasicMaterial({
      color: '#1e1b4b',
      transparent: true,
      opacity: 0,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    auraMat.userData.isAuraMaterial = true;
    const auraMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.55, 1.85, 12, 1, true), auraMat);
    auraMesh.position.set(0, 0.92, 0);
    auraMesh.userData.isAura = true;
    auraMesh.visible = false;
    rig.bodyPivot.add(auraMesh);
    rig.auraMesh = auraMesh;

    recordMaterials(rig, rig.root);
    return rig;
  }

  if (heroId === 'maya') {
    const rig = createBaseHumanoidRig({
      heightScale: 0.97,
      widthScale: 0.9,
      chestColor: '#0f766e',
      trimColor: '#facc15',
      pantsColor: '#cbd5e1',
      skinColor: '#ecc5a5',
      hairColor: '#134e4a',
      visorColor: '#22d3ee',
      bootColor: '#0f4c4c',
      gloveColor: '#f8fafc',
      showFullFace: true,
      irisColor: '#06b6d4',
    });

    // Golden psychic chest brooch & tailored cyber coat-tails
    const brooch = cyl(0.055, 0.055, 0.03, 8, makeToonMaterial('#22d3ee', { emissive: '#06b6d4', emissiveIntensity: 1.0 }), false);
    brooch.rotation.x = Math.PI / 2;
    brooch.position.set(0, 0.34, 0.19);
    rig.torso.add(brooch);

    const coatMat = makeToonMaterial('#0f766e');
    rig.coatFlaps = [];
    for (const side of [-1, 1] as const) {
      const flap = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.36, 0.05), coatMat);
      flap.position.set(side * 0.13, -0.14, -0.14);
      flap.rotation.x = 0.2;
      flap.rotation.z = side * 0.12;
      rig.hips.add(flap);
      rig.coatFlaps.push(flap);
    }

    // Maya's twin stylized ponytail cylinders + golden hair ties
    const hairMat = makeToonMaterial('#134e4a');
    const tieMat = makeToonMaterial('#facc15', { emissive: '#eab308', emissiveIntensity: 0.4 });
    for (const side of [-1, 1] as const) {
      const tie = cyl(0.068, 0.068, 0.04, 8, tieMat, false);
      tie.position.set(side * 0.135, 0.25, -0.09);
      rig.head.add(tie);

      const tail = cyl(0.06, 0.022, 0.44, 7, hairMat);
      tail.position.set(side * 0.15, 0.14, -0.13);
      tail.rotation.x = 0.38;
      tail.rotation.z = side * 0.28;
      rig.head.add(tail);
    }

    // Tiara jewel on forehead
    const gem = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.04, 0),
      makeToonMaterial('#00f0ff', { emissive: '#00f0ff', emissiveIntensity: 1.2 })
    );
    gem.position.set(0, 0.275, 0.165);
    rig.head.add(gem);

    // Multi-ring floating psychic sacred halo
    const haloGroup = new THREE.Group();
    haloGroup.position.set(0, 0.3, -0.2);
    const ringMat = makeToonMaterial('#00f0ff', {
      emissive: '#06b6d4',
      emissiveIntensity: 1.2,
    });
    const outerRing = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.026, 6, 18), ringMat);
    haloGroup.add(outerRing);
    const innerRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.19, 0.02, 6, 4),
      makeToonMaterial('#facc15', { emissive: '#eab308', emissiveIntensity: 0.9 })
    );
    haloGroup.add(innerRing);
    const goldOrb = cyl(0.055, 0.055, 0.075, 8, makeToonMaterial('#facc15', { emissive: '#eab308', emissiveIntensity: 0.95 }));
    haloGroup.add(goldOrb);
    rig.torso.add(haloGroup);
    rig.haloGroup = haloGroup;

    // Psychic wrist cuffs
    for (const elbow of [rig.elbowL, rig.elbowR]) {
      const band = cyl(0.084, 0.084, 0.065, 8, ringMat, false);
      band.position.set(0, -0.18, 0);
      elbow.add(band);
    }

    // Psychic levitation meditation aura ring beneath Maya
    const auraMat = new THREE.MeshBasicMaterial({
      color: '#22d3ee',
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    auraMat.userData.isAuraMaterial = true;
    const auraMesh = new THREE.Mesh(new THREE.RingGeometry(0.42, 0.72, 24), auraMat);
    auraMesh.rotation.x = -Math.PI / 2;
    auraMesh.position.set(0, 0.06, 0);
    auraMesh.userData.isAura = true;
    auraMesh.visible = false;
    rig.bodyPivot.add(auraMesh);
    rig.auraMesh = auraMesh;

    recordMaterials(rig, rig.root);
    return rig;
  }

  // Leon: Heavy Pirokinetic Brawler
  const rig = createBaseHumanoidRig({
    heightScale: 1.07,
    widthScale: 1.22,
    chestColor: '#991b1b',
    trimColor: '#f97316',
    pantsColor: '#1e293b',
    skinColor: '#d99b77',
    hairColor: '#451a1a',
    visorColor: '#fbbf24',
    bootColor: '#111827',
    gloveColor: '#ea580c',
    showFullFace: true,
    irisColor: '#f59e0b',
  });

  // Open brawler vest lapels + glowing inner ember emblem
  const lapelMat = makeToonMaterial('#7f1d1d');
  for (const side of [-1, 1] as const) {
    const lapel = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.42, 0.07), lapelMat);
    lapel.position.set(side * 0.13, 0.25, 0.21);
    lapel.rotation.z = side * -0.12;
    rig.torso.add(lapel);
  }

  // Broad dual-layer shoulder armor plates & heavy segmented pyro-gauntlets
  const armorMat = makeToonMaterial('#7f1d1d');
  const fireMat = makeToonMaterial('#fb923c', {
    emissive: '#f97316',
    emissiveIntensity: 0.9,
  });
  const knuckleMat = makeToonMaterial('#fde047', {
    emissive: '#facc15',
    emissiveIntensity: 0.95,
  });
  for (const [shoulder, elbow] of [
    [rig.shoulderL, rig.elbowL],
    [rig.shoulderR, rig.elbowR],
  ] as const) {
    const pad = cyl(0.155, 0.13, 0.13, 8, armorMat);
    pad.position.set(0, 0.025, 0);
    shoulder.add(pad);

    const trim = cyl(0.16, 0.16, 0.032, 8, fireMat, false);
    trim.position.set(0, -0.025, 0);
    shoulder.add(trim);

    const gauntlet = cyl(0.116, 0.132, 0.23, 8, fireMat);
    gauntlet.position.set(0, -0.215, 0);
    elbow.add(gauntlet);

    const knuckles = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.075, 0.16), knuckleMat);
    knuckles.position.set(0, -0.32, 0.02);
    elbow.add(knuckles);
  }

  // Wild flame-crest hair + forehead amber goggles (never covering eyes!)
  const hairMat = makeToonMaterial('#5c251f');
  for (let i = 0; i < 4; i++) {
    const spike = cyl(0.025, 0.11, 0.21 - i * 0.015, 7, hairMat);
    spike.position.set((i - 1.5) * 0.06, 0.37, 0.01 - i * 0.025);
    spike.rotation.x = 0.18 - i * 0.14;
    spike.rotation.z = (1.5 - i) * 0.16;
    rig.head.add(spike);
  }
  const goggleMat = makeToonMaterial('#fbbf24', { emissive: '#f59e0b', emissiveIntensity: 0.85 });
  for (const side of [-1, 1] as const) {
    const lens = cyl(0.05, 0.05, 0.04, 8, goggleMat, false);
    lens.rotation.x = Math.PI / 2;
    lens.position.set(side * 0.075, 0.29, 0.165);
    rig.head.add(lens);
  }

  // Calm / Intense Flame Aura tongues around Leon for meditation & Chama Intensa
  const flameAura = new THREE.Group();
  flameAura.userData.isAura = true;
  flameAura.visible = false;
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI * 2) / 8;
    const fMat = new THREE.MeshBasicMaterial({
      color: i % 2 === 0 ? '#f97316' : '#facc15',
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    fMat.userData.isAuraMaterial = true;
    const tongue = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.85, 6), fMat);
    tongue.position.set(Math.cos(a) * 0.48, 0.55 + (i % 3) * 0.18, Math.sin(a) * 0.48);
    tongue.userData.isAura = true;
    flameAura.add(tongue);
  }
  const baseEmberMat = new THREE.MeshBasicMaterial({
    color: '#fb923c',
    transparent: true,
    opacity: 0.45,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  baseEmberMat.userData.isAuraMaterial = true;
  const emberRing = new THREE.Mesh(new THREE.RingGeometry(0.4, 0.72, 20), baseEmberMat);
  emberRing.rotation.x = -Math.PI / 2;
  emberRing.position.y = 0.04;
  emberRing.userData.isAura = true;
  flameAura.add(emberRing);
  rig.bodyPivot.add(flameAura);
  rig.flameAuraMesh = flameAura;

  recordMaterials(rig, rig.root);
  return rig;
}

function dampAngle(current: number, target: number, lambda: number, dt: number): number {
  return THREE.MathUtils.damp(current, target, lambda, dt);
}

function ensurePoseBuffers(rig: HumanoidRigParts): {
  prev: SkeletonKeyPose;
  curr: SkeletonKeyPose;
  target: SkeletonKeyPose;
  blended: SkeletonKeyPose;
  faceBuf: FaceState;
} {
  if (!rig.prevPoseSnapshot) rig.prevPoseSnapshot = createNeutralKeyPose();
  if (!rig.currentPoseState) rig.currentPoseState = createNeutralKeyPose();
  if (!rig.targetPoseBuffer) rig.targetPoseBuffer = createNeutralKeyPose();
  if (!rig.blendedPoseBuffer) rig.blendedPoseBuffer = createNeutralKeyPose();
  if (!rig.faceTargetBuffer) rig.faceTargetBuffer = createNeutralFaceState();
  return {
    prev: rig.prevPoseSnapshot,
    curr: rig.currentPoseState,
    target: rig.targetPoseBuffer,
    blended: rig.blendedPoseBuffer,
    faceBuf: rig.faceTargetBuffer,
  };
}

function applyCharacterStyleAccents(
  pose: HeroPose,
  characterId: CharacterId,
  vy: number,
  target: SkeletonKeyPose
): void {
  // Velocity-responsive aerial pitch on jumps & falls
  if (pose === 'jump') {
    const riseBias = Math.min(0.22, Math.max(-0.1, -vy * 0.015));
    target.torsoRotX += riseBias * 0.4;
    target.hipLX -= riseBias * 0.5;
  } else if (pose === 'fall') {
    const dropBias = Math.min(0.25, Math.max(0, vy * 0.018));
    target.shLX -= dropBias * 0.4;
    target.shRX -= dropBias * 0.4;
  }

  // Distinct combat silhouettes per hero
  if (pose.startsWith('attack')) {
    if (characterId === 'leon') {
      // Heavy brawler hooks & rising fiery uppercut on combo 3
      target.torsoRotY *= 1.18;
      if (pose === 'attack3') {
        target.shRX -= 0.16;
        target.elRX -= 0.18;
      }
    } else if (characterId === 'maya') {
      // Sweeping psychic dual-palm projection
      target.shLX = Math.min(target.shLX, -0.95);
      target.elLX = -0.36;
      target.hipsYOffset += 0.04;
    } else if (characterId === 'ren') {
      // Low-stance ninja cypher blade slash
      target.hipsYOffset -= 0.03;
      target.torsoRotX += 0.08;
    }
  }
}

function applyKeyPoseToRig(
  rig: HumanoidRigParts,
  pose: HeroPose,
  target: SkeletonKeyPose,
  dt: number,
  tickCount: number,
  speed: number,
  vy: number,
  input: Pick<HeroRigInput, 'characterId' | 'grounded' | 'isFlying' | 'gstTimer' | 'invulnTimer' | 'atkTimer' | 'flameTimer'>,
  idleMeta: IdleChoreographyResult | null
): void {
  const safeDt = Math.min(0.05, Math.max(0.001, dt));
  const buffers = ensurePoseBuffers(rig);

  // Subtle landing micro-squash on grounded impact
  if (rig.wasGrounded === false && input.grounded && vy >= 1.5) {
    rig.landingSquash = Math.min(0.14, 0.06 + vy * 0.006);
  }
  rig.wasGrounded = input.grounded;
  rig.landingSquash = THREE.MathUtils.damp(rig.landingSquash ?? 0, 0, 18, safeDt);
  const squash = rig.landingSquash ?? 0;

  if (rig.activePose !== pose) {
    Object.assign(buffers.prev, buffers.curr);
    rig.activePose = pose;
    rig.poseBlend = 0;
  }

  const blendRate = pose.startsWith('attack') || pose === 'dash' || pose === 'hurt' ? 28 : 16;
  rig.poseBlend = 1 - (1 - (rig.poseBlend ?? 1)) * Math.exp(-blendRate * safeDt);
  const blended = blendPoseTargets(buffers.prev, target, rig.poseBlend, buffers.blended);
  Object.assign(buffers.curr, blended);

  const scaleH = rig.heightUnits / 1.75;
  const baseHipsY = 0.78 * scaleH;
  const targetHipsY = baseHipsY + (blended.hipsYOffset - squash) * scaleH;
  const lambda = pose.startsWith('attack') || pose === 'dash' ? 34 : 20;

  rig.bodyPivot.rotation.x = dampAngle(rig.bodyPivot.rotation.x, blended.bodyLeanX, lambda, safeDt);
  rig.hips.position.y = THREE.MathUtils.damp(rig.hips.position.y, targetHipsY, lambda, safeDt);
  rig.torso.rotation.x = dampAngle(rig.torso.rotation.x, blended.torsoRotX + squash * 0.9, lambda, safeDt);
  rig.torso.rotation.y = dampAngle(rig.torso.rotation.y, blended.torsoRotY, lambda, safeDt);
  rig.head.rotation.x = dampAngle(rig.head.rotation.x, blended.headRotX, lambda, safeDt);
  rig.head.rotation.y = dampAngle(rig.head.rotation.y, blended.headRotY, lambda, safeDt);

  rig.shoulderL.rotation.x = dampAngle(rig.shoulderL.rotation.x, blended.shLX, lambda, safeDt);
  rig.shoulderL.rotation.z = dampAngle(rig.shoulderL.rotation.z, blended.shLZ, lambda, safeDt);
  rig.elbowL.rotation.x = dampAngle(rig.elbowL.rotation.x, blended.elLX, lambda, safeDt);
  rig.shoulderR.rotation.x = dampAngle(rig.shoulderR.rotation.x, blended.shRX, lambda, safeDt);
  rig.shoulderR.rotation.z = dampAngle(rig.shoulderR.rotation.z, blended.shRZ, lambda, safeDt);
  rig.elbowR.rotation.x = dampAngle(rig.elbowR.rotation.x, blended.elRX, lambda, safeDt);

  rig.hipL.rotation.x = dampAngle(rig.hipL.rotation.x, blended.hipLX - squash * 1.4, lambda, safeDt);
  rig.kneeL.rotation.x = dampAngle(rig.kneeL.rotation.x, blended.kneeLX + squash * 2.6, lambda, safeDt);
  rig.hipR.rotation.x = dampAngle(rig.hipR.rotation.x, blended.hipRX - squash * 1.4, lambda, safeDt);
  rig.kneeR.rotation.x = dampAngle(rig.kneeR.rotation.x, blended.kneeRX + squash * 2.6, lambda, safeDt);

  const medFactor = idleMeta?.meditationFactor ?? 0;
  rig.meditationFactor = medFactor;

  // Ren's 3D flowing scarf wave driven by movement speed (calms smoothly during meditation)
  if (rig.scarfMeshes) {
    const billow = Math.min(1.4, (0.25 + speed * 0.14 + Math.abs(vy) * 0.05) * (1 - medFactor * 0.65));
    rig.scarfMeshes.forEach((seg, idx) => {
      const wave = Math.sin(tickCount * 0.22 - idx * 0.75) * (0.045 + idx * 0.015) * billow;
      const lift = Math.min(0.18, speed * 0.025) * (idx / 6);
      seg.position.y = 0.43 - idx * (0.032 - lift * 0.08) + wave * 0.4;
      seg.position.x = wave * 0.9;
      seg.position.z = -0.14 - idx * (0.14 + billow * 0.03);
      seg.rotation.z = wave * 2.2;
    });
  }

  // Maya's coat-tails subtle air sway
  if (rig.coatFlaps) {
    const flapLift = input.isFlying || medFactor > 0.2 ? 0.28 + Math.sin(tickCount * 0.12) * 0.08 : 0.18 + speed * 0.04;
    rig.coatFlaps.forEach((flap, i) => {
      flap.rotation.x = flapLift + (i === 0 ? 0.04 : -0.04);
    });
  }

  // Maya's floating psychic halo spin (expands & glows calmly during meditation too!)
  if (rig.haloGroup) {
    const haloSpeed = input.isFlying ? 4.5 : medFactor > 0.1 ? 1.8 : 1.3;
    rig.haloGroup.rotation.z += safeDt * haloSpeed;
    const innerRing = rig.haloGroup.children[1];
    if (innerRing) innerRing.rotation.z -= safeDt * (haloSpeed * 1.45);
    const haloScale = input.isFlying
      ? 1.28 + Math.sin(tickCount * 0.24) * 0.08
      : 1.0 + medFactor * (0.42 + Math.sin(tickCount * 0.07) * 0.06);
    rig.haloGroup.scale.setScalar(haloScale);
  }

  // Ren stealth aura / Maya levitation ring
  if (rig.auraMesh) {
    const auraMat = rig.auraMesh.material as THREE.MeshBasicMaterial;
    if (input.characterId === 'ren') {
      const stealthGlow = idleMeta ? Math.max(0, 1 - idleMeta.stealthOpacity) : 0;
      rig.auraMesh.visible = stealthGlow > 0.06;
      if (rig.auraMesh.visible) {
        auraMat.opacity = stealthGlow * 0.22;
        rig.auraMesh.rotation.y += safeDt * 0.8;
        const pulse = 1 + Math.sin(tickCount * 0.06) * 0.06;
        rig.auraMesh.scale.set(pulse, 1, pulse);
      }
    } else if (input.characterId === 'maya') {
      const psy = Math.max(idleMeta?.psychicGlow ?? 0, input.isFlying ? 0.5 : 0);
      rig.auraMesh.visible = psy > 0.06;
      if (rig.auraMesh.visible) {
        auraMat.opacity = psy * 0.45;
        rig.auraMesh.rotation.z -= safeDt * 1.5;
        const pulse = 0.95 + psy * 0.25 + Math.sin(tickCount * 0.08) * 0.05;
        rig.auraMesh.scale.setScalar(pulse);
      }
    }
  }

  // Leon's calm meditation flame aura OR intense combat flame aura
  if (rig.flameAuraMesh) {
    const calmFlame = idleMeta?.flameIgnite ?? 0;
    const combatFlame = input.flameTimer > 0 ? 1 : 0;
    const flameStrength = Math.max(calmFlame * 0.85, combatFlame);
    rig.flameAuraMesh.visible = flameStrength > 0.05;
    if (rig.flameAuraMesh.visible) {
      rig.flameAuraMesh.rotation.y += safeDt * (combatFlame > 0 ? 3.8 : 1.0);
      const children = rig.flameAuraMesh.children;
      for (let i = 0; i < children.length; i++) {
        const ch = children[i] as THREE.Mesh;
        const mat = ch.material as THREE.MeshBasicMaterial;
        if (i < children.length - 1) {
          const speedMult = combatFlame > 0 ? 0.35 : 0.075;
          const flicker = 0.85 + Math.sin(tickCount * speedMult + i * 1.3) * (combatFlame > 0 ? 0.3 : 0.14);
          ch.scale.set(0.85 + flameStrength * 0.25, flameStrength * flicker, 0.85 + flameStrength * 0.25);
          mat.opacity = Math.min(0.7, flameStrength * (combatFlame > 0 ? 0.65 : 0.42));
        } else {
          mat.opacity = flameStrength * 0.42;
          ch.scale.setScalar(0.9 + flameStrength * 0.22);
        }
      }
    }
  }

  // Transparency / Ghost / Ren Stealth Meditation + Darkening + ATK / Calm Flame Glow
  const stealthOpacity = idleMeta?.stealthOpacity ?? 1;
  const darkenFactor = idleMeta?.darkenFactor ?? 0;
  const calmFlameGlow = idleMeta?.flameIgnite ?? 0;
  rig.stealthOpacity = stealthOpacity;

  const baseOpacity =
    input.gstTimer > 0
      ? 0.35
      : input.invulnTimer > 0 && Math.floor(input.invulnTimer / 3) % 2 === 1
        ? 0.45
        : 1;
  const finalOpacity = Math.min(baseOpacity, stealthOpacity);

  for (const mat of rig.materials) {
    const toon = mat as THREE.MeshToonMaterial;
    toon.transparent = finalOpacity < 0.995;
    toon.opacity = finalOpacity;

    const baseC = rig.baseColors.get(mat);
    if (toon.color && baseC) {
      if (darkenFactor > 0.001) {
        _tmpColor.copy(baseC).lerp(_stealthShadowColor, darkenFactor);
        toon.color.copy(_tmpColor);
      } else {
        toon.color.copy(baseC);
      }
    }

    const baseE = rig.baseEmissive.get(mat);
    if (toon.emissive && baseE) {
      if (input.atkTimer > 0) {
        toon.emissive.set('#ef4444');
        toon.emissiveIntensity = 0.55;
      } else if (input.characterId === 'leon' && input.flameTimer > 0) {
        toon.emissive.set(Math.floor(tickCount) % 8 < 4 ? '#f97316' : '#facc15');
        toon.emissiveIntensity = 0.65;
      } else if (input.characterId === 'leon' && calmFlameGlow > 0.04) {
        // Smooth calm breathing ember glow when Leon meditates
        toon.emissive.copy(baseE).lerp(_tmpColor.set('#f97316'), calmFlameGlow * 0.55);
        toon.emissiveIntensity = Math.max(baseE.getHex() === 0 ? 0 : 0.85, calmFlameGlow * 0.52);
      } else if (darkenFactor > 0.05) {
        toon.emissive.copy(baseE);
        toon.emissiveIntensity = (baseE.getHex() === 0 ? 0 : 0.85) * (1 - darkenFactor * 0.78);
      } else {
        toon.emissive.copy(baseE);
        toon.emissiveIntensity = baseE.getHex() === 0 ? 0 : 0.85;
      }
    }
  }
}

export function updateHeroRig3D(rig: HumanoidRigParts, input: HeroRigInput, dt: number): void {
  const safeDt = Math.min(0.05, Math.max(0.001, dt));
  const speed = Math.abs(input.vx);
  const idleTicks = input.idleTicks ?? 0;

  // Face direction: during deep meditation, face slightly more forward (~0.55 rad) so eyes/breath/aura read clearly!
  const isMeditating = input.pose === 'idle' && idleTicks >= 300;
  const medBlend = isMeditating ? Math.min(1, (idleTicks - 300) / 90) : 0;
  const frontAngle = input.facing > 0 ? 0.52 : -0.52;
  const normalAngle = input.facing > 0 ? 1.18 : -1.18;
  const targetTurn =
    (input.pose === 'wall' || input.pose === 'climb') && input.onWall !== 0
      ? input.onWall > 0
        ? Math.PI / 2
        : -Math.PI / 2
      : normalAngle + (frontAngle - normalAngle) * medBlend;

  rig.turnAngle = dampAngle(rig.turnAngle, targetTurn, 16, safeDt);
  rig.bodyPivot.rotation.y = rig.turnAngle;

  const buffers = ensurePoseBuffers(rig);
  let target: SkeletonKeyPose;
  let idleMeta: IdleChoreographyResult | null = null;

  if (input.pose === 'idle' && rig.faceRig) {
    // Hero rich varied idle choreography + long-idle meditation
    idleMeta = evaluateHeroIdleChoreography(
      input.characterId,
      idleTicks,
      input.tickCount,
      buffers.target
    );
    rig.currentIdleSegment = idleMeta.segmentName;
    target = buffers.target;
  } else {
    rig.currentIdleSegment = input.pose;
    let frame = input.frame;
    let nextFrame = input.nextFrame;
    let frameAlpha = input.frameAlpha;

    if (frame === undefined || nextFrame === undefined || frameAlpha === undefined) {
      if (input.pose === 'run') {
        rig.runPhase += safeDt * (26 + speed * 2.4);
        const s = sampleSpriteClipAt('run', rig.runPhase);
        frame = s.frame;
        nextFrame = s.nextFrame;
        frameAlpha = s.frameAlpha;
      } else {
        const s = sampleSpriteClipAt(input.pose, input.elapsedTicks ?? input.tickCount);
        frame = s.frame;
        nextFrame = s.nextFrame;
        frameAlpha = s.frameAlpha;
      }
    }

    const clip = HERO_CLIPS[input.pose];
    const keyframes = SPRITE_KEYFRAMES[input.pose];
    target = interpolateKeyframes(keyframes, frame, nextFrame, frameAlpha, clip.loop, buffers.target);

    if (input.pose === 'run') {
      const amp = Math.min(1.12, Math.max(0.45, speed / 4.2));
      target.hipLX *= amp;
      target.hipRX *= amp;
      target.shLX *= amp;
      target.shRX *= amp;
      target.torsoRotY *= amp;
    } else if (input.pose === 'flight') {
      target.torsoRotX += Math.min(0.22, speed * 0.03);
    }

    applyCharacterStyleAccents(input.pose, input.characterId, input.vy, target);
  }

  applyKeyPoseToRig(rig, input.pose, target, safeDt, input.tickCount, speed, input.vy, input, idleMeta);

  // Expressive face state resolution & damping (gracefully skipped if rig has no faceRig)
  const faceState = resolveHeroFaceState(
    input.characterId,
    input.pose,
    {
      comboStep: input.comboStep,
      slashing: input.slashing,
      slashTimer: input.slashTimer,
      hp: input.hp,
      tickCount: input.tickCount,
      idle: idleMeta,
    },
    buffers.faceBuf
  );
  applyFaceStateToRig(rig, faceState, safeDt);
}

export function buildEnemyRig3D(enemy: Enemy): HumanoidRigParts {
  // Specialized mechanical / quadruped silhouettes
  if (enemy.type === 'cyber_hound') {
    const rig = createBaseHumanoidRig({
      heightScale: 0.72,
      widthScale: 1.0,
      chestColor: '#334155',
      trimColor: '#ef4444',
      pantsColor: '#1e293b',
      skinColor: '#475569',
      hairColor: '#0f172a',
      visorColor: '#ff0055',
      bootColor: '#0f172a',
      gloveColor: '#334155',
    });
    // Reorient torso horizontally as quadruped chassis
    rig.hips.position.y = 0.52;
    rig.torso.rotation.x = Math.PI / 2;
    rig.head.position.set(0, 0.5, 0.08);
    rig.head.rotation.x = -Math.PI / 2;
    recordMaterials(rig, rig.root);
    return rig;
  }

  if (enemy.type === 'drone') {
    const root = new THREE.Group();
    const bodyPivot = new THREE.Group();
    root.add(bodyPivot);
    const hullMat = makeToonMaterial('#1e293b');
    const neonMat = makeToonMaterial('#ef4444', { emissive: '#ef4444', emissiveIntensity: 1.1 });
    const rotorMat = makeToonMaterial('#38bdf8', { emissive: '#0ea5e9', emissiveIntensity: 0.7 });

    const hips = new THREE.Group();
    hips.position.y = 0.65;
    bodyPivot.add(hips);
    const torso = new THREE.Group();
    hips.add(torso);
    const head = new THREE.Group();
    torso.add(head);

    const pod = cyl(0.28, 0.22, 0.36, 8, hullMat);
    torso.add(pod);
    const eye = cyl(0.11, 0.11, 0.12, 8, neonMat, false);
    eye.rotation.x = Math.PI / 2;
    eye.position.set(0, 0, 0.24);
    torso.add(eye);
    const rotorGeo = new THREE.TorusGeometry(0.42, 0.035, 6, 14);
    const rotorMesh = new THREE.Mesh(rotorGeo, rotorMat);
    rotorMesh.rotation.x = Math.PI / 2;
    rotorMesh.position.y = 0.24;
    torso.add(rotorMesh);

    const dummy = () => new THREE.Group();
    const rig: HumanoidRigParts = {
      root,
      bodyPivot,
      hips,
      torso,
      head,
      shoulderL: dummy(),
      elbowL: dummy(),
      shoulderR: dummy(),
      elbowR: dummy(),
      hipL: dummy(),
      kneeL: dummy(),
      hipR: dummy(),
      kneeR: dummy(),
      rotorMesh,
      materials: [],
      baseColors: new Map(),
      baseEmissive: new Map(),
      heightUnits: 1.0,
      runPhase: 0,
      turnAngle: 1.18,
      lastSlashKey: 0,
    };
    recordMaterials(rig, rig.root);
    return rig;
  }

  if (enemy.type === 'turret') {
    const root = new THREE.Group();
    const bodyPivot = new THREE.Group();
    root.add(bodyPivot);
    const baseMat = makeToonMaterial('#1e293b');
    const accentMat = makeToonMaterial(enemy.deployedBy ? '#f59e0b' : '#ef4444', {
      emissive: enemy.deployedBy ? '#d97706' : '#dc2626',
      emissiveIntensity: 0.55,
    });
    const barrelMat = makeToonMaterial('#94a3b8');

    const hips = new THREE.Group();
    hips.position.y = 0.5;
    bodyPivot.add(hips);
    const torso = new THREE.Group();
    hips.add(torso);
    const head = new THREE.Group();
    torso.add(head);

    const pedestal = cyl(0.32, 0.38, 0.26, 8, baseMat);
    pedestal.position.y = enemy.mount === 'ceiling' ? 0.36 : -0.36;
    bodyPivot.add(pedestal);

    const turretHead = new THREE.Group();
    turretHead.position.y = 0;
    hips.add(turretHead);
    const housing = cyl(0.24, 0.26, 0.32, 8, accentMat);
    turretHead.add(housing);

    const turretBarrels = new THREE.Group();
    turretHead.add(turretBarrels);
    for (const yOff of [-0.06, 0.06]) {
      const barrel = cyl(0.055, 0.055, 0.62, 6, barrelMat);
      barrel.rotation.z = Math.PI / 2;
      barrel.position.set(0.34, yOff, 0);
      turretBarrels.add(barrel);
    }

    const dummy = () => new THREE.Group();
    const rig: HumanoidRigParts = {
      root,
      bodyPivot,
      hips,
      torso,
      head,
      shoulderL: dummy(),
      elbowL: dummy(),
      shoulderR: dummy(),
      elbowR: dummy(),
      hipL: dummy(),
      kneeL: dummy(),
      hipR: dummy(),
      kneeR: dummy(),
      turretHead,
      turretBarrels,
      materials: [],
      baseColors: new Map(),
      baseEmissive: new Map(),
      heightUnits: 1.0,
      runPhase: 0,
      turnAngle: 0,
      lastSlashKey: 0,
    };
    recordMaterials(rig, rig.root);
    return rig;
  }

  const paletteMap: Record<
    Exclude<EnemyType, 'cyber_hound' | 'drone' | 'turret'>,
    {
      h: number;
      w: number;
      chest: string;
      trim: string;
      pants: string;
      skin: string;
      hair: string;
      visor: string;
      boot: string;
      glove: string;
    }
  > = {
    mib_gunner: { h: 1.0, w: 0.96, chest: '#1e293b', trim: '#38bdf8', pants: '#0f172a', skin: '#e2b698', hair: '#090d16', visor: '#38bdf8', boot: '#020617', glove: '#334155' },
    mib_shield: { h: 1.04, w: 1.08, chest: '#1e3a5f', trim: '#00f0ff', pants: '#0f172a', skin: '#d6a485', hair: '#1e293b', visor: '#00f0ff', boot: '#090d16', glove: '#0ea5e9' },
    jetpack: { h: 1.0, w: 1.02, chest: '#475569', trim: '#fb923c', pants: '#1e293b', skin: '#cbd5e1', hair: '#0f172a', visor: '#f97316', boot: '#0f172a', glove: '#64748b' },
    mutant: { h: 1.08, w: 1.15, chest: '#14532d', trim: '#4ade80', pants: '#064e3b', skin: '#4ade80', hair: '#166534', visor: '#bef264', boot: '#052e16', glove: '#22c55e' },
    sniper: { h: 0.98, w: 0.9, chest: '#27272a', trim: '#ff007f', pants: '#18181b', skin: '#d8b4a0', hair: '#18181b', visor: '#ff007f', boot: '#09090b', glove: '#3f3f46' },
    suit_martial: { h: 1.02, w: 1.02, chest: '#312e81', trim: '#c084fc', pants: '#1e1b4b', skin: '#e6b89c', hair: '#0f172a', visor: '#e879f9', boot: '#1e1b4b', glove: '#f43f5e' },
    samurai: { h: 1.06, w: 1.05, chest: '#7f1d1d', trim: '#facc15', pants: '#18181b', skin: '#e2b698', hair: '#09090b', visor: '#fbbf24', boot: '#09090b', glove: '#991b1b' },
    turret_engineer: { h: 0.98, w: 1.04, chest: '#78350f', trim: '#f59e0b', pants: '#1e293b', skin: '#d9a788', hair: '#451a03', visor: '#fbbf24', boot: '#1c1917', glove: '#d97706' },
    heavy_trooper: { h: 1.22, w: 1.28, chest: '#334155', trim: '#f97316', pants: '#1e293b', skin: '#94a3b8', hair: '#0f172a', visor: '#ef4444', boot: '#0f172a', glove: '#475569' },
  };

  const p = paletteMap[enemy.type];
  const rig = createBaseHumanoidRig({
    heightScale: p.h,
    widthScale: p.w,
    chestColor: p.chest,
    trimColor: p.trim,
    pantsColor: p.pants,
    skinColor: p.skin,
    hairColor: p.hair,
    visorColor: p.visor,
    bootColor: p.boot,
    gloveColor: p.glove,
  });

  if (enemy.type === 'mib_shield' || enemy.type === 'heavy_trooper') {
    const shieldMat = makeToonMaterial('#00f0ff', {
      emissive: '#06b6d4',
      emissiveIntensity: 0.7,
      transparent: true,
      opacity: 0.65,
    });
    const shield = new THREE.Mesh(new THREE.BoxGeometry(0.45, 1.35 * p.h, 0.08), shieldMat);
    shield.position.set(0.18, -0.05, 0.28);
    rig.elbowL.add(shield);
    rig.shieldMesh = shield;
  }

  if (enemy.type === 'samurai') {
    const crest = cyl(0.02, 0.16, 0.22, 6, makeToonMaterial('#facc15'));
    crest.position.set(0, 0.36, 0.06);
    rig.head.add(crest);
    const katana = cyl(0.015, 0.028, 0.85, 6, makeToonMaterial('#e2e8f0', { emissive: '#38bdf8', emissiveIntensity: 0.4 }));
    katana.rotation.x = Math.PI / 2;
    katana.position.set(0, -0.22, 0.42);
    rig.elbowR.add(katana);
  }

  if (enemy.type === 'sniper' || enemy.type === 'mib_gunner') {
    const gunLen = enemy.type === 'sniper' ? 0.82 : 0.42;
    const gun = cyl(0.04, 0.045, gunLen, 6, makeToonMaterial('#0f172a'));
    gun.rotation.x = Math.PI / 2;
    gun.position.set(0, -0.22, gunLen * 0.45);
    rig.elbowR.add(gun);
  }

  if (enemy.type === 'jetpack') {
    const pack = cyl(0.16, 0.16, 0.42, 8, makeToonMaterial('#334155'));
    pack.position.set(0, 0.24, -0.22);
    rig.torso.add(pack);
    rig.jetFlames = [];
    for (const sx of [-0.09, 0.09]) {
      const flame = cyl(0.05, 0.01, 0.26, 6, makeToonMaterial('#fb923c', { emissive: '#f97316', emissiveIntensity: 1.2 }), false);
      flame.position.set(sx, 0.02, -0.24);
      rig.torso.add(flame);
      rig.jetFlames.push(flame);
    }
  }

  recordMaterials(rig, rig.root);
  return rig;
}

export function updateEnemyRig3D(rig: HumanoidRigParts, enemy: Enemy, tickCount: number, dt: number): void {
  const safeDt = Math.min(0.05, Math.max(0.001, dt));
  const hitFlash = (enemy.hitFlashTimer ?? 0) > 0;

  if (enemy.type === 'turret') {
    const cx = enemy.x + enemy.w / 2;
    const cy = enemy.y + enemy.h / 2;
    const angle = enemy.ai
      ? Math.atan2(-(enemy.ai.aimY - cy), enemy.ai.aimX - cx)
      : enemy.mount === 'ceiling'
        ? -Math.PI / 2
        : enemy.facing === 1
          ? 0
          : Math.PI;
    if (rig.turretBarrels) {
      rig.turretBarrels.rotation.z = angle;
    }
  } else if (enemy.type === 'drone') {
    rig.hips.position.y = 0.65 + Math.sin(tickCount * 0.15 + enemy.id) * 0.09;
    rig.bodyPivot.rotation.y = dampAngle(rig.bodyPivot.rotation.y, enemy.facing > 0 ? 1.1 : -1.1, 16, safeDt);
    if (rig.rotorMesh) rig.rotorMesh.rotation.z += safeDt * 18;
  } else {
    const moving = Math.abs(enemy.vx) > 0.2 || enemy.ai?.state === 'patrol' || enemy.ai?.state === 'chase';
    const isAttacking = enemy.ai?.state === 'attack' || enemy.ai?.state === 'windup';
    const pose: HeroPose = enemy.stunTimer && enemy.stunTimer > 0
      ? 'stun'
      : enemy.airborne
        ? 'jump'
        : isAttacking
          ? 'attack1'
          : moving
            ? 'run'
            : 'idle';

    // Interpolate smoothly across enemy's 4-frame sprite cycle (run1<->run2 at 6 ticks/frame)
    if (pose === 'run') {
      const cycle = ((tickCount + enemy.id * 7) / 6) % 2;
      const frame = cycle < 1 ? 1 : 2;
      const nextFrame = frame === 1 ? 2 : 1;
      const alpha = cycle % 1;
      rig.turnAngle = dampAngle(rig.turnAngle, enemy.facing > 0 ? 1.18 : -1.18, 20, safeDt);
      rig.bodyPivot.rotation.y = rig.turnAngle;
      const buffers = ensurePoseBuffers(rig);
      const target = interpolateKeyframes(ENEMY_SPRITE_KEYFRAMES, frame, nextFrame, alpha, true, buffers.target);
      applyKeyPoseToRig(rig, pose, target, safeDt, tickCount, Math.max(Math.abs(enemy.vx), 2.5), enemy.vy, {
        characterId: 'ren',
        grounded: !enemy.airborne,
        isFlying: enemy.type === 'jetpack',
        gstTimer: 0,
        invulnTimer: 0,
        atkTimer: 0,
        flameTimer: 0,
      }, null);
    } else {
      updateHeroRig3D(
        rig,
        {
          characterId: 'ren',
          pose,
          vx: moving ? Math.max(Math.abs(enemy.vx), 2.5) : 0,
          vy: enemy.vy,
          facing: enemy.facing,
          onWall: 0,
          grounded: !enemy.airborne,
          isDashing: false,
          isSliding: false,
          isFlying: enemy.type === 'jetpack',
          slashing: isAttacking,
          slashTimer: enemy.ai?.timer ?? 6,
          comboStep: 0,
          invulnTimer: 0,
          gstTimer: 0,
          atkTimer: 0,
          flameTimer: 0,
          stunTimer: enemy.stunTimer ?? 0,
          hp: enemy.hp,
          tickCount: tickCount + enemy.id * 7,
        },
        safeDt
      );
    }

    if (rig.shieldMesh) {
      rig.shieldMesh.visible = !enemy.shieldBroken;
    }
    if (rig.jetFlames) {
      for (const f of rig.jetFlames) {
        f.scale.y = 0.75 + Math.sin(tickCount * 0.6 + enemy.id) * 0.35;
      }
    }
  }

  const alpha = enemy.stealthAlpha ?? 1;
  for (const mat of rig.materials) {
    const toon = mat as THREE.MeshToonMaterial;
    if (mat !== rig.shieldMesh?.material) {
      toon.transparent = alpha < 1;
      toon.opacity = alpha;
    }
    if (hitFlash) {
      toon.emissive?.set('#ffffff');
      toon.emissiveIntensity = 1.6;
    } else if (enemy.burnTimer && enemy.burnTimer > 0) {
      toon.emissive?.set(tickCount % 6 < 3 ? '#f97316' : '#facc15');
      toon.emissiveIntensity = 0.6;
    } else {
      const baseE = rig.baseEmissive.get(mat);
      if (toon.emissive && baseE) {
        toon.emissive.copy(baseE);
        toon.emissiveIntensity = baseE.getHex() === 0 ? 0 : 0.8;
      }
    }
  }
}

export function buildBossRig3D(boss: BossRuntime): HumanoidRigParts {
  const scaleH = Math.max(1.25, boss.h / 56);
  const scaleW = Math.max(1.2, boss.w / 36);
  const rig = createBaseHumanoidRig({
    heightScale: scaleH,
    widthScale: scaleW,
    chestColor: boss.color,
    trimColor: boss.accentColor,
    pantsColor: '#0f172a',
    skinColor: '#cbd5e1',
    hairColor: '#090d16',
    visorColor: boss.accentColor,
    bootColor: '#020617',
    gloveColor: boss.accentColor,
    visorEmissive: 1.2,
  });

  // Heavy boss shoulder pauldrons & crown/crest
  const pauldronMat = makeToonMaterial(boss.accentColor, { emissive: boss.accentColor, emissiveIntensity: 0.35 });
  for (const sh of [rig.shoulderL, rig.shoulderR]) {
    const spike = cyl(0.05 * scaleW, 0.16 * scaleW, 0.25 * scaleH, 6, pauldronMat);
    spike.position.y = 0.08 * scaleH;
    sh.add(spike);
  }
  const crown = cyl(0.04 * scaleW, 0.18 * scaleW, 0.22 * scaleH, 6, pauldronMat);
  crown.position.y = 0.36 * scaleH;
  rig.head.add(crown);

  if (boss.behavior === 'valkyrie') {
    const wingMat = makeToonMaterial('#38bdf8', { emissive: '#0ea5e9', emissiveIntensity: 0.7 });
    for (const side of [-1, 1] as const) {
      const wing = new THREE.Mesh(new THREE.BoxGeometry(0.95 * scaleW, 0.14 * scaleH, 0.06), wingMat);
      wing.position.set(side * 0.55 * scaleW, 0.36 * scaleH, -0.2);
      wing.rotation.z = side * 0.35;
      rig.torso.add(wing);
    }
  }

  recordMaterials(rig, rig.root);
  return rig;
}

export function updateBossRig3D(rig: HumanoidRigParts, boss: BossRuntime, tickCount: number, dt: number): void {
  const safeDt = Math.min(0.05, Math.max(0.001, dt));
  const mind = boss.mind;
  const speed = Math.abs(boss.vx);
  const pose: HeroPose =
    mind?.state === 'active' || mind?.state === 'windup'
      ? 'attack3'
      : Math.abs(boss.vy) > 1.2
        ? boss.vy < 0
          ? 'jump'
          : 'fall'
        : speed > 0.6
          ? 'run'
          : 'idle';

  updateHeroRig3D(
    rig,
    {
      characterId: 'leon',
      pose,
      vx: boss.vx,
      vy: boss.vy,
      facing: boss.facing,
      onWall: 0,
      grounded: Math.abs(boss.vy) <= 0.5,
      isDashing: mind?.state === 'active' && (mind.attack === 'charge' || mind.attack === 'lunge'),
      isSliding: false,
      isFlying: boss.behavior === 'valkyrie' || boss.behavior === 'oswald',
      slashing: mind?.state === 'active',
      slashTimer: mind?.timer ?? 8,
      comboStep: 2,
      invulnTimer: 0,
      gstTimer: 0,
      atkTimer: boss.phase === 2 ? 10 : 0,
      flameTimer: 0,
      stunTimer: 0,
      hp: boss.hp,
      tickCount,
    },
    safeDt
  );

  for (const mat of rig.materials) {
    const toon = mat as THREE.MeshToonMaterial;
    if (boss.burnTimer && boss.burnTimer > 0) {
      toon.emissive?.set(tickCount % 6 < 3 ? '#f97316' : '#facc15');
      toon.emissiveIntensity = 0.7;
    } else if (boss.phase === 2) {
      const baseE = rig.baseEmissive.get(mat);
      if (baseE && baseE.getHex() === 0) {
        toon.emissive?.set(boss.accentColor);
        toon.emissiveIntensity = 0.25;
      }
    }
  }
}
