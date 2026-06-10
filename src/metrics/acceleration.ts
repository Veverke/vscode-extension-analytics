/**
 * Returns the change in velocity between consecutive velocity values.
 * acceleration[0] = 0, acceleration[1] = 0 (need at least 2 velocity values to compare).
 * Positive acceleration = growth is speeding up; negative = slowing down.
 */
export function computeAcceleration(velocity: number[]): number[] {
  return velocity.map((v, i) => {
    if (i < 2) return 0
    return v - velocity[i - 1]
  })
}
