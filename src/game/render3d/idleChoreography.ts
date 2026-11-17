import type { HeroPose } from '../heroAnimation';
import type { CharacterId } from '../types';
import {
  type SkeletonKeyPose,
  blendPoseTargets,
  createNeutralKeyPose,
} from './spriteInterpolation';

export const MEDITATION_START_TICKS = 300; // 5.0s at 60Hz before meditation begins
export const MEDITATION_RAMP_TICKS = 90;   // 1.5s smooth transition into full meditation

export type FacialExpression =
  | 'neutral'
  | 'serious'
  | 'determined'
  | 'angry'
  | 'shout'
  | 'calm'
  | 'serene'
  | 'smug'
  | 'suspicious'
  | 'hurt'
  | 'wince'
  | 'meditate';

export interface FaceState {
  expression: FacialExpression;
  eyeOpenL: number;
  eyeOpenR: number;
  eyeLookX: number;
  eyeLookY: number;
  browTiltL: number;
  browTiltR: number;
  browHeightL: number;
  browHeightR: number;
  mouthOpen: number;
  mouthWidth: number;
  mouthCurve: number;
}

export interface IdleChoreographyResult {
  segmentName: string;
  expression: FacialExpression;
  meditationFactor: number;
  stealthOpacity: number;
  darkenFactor: number;
  flameIgnite: number;
  psychicGlow: number;
  eyeLookX: number;
  eyeLookY: number;
  winceBeat: number;
}

export function createNeutralFaceState(expression: FacialExpression = 'neutral'): FaceState {
  return {
    expression,
    eyeOpenL: 1,
    eyeOpenR: 1,
    eyeLookX: 0,
    eyeLookY: 0,
    browTiltL: 0,
    browTiltR: 0,
    browHeightL: 0,
    browHeightR: 0,
    mouthOpen: 0.05,
    mouthWidth: 1,
    mouthCurve: 0,
  };
}

interface IdleSegment {
  name: string;
  duration: number;
  expression: FacialExpression;
  evaluate: (localT: number, localTicks: number, out: SkeletonKeyPose, outLook: { x: number; y: number; wince: number }) => void;
}

function smooth(t: number): number {
  const c = Math.min(1, Math.max(0, t));
  return c * c * (3 - 2 * c);
}

function bell(t: number, attackEnd = 0.22, releaseStart = 0.78): number {
  if (t <= 0 || t >= 1) return 0;
  if (t < attackEnd) return smooth(t / attackEnd);
  if (t > releaseStart) return smooth((1 - t) / (1 - releaseStart));
  return 1;
}

function setPose(out: SkeletonKeyPose, overrides: Partial<SkeletonKeyPose>): void {
  out.hipsYOffset = overrides.hipsYOffset ?? 0;
  out.bodyLeanX = overrides.bodyLeanX ?? 0;
  out.torsoRotX = overrides.torsoRotX ?? 0;
  out.torsoRotY = overrides.torsoRotY ?? 0;
  out.headRotX = overrides.headRotX ?? 0;
  out.headRotY = overrides.headRotY ?? 0;
  out.shLX = overrides.shLX ?? 0;
  out.shLZ = overrides.shLZ ?? 0.16;
  out.elLX = overrides.elLX ?? -0.55;
  out.shRX = overrides.shRX ?? 0;
  out.shRZ = overrides.shRZ ?? -0.16;
  out.elRX = overrides.elRX ?? -0.55;
  out.hipLX = overrides.hipLX ?? 0;
  out.kneeLX = overrides.kneeLX ?? 0.1;
  out.hipRX = overrides.hipRX ?? 0;
  out.kneeRX = overrides.kneeRX ?? 0.1;
}

