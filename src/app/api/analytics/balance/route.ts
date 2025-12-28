import { NextResponse } from 'next/server';
import { getAuthUserWithHousehold } from '@/lib/auth-dev';
import { prisma } from '@/lib/db';
import { getWeekKey } from '@/lib/ritual/weekKey';

export async function GET(request: Request) {
  const authUser = await getAuthUserWithHousehold();
  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const weekKey = searchParams.get('week') || getWeekKey();

  // Get snapshot for this week
  const snapshot = await prisma.weekSnapshot.findUnique({
    where: {
      householdId_weekKey: { householdId: authUser.householdId, weekKey },
    },
  });

  // Get family member names
  const members = await prisma.familyMember.findMany({
    where: { householdId: authUser.householdId },
    select: { role: true, displayName: true },
  });

  const parentAName = members.find((m) => m.role === 'parent_a')?.displayName || 'Parent A';
  const parentBName = members.find((m) => m.role === 'parent_b')?.displayName || 'Parent B';

  if (!snapshot) {
    // Return empty balance if no snapshot
    return NextResponse.json({
      weekKey,
      parentA: { name: parentAName, events: 0, handoffs: 0, soloDays: 0 },
      parentB: { name: parentBName, events: 0, handoffs: 0, soloDays: 0 },
      totalEvents: 0,
      balanceScore: 50,
      balanceLabel: 'balanced',
    });
  }

  // Calculate balance score
  const total = snapshot.parentAEvents + snapshot.parentBEvents;
  let balanceScore = 50;
  let balanceLabel: 'balanced' | 'slight-imbalance' | 'imbalanced' = 'balanced';

  if (total > 0) {
    balanceScore = Math.round((snapshot.parentAEvents / total) * 100);
    const deviation = Math.abs(50 - balanceScore);
    if (deviation > 25) balanceLabel = 'imbalanced';
    else if (deviation > 10) balanceLabel = 'slight-imbalance';
  }

  return NextResponse.json({
    weekKey,
    parentA: {
      name: parentAName,
      events: snapshot.parentAEvents,
      handoffs: snapshot.parentAHandoffs,
      soloDays: snapshot.parentASoloDays,
    },
    parentB: {
      name: parentBName,
      events: snapshot.parentBEvents,
      handoffs: snapshot.parentBHandoffs,
      soloDays: snapshot.parentBSoloDays,
    },
    totalEvents: snapshot.totalEvents,
    balanceScore,
    balanceLabel,
    intensity: snapshot.intensity,
    ritualCompleted: !!snapshot.ritualCompletedAt,
    prepProgress: {
      completed: snapshot.prepItemsCompleted,
      total: snapshot.prepItemsTotal,
    },
    taskProgress: {
      completed: snapshot.tasksCompleted,
      total: snapshot.tasksTotal,
    },
  });
}
