import { DataPoint } from '../types/schema'
import { computeVelocity } from './velocity'
import { computeAcceleration } from './acceleration'

function mean(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((sum, v) => sum + v, 0) / values.length
}

function minMaxNormalize(values: number[]): number[] {
  const min = Math.min(...values)
  const max = Math.max(...values)
  if (max === min) return values.map(() => 0.5)
  return values.map(v => (v - min) / (max - min))
}

/**
 * Computes a 0–100 momentum score for an extension based on recent metrics.
 * Higher = faster growing, accelerating, and recently active.
 */
export function computeMomentum(data: DataPoint[]): number {
  if (data.length === 0) return 0

  const window = Math.min(7, data.length)
  const velocity = computeVelocity(data)
  const acceleration = computeAcceleration(velocity)

  const recentVelocity = velocity.slice(-window)
  const recentAcceleration = acceleration.slice(-window)

  const normalizedVelocity = minMaxNormalize(recentVelocity)
  const normalizedAcceleration = minMaxNormalize(recentAcceleration)

  const meanVelocityScore = mean(normalizedVelocity)
  const meanAccelerationScore = mean(normalizedAcceleration)

  const lastTs = new Date(data[data.length - 1].ts).getTime()
  const now = Date.now()
  const daysSinceLastPoint = (now - lastTs) / (1000 * 60 * 60 * 24)
  const recencyFactor = Math.max(0, Math.min(1, 1 - daysSinceLastPoint / 30))

  const rawScore =
    0.5 * meanVelocityScore +
    0.3 * meanAccelerationScore +
    0.2 * recencyFactor

  return Math.min(100, Math.max(0, rawScore * 100))
}