// =========================================================================
// REN: Practical, sharp, slightly paranoid shinobi idle segments
// =========================================================================
const REN_IDLE_SEGMENTS: IdleSegment[] = [
  {
    name: 'alert_stance',
    duration: 74,
    expression: 'serious',
    evaluate(t, ticks, out, look) {
      const b = Math.sin(ticks * 0.085);
      setPose(out, {
        hipsYOffset: b * 0.015,
        torsoRotX: 0.06 + b * 0.015,
        torsoRotY: 0.18,
        headRotX: 0.02,
        headRotY: -0.14,
        shLX: -0.35 + b * 0.03,
        shLZ: 0.22,
        elLX: -1.12,
        shRX: -0.42 - b * 0.03,
        shRZ: -0.22,
        elRX: -1.18,
        hipLX: -0.16,
        kneeLX: 0.24,
        hipRX: 0.18,
        kneeRX: 0.14,
      });
      look.x = 0.08 * Math.sin(t * Math.PI * 2);
      look.y = 0;
      look.wince = 0;
    },
  },
  {
    name: 'scan_flanks',
    duration: 64,
    expression: 'suspicious',
    evaluate(t, ticks, out, look) {
      // Quick turn right, pause, snap check behind/left
      const scan = t < 0.45
        ? smooth(t / 0.22) * (t > 0.34 ? 1 - smooth((t - 0.34) / 0.11) : 1) * 0.62
        : -smooth((t - 0.45) / 0.18) * (t > 0.8 ? 1 - smooth((t - 0.8) / 0.2) : 1) * 0.72;
      const b = Math.sin(ticks * 0.09) * 0.012;
      setPose(out, {
        hipsYOffset: -0.02 + b,
        torsoRotX: 0.1,
        torsoRotY: 0.12 + scan * 0.35,
        headRotX: 0.04,
        headRotY: scan,
        shLX: -0.44,
        shLZ: 0.24,
        elLX: -1.25,
        shRX: -0.52,
        shRZ: -0.2,
        elRX: -1.28,
        hipLX: -0.18,
        kneeLX: 0.28,
        hipRX: 0.2,
        kneeRX: 0.18,
      });
      look.x = Math.max(-1, Math.min(1, scan * 1.4));
      look.y = 0;
      look.wince = 0;
    },
  },
  {
    name: 'crouch_sneak',
    duration: 78,
    expression: 'suspicious',
    evaluate(t, ticks, out, look) {
      const duck = bell(t, 0.2, 0.78);
      const peek = Math.sin(t * Math.PI * 2) * 0.32 * duck;
      const breath = Math.sin(ticks * 0.1) * 0.01;
      setPose(out, {
        hipsYOffset: -0.26 * duck + breath,
        bodyLeanX: 0.16 * duck,
        torsoRotX: 0.08 + 0.32 * duck,
        torsoRotY: 0.18 + peek * 0.45,
        headRotX: -0.22 * duck,
        headRotY: -0.14 + peek,
        shLX: -0.35 - 0.38 * duck,
        shLZ: 0.24 + 0.12 * duck,
        elLX: -1.1 - 0.35 * duck,
        shRX: -0.42 + 0.75 * duck, // blade arm tucked discreetly behind hip while sneaking
        shRZ: -0.22 - 0.1 * duck,
        elRX: -1.15 + 0.45 * duck,
        hipLX: -0.16 - 0.56 * duck,
        kneeLX: 0.22 + 0.98 * duck,
        hipRX: 0.18 - 0.36 * duck,
        kneeRX: 0.14 + 0.92 * duck,
      });
      look.x = peek * 1.8;
      look.y = 0.22 * duck;
      look.wince = 0;
    },
  },
  {
    name: 'look_up_ceiling',
    duration: 54,
    expression: 'suspicious',
    evaluate(t, _ticks, out, look) {
      const up = bell(t, 0.24, 0.72);
      setPose(out, {
        hipsYOffset: -0.04 * up,
        torsoRotX: 0.06 - 0.12 * up,
        torsoRotY: 0.16,
        headRotX: -0.52 * up,
        headRotY: -0.1 + Math.sin(t * Math.PI * 3) * 0.12 * up,
        shLX: -0.38,
        shLZ: 0.24,
        elLX: -1.18,
        shRX: -0.68 * up - 0.35 * (1 - up),
        shRZ: -0.24,
        elRX: -1.35,
        hipLX: -0.18,
        kneeLX: 0.26,
        hipRX: 0.2,
        kneeRX: 0.18,
      });
      look.x = Math.sin(t * Math.PI * 2) * 0.25 * up;
      look.y = 0.85 * up;
      look.wince = 0;
    },
  },
  {
    name: 'blade_check',
    duration: 68,
    expression: 'determined',
    evaluate(t, _ticks, out, look) {
      const inspect = bell(t, 0.25, 0.75);
      setPose(out, {
        hipsYOffset: -0.02 * inspect,
        torsoRotX: 0.08 + 0.06 * inspect,
        torsoRotY: 0.18 - 0.35 * inspect,
        headRotX: 0.24 * inspect,
        headRotY: -0.14 + 0.36 * inspect,
        shLX: -0.32,
        shLZ: 0.22,
        elLX: -1.05,
        shRX: -0.45 - 0.72 * inspect,
        shRZ: -0.22 + 0.34 * inspect,
        elRX: -1.15 - 0.32 * inspect,
        hipLX: -0.15,
        kneeLX: 0.2,
        hipRX: 0.17,
        kneeRX: 0.15,
      });
      look.x = 0.35 * inspect;
      look.y = -0.55 * inspect;
      look.wince = 0;
    },
  },
];

