import { NextResponse } from 'next/server';
import { getAuthUserWithHousehold } from '@/lib/auth-dev';
import { prisma } from '@/lib/db';
import { formatWeekKey } from '@/lib/analytics/trends';

export async function GET(request: Request) {
  const authUser = await getAuthUserWithHousehold();
  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const weeks = parseInt(searchParams.get('weeks') || '8', 10);

  // Get snapshots
  const snapshots = await prisma.weekSnapshot.findMany({
    where: { householdId: authUser.householdId },
    orderBy: { weekKey: 'desc' },
    take: weeks,
  });

  // Get family member names
  const members = await prisma.familyMember.findMany({
    where: { householdId: authUser.householdId },
    select: { role: true, displayName: true },
  });

  const parentAName = members.find((m) => m.role === 'parent_a')?.displayName || 'Parent A';
  const parentBName = members.find((m) => m.role === 'parent_b')?.displayName || 'Parent B';

  // Format for charts
  const data = snapshots.reverse().map((s) => ({
    weekKey: s.weekKey,
    label: formatWeekKey(s.weekKey),
    parentAEvents: s.parentAEvents,
    parentBEvents: s.parentBEvents,
    totalEvents: s.totalEvents,
    conflictCount: s.conflictCount,
    intensity: s.intensity,
    ritualCompleted: !!s.ritualCompletedAt,
    prepCompletion: s.prepItemsTotal > 0 ? Math.round((s.prepItemsCompleted / s.prepItemsTotal) * 100) : 0,
    taskCompletion: s.tasksTotal > 0 ? Math.round((s.tasksCompleted / s.tasksTotal) * 100) : 0,
  }));

  // Calculate summary stats
  const totalWeeks = data.length;
  const ritualsCompleted = data.filter((d) => d.ritualCompleted).length;
  const avgEvents = totalWeeks > 0 ? Math.round(data.reduce((sum, d) => sum + d.totalEvents, 0) / totalWeeks) : 0;
  const avgConflicts = totalWeeks > 0 ? Math.round(data.reduce((sum, d) => sum + d.conflictCount, 0) / totalWeeks) : 0;

  return NextResponse.json({
    data,
    parentAName,
    parentBName,
    summary: {
      totalWeeks,
      ritualsCompleted,
      ritualStreak: calculateStreak(data.map((d) => d.ritualCompleted)),
      avgEventsPerWeek: avgEvents,
      avgConflictsPerWeek: avgConflicts,
    },
  });
}

function calculateStreak(completed: boolean[]): number {
  let streak = 0;
  // Count from most recent
  for (let i = completed.length - 1; i >= 0; i--) {
    if (completed[i]) streak++;
    else break;
  }
  return streak;
}
