/** Values in world units per 60 Hz simulation tick, unless indicated otherwise. */
export const MOVEMENT = {
  version: 1,
  gravity: 0.65,
  stunDrag: 0.85,
  wallKickJump: 0.96,
  wallKickSpeed: 1.45,
  aerialJump: 0.88,
  vaultJump: 0.42,
  slideSpeed: 2.05,
  dashSpeed: 2.35,
  flightSpeedX: 1.1,
  flightSpeedY: 0.95,
  hangSpeed: 0.85,
  wallClimbSpeed: 3.6,
  wallSlideGravity: 0.2,
  wallSlideTerminal: 2.4,
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
