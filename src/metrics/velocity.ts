import { DataPoint } from '../types/schema'

/**
 * Returns the absolute change in installs between consecutive data points.
 * Returns N-1 values for N data points (the diffs between consecutive points).
 */
export function computeVelocity(data: DataPoint[]): number[] {
  const result: number[] = []
  for (let i = 1; i < data.length; i++) {
    result.push(data[i].marketplace.installs - data[i - 1].marketplace.installs)
  }
  return result
}

/**
 * Returns installs-per-hour between consecutive data points.
 * Returns N-1 values for N data points.
 * If the time difference is 0 or negative, returns 0.
 * Normalized to 0–1 range by dividing by the max absolute value.
 */
export function computeVelocityNormalized(data: DataPoint[]): number[] {
  const raw: number[] = []
  for (let i = 1; i < data.length; i++) {
    const deltaInstalls = data[i].marketplace.installs - data[i - 1].marketplace.installs
    const prevTs = new Date(data[i - 1].ts).getTime()
    const currTs = new Date(data[i].ts).getTime()
    const deltaHours = (currTs - prevTs) / (1000 * 60 * 60)
    if (deltaHours <= 0) {
      raw.push(0)
    } else {
      raw.push(deltaInstalls / deltaHours)
    }
  }
  if (raw.length === 0) return []
  const maxAbs = Math.max(...raw.map(Math.abs), 1)
  return raw.map(v => v / maxAbs)
}