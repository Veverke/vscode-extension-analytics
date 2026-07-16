import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { DataPoint } from '../../types/schema'
import { formatDate } from '../../utils/normalize'

export const EMPTY_DATA_MESSAGE = "No GitHub data yet — the collector hasn't run yet"

interface Props {
  data: DataPoint[]
}

interface GitHubChartPoint {
  ts: number
  stars: number | null
  forks: number | null
  contributions: number | null
}

export function buildChartData(data: DataPoint[]): GitHubChartPoint[] {
  return data
    .filter((point): point is DataPoint & { github: NonNullable<DataPoint['github']> } => point.github != null)
    .map(point => ({
      ts: new Date(point.ts).getTime(),
      stars: point.github.stars,
      forks: point.github.forks,
      contributions: point.github.contributions,
    }))
}

export function formatTooltipValue(value: unknown, name: string | number | undefined): [string, string] {
  const num = typeof value === 'number' ? value : null
  return [num !== null ? num.toLocaleString() : 'N/A', name !== undefined ? String(name) : '']
}

const METRICS = [
  { dataKey: 'stars', name: 'Stars', color: '#f59e0b', yAxisId: 'stars' },
  { dataKey: 'forks', name: 'Forks', color: '#3b82f6', yAxisId: 'forks' },
  { dataKey: 'contributions', name: 'Contributions (non-owner)', color: '#22c55e', yAxisId: 'contributions' },
]

export default function GitHubChart({ data }: Props) {
  const chartData = buildChartData(data)

  if (chartData.length === 0) {
    return <p role="status">{EMPTY_DATA_MESSAGE}</p>
  }

  const allStars = chartData.map(p => p.stars).filter((s): s is number => s !== null)
  const allForks = chartData.map(p => p.forks).filter((f): f is number => f !== null)

  const starsMax = allStars.length > 0 ? Math.max(...allStars) : 0
  const forksMax = allForks.length > 0 ? Math.max(...allForks) : 0

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={chartData}>
        <XAxis
          dataKey="ts"
          type="number"
          scale="time"
          domain={['dataMin', 'dataMax']}
          tickFormatter={formatDate}
        />
        <YAxis
          yAxisId="stars"
          orientation="left"
          domain={[0, starsMax > 0 ? Math.ceil(starsMax * 1.05) : 'auto']}
          tickFormatter={(v: number) => v.toLocaleString()}
          stroke="#f59e0b"
        />
        <YAxis
          yAxisId="forks"
          orientation="right"
          domain={[0, forksMax > 0 ? Math.ceil(forksMax * 1.05) : 'auto']}
          tickFormatter={(v: number) => v.toLocaleString()}
          stroke="#3b82f6"
        />
        <Tooltip
          labelFormatter={(label: unknown) => formatDate(label as number)}
          formatter={formatTooltipValue}
        />
        <Legend />
        {METRICS.map(metric => (
          <Line
            key={metric.dataKey}
            type="monotone"
            dataKey={metric.dataKey}
            name={metric.name}
            stroke={metric.color}
            dot={false}
            connectNulls={true}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}