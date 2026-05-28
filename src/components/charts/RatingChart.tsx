import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { DataPoint } from '../../types/schema'
import { formatDate } from '../../utils/normalize'
import { EMPTY_DATA_MESSAGE } from './InstallsChart'

interface Props {
  data: DataPoint[]
}

interface RatingChartPoint {
  ts: number
  rating: number | null
  ratingCount: number
}

function buildChartData(data: DataPoint[]): RatingChartPoint[] {
  return data.map(point => ({
    ts: new Date(point.ts).getTime(),
    rating: point.marketplace.averageRating ?? null,
    ratingCount: point.marketplace.ratingCount,
  }))
}

export default function RatingChart({ data }: Props) {
  if (data.length === 0) {
    return <p role="status">{EMPTY_DATA_MESSAGE}</p>
  }

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
        <YAxis yAxisId="left" domain={[0, 5]} />
        <YAxis yAxisId="right" orientation="right" />
        <Tooltip
          labelFormatter={(label: number) => formatDate(label)}
        />
        <Legend />
        <Line
          yAxisId="left"
          type="monotone"
          dataKey="rating"
          name="Average Rating"
          stroke="#ff7300"
          dot={false}
        />
        <Bar
          yAxisId="right"
          dataKey="ratingCount"
          name="Rating Count"
          fill="#8884d8"
          opacity={0.6}
        />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