// =========================================================================
// MAYA: Calm, placid, serene psychic idle segments
// =========================================================================
const MAYA_IDLE_SEGMENTS: IdleSegment[] = [
  {
    name: 'serene_poise',
    duration: 102,
    expression: 'serene',
    evaluate(_t, ticks, out, look) {
      const b = Math.sin(ticks * 0.055);
      setPose(out, {
        hipsYOffset: b * 0.02,
        torsoRotX: 0.02 + b * 0.015,
        torsoRotY: 0.08,
        headRotX: -0.02 + b * 0.02,
        headRotY: -0.06,
        shLX: -0.14 + b * 0.03,
        shLZ: 0.2 + b * 0.03,
        elLX: -0.58,
        shRX: -0.16 - b * 0.03,
        shRZ: -0.2 - b * 0.03,
        elRX: -0.62,
        hipLX: -0.08,
        kneeLX: 0.12,
        hipRX: 0.1,
        kneeRX: 0.1,
      });
      look.x = 0;
      look.y = 0;
      look.wince = 0;
    },
  },
  {
    name: 'psychic_palm_focus',
    duration: 94,
    expression: 'calm',
    evaluate(t, ticks, out, look) {
      const w = bell(t, 0.24, 0.76);
      const floatWave = Math.sin(ticks * 0.08) * 0.035 * w;
      setPose(out, {
        hipsYOffset: 0.05 * w + floatWave,
        torsoRotX: 0.03,
        torsoRotY: 0.04,
        headRotX: 0.1 * w,
        headRotY: -0.04,
        shLX: -0.14 - 0.68 * w,
        shLZ: 0.2 - 0.34 * w,
        elLX: -0.58 - 0.62 * w,
        shRX: -0.16 - 0.66 * w,
        shRZ: -0.2 + 0.34 * w,
        elRX: -0.62 - 0.62 * w,
        hipLX: -0.08 + 0.05 * w,
        kneeLX: 0.12 + 0.12 * w,
        hipRX: 0.1 - 0.05 * w,
        kneeRX: 0.1 + 0.1 * w,
      });
      look.x = 0;
      look.y = -0.35 * w;
      look.wince = 0;
    },
  },
  {
    name: 'horizon_glance',
    duration: 86,
    expression: 'serene',
    evaluate(t, ticks, out, look) {
      const turn = Math.sin(t * Math.PI) * 0.34;
      const b = Math.sin(ticks * 0.06) * 0.018;
      setPose(out, {
        hipsYOffset: b,
        torsoRotX: 0.02,
        torsoRotY: 0.08 + turn * 0.25,
        headRotX: -0.06 * bell(t),
        headRotY: -0.06 + turn,
        shLX: -0.12,
        shLZ: 0.22,
        elLX: -0.52,
        shRX: -0.22,
        shRZ: -0.22,
        elRX: -0.72,
        hipLX: -0.09,
        kneeLX: 0.12,
        hipRX: 0.11,
        kneeRX: 0.1,
      });
      look.x = turn * 1.3;
      look.y = 0.12 * bell(t);
      look.wince = 0;
    },
  },
  {
    name: 'gentle_hover_stretch',
    duration: 98,
    expression: 'serene',
    evaluate(t, ticks, out, look) {
      const lift = bell(t, 0.25, 0.75);
      const wave = Math.sin(ticks * 0.07) * 0.02;
      setPose(out, {
        hipsYOffset: 0.12 * lift + wave,
        torsoRotX: -0.04 * lift,
        torsoRotY: 0.06,
        headRotX: -0.08 * lift,
        headRotY: 0.1 * lift,
        shLX: -0.14 - 0.35 * lift,
        shLZ: 0.2 + 0.36 * lift,
        elLX: -0.58 + 0.24 * lift,
        shRX: -0.16 - 0.35 * lift,
        shRZ: -0.2 - 0.36 * lift,
        elRX: -0.62 + 0.24 * lift,
        hipLX: -0.06,
        kneeLX: 0.18 * lift + 0.12,
        hipRX: 0.08,
        kneeRX: 0.22 * lift + 0.12,
      });
      look.x = 0.22 * lift;
      look.y = 0.15 * lift;
      look.wince = 0;
    },
  },
];

