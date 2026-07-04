import { DataPoint } from '../../types/schema'
import { computeVelocityNormalized } from '../../metrics/velocity'
import { computeAcceleration } from '../../metrics/acceleration'
import { computeProjection } from '../../metrics/projections'
import { computeMomentum } from '../../metrics/momentum'
import FormulaTooltip from '../annotations/FormulaTooltip'

interface Props {
  data: DataPoint[]
  projectionMonths?: number
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

export default function MetricsPanel({ data, projectionMonths = 1 }: Props) {
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

  const daysAhead = projectionMonths * 30
  const linearProjection = computeProjection(data, 'linear', daysAhead)
  const projectedValue =
    linearProjection && linearProjection.points.length > 0
      ? Math.round(linearProjection.points[linearProjection.points.length - 1].value)
      : null

  const lastInstalls = data[data.length - 1].marketplace.installs
  const newDownloads = projectedValue !== null ? projectedValue - lastInstalls : null

  const projectionLabel = `${projectionMonths === 1 ? '30-day' : `${projectionMonths}-month`} Projection`

  // Open VSX projection
  const openVsxData = data.filter(p => p.openVsx != null)
  const openVsxProjection = computeProjection(openVsxData, 'linear', daysAhead, (p) => (p.openVsx as NonNullable<DataPoint['openVsx']>).downloads)
  const openVsxProjected =
    openVsxProjection && openVsxProjection.points.length > 0
      ? Math.round(openVsxProjection.points[openVsxProjection.points.length - 1].value)
      : null
  const lastOpenVsxDownloads = openVsxData.length > 0 ? (openVsxData[openVsxData.length - 1].openVsx as NonNullable<DataPoint['openVsx']>).downloads : 0
  const newOpenVsxDownloads = openVsxProjected !== null ? openVsxProjected - lastOpenVsxDownloads : null

  return (
    <div className="metrics-panel" role="region" aria-label="Metrics">
      <div className="metric-card">
        <FormulaTooltip
          label="Velocity"
          formula="Velocity = (installsₜ − installsₜ₋₁) / Δhours"
          description="How fast installs are growing per hour, averaged over the most recent collection interval."
        >
          <p className="metric-label">Current Velocity</p>
        </FormulaTooltip>
        <p className="metric-value" data-testid="metric-velocity">{velocityLabel}</p>
      </div>
      <div className="metric-card">
        <FormulaTooltip
          label="Acceleration"
          formula="Acceleration = velocityₜ − velocityₜ₋₁"
          description="Whether growth is speeding up (positive) or slowing down (negative)."
        >
          <p className="metric-label">Acceleration</p>
        </FormulaTooltip>
        <p className="metric-value" data-testid="metric-acceleration">{accelerationLabel}</p>
      </div>
      <div className="metric-card">
        <FormulaTooltip
          label="Momentum Score"
          formula="Score = 0.5 × norm(velocity) + 0.3 × norm(acceleration) + 0.2 × recency"
          description="A 0–100 composite that ranks growth intensity. Higher is faster-growing."
        >
          <p className="metric-label">Momentum Score</p>
        </FormulaTooltip>
        <p
          className="metric-value"
          data-testid="metric-momentum"
          style={{ color: momentumColor }}
        >
          {Math.round(momentumScore)}
        </p>
      </div>
      <div className="metric-card">
        <FormulaTooltip
          label="Projection"
          formula="Linear regression: y = mx + b"
          description={`Predicted installs in ${projectionMonths * 30} days if current linear trend continues. R² shows confidence (1.0 = perfect fit).`}
        >
          <p className="metric-label">{projectionLabel}</p>
        </FormulaTooltip>
        {projectedValue !== null ? (
          <>
            <p className="metric-value" data-testid="metric-projection">
              {projectedValue.toLocaleString()} total
            </p>
            <p className="metric-r2">
              +{newDownloads!.toLocaleString()} new · R²={linearProjection!.r2.toFixed(2)}
            </p>
          </>
        ) : (
          <p className="metric-value" data-testid="metric-projection">
            Not enough data
          </p>
        )}
      </div>
      <div className="metric-card">
        <FormulaTooltip
          label="Open VSX Projection"
          formula="Linear regression: y = mx + b"
          description={`Predicted Open VSX downloads in ${projectionMonths * 30} days if current linear trend continues.`}
        >
          <p className="metric-label">Open VSX {projectionLabel.toLowerCase()}</p>
        </FormulaTooltip>
        {openVsxProjected !== null ? (
          <>
            <p className="metric-value" data-testid="metric-openvsx-projection">
              {openVsxProjected.toLocaleString()} total
            </p>
            <p className="metric-r2">
              +{newOpenVsxDownloads!.toLocaleString()} new · R²={openVsxProjection!.r2.toFixed(2)}
            </p>
          </>
        ) : (
          <p className="metric-value" data-testid="metric-openvsx-projection">
            Not enough data
          </p>
        )}
      </div>
    </div>
  )
}
