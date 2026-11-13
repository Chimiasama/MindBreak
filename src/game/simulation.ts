/** Legacy movement values are tuned for 60 simulation steps per second. */
export const STEP_MS = 1000 / 60;

export class FixedStepClock {
  private previous: number | null = null;
  private accumulator = 0;

  reset() {
    this.previous = null;
    this.accumulator = 0;
  }

  advance(timestamp: number, step: () => void | boolean) {
    if (this.previous === null) {
      this.previous = timestamp;
      return;
    }
    // Discard long interruptions instead of simulating seconds of unseen damage.
    this.accumulator += Math.min(100, Math.max(0, timestamp - this.previous));
    this.previous = timestamp;
    let count = 0;
    while (this.accumulator + 1e-7 >= STEP_MS && count < 6) {
      this.accumulator = Math.max(0, this.accumulator - STEP_MS);
      count++;
      if (step() === false) {
        this.reset();
        return;
      }
    }
  }
}
