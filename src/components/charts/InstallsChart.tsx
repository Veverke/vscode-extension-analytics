import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Label,
} from 'recharts'
import type { ReferenceLineProps } from 'recharts'
import { DataPoint } from '../../types/schema'
import { ProjectionResult } from '../../metrics/projections'
import { computeVelocity } from '../../metrics/velocity'
import { formatDate } from '../../utils/normalize'

export const EMPTY_DATA_MESSAGE = "No data yet — the collector hasn't run yet"

export function formatInstallsTooltipValue(value: unknown, name: unknown): [string, string] {
  const num = typeof value === 'number' ? value : null
  return [num !== null ? num.toLocaleString() : 'N/A', name as string]
}

const PROJECTION_COLORS: Record<string, string> = {
  linear: '#3b82f6',
  exponential: '#f97316',
  polynomial: '#a855f7',
}

interface Props {
  data: DataPoint[]
  projections?: ProjectionResult[]
  peaks?: number[]
  annotations?: ReferenceLineProps[]
}

interface InstallsChartPoint {
  ts: number
  installs: number | null
  openVsxDownloads: number | null
  [key: string]: number | null
}

function buildChartData(data: DataPoint[], projections?: ProjectionResult[]): InstallsChartPoint[] {
  const realPoints: InstallsChartPoint[] = data.map(point => ({
    ts: new Date(point.ts).getTime(),
    installs: point.marketplace.installs,
    openVsxDownloads: point.openVsx?.downloads ?? null,
  }))

  if (!projections || projections.length === 0) return realPoints

  // Collect all unique projection timestamps
  const projectionTsMap = new Map<number, InstallsChartPoint>()

  projections.forEach(proj => {
    proj.points.forEach(({ ts, value }) => {
      if (!projectionTsMap.has(ts)) {
        projectionTsMap.set(ts, {
          ts,
          installs: null,
          openVsxDownloads: null,
        })
      }
      const entry = projectionTsMap.get(ts)!
      entry[`proj_${proj.model}`] = value
    })
  })

  // Attach projection keys to last real data point so lines connect seamlessly
  const lastReal = realPoints[realPoints.length - 1]
  projections.forEach(proj => {
    lastReal[`proj_${proj.model}`] = lastReal.installs
  })

  const projPoints = Array.from(projectionTsMap.values()).sort((a, b) => a.ts - b.ts)
  return [...realPoints, ...projPoints]
}

export default function InstallsChart({ data, projections, peaks, annotations }: Props) {
  if (data.length === 0) {
    return <p role="status">{EMPTY_DATA_MESSAGE}</p>
  }

  const hasOpenVsx = data.some(p => p.openVsx !== null)
  const chartData = buildChartData(data, projections)
  const velocity = peaks && peaks.length > 0 ? computeVelocity(data) : []

  const allValues = chartData.flatMap(p => {
    const vals: number[] = []
    if (p.installs !== null) vals.push(p.installs)
    if (p.openVsxDownloads !== null) vals.push(p.openVsxDownloads)
    projections?.forEach(proj => {
      const v = p[`proj_${proj.model}`]
      if (v !== null && v !== undefined) vals.push(v as number)
    })
    return vals
  })
  const yMax = allValues.length > 0 ? Math.max(...allValues) : 'auto'

  return (
    <ResponsiveContainer width="100%" height={300}>
      <ComposedChart data={chartData}>
        <XAxis
          dataKey="ts"
          type="number"
          scale="time"
          domain={['dataMin', 'dataMax']}
          tickFormatter={formatDate}
        />
        <YAxis
          domain={[0, yMax === 'auto' ? 'auto' : Math.ceil((yMax as number) * 1.05)]}
          tickFormatter={(v: number) => v.toLocaleString()}
        />
        <Tooltip
          labelFormatter={(label: unknown) => formatDate(label as number)}
          formatter={formatInstallsTooltipValue}
        />
        <Legend />
        <Line
          type="monotone"
          dataKey="installs"
          name="Marketplace Installs"
          stroke="#8884d8"
          dot={false}
          connectNulls={false}
        />
        {hasOpenVsx && (
          <Line
            type="monotone"
            dataKey="openVsxDownloads"
            name="Open VSX Downloads"
            stroke="#82ca9d"
            strokeDasharray="5 5"
            dot={false}
            connectNulls={false}
          />
        )}
        {projections?.map(proj => (
          <Line
            key={`proj_${proj.model}`}
            type="monotone"
            dataKey={`proj_${proj.model}`}
            name={`${proj.model.charAt(0).toUpperCase() + proj.model.slice(1)} R²=${proj.r2.toFixed(2)}`}
            stroke={PROJECTION_COLORS[proj.model] ?? '#888'}
            strokeDasharray="6 3"
            dot={false}
            connectNulls={true}
          />
        ))}
        {peaks?.map(peakIndex => {
          const peakTs = new Date(data[peakIndex].ts).getTime()
          const gain = velocity[peakIndex]
          return (
            <ReferenceLine
              key={`peak-${peakIndex}`}
              x={peakTs}
              stroke="#f59e0b"
              strokeDasharray="4 4"
            >
              <Label
                value={`+${gain} installs`}
                position="top"
                fill="#f59e0b"
                fontSize={11}
              />
            </ReferenceLine>
          )
        })}
        {annotations?.map((props, index) => (
          <ReferenceLine key={`annotation-${index}`} {...props} />
        ))}
      </ComposedChart>
    </ResponsiveContainer>
  )
}
