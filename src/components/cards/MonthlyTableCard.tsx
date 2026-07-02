import { useState, useMemo } from 'react'
import { MonthlyRollup } from '../../types/schema'
import FormulaTooltip from '../annotations/FormulaTooltip'

interface Props {
  rollups: MonthlyRollup[]
}

type SortKey = 'yearMonth' | 'installsEndOfMonth' | 'installsGained' | 'avgRating' | 'dataPointsInMonth'
type SortDir = 'asc' | 'desc'

function formatMonth(yearMonth: string): string {
  const [year, month] = yearMonth.split('-')
  const date = new Date(Number(year), Number(month) - 1)
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' })
}

function formatNum(n: number): string {
  return new Intl.NumberFormat('en-US').format(n)
}

export default function MonthlyTableCard({ rollups }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('yearMonth')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  const sorted = useMemo(() => {
    const sorted = [...rollups].sort((a, b) => {
      let cmp = 0
      switch (sortKey) {
        case 'yearMonth':
          cmp = a.yearMonth.localeCompare(b.yearMonth)
          break
        case 'installsEndOfMonth':
          cmp = a.installsEndOfMonth - b.installsEndOfMonth
          break
        case 'installsGained':
          cmp = a.installsGained - b.installsGained
          break
        case 'avgRating':
          cmp = a.avgRating - b.avgRating
          break
        case 'dataPointsInMonth':
          cmp = a.dataPointsInMonth - b.dataPointsInMonth
          break
      }
      return sortDir === 'desc' ? -cmp : cmp
    })
    return sorted
  }, [rollups, sortKey, sortDir])

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  function SortIcon({ column }: { column: SortKey }) {
    if (sortKey !== column) return <span style={{ opacity: 0.3, marginLeft: 4 }}>↕</span>
    return <span style={{ marginLeft: 4 }}>{sortDir === 'desc' ? '↓' : '↑'}</span>
  }

  if (rollups.length === 0) {
    return <p role="status" style={{ color: 'var(--color-text-muted)' }}>No monthly data available yet</p>
  }

  return (
    <div className="monthly-table-wrapper">
      <table className="monthly-table">
        <thead>
          <tr>
            <th onClick={() => toggleSort('yearMonth')} style={{ cursor: 'pointer' }}>
              Month <SortIcon column="yearMonth" />
            </th>
            <th onClick={() => toggleSort('installsEndOfMonth')} style={{ cursor: 'pointer' }}>
              Installs (EOM) <SortIcon column="installsEndOfMonth" />
            </th>
            <th onClick={() => toggleSort('installsGained')} style={{ cursor: 'pointer' }}>
              Gained <SortIcon column="installsGained" />
            </th>
            <th onClick={() => toggleSort('avgRating')} style={{ cursor: 'pointer' }}>
              Avg Rating <SortIcon column="avgRating" />
            </th>
            <th onClick={() => toggleSort('dataPointsInMonth')} style={{ cursor: 'pointer' }}>
              Data Points <SortIcon column="dataPointsInMonth" />
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => (
            <tr key={row.yearMonth}>
              <td>{formatMonth(row.yearMonth)}</td>
              <td>{formatNum(row.installsEndOfMonth)}</td>
              <td>
                {row.installsGained === 0 ? (
                  <FormulaTooltip
                    label="Installs Gained = 0"
                    formula="installsGained = currentMonthEnd − previousMonthEnd"
                    description="Zero means this is the first tracked month, so there's no prior month to compute a difference from."
                  >
                    <span>+0</span>
                  </FormulaTooltip>
                ) : (
                  <span>+{formatNum(row.installsGained)}</span>
                )}
              </td>
              <td>
                {row.avgRating === 0 ? (
                  <FormulaTooltip
                    label="Avg Rating = 0"
                    formula="avgRating = Σ ratings / count"
                    description="Zero means no rating data was available for this month. This can happen if no user submitted ratings during this period."
                  >
                    <span>0.00</span>
                  </FormulaTooltip>
                ) : (
                  <span>{row.avgRating.toFixed(2)}</span>
                )}
              </td>
              <td>{row.dataPointsInMonth}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