// =========================================================================
// LEON: Ready for action, upbeat & goofy brawler idle segments
// =========================================================================
const LEON_IDLE_SEGMENTS: IdleSegment[] = [
  {
    name: 'boxer_bounce',
    duration: 68,
    expression: 'determined',
    evaluate(_t, ticks, out, look) {
      const bounce = Math.abs(Math.sin(ticks * 0.14));
      const sway = Math.sin(ticks * 0.07);
      setPose(out, {
        hipsYOffset: -0.03 + bounce * 0.045,
        torsoRotX: 0.08,
        torsoRotY: 0.22 + sway * 0.1,
        headRotX: 0.03,
        headRotY: -0.16 - sway * 0.06,
        shLX: -0.62 + bounce * 0.08,
        shLZ: 0.28,
        elLX: -1.45,
        shRX: -0.74 - bounce * 0.08,
        shRZ: -0.26,
        elRX: -1.55,
        hipLX: -0.22,
        kneeLX: 0.28 + bounce * 0.06,
        hipRX: 0.24,
        kneeRX: 0.2 + bounce * 0.06,
      });
      look.x = 0;
      look.y = 0;
      look.wince = 0;
    },
  },
  {
    name: 'shadow_jabs',
    duration: 72,
    expression: 'determined',
    evaluate(t, _ticks, out, look) {
      // Three snappy playful air punches: quick left jab, right cross, playful uppercut!
      const jab1 = Math.sin(Math.min(1, Math.max(0, (t - 0.08) / 0.22)) * Math.PI);
      const jab2 = Math.sin(Math.min(1, Math.max(0, (t - 0.34) / 0.24)) * Math.PI);
      const upper = Math.sin(Math.min(1, Math.max(0, (t - 0.62) / 0.3)) * Math.PI);
      setPose(out, {
        hipsYOffset: -0.05 + upper * 0.07,
        torsoRotX: 0.12 - upper * 0.1,
        torsoRotY: 0.15 + jab1 * 0.45 - jab2 * 0.55 - upper * 0.35,
        headRotX: 0.04 - upper * 0.1,
        headRotY: -0.1 - jab1 * 0.2 + jab2 * 0.25,
        shLX: -0.7 - jab1 * 0.95,
        shLZ: 0.28 - jab1 * 0.2,
        elLX: -1.45 + jab1 * 1.15,
        shRX: -0.75 - jab2 * 1.0 - upper * 1.35,
        shRZ: -0.26 + jab2 * 0.22,
        elRX: -1.5 + jab2 * 1.25 + upper * 0.5,
        hipLX: -0.26,
        kneeLX: 0.32,
        hipRX: 0.26,
        kneeRX: 0.24,
      });
      look.x = jab2 * 0.15 - jab1 * 0.1;
      look.y = upper * 0.3;
      look.wince = 0;
    },
  },
  {
    name: 'chest_thump_taunt',
    duration: 60,
    expression: 'smug',
    evaluate(t, _ticks, out, look) {
      // Proudly puffs chest & thumps chest twice with fist!
      const puff = bell(t, 0.2, 0.8);
      const beat1 = Math.sin(Math.min(1, Math.max(0, (t - 0.22) / 0.24)) * Math.PI);
      const beat2 = Math.sin(Math.min(1, Math.max(0, (t - 0.52) / 0.26)) * Math.PI);
      const thump = Math.max(beat1, beat2);
      setPose(out, {
        hipsYOffset: 0.02 * puff,
        torsoRotX: -0.12 * puff + thump * 0.08,
        torsoRotY: 0.14 - 0.2 * puff,
        headRotX: -0.12 * puff + thump * 0.06,
        headRotY: -0.08,
        shLX: -0.45 + 0.15 * puff,
        shLZ: 0.28 + 0.18 * puff,
        elLX: -1.15,
        shRX: -0.75 - 0.52 * puff + thump * 0.26,
        shRZ: -0.25 + 0.52 * puff,
        elRX: -1.4 - 0.72 * puff - thump * 0.25,
        hipLX: -0.18,
        kneeLX: 0.2,
        hipRX: 0.2,
        kneeRX: 0.16,
      });
      look.x = 0.05;
      look.y = 0.15 * puff;
      look.wince = 0;
    },
  },
  {
    name: 'chest_cough',
    duration: 74,
    expression: 'wince',
    evaluate(t, _ticks, out, look) {
      // Immediately after thumping too hard: winces, hunches forward & coughs 3 times into fist!
      const w = bell(t, 0.16, 0.82);
      const coughPulse = t > 0.16 && t < 0.78
        ? Math.max(0, Math.sin((t - 0.16) * Math.PI * 5.2))
        : 0;
      setPose(out, {
        hipsYOffset: -0.06 * w - coughPulse * 0.035,
        torsoRotX: 0.34 * w + coughPulse * 0.18,
        torsoRotY: 0.18,
        headRotX: 0.36 * w + coughPulse * 0.24,
        headRotY: -0.12,
        shLX: -0.35 + 0.22 * w,
        shLZ: 0.22,
        elLX: -0.95,
        shRX: -1.25 * w - 0.55 * (1 - w) - coughPulse * 0.14,
        shRZ: -0.22 + 0.44 * w,
        elRX: -1.75 * w - 1.2 * (1 - w) - coughPulse * 0.2,
        hipLX: -0.2,
        kneeLX: 0.36 * w + 0.2,
        hipRX: 0.18,
        kneeRX: 0.32 * w + 0.16,
      });
      look.x = 0;
      look.y = -0.35 * w;
      look.wince = Math.max(w * 0.75, coughPulse);
    },
  },
  {
    name: 'shoulder_roll_ready',
    duration: 62,
    expression: 'determined',
    evaluate(t, _ticks, out, look) {
      const roll = Math.sin(t * Math.PI * 2);
      const w = bell(t, 0.2, 0.8);
      setPose(out, {
        hipsYOffset: -0.02 * w,
        torsoRotX: 0.05,
        torsoRotY: 0.16 + roll * 0.22 * w,
        headRotX: 0.02,
        headRotY: -0.14 - roll * 0.14 * w,
        shLX: -0.45 + roll * 0.28 * w,
        shLZ: 0.26 + Math.abs(roll) * 0.15 * w,
        elLX: -1.15,
        shRX: -0.52 - roll * 0.28 * w,
        shRZ: -0.26 - Math.abs(roll) * 0.15 * w,
        elRX: -1.2,
        hipLX: -0.2,
        kneeLX: 0.24,
        hipRX: 0.22,
        kneeRX: 0.18,
      });
      look.x = -roll * 0.2;
      look.y = 0;
      look.wince = 0;
    },
  },
];

