/** Internal progression only: reward values and life thresholds are not shown in UI. */
export const ENEMY_DEFEAT_REWARDS = [1000, 500, 50] as const;

export function defeatReward(previousDefeats: number) {
  if (!Number.isInteger(previousDefeats) || previousDefeats < 0) return 0;
  return ENEMY_DEFEAT_REWARDS[previousDefeats] ?? 0;
}
