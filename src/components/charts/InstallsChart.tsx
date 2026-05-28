import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { DataPoint } from '../../types/schema'
import { formatDate } from '../../utils/normalize'

export const EMPTY_DATA_MESSAGE = "No data yet — the collector hasn't run yet"

interface Props {
  data: DataPoint[]
}

interface InstallsChartPoint {
  ts: number
  installs: number
  openVsxDownloads: number | null
}

function buildChartData(data: DataPoint[]): InstallsChartPoint[] {
  return data.map(point => ({
    ts: new Date(point.ts).getTime(),
    installs: point.marketplace.installs,
    openVsxDownloads: point.openVsx?.downloads ?? null,
  }))
}

export default function InstallsChart({ data }: Props) {
  if (data.length === 0) {
    return <p role="status">{EMPTY_DATA_MESSAGE}</p>
  }

  const hasOpenVsx = data.some(p => p.openVsx !== null)
  const chartData = buildChartData(data)

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
        <YAxis tickFormatter={(v: number) => v.toLocaleString()} />
        <Tooltip
          labelFormatter={(label: number) => formatDate(label)}
          formatter={(value: number | null, name: string) => [
            value !== null ? value.toLocaleString() : 'N/A',
            name,
          ]}
        />
        <Legend />
        <Line
          type="monotone"
          dataKey="installs"
          name="Marketplace Installs"
          stroke="#8884d8"
          dot={false}
        />
        {hasOpenVsx && (
          <Line
            type="monotone"
            dataKey="openVsxDownloads"
            name="Open VSX Downloads"
            stroke="#82ca9d"
            strokeDasharray="5 5"
            dot={false}
          />
        )}
      </ComposedChart>
    </ResponsiveContainer>
  )
}