const HERO_IDLE_TABLES: Record<CharacterId, IdleSegment[]> = {
  ren: REN_IDLE_SEGMENTS,
  maya: MAYA_IDLE_SEGMENTS,
  leon: LEON_IDLE_SEGMENTS,
};

function computeMeditationPose(
  heroId: CharacterId,
  tickCount: number,
  out: SkeletonKeyPose
): { stealthOpacity: number; darkenFactor: number; flameIgnite: number; psychicGlow: number } {
  const breath = Math.sin(tickCount * 0.048);

  if (heroId === 'ren') {
    // Standing upright, centered, hands brought together in focused shinobi mudra
    setPose(out, {
      hipsYOffset: 0.02 + breath * 0.014,
      bodyLeanX: 0,
      torsoRotX: 0.015 + breath * 0.018,
      torsoRotY: 0,
      headRotX: 0.08 + breath * 0.01,
      headRotY: 0,
      shLX: -0.78,
      shLZ: -0.24,
      elLX: -1.28,
      shRX: -0.78,
      shRZ: 0.24,
      elRX: -1.28,
      hipLX: -0.05,
      kneeLX: 0.08,
      hipRX: 0.05,
      kneeRX: 0.08,
    });
    return {
      stealthOpacity: 0.3 + breath * 0.04,
      darkenFactor: 0.72,
      flameIgnite: 0,
      psychicGlow: 0,
    };
  }

  if (heroId === 'maya') {
    // Levitating peacefully off the floor with crossed lotus-like legs and eyes closed
    const hover = Math.sin(tickCount * 0.052);
    setPose(out, {
      hipsYOffset: 0.58 + hover * 0.09,
      bodyLeanX: 0,
      torsoRotX: 0.02 + breath * 0.015,
      torsoRotY: 0,
      headRotX: 0.12 + breath * 0.015,
      headRotY: 0,
      shLX: -0.52,
      shLZ: 0.34,
      elLX: -1.18,
      shRX: -0.52,
      shRZ: -0.34,
      elRX: -1.18,
      hipLX: -0.88,
      kneeLX: 1.52,
      hipRX: -0.88,
      kneeRX: 1.52,
    });
    return {
      stealthOpacity: 1,
      darkenFactor: 0,
      flameIgnite: 0,
      psychicGlow: 0.85 + breath * 0.15,
    };
  }

  // Leon: Grounded steady stance, deep chest breathing, arms calm/balanced, softly igniting
  const deepBreath = Math.sin(tickCount * 0.042);
  setPose(out, {
    hipsYOffset: -0.02 + deepBreath * 0.024,
    bodyLeanX: 0,
    torsoRotX: 0.02 - deepBreath * 0.045, // chest swells backward & upward on deep inhale
    torsoRotY: 0,
    headRotX: 0.1 - deepBreath * 0.03,
    headRotY: 0,
    shLX: -0.42 + deepBreath * 0.05,
    shLZ: 0.24 + deepBreath * 0.04,
    elLX: -1.05,
    shRX: -0.42 + deepBreath * 0.05,
    shRZ: -0.24 - deepBreath * 0.04,
    elRX: -1.05,
    hipLX: -0.14,
    kneeLX: 0.18,
    hipRX: 0.14,
    kneeRX: 0.18,
  });
  return {
    stealthOpacity: 1,
    darkenFactor: 0,
    flameIgnite: 0.78 + deepBreath * 0.22,
    psychicGlow: 0,
  };
}

