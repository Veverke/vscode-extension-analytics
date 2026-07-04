import regression from 'regression'
import { DataPoint } from '../types/schema'

export type RegressionModel = 'linear' | 'exponential' | 'polynomial'

export interface ProjectionResult {
  model: RegressionModel
  r2: number
  points: { ts: number; value: number }[]
  equation: string
}

const MIN_DATA_POINTS = 3

/**
 * Fits a regression model to a time series extracted from DataPoint[].
 * Returns projected values for the next `daysAhead` days, or null if insufficient data.
 * @param getValue - Function to extract the numeric value from each DataPoint (default: marketplace.installs)
 */
export function computeProjection(
  data: DataPoint[],
  model: RegressionModel,
  daysAhead: number,
  getValue: (point: DataPoint) => number = (p) => p.marketplace.installs,
): ProjectionResult | null {
  if (data.length < MIN_DATA_POINTS) return null

  const regressionInput: [number, number][] = data.map((point, i) => [
    i,
    getValue(point),
  ])

  const options = { precision: 6 }
  let result: ReturnType<typeof regression.linear>

  if (model === 'linear') {
    result = regression.linear(regressionInput, options)
  } else if (model === 'exponential') {
    result = regression.exponential(regressionInput, options)
  } else {
    result = regression.polynomial(regressionInput, { ...options, order: 2 })
  }

  const lastTs = new Date(data[data.length - 1].ts).getTime()
  const msPerPoint = daysAhead > 0 && data.length > 1
    ? (new Date(data[data.length - 1].ts).getTime() - new Date(data[0].ts).getTime()) / (data.length - 1)
    : 24 * 60 * 60 * 1000

  const projectedPoints: { ts: number; value: number }[] = []
  const totalFuturePoints = Math.max(1, Math.round((daysAhead * 24 * 60 * 60 * 1000) / msPerPoint))

  for (let step = 1; step <= totalFuturePoints; step++) {
    const xIndex = data.length - 1 + step
    const [, predictedValue] = result.predict(xIndex)
    const ts = lastTs + step * msPerPoint
    projectedPoints.push({ ts, value: Math.max(0, predictedValue) })
  }

  return {
    model,
    r2: isNaN(result.r2) ? 1 : result.r2,
    points: projectedPoints,
    equation: result.string,
  }
}
