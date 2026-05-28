import { DataPoint } from '../types/schema'

export interface ChartPoint {
  ts: number
  value: number
}

export function toChartPoints(
  data: DataPoint[],
  field: 'installs' | 'rating' | 'openVsxDownloads',
): ChartPoint[] {
  return data.map(point => {
    let value: number
    switch (field) {
      case 'installs':
        value = point.marketplace.installs
        break
      case 'rating':
        value = point.marketplace.averageRating ?? 0
        break
      case 'openVsxDownloads':
        value = point.openVsx?.downloads ?? 0
        break
    }
    return { ts: new Date(point.ts).getTime(), value }
  })
}

export function formatDate(ts: number): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(ts))
}
