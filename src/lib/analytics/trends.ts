/**
 * Calculate week-over-week change
 */
export function calculateChange(current: number, previous: number): {
  value: number;
  direction: 'up' | 'down' | 'same';
  percentage: number;
} {
  if (previous === 0) {
    return {
      value: current,
      direction: current > 0 ? 'up' : 'same',
      percentage: current > 0 ? 100 : 0,
    };
  }

  const change = current - previous;
  const percentage = Math.round((change / previous) * 100);

  return {
    value: Math.abs(change),
    direction: change > 0 ? 'up' : change < 0 ? 'down' : 'same',
    percentage: Math.abs(percentage),
  };
}

/**
 * Calculate average over a series
 */
export function calculateAverage(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.round(values.reduce((sum, v) => sum + v, 0) / values.length);
}

/**
 * Calculate trend direction from a series
 */
export function calculateTrend(values: number[]): 'increasing' | 'decreasing' | 'stable' {
  if (values.length < 2) return 'stable';

  const firstHalf = values.slice(0, Math.floor(values.length / 2));
  const secondHalf = values.slice(Math.floor(values.length / 2));

  const firstAvg = calculateAverage(firstHalf);
  const secondAvg = calculateAverage(secondHalf);

  const diff = secondAvg - firstAvg;
  const threshold = firstAvg * 0.1; // 10% change threshold

  if (diff > threshold) return 'increasing';
  if (diff < -threshold) return 'decreasing';
  return 'stable';
}

/**
 * Format week key for display
 */
export function formatWeekKey(weekKey: string): string {
  // weekKey format: "2024-W52"
  const [year, week] = weekKey.split('-W');
  const weekNum = parseInt(week, 10);

  // Calculate approximate date of week start
  const jan1 = new Date(parseInt(year, 10), 0, 1);
  const daysToAdd = (weekNum - 1) * 7;
  const weekStart = new Date(jan1.getTime() + daysToAdd * 24 * 60 * 60 * 1000);

  return weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Get the last N week keys
 */
export function getLastNWeeks(n: number): string[] {
  const weeks: string[] = [];
  const now = new Date();

  for (let i = 0; i < n; i++) {
    const date = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
    const year = date.getFullYear();
    const startOfYear = new Date(year, 0, 1);
    const days = Math.floor((date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
    const weekNum = Math.ceil((days + startOfYear.getDay() + 1) / 7);
    weeks.push(`${year}-W${String(weekNum).padStart(2, '0')}`);
  }

  return weeks.reverse();
}
