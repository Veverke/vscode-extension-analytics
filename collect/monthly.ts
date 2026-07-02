import fs from 'fs';
import path from 'path';
import type { DataPoint, MonthlyRollup } from '../src/types/schema.js';
import { getDataDir } from './storage.js';

/**
 * Groups data points by calendar month (UTC) and produces one summary record per month.
 */
export function computeMonthlyRollup(data: DataPoint[]): MonthlyRollup[] {
  if (data.length === 0) return [];

  // Sort by timestamp ascending
  const sorted = [...data].sort(
    (a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime()
  );

  // Group by year-month
  const grouped = new Map<string, DataPoint[]>();

  for (const point of sorted) {
    const d = new Date(point.ts);
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(point);
  }

  const months = Array.from(grouped.keys()).sort();
  const rollups: MonthlyRollup[] = [];

  for (let i = 0; i < months.length; i++) {
    const yearMonth = months[i];
    const points = grouped.get(yearMonth)!;
    const lastPoint = points[points.length - 1];

    // Installs gained = current month end - previous month end (or 0 for first month)
    let installsGained = 0;
    if (i > 0) {
      const prevMonth = months[i - 1];
      const prevPoints = grouped.get(prevMonth)!;
      const prevLastPoint = prevPoints[prevPoints.length - 1];
      installsGained = lastPoint.marketplace.installs - prevLastPoint.marketplace.installs;
    }

    // Average rating across all points in the month
    const ratings = points
      .map((p) => p.marketplace.averageRating)
      .filter((r): r is number => r !== undefined);
    const avgRating =
      ratings.length > 0
        ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length
        : 0;

    rollups.push({
      yearMonth,
      installsEndOfMonth: lastPoint.marketplace.installs,
      installsGained: Math.max(0, installsGained),
      avgRating: Math.round(avgRating * 100) / 100,
      ratingCountEndOfMonth: lastPoint.marketplace.ratingCount,
      openVsxDownloadsEndOfMonth: lastPoint.openVsx?.downloads ?? 0,
      dataPointsInMonth: points.length,
    });
  }

  return rollups;
}

/**
 * Writes monthly rollups to data/<extensionId>.monthly.json
 */
export function writeMonthlyRollup(extensionId: string, rollups: MonthlyRollup[]): void {
  const dataDir = getDataDir();
  const filePath = path.join(dataDir, `${extensionId}.monthly.json`);
  fs.writeFileSync(filePath, JSON.stringify(rollups, null, 2), 'utf-8');
}

/**
 * Reads monthly rollups from data/<extensionId>.monthly.json
 */
export function readMonthlyRollup(extensionId: string): MonthlyRollup[] {
  const dataDir = getDataDir();
  const filePath = path.join(dataDir, `${extensionId}.monthly.json`);
  if (!fs.existsSync(filePath)) {
    return [];
  }
  const content = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(content) as MonthlyRollup[];
}