const _segPoseA = createNeutralKeyPose();
const _segPoseB = createNeutralKeyPose();
const _medPose = createNeutralKeyPose();
const _lookBuf = { x: 0, y: 0, wince: 0 };

/**
 * Evaluates character-specific varied idle animations and deep meditation states.
 * Returns metadata (expression, meditation blend, stealth opacity, flame ignite) and writes
 * the blended SkeletonKeyPose into `outPose`.
 */
export function evaluateHeroIdleChoreography(
  heroId: CharacterId,
  idleTicks: number,
  tickCount: number,
  outPose: SkeletonKeyPose
): IdleChoreographyResult {
  const segments = HERO_IDLE_TABLES[heroId];
  const cycleTicks = segments.reduce((sum, s) => sum + s.duration, 0);
  const tCycle = ((Math.max(0, tickCount) % cycleTicks) + cycleTicks) % cycleTicks;

  let cursor = tCycle;
  let segIndex = 0;
  for (let i = 0; i < segments.length; i++) {
    if (cursor < segments[i].duration || i === segments.length - 1) {
      segIndex = i;
      break;
    }
    cursor -= segments[i].duration;
  }

  const seg = segments[segIndex];
  const nextSeg = segments[(segIndex + 1) % segments.length];
  const localT = seg.duration > 0 ? Math.min(1, Math.max(0, cursor / seg.duration)) : 0;

  seg.evaluate(localT, tickCount, _segPoseA, _lookBuf);
  const lookX = _lookBuf.x;
  const lookY = _lookBuf.y;
  const winceBeat = _lookBuf.wince;

  // Smooth cross-fade across the final 10 ticks of each segment so idle beats flow seamlessly
  const tailWindow = Math.min(10, seg.duration * 0.22);
  const remaining = seg.duration - cursor;
  if (remaining < tailWindow && tailWindow > 0) {
    const blend = smooth(1 - remaining / tailWindow);
    nextSeg.evaluate(0, tickCount, _segPoseB, _lookBuf);
    blendPoseTargets(_segPoseA, _segPoseB, blend, outPose);
  } else {
    Object.assign(outPose, _segPoseA);
  }

  // Long-idle meditation transition
  const rawMed =
    idleTicks >= MEDITATION_START_TICKS
      ? Math.min(1, (idleTicks - MEDITATION_START_TICKS) / MEDITATION_RAMP_TICKS)
      : 0;
  const meditationFactor = smooth(rawMed);

  if (meditationFactor > 0.001) {
    const medMeta = computeMeditationPose(heroId, tickCount, _medPose);
    blendPoseTargets(outPose, _medPose, meditationFactor, outPose);
    return {
      segmentName: meditationFactor > 0.45 ? `${heroId}_meditate` : seg.name,
      expression: meditationFactor > 0.35 ? 'meditate' : seg.expression,
      meditationFactor,
      stealthOpacity: 1 - (1 - medMeta.stealthOpacity) * meditationFactor,
      darkenFactor: medMeta.darkenFactor * meditationFactor,
      flameIgnite: medMeta.flameIgnite * meditationFactor,
      psychicGlow: medMeta.psychicGlow * meditationFactor,
      eyeLookX: lookX * (1 - meditationFactor),
      eyeLookY: lookY * (1 - meditationFactor),
      winceBeat: winceBeat * (1 - meditationFactor),
    };
  }

  return {
    segmentName: seg.name,
    expression: seg.expression,
    meditationFactor: 0,
    stealthOpacity: 1,
    darkenFactor: 0,
    flameIgnite: 0,
    psychicGlow: 0,
    eyeLookX: lookX,
    eyeLookY: lookY,
    winceBeat,
  };
}

