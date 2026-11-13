/** Attack clocks use fixed simulation ticks (60 Hz), independently of hit-count score. */
export const COMBO = { bufferTicks: 6, linkTicks: 24 } as const;
export const SWINGS = [
  { name: 'cut', activeTicks: 6, totalTicks: 11, bonusDamage: 0 },
  { name: 'return_cut', activeTicks: 6, totalTicks: 11, bonusDamage: 0 },
  { name: 'launcher', activeTicks: 8, totalTicks: 16, bonusDamage: 12 },
] as const;
export function nextComboStep(step: number, remaining: number) {
  return remaining > 0 ? (step + 1) % SWINGS.length : 0;
}
