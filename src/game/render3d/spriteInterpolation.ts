import { HERO_CLIPS, type HeroPose } from '../heroAnimation';

export interface SkeletonKeyPose {
  hipsYOffset: number;
  bodyLeanX: number;
  torsoRotX: number;
  torsoRotY: number;
  headRotX: number;
  headRotY: number;
  shLX: number;
  shLZ: number;
  elLX: number;
  shRX: number;
  shRZ: number;
  elRX: number;
  hipLX: number;
  kneeLX: number;
  hipRX: number;
  kneeRX: number;
}

export interface SpriteFrameSample {
  pose: HeroPose;
  frame: number;
  nextFrame: number;
  frameAlpha: number;
  totalTicks: number;
  loop: boolean;
  normalizedTime: number;
}

export function createNeutralKeyPose(overrides: Partial<SkeletonKeyPose> = {}): SkeletonKeyPose {
  return {
    hipsYOffset: 0,
    bodyLeanX: 0,
    torsoRotX: 0,
    torsoRotY: 0,
    headRotX: 0,
    headRotY: 0,
    shLX: 0,
    shLZ: 0.14,
    elLX: -0.55,
    shRX: 0,
    shRZ: -0.14,
    elRX: -0.55,
    hipLX: 0,
    kneeLX: 0.08,
    hipRX: 0,
    kneeRX: 0.08,
    ...overrides,
  };
}

const k = createNeutralKeyPose;

/**
 * Keyframes matched 1-to-1 with every discrete frame in HERO_CLIPS.
 * The 2.5D renderer smoothly interpolates between these sprite frames at 60fps+.
 */