// =========================================================================
// FACIAL EXPRESSION PRESETS & SOLVER
// =========================================================================
const EXPRESSION_PRESETS: Record<FacialExpression, Omit<FaceState, 'expression' | 'eyeLookX' | 'eyeLookY'>> = {
  neutral: {
    eyeOpenL: 1.0,
    eyeOpenR: 1.0,
    browTiltL: -0.04,
    browTiltR: 0.04,
    browHeightL: 0,
    browHeightR: 0,
    mouthOpen: 0.05,
    mouthWidth: 1.0,
    mouthCurve: 0.02,
  },
  serious: {
    eyeOpenL: 0.78,
    eyeOpenR: 0.78,
    browTiltL: -0.18,
    browTiltR: 0.18,
    browHeightL: -0.012,
    browHeightR: -0.012,
    mouthOpen: 0.04,
    mouthWidth: 0.92,
    mouthCurve: -0.12,
  },
  determined: {
    eyeOpenL: 0.84,
    eyeOpenR: 0.84,
    browTiltL: -0.28,
    browTiltR: 0.28,
    browHeightL: -0.016,
    browHeightR: -0.016,
    mouthOpen: 0.06,
    mouthWidth: 1.05,
    mouthCurve: 0.14,
  },
  angry: {
    eyeOpenL: 0.68,
    eyeOpenR: 0.68,
    browTiltL: -0.44,
    browTiltR: 0.44,
    browHeightL: -0.024,
    browHeightR: -0.024,
    mouthOpen: 0.22,
    mouthWidth: 1.15,
    mouthCurve: -0.45,
  },
  shout: {
    eyeOpenL: 0.92,
    eyeOpenR: 0.92,
    browTiltL: -0.42,
    browTiltR: 0.42,
    browHeightL: -0.02,
    browHeightR: -0.02,
    mouthOpen: 0.92,
    mouthWidth: 1.24,
    mouthCurve: -0.25,
  },
  calm: {
    eyeOpenL: 0.88,
    eyeOpenR: 0.88,
    browTiltL: 0.04,
    browTiltR: -0.04,
    browHeightL: 0.008,
    browHeightR: 0.008,
    mouthOpen: 0.04,
    mouthWidth: 0.95,
    mouthCurve: 0.28,
  },
  serene: {
    eyeOpenL: 0.82,
    eyeOpenR: 0.82,
    browTiltL: 0.08,
    browTiltR: -0.08,
    browHeightL: 0.01,
    browHeightR: 0.01,
    mouthOpen: 0.05,
    mouthWidth: 1.0,
    mouthCurve: 0.48,
  },
  smug: {
    eyeOpenL: 0.72,
    eyeOpenR: 0.88,
    browTiltL: -0.22,
    browTiltR: 0.08,
    browHeightL: -0.01,
    browHeightR: 0.018,
    mouthOpen: 0.1,
    mouthWidth: 1.18,
    mouthCurve: 0.62,
  },
  suspicious: {
    eyeOpenL: 0.56,
    eyeOpenR: 0.62,
    browTiltL: -0.24,
    browTiltR: 0.12,
    browHeightL: -0.018,
    browHeightR: 0.008,
    mouthOpen: 0.04,
    mouthWidth: 0.85,
    mouthCurve: -0.18,
  },
  hurt: {
    eyeOpenL: 0.08,
    eyeOpenR: 0.08,
    browTiltL: 0.34,
    browTiltR: -0.34,
    browHeightL: 0.012,
    browHeightR: 0.012,
    mouthOpen: 0.62,
    mouthWidth: 1.12,
    mouthCurve: -0.68,
  },
  wince: {
    eyeOpenL: 0.12,
    eyeOpenR: 0.12,
    browTiltL: 0.26,
    browTiltR: -0.26,
    browHeightL: -0.01,
    browHeightR: -0.01,
    mouthOpen: 0.48,
    mouthWidth: 0.9,
    mouthCurve: -0.55,
  },
  meditate: {
    eyeOpenL: 0.0,
    eyeOpenR: 0.0,
    browTiltL: 0.05,
    browTiltR: -0.05,
    browHeightL: 0.004,
    browHeightR: 0.004,
    mouthOpen: 0.03,
    mouthWidth: 0.92,
    mouthCurve: 0.22,
  },
};

