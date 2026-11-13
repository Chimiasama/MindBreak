import { CharacterId } from './types';

/** Version 1: world units per 60 Hz tick (acceleration is units/tick²). */
export const MOVEMENT_PROFILE_VERSION = 1;
export interface MovementProfile {
  groundAcceleration: number;
  groundBrake: number;
  airAcceleration: number;
  airBrake: number;
  turnMultiplier: number;
  flightAcceleration: number;
}
export const MOVEMENT_PROFILES: Record<CharacterId, MovementProfile> = {
  ren: { groundAcceleration: 2.4, groundBrake: 2.8, airAcceleration: 2.4, airBrake: 1, turnMultiplier: 1.5, flightAcceleration: 2.8 },
  maya: { groundAcceleration: 2, groundBrake: 2.5, airAcceleration: 2, airBrake: 1, turnMultiplier: 1.5, flightAcceleration: 2.8 },
  leon: { groundAcceleration: 1.7, groundBrake: 2.2, airAcceleration: 1.7, airBrake: 0.9, turnMultiplier: 1.5, flightAcceleration: 2.8 },
};

export function approachVelocity(current: number, target: number, acceleration: number) {
  return current < target ? Math.min(target, current + acceleration) : Math.max(target, current - acceleration);
}

/** Does not alter dash, slide, knockback locks or wall-kick impulses. */
export function horizontalVelocity(current: number, direction: -1 | 0 | 1, speed: number,
  profile: MovementProfile, grounded: boolean, flying: boolean) {
  if (!direction) return approachVelocity(current, 0, grounded ? profile.groundBrake : profile.airBrake);
  const turning = current * direction < 0;
  const acceleration = flying ? profile.flightAcceleration : grounded ? profile.groundAcceleration : profile.airAcceleration;
  return approachVelocity(current, direction * speed, acceleration * (turning ? profile.turnMultiplier : 1));
}
