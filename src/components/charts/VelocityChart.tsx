import {
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import { DataPoint } from '../../types/schema'
import { computeVelocity } from '../../metrics/velocity'
import { formatDate } from '../../utils/normalize'

interface Props {
  data: DataPoint[]
}

interface VelocityChartPoint {
  ts: number
  velocity: number
}

export function formatVelocityTooltipValue(value: unknown): [string, string] {
  const num = typeof value === 'number' ? value : 0
  const sign = num >= 0 ? '+' : ''
  return [`${sign}${num.toLocaleString()} installs`, 'Velocity']
}

export function buildChartData(data: DataPoint[]): VelocityChartPoint[] {
  const velocities = computeVelocity(data)
  return data.map((point, i) => ({
    ts: new Date(point.ts).getTime(),
    velocity: velocities[i],
  }))
}

export default function VelocityChart({ data }: Props) {
  if (data.length === 0) {
    return <p role="status">No velocity data available</p>
  }

  const chartData = buildChartData(data)

  return (
    <ResponsiveContainer width="100%" height={250}>
      <ComposedChart data={chartData}>
        <XAxis
          dataKey="ts"
          type="number"
          scale="time"
          domain={['dataMin', 'dataMax']}
          tickFormatter={formatDate}
        />
        <YAxis tickFormatter={(v: number) => v.toLocaleString()} />
        <Tooltip
          labelFormatter={(label: unknown) => formatDate(label as number)}
          formatter={formatVelocityTooltipValue}
        />
        <ReferenceLine y={0} stroke="#888" strokeDasharray="4 4" />
        <Bar dataKey="velocity" name="Velocity">
          {chartData.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={entry.velocity >= 0 ? '#4ade80' : '#f87171'}
            />
          ))}
        </Bar>
      </ComposedChart>
    </ResponsiveContainer>
  )
}