export function resolveHeroFaceState(
  heroId: CharacterId,
  pose: HeroPose,
  opts: {
    comboStep: number;
    slashing: boolean;
    slashTimer: number;
    hp: number;
    tickCount: number;
    idle?: IdleChoreographyResult | null;
  },
  out: FaceState = createNeutralFaceState()
): FaceState {
  let expr: FacialExpression = 'serious';
  let lookX = 0;
  let lookY = 0;
  let winceBeat = 0;

  if (pose === 'death' || opts.hp <= 0) {
    expr = 'hurt';
  } else if (pose === 'hurt' || pose === 'stun') {
    expr = 'hurt';
  } else if (pose === 'special') {
    expr = 'shout';
  } else if (pose === 'attack1' || pose === 'attack2' || pose === 'attack3') {
    if (pose === 'attack3' || opts.slashTimer >= 6) {
      expr = 'shout';
    } else {
      expr = heroId === 'maya' ? 'determined' : 'angry';
    }
  } else if (pose === 'dash' || pose === 'slide' || pose === 'vault') {
    expr = heroId === 'leon' ? 'determined' : 'angry';
  } else if (pose === 'jump') {
    expr = 'determined';
    lookY = 0.25;
  } else if (pose === 'fall') {
    expr = heroId === 'maya' ? 'calm' : 'serious';
    lookY = -0.3;
  } else if (pose === 'wall' || pose === 'climb' || pose === 'hang') {
    expr = 'determined';
  } else if (pose === 'flight') {
    expr = heroId === 'maya' ? 'serene' : 'determined';
  } else if (pose === 'run') {
    expr = heroId === 'maya' ? 'determined' : heroId === 'leon' ? 'determined' : 'serious';
  } else if (pose === 'idle') {
    if (opts.idle) {
      expr = opts.idle.expression;
      lookX = opts.idle.eyeLookX;
      lookY = opts.idle.eyeLookY;
      winceBeat = opts.idle.winceBeat;
    } else {
      expr = heroId === 'maya' ? 'serene' : heroId === 'leon' ? 'determined' : 'serious';
    }
  }

  const preset = EXPRESSION_PRESETS[expr];
  out.expression = expr;
  out.eyeOpenL = preset.eyeOpenL;
  out.eyeOpenR = preset.eyeOpenR;
  out.eyeLookX = lookX;
  out.eyeLookY = lookY;
  out.browTiltL = preset.browTiltL;
  out.browTiltR = preset.browTiltR;
  out.browHeightL = preset.browHeightL;
  out.browHeightR = preset.browHeightR;
  out.mouthOpen = preset.mouthOpen;
  out.mouthWidth = preset.mouthWidth;
  out.mouthCurve = preset.mouthCurve;

  // Dynamic cough mouth/squint pulse when Leon hits his chest too hard
  if (expr === 'wince' && winceBeat > 0) {
    out.mouthOpen = 0.18 + winceBeat * 0.65;
    out.eyeOpenL = Math.max(0.04, 0.25 - winceBeat * 0.22);
    out.eyeOpenR = out.eyeOpenL;
  }

  // Natural periodic eye blink (skipped during closed-eye states)
  if (expr !== 'meditate' && expr !== 'hurt' && expr !== 'wince') {
    const period = heroId === 'maya' ? 190 : heroId === 'leon' ? 165 : 210;
    const phase = Math.floor(opts.tickCount) % period;
    if (phase >= period - 7) {
      const blinkProgress = (phase - (period - 7)) / 7;
      const closure = Math.sin(blinkProgress * Math.PI);
      out.eyeOpenL *= 1 - closure * 0.92;
      out.eyeOpenR *= 1 - closure * 0.92;
    }
  }

  return out;
}
