import { DataPoint } from '../types/schema'

/**
 * Returns the absolute change in installs between consecutive data points.
 * velocity[0] = 0 (no previous point to compare against).
 */
export function computeVelocity(data: DataPoint[]): number[] {
  return data.map((point, i) => {
    if (i === 0) return 0
    return point.marketplace.installs - data[i - 1].marketplace.installs
  })
}

/**
 * Returns installs-per-hour between consecutive data points.
 * velocity[0] = 0.
 * If the time difference is 0 or negative, returns 0.
 */
export function computeVelocityNormalized(data: DataPoint[]): number[] {
  return data.map((point, i) => {
    if (i === 0) return 0
    const deltaInstalls = point.marketplace.installs - data[i - 1].marketplace.installs
    const prevTs = new Date(data[i - 1].ts).getTime()
    const currTs = new Date(point.ts).getTime()
    const deltaHours = (currTs - prevTs) / (1000 * 60 * 60)
    if (deltaHours <= 0) return 0
    return deltaInstalls / deltaHours
  })
}