export const SPRITE_KEYFRAMES: Record<HeroPose, SkeletonKeyPose[]> = {
  idle: [
    k({ hipsYOffset: 0.0, torsoRotX: 0.04, torsoRotY: 0.12, headRotY: -0.08, shLX: -0.32, shLZ: 0.22, elLX: -1.02, shRX: -0.46, shRZ: -0.22, elRX: -1.12, hipLX: -0.14, kneeLX: 0.18, hipRX: 0.16, kneeRX: 0.12 }),
    k({ hipsYOffset: 0.022, torsoRotX: 0.075, torsoRotY: 0.15, headRotX: -0.03, headRotY: -0.1, shLX: -0.38, shLZ: 0.24, elLX: -1.08, shRX: -0.53, shRZ: -0.24, elRX: -1.18, hipLX: -0.15, kneeLX: 0.2, hipRX: 0.17, kneeRX: 0.14 }),
    k({ hipsYOffset: 0.012, torsoRotX: 0.06, torsoRotY: 0.1, headRotY: -0.06, shLX: -0.34, shLZ: 0.21, elLX: -1.05, shRX: -0.48, shRZ: -0.21, elRX: -1.15, hipLX: -0.13, kneeLX: 0.17, hipRX: 0.15, kneeRX: 0.11 }),
    k({ hipsYOffset: -0.014, torsoRotX: 0.03, torsoRotY: 0.11, headRotX: 0.02, headRotY: -0.07, shLX: -0.29, shLZ: 0.2, elLX: -0.98, shRX: -0.43, shRZ: -0.2, elRX: -1.08, hipLX: -0.14, kneeLX: 0.19, hipRX: 0.16, kneeRX: 0.13 }),
  ],
  run: [
    // Frame 0: mid-cross (left leg forward pass, right trailing)
    k({ hipsYOffset: 0.03, torsoRotX: 0.23, torsoRotY: -0.04, headRotX: -0.15, shLX: -0.05, shLZ: 0.18, elLX: -0.98, shRX: 0.05, shRZ: -0.18, elRX: -0.98, hipLX: 0.06, kneeLX: 1.02, hipRX: -0.08, kneeRX: 0.35 }),
    // Frame 1: peak right-drive / left-extension stride
    k({ hipsYOffset: -0.065, torsoRotX: 0.26, torsoRotY: -0.22, headRotX: -0.18, shLX: -0.82, shLZ: 0.2, elLX: -0.74, shRX: 0.82, shRZ: -0.2, elRX: -1.16, hipLX: 0.88, kneeLX: 0.24, hipRX: -0.88, kneeRX: 0.86 }),
    // Frame 2: follow-through float
    k({ hipsYOffset: 0.01, torsoRotX: 0.24, torsoRotY: -0.14, headRotX: -0.16, shLX: -0.52, shLZ: 0.18, elLX: -0.86, shRX: 0.52, shRZ: -0.18, elRX: -1.08, hipLX: 0.52, kneeLX: 0.58, hipRX: -0.54, kneeRX: 1.12 }),
    // Frame 3: opposite mid-cross (right leg forward pass, left trailing)
    k({ hipsYOffset: 0.03, torsoRotX: 0.23, torsoRotY: 0.04, headRotX: -0.15, shLX: 0.05, shLZ: 0.18, elLX: -0.98, shRX: -0.05, shRZ: -0.18, elRX: -0.98, hipLX: -0.08, kneeLX: 0.35, hipRX: 0.06, kneeRX: 1.02 }),
    // Frame 4: peak left-drive / right-extension stride
    k({ hipsYOffset: -0.065, torsoRotX: 0.26, torsoRotY: 0.22, headRotX: -0.18, shLX: 0.82, shLZ: 0.2, elLX: -1.16, shRX: -0.82, shRZ: -0.2, elRX: -0.74, hipLX: -0.88, kneeLX: 0.86, hipRX: 0.88, kneeRX: 0.24 }),
    // Frame 5: follow-through float
    k({ hipsYOffset: 0.01, torsoRotX: 0.24, torsoRotY: 0.14, headRotX: -0.16, shLX: 0.52, shLZ: 0.18, elLX: -1.08, shRX: -0.52, shRZ: -0.18, elRX: -0.86, hipLX: -0.54, kneeLX: 1.12, hipRX: 0.52, kneeRX: 0.58 }),
  ],
  jump: [
    k({ hipsYOffset: 0.08, bodyLeanX: 0.06, torsoRotX: 0.22, torsoRotY: -0.1, headRotX: -0.14, shLX: -1.38, shLZ: 0.28, elLX: -0.82, shRX: 0.65, shRZ: -0.22, elRX: -0.92, hipLX: -0.92, kneeLX: 1.38, hipRX: 0.36, kneeRX: 0.42 }),
    k({ hipsYOffset: 0.14, bodyLeanX: -0.04, torsoRotX: 0.14, torsoRotY: 0.06, headRotX: -0.18, shLX: -1.72, shLZ: 0.36, elLX: -0.58, shRX: 0.78, shRZ: -0.28, elRX: -0.72, hipLX: -1.12, kneeLX: 1.54, hipRX: 0.12, kneeRX: 0.62 }),
  ],
  fall: [
    k({ hipsYOffset: 0.04, bodyLeanX: -0.04, torsoRotX: -0.08, headRotX: 0.2, shLX: -2.22, shLZ: 0.56, elLX: -0.45, shRX: -1.98, shRZ: -0.56, elRX: -0.45, hipLX: -0.48, kneeLX: 0.72, hipRX: 0.28, kneeRX: 0.44 }),
    k({ hipsYOffset: -0.02, bodyLeanX: -0.08, torsoRotX: -0.14, headRotX: 0.26, shLX: -2.42, shLZ: 0.68, elLX: -0.34, shRX: -2.22, shRZ: -0.68, elRX: -0.34, hipLX: -0.58, kneeLX: 0.88, hipRX: 0.36, kneeRX: 0.56 }),
  ],
  wall: [
    k({ torsoRotX: 0.14, headRotY: -0.24, shLX: -2.12, shLZ: 0.18, elLX: -0.52, shRX: -1.65, elRX: -0.92, hipLX: -0.82, kneeLX: 1.24, hipRX: -0.24, kneeRX: 0.52 }),
    k({ hipsYOffset: -0.02, torsoRotX: 0.18, headRotY: -0.28, shLX: -2.22, shLZ: 0.2, elLX: -0.58, shRX: -1.76, elRX: -0.96, hipLX: -0.88, kneeLX: 1.32, hipRX: -0.3, kneeRX: 0.58 }),
  ],
  climb: [
    k({ hipsYOffset: 0.0, torsoRotX: 0.14, shLX: -2.42, elLX: -0.4, shRX: -1.42, elRX: -1.05, hipLX: -0.45, kneeLX: 0.72, hipRX: -0.62, kneeRX: 0.98 }),
    k({ hipsYOffset: 0.03, torsoRotX: 0.16, shLX: -1.95, elLX: -0.75, shRX: -1.85, elRX: -0.75, hipLX: -0.82, kneeLX: 1.22, hipRX: -0.25, kneeRX: 0.42 }),
    k({ hipsYOffset: 0.0, torsoRotX: 0.14, shLX: -1.42, elLX: -1.05, shRX: -2.42, elRX: -0.4, hipLX: -0.62, kneeLX: 0.98, hipRX: -0.45, kneeRX: 0.72 }),
    k({ hipsYOffset: 0.03, torsoRotX: 0.16, shLX: -1.85, elLX: -0.75, shRX: -1.95, elRX: -0.75, hipLX: -0.25, kneeLX: 0.42, hipRX: -0.82, kneeRX: 1.22 }),
  ],
  hang: [
    k({ torsoRotX: -0.04, shLX: -2.85, elLX: -0.15, shRX: -2.85, elRX: -0.15, hipLX: -0.22, kneeLX: 0.45, hipRX: 0.14, kneeRX: 0.38 }),
    k({ torsoRotX: 0.04, shLX: -2.8, elLX: -0.2, shRX: -2.8, elRX: -0.2, hipLX: -0.1, kneeLX: 0.52, hipRX: 0.24, kneeRX: 0.46 }),
  ],
  vault: [
    k({ hipsYOffset: 0.06, bodyLeanX: 0.24, torsoRotX: 0.36, shLX: -1.2, elLX: -0.7, shRX: -1.05, elRX: -0.82, hipLX: -1.02, kneeLX: 1.48, hipRX: -0.58, kneeRX: 0.95 }),
    k({ hipsYOffset: 0.16, bodyLeanX: 0.12, torsoRotX: 0.22, shLX: -1.78, shLZ: 0.34, elLX: -0.45, shRX: 0.65, elRX: -0.65, hipLX: -1.18, kneeLX: 1.52, hipRX: 0.24, kneeRX: 0.62 }),
    k({ hipsYOffset: 0.08, bodyLeanX: 0.04, torsoRotX: 0.12, shLX: -1.35, elLX: -0.65, shRX: 0.42, elRX: -0.75, hipLX: -0.58, kneeLX: 0.88, hipRX: 0.3, kneeRX: 0.42 }),
  ],
  dash: [
    k({ hipsYOffset: -0.12, bodyLeanX: 0.44, torsoRotX: 0.34, headRotX: -0.25, shLX: 0.68, elLX: -0.48, shRX: -0.78, elRX: -0.52, hipLX: -0.62, kneeLX: 0.95, hipRX: 0.65, kneeRX: 0.44 }),
    k({ hipsYOffset: -0.18, bodyLeanX: 0.64, torsoRotX: 0.48, headRotX: -0.34, shLX: 1.05, elLX: -0.3, shRX: -1.18, elRX: -0.36, hipLX: -0.82, kneeLX: 1.12, hipRX: 0.92, kneeRX: 0.34 }),
    k({ hipsYOffset: -0.1, bodyLeanX: 0.4, torsoRotX: 0.3, headRotX: -0.22, shLX: 0.56, elLX: -0.54, shRX: -0.66, elRX: -0.58, hipLX: -0.46, kneeLX: 0.78, hipRX: 0.5, kneeRX: 0.38 }),
  ],
  slide: [
    k({ hipsYOffset: -0.44, bodyLeanX: -0.96, torsoRotY: -0.18, headRotX: 0.42, shLX: 0.38, elLX: -0.85, shRX: -0.58, elRX: -0.5, hipLX: -0.22, kneeLX: 0.2, hipRX: 0.26, kneeRX: 1.12 }),
    k({ hipsYOffset: -0.5, bodyLeanX: -1.16, torsoRotY: -0.24, headRotX: 0.48, shLX: 0.52, elLX: -0.72, shRX: -0.72, elRX: -0.42, hipLX: -0.38, kneeLX: 0.08, hipRX: 0.34, kneeRX: 1.3 }),
  ],
  attack1: [
    // Windup coil -> Snappy forward slash/punch -> Crisp followthrough
    k({ hipsYOffset: -0.05, torsoRotX: 0.14, torsoRotY: 0.82, headRotY: -0.42, shRX: -0.95, shRZ: -0.78, elRX: -1.32, shLX: -0.35, shLZ: 0.36, elLX: -1.05, hipLX: -0.38, kneeLX: 0.52, hipRX: 0.4, kneeRX: 0.22 }),
    k({ hipsYOffset: -0.07, bodyLeanX: 0.14, torsoRotX: 0.28, torsoRotY: -0.86, headRotY: 0.34, shRX: -1.85, shRZ: 0.44, elRX: -0.16, shLX: 0.72, shLZ: 0.22, elLX: -0.82, hipLX: -0.68, kneeLX: 0.76, hipRX: 0.62, kneeRX: 0.28 }),
    k({ hipsYOffset: -0.02, bodyLeanX: 0.06, torsoRotX: 0.16, torsoRotY: -0.42, headRotY: 0.18, shRX: -1.42, shRZ: 0.26, elRX: -0.48, shLX: 0.38, elLX: -0.95, hipLX: -0.42, kneeLX: 0.5, hipRX: 0.38, kneeRX: 0.2 }),
  ],
  attack2: [
    // Cross-body backhand coil -> Reverse sweep -> Followthrough
    k({ hipsYOffset: -0.06, torsoRotX: 0.16, torsoRotY: -0.85, headRotY: 0.38, shLX: -1.05, shLZ: 0.78, elLX: -1.28, shRX: 0.32, elRX: -0.98, hipLX: -0.42, kneeLX: 0.56, hipRX: 0.42, kneeRX: 0.24 }),
    k({ hipsYOffset: -0.08, bodyLeanX: 0.16, torsoRotX: 0.3, torsoRotY: 0.92, headRotY: -0.36, shLX: -1.92, shLZ: -0.42, elLX: -0.16, shRX: 0.76, elRX: -0.78, hipLX: -0.7, kneeLX: 0.78, hipRX: 0.64, kneeRX: 0.3 }),
    k({ hipsYOffset: -0.02, bodyLeanX: 0.05, torsoRotX: 0.16, torsoRotY: 0.42, headRotY: -0.16, shLX: -1.38, shLZ: -0.18, elLX: -0.5, shRX: 0.34, elRX: -0.92, hipLX: -0.4, kneeLX: 0.48, hipRX: 0.36, kneeRX: 0.2 }),
  ],
  attack3: [
    // Rising launcher / heavy finisher coil -> Explosive overhead/uppercut drive -> Landing recovery
    k({ hipsYOffset: -0.12, bodyLeanX: 0.06, torsoRotX: 0.24, torsoRotY: -0.72, headRotY: 0.28, shRX: -0.45, shRZ: -0.45, elRX: -1.45, shLX: -0.65, elLX: -1.15, hipLX: -0.52, kneeLX: 0.82, hipRX: 0.42, kneeRX: 0.44 }),
    k({ hipsYOffset: 0.22, bodyLeanX: -0.08, torsoRotX: -0.12, torsoRotY: 0.85, headRotX: -0.22, headRotY: -0.32, shRX: -2.95, shRZ: 0.24, elRX: -0.14, shLX: -1.78, elLX: -0.46, hipLX: -0.78, kneeLX: 0.88, hipRX: 0.56, kneeRX: 0.28 }),
    k({ hipsYOffset: 0.07, bodyLeanX: 0.04, torsoRotX: 0.14, torsoRotY: 0.34, headRotX: -0.05, shRX: -2.02, shRZ: 0.1, elRX: -0.42, shLX: -1.08, elLX: -0.75, hipLX: -0.44, kneeLX: 0.52, hipRX: 0.38, kneeRX: 0.22 }),
  ],
  hurt: [
    k({ torsoRotX: -0.46, headRotX: -0.36, headRotY: -0.26, shLX: -0.95, shLZ: 0.68, shRX: -0.95, shRZ: -0.68, hipLX: -0.24, kneeLX: 0.38, hipRX: 0.22, kneeRX: 0.28 }),
    k({ torsoRotX: -0.26, headRotX: -0.16, headRotY: 0.16, shLX: -0.68, shLZ: 0.5, shRX: -0.68, shRZ: -0.5, hipLX: -0.18, kneeLX: 0.26, hipRX: 0.18, kneeRX: 0.2 }),
  ],
  stun: [
    k({ torsoRotX: -0.22, torsoRotY: -0.22, headRotX: 0.18, headRotY: -0.32, shLX: -0.52, shLZ: 0.48, elLX: -0.82, shRX: -0.52, shRZ: -0.48, elRX: -0.82 }),
    k({ torsoRotX: -0.18, torsoRotY: 0.22, headRotX: 0.24, headRotY: 0.32, shLX: -0.44, shLZ: 0.4, elLX: -0.92, shRX: -0.44, shRZ: -0.4, elRX: -0.92 }),
  ],
  special: [
    k({ hipsYOffset: -0.08, torsoRotX: 0.22, headRotX: 0.12, shLX: -1.25, shLZ: 0.18, elLX: -1.25, shRX: -1.25, shRZ: -0.18, elRX: -1.25, hipLX: -0.32, kneeLX: 0.48, hipRX: 0.28, kneeRX: 0.34 }),
    k({ hipsYOffset: 0.12, torsoRotX: -0.22, headRotX: -0.28, shLX: -2.55, shLZ: 0.58, elLX: -0.18, shRX: -2.55, shRZ: -0.58, elRX: -0.18 }),
    k({ hipsYOffset: 0.16, torsoRotX: -0.28, headRotX: -0.32, shLX: -2.78, shLZ: 0.72, elLX: -0.1, shRX: -2.78, shRZ: -0.72, elRX: -0.1 }),
    k({ hipsYOffset: 0.04, torsoRotX: -0.05, headRotX: -0.06, shLX: -1.8, shLZ: 0.35, elLX: -0.45, shRX: -1.8, shRZ: -0.35, elRX: -0.45 }),
  ],
  flight: [
    k({ hipsYOffset: 0.08, torsoRotX: 0.2, shLX: -1.22, shLZ: 0.62, elLX: -0.42, shRX: -1.22, shRZ: -0.62, elRX: -0.42, hipLX: 0.22, kneeLX: 0.5, hipRX: -0.14, kneeRX: 0.32 }),
    k({ hipsYOffset: 0.18, torsoRotX: 0.24, shLX: -1.42, shLZ: 0.72, elLX: -0.32, shRX: -1.42, shRZ: -0.72, elRX: -0.32, hipLX: 0.32, kneeLX: 0.62, hipRX: -0.22, kneeRX: 0.42 }),
    k({ hipsYOffset: 0.12, torsoRotX: 0.22, shLX: -1.3, shLZ: 0.68, elLX: -0.38, shRX: -1.3, shRZ: -0.68, elRX: -0.38, hipLX: 0.26, kneeLX: 0.55, hipRX: -0.18, kneeRX: 0.36 }),
    k({ hipsYOffset: 0.05, torsoRotX: 0.18, shLX: -1.16, shLZ: 0.58, elLX: -0.45, shRX: -1.16, shRZ: -0.58, elRX: -0.45, hipLX: 0.18, kneeLX: 0.46, hipRX: -0.1, kneeRX: 0.28 }),
  ],
  death: [
    k({ hipsYOffset: 0.0, bodyLeanX: -0.25, torsoRotX: -0.3, shLX: -0.9, shRX: -0.7 }),
    k({ hipsYOffset: -0.22, bodyLeanX: -0.72, torsoRotX: -0.2, shLX: -1.1, shRX: -0.85, hipLX: -0.3, kneeLX: 0.6, hipRX: 0.25, kneeRX: 0.55 }),
    k({ hipsYOffset: -0.44, bodyLeanX: -1.25, torsoRotX: -0.08, shLX: -1.2, shRX: -0.9, hipLX: -0.15, kneeLX: 0.25, hipRX: 0.15, kneeRX: 0.25 }),
    k({ hipsYOffset: -0.54, bodyLeanX: -1.48, torsoRotX: 0, shLX: -1.2, shRX: -0.9, hipLX: 0, kneeLX: 0.12, hipRX: 0.05, kneeRX: 0.12 }),
  ],
};

