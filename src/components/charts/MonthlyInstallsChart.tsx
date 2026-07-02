import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { MonthlyRollup } from '../../types/schema'

export const EMPTY_DATA_MESSAGE = 'No monthly rollups available yet'

interface Props {
  rollups: MonthlyRollup[]
}

function formatMonthLabel(yearMonth: string): string {
  const [year, month] = yearMonth.split('-')
  const date = new Date(Number(year), Number(month) - 1)
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' })
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (!active || !payload || !label) return null
  return (
    <div
      style={{
        background: 'rgba(26, 26, 46, 0.95)',
        border: '1px solid var(--color-border)',
        borderRadius: 8,
        padding: '8px 12px',
        fontSize: 13,
        color: '#e2e8f0',
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: 4 }}>{formatMonthLabel(label)}</div>
      <div>Installs gained: {payload[0].value.toLocaleString()}</div>
    </div>
  )
}

export default function MonthlyInstallsChart({ rollups }: Props) {
  if (rollups.length === 0) {
    return <p role="status">{EMPTY_DATA_MESSAGE}</p>
  }

  // Sort by yearMonth ascending
  const sorted = [...rollups].sort((a, b) => a.yearMonth.localeCompare(b.yearMonth))

  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={sorted}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(120, 140, 248, 0.1)" />
        <XAxis
          dataKey="yearMonth"
          tickFormatter={formatMonthLabel}
          tick={{ fontSize: 11, fill: '#94a3b8' }}
        />
        <YAxis
          tickFormatter={(v: number) => v.toLocaleString()}
          tick={{ fontSize: 11, fill: '#94a3b8' }}
        />
        <Tooltip content={<CustomTooltip />} />
        <Bar
          dataKey="installsGained"
          name="Installs Gained"
          fill="#7c8cf8"
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  )
}