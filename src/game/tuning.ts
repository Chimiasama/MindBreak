/** Values in world units per 60 Hz simulation tick, unless indicated otherwise. */
export const MOVEMENT = {
  gravity: 0.65,
  terminalVelocity: 22,
  coyoteTicks: 6,
  jumpBufferTicks: 6,
  wallKickLockTicks: 6,
  flightDrain: 0.35,
};

export const RESPAWN = {
  activationRadius: 900,
  farDistance: 1800,
  farTicks: 5 * 60,
  minimumDeadTicks: 15 * 60,
  cameraMargin: 240,
  playerSafetyRadius: 320,
  maxActive: 24,
};
