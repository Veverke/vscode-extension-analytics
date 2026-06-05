import { DataPoint } from '../../types/schema'
import { computeVelocityNormalized } from '../../metrics/velocity'
import { computeAcceleration } from '../../metrics/acceleration'
import { computeProjection } from '../../metrics/projections'
import { computeMomentum } from '../../metrics/momentum'

interface Props {
  data: DataPoint[]
}

function getMomentumColor(score: number): string {
  if (score > 66) return '#4ade80'
  if (score >= 33) return '#facc15'
  return '#f87171'
}

function getAccelerationLabel(lastAcceleration: number): string {
  if (lastAcceleration > 0) return '↑ speeding up'
  if (lastAcceleration < 0) return '↓ slowing down'
  return '→ stable'
}

export default function MetricsPanel({ data }: Props) {
  if (data.length === 0) return null

  const normalizedVelocity = computeVelocityNormalized(data)
  const currentVelocity = normalizedVelocity[normalizedVelocity.length - 1]
  const velocitySign = currentVelocity >= 0 ? '+' : ''
  const velocityLabel = `${velocitySign}${currentVelocity.toFixed(1)} /hour`

  const velocityRaw = data.map((p, i) =>
    i === 0 ? 0 : p.marketplace.installs - data[i - 1].marketplace.installs,
  )
  const acceleration = computeAcceleration(velocityRaw)
  const lastAcceleration = acceleration[acceleration.length - 1]
  const accelerationLabel = getAccelerationLabel(lastAcceleration)

  const momentumScore = computeMomentum(data)
  const momentumColor = getMomentumColor(momentumScore)

  const linearProjection = computeProjection(data, 'linear', 30)
  const projectedValue =
    linearProjection && linearProjection.points.length > 0
      ? Math.round(linearProjection.points[linearProjection.points.length - 1].value)
      : null

  return (
    <div className="metrics-panel" role="region" aria-label="Metrics">
      <div className="metric-card">
        <p className="metric-label">Current Velocity</p>
        <p className="metric-value" data-testid="metric-velocity">{velocityLabel}</p>
      </div>
      <div className="metric-card">
        <p className="metric-label">Acceleration</p>
        <p className="metric-value" data-testid="metric-acceleration">{accelerationLabel}</p>
      </div>
      <div className="metric-card">
        <p className="metric-label">Momentum Score</p>
        <p
          className="metric-value"
          data-testid="metric-momentum"
          style={{ color: momentumColor }}
        >
          {Math.round(momentumScore)}
        </p>
      </div>
      <div className="metric-card">
        <p className="metric-label">30-day Projection</p>
        {projectedValue !== null ? (
          <>
            <p className="metric-value" data-testid="metric-projection">
              {projectedValue.toLocaleString()}
            </p>
            {linearProjection && (
              <p className="metric-r2">R²={linearProjection.r2.toFixed(2)}</p>
            )}
          </>
        ) : (
          <p className="metric-value" data-testid="metric-projection">
            Not enough data
          </p>
        )}
      </div>
    </div>
  )
}
