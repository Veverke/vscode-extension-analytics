import { DataPoint } from '../types/schema'
import { computeVelocity } from './velocity'
import { computeAcceleration } from './acceleration'

function mean(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((sum, v) => sum + v, 0) / values.length
}

function signedNormalize(values: number[]): number[] {
  if (values.length === 0) return []
  const maxAbs = Math.max(...values.map(Math.abs), 1)
  return values.map(v => v / maxAbs)
}

/**
 * Computes a momentum score for an extension based on recent metrics.
 * Positive = growing, negative = declining, near-zero = flat.
 * Returns a value in the range [-1, 1].
 */
export function computeMomentum(data: DataPoint[]): number {
  if (data.length <= 1) return 0

  const window = Math.min(7, data.length)
  const velocity = computeVelocity(data)
  const acceleration = computeAcceleration(velocity)

  const recentVelocity = velocity.slice(-window)
  const recentAcceleration = acceleration.slice(-window)

  // If all velocity values are zero (flat data), return 0
  if (recentVelocity.every(v => v === 0)) return 0

  const normalizedVelocity = signedNormalize(recentVelocity)
  const normalizedAcceleration = signedNormalize(recentAcceleration)

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

  // Return signed score in [-1, 1] range
  return Math.max(-1, Math.min(1, rawScore))
}