/** 4-frame enemy sprite keyframe poses matching ENEMY_FRAME (idle, runA, runB, attack). */
export const ENEMY_SPRITE_KEYFRAMES: SkeletonKeyPose[] = [
  SPRITE_KEYFRAMES.idle[0],
  SPRITE_KEYFRAMES.run[1],
  SPRITE_KEYFRAMES.run[4],
  SPRITE_KEYFRAMES.attack1[1],
];

/** Samples a sprite clip continuously (supporting fractional ticks at 60fps+ refresh rates). */
export function sampleSpriteClipAt(pose: HeroPose, elapsedTicks: number): SpriteFrameSample {
  const clip = HERO_CLIPS[pose];
  const durations = clip.durations;
  const totalTicks = durations.reduce((acc, d) => acc + d, 0);
  const clamped = Math.max(0, elapsedTicks);
  const time = clip.loop ? clamped % totalTicks : Math.min(clamped, Math.max(0, totalTicks - 0.001));

  let cursor = time;
  for (let frame = 0; frame < durations.length; frame++) {
    const dur = durations[frame];
    if (cursor < dur || frame === durations.length - 1) {
      const localAlpha = dur > 0 ? Math.min(1, Math.max(0, cursor / dur)) : 0;
      const isLast = frame === durations.length - 1;
      const nextFrame = clip.loop ? (frame + 1) % durations.length : Math.min(durations.length - 1, frame + 1);
      const frameAlpha = !clip.loop && isLast ? 0 : localAlpha;
      return {
        pose,
        frame,
        nextFrame,
        frameAlpha,
        totalTicks,
        loop: clip.loop,
        normalizedTime: totalTicks > 0 ? time / totalTicks : 0,
      };
    }
    cursor -= dur;
  }

  return {
    pose,
    frame: durations.length - 1,
    nextFrame: clip.loop ? 0 : durations.length - 1,
    frameAlpha: 0,
    totalTicks,
    loop: clip.loop,
    normalizedTime: 1,
  };
}

