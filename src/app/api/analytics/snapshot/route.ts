import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getWeekKey } from '@/lib/ritual/weekKey';

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { householdId: true },
  });

  if (!user?.householdId) {
    return NextResponse.json({ error: 'No household' }, { status: 400 });
  }

  const { searchParams } = new URL(request.url);
  const weekKey = searchParams.get('week') || getWeekKey();

  const snapshot = await prisma.weekSnapshot.findUnique({
    where: {
      householdId_weekKey: { householdId: user.householdId, weekKey },
    },
  });

  if (!snapshot) {
    return NextResponse.json({ snapshot: null, weekKey });
  }

  return NextResponse.json({ snapshot, weekKey });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { householdId: true },
  });

  if (!user?.householdId) {
    return NextResponse.json({ error: 'No household' }, { status: 400 });
  }

  const body = await request.json();
  const weekKey = body.weekKey || getWeekKey();

  // Get or calculate snapshot data from body or compute from current data
  const {
    parentAEvents = 0,
    parentBEvents = 0,
    parentAHandoffs = 0,
    parentBHandoffs = 0,
    parentASoloDays = 0,
    parentBSoloDays = 0,
    totalEvents = 0,
    conflictCount = 0,
    conflictResolved = 0,
    travelDays = 0,
    intensity = 'light',
  } = body;

  // Get ritual and task completion data
  const ritualWeek = await prisma.householdRitualWeek.findUnique({
    where: {
      householdId_weekKey: { householdId: user.householdId, weekKey },
    },
    include: {
      sessions: {
        include: {
          prepItems: true,
        },
      },
    },
  });

  let prepItemsTotal = 0;
  let prepItemsCompleted = 0;
  ritualWeek?.sessions.forEach((s) => {
    prepItemsTotal += s.prepItems.length;
    prepItemsCompleted += s.prepItems.filter((p) => p.done).length;
  });

  const completedSession = ritualWeek?.sessions.find((s) => s.completedAt);
  const ritualCompletedAt = completedSession?.completedAt || null;

  // Get task stats
  const tasks = await prisma.task.findMany({
    where: { householdId: user.householdId, weekKey },
  });
  const tasksTotal = tasks.length;
  const tasksCompleted = tasks.filter((t) => t.status === 'completed').length;

  // Upsert snapshot
  const snapshot = await prisma.weekSnapshot.upsert({
    where: {
      householdId_weekKey: { householdId: user.householdId, weekKey },
    },
    update: {
      parentAEvents,
      parentBEvents,
      parentAHandoffs,
      parentBHandoffs,
      parentASoloDays,
      parentBSoloDays,
      totalEvents,
      conflictCount,
      conflictResolved,
      travelDays,
      intensity,
      ritualCompletedAt,
      prepItemsTotal,
      prepItemsCompleted,
      tasksTotal,
      tasksCompleted,
    },
    create: {
      householdId: user.householdId,
      weekKey,
      parentAEvents,
      parentBEvents,
      parentAHandoffs,
      parentBHandoffs,
      parentASoloDays,
      parentBSoloDays,
      totalEvents,
      conflictCount,
      conflictResolved,
      travelDays,
      intensity,
      ritualCompletedAt,
      prepItemsTotal,
      prepItemsCompleted,
      tasksTotal,
      tasksCompleted,
    },
  });

  return NextResponse.json({ snapshot });
}
