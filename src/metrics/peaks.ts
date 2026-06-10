import { DataPoint } from '../types/schema'

/**
 * Returns the indices of local maxima in the velocity signal.
 * A peak is a point where velocity[i] > velocity[i-1] AND velocity[i] > velocity[i+1].
 * Optionally filter by minimum threshold: only report peaks where velocity[i] >= minThreshold.
 */
export function detectPeaks(velocity: number[], minThreshold?: number): number[] {
  const peaks: number[] = []
  for (let i = 1; i < velocity.length - 1; i++) {
    const isLocalMax = velocity[i] > velocity[i - 1] && velocity[i] > velocity[i + 1]
    if (!isLocalMax) continue
    if (minThreshold !== undefined && velocity[i] < minThreshold) continue
    peaks.push(i)
  }
  return peaks
}

/**
 * Convenience wrapper returning the actual data points at peak indices.
 */
export function peakDataPoints(data: DataPoint[], peakIndices: number[]): DataPoint[] {
  return peakIndices.map(i => data[i])
}