export function catmullRomScalar(p0: number, p1: number, p2: number, p3: number, t: number): number {
  const t2 = t * t;
  const t3 = t2 * t;
  return 0.5 * (
    (2 * p1) +
    (-p0 + p2) * t +
    (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
    (-p0 + 3 * p1 - 3 * p2 + p3) * t3
  );
}

const KEY_FIELDS: (keyof SkeletonKeyPose)[] = [
  'hipsYOffset',
  'bodyLeanX',
  'torsoRotX',
  'torsoRotY',
  'headRotX',
  'headRotY',
  'shLX',
  'shLZ',
  'elLX',
  'shRX',
  'shRZ',
  'elRX',
  'hipLX',
  'kneeLX',
  'hipRX',
  'kneeRX',
];

/**
 * Interpolates smoothly between discrete sprite keyframes using Catmull-Rom splines
 * on multi-frame loops (>= 3 frames) and smoothstep Hermite on 2-frame or clamped clips.
 */
export function interpolateKeyframes(
  frames: SkeletonKeyPose[],
  frame: number,
  nextFrame: number,
  alpha: number,
  loop: boolean,
  out: SkeletonKeyPose = createNeutralKeyPose()
): SkeletonKeyPose {
  const len = frames.length;
  if (len === 0) return out;
  const f1 = ((frame % len) + len) % len;
  const f2 = ((nextFrame % len) + len) % len;
  const t = Math.min(1, Math.max(0, alpha));

  if (f1 === f2 || t <= 0) {
    const src = frames[f1];
    for (const field of KEY_FIELDS) out[field] = src[field];
    return out;
  }

  if (len >= 3) {
    const f0 = loop ? (f1 - 1 + len) % len : Math.max(0, f1 - 1);
    const f3 = loop ? (f2 + 1) % len : Math.min(len - 1, f2 + 1);
    const k0 = frames[f0];
    const k1 = frames[f1];
    const k2 = frames[f2];
    const k3 = frames[f3];
    for (const field of KEY_FIELDS) {
      out[field] = catmullRomScalar(k0[field], k1[field], k2[field], k3[field], t);
    }
    return out;
  }

  const smoothT = t * t * (3 - 2 * t);
  const k1 = frames[f1];
  const k2 = frames[f2];
  for (const field of KEY_FIELDS) {
    out[field] = k1[field] + (k2[field] - k1[field]) * smoothT;
  }
  return out;
}

export function blendPoseTargets(
  from: SkeletonKeyPose,
  to: SkeletonKeyPose,
  weight: number,
  out: SkeletonKeyPose = createNeutralKeyPose()
): SkeletonKeyPose {
  const w = Math.min(1, Math.max(0, weight));
  for (const field of KEY_FIELDS) {
    out[field] = from[field] + (to[field] - from[field]) * w;
  }
  return out;
}

/** Sub-tick spatial interpolation guarded against teleports, respawns and area jumps. */
export function lerpActorPosition(
  prevX: number,
  prevY: number,
  currX: number,
  currY: number,
  alpha: number,
  maxSnapDistance = 80
): { x: number; y: number } {
  const a = Math.min(1, Math.max(0, alpha));
  const dx = currX - prevX;
  const dy = currY - prevY;
  if (Math.abs(dx) > maxSnapDistance || Math.abs(dy) > maxSnapDistance) {
    return { x: currX, y: currY };
  }
  return {
    x: prevX + dx * a,
    y: prevY + dy * a,
  };
}
