import { prisma } from '@/lib/db';
import { calculateBalance } from './calculateBalance';
import type { Event, Conflict, WeekSummary } from '@/data/mock-data';

export interface SnapshotData {
  parentAEvents: number;
  parentBEvents: number;
  parentAHandoffs: number;
  parentBHandoffs: number;
  parentASoloDays: number;
  parentBSoloDays: number;
  totalEvents: number;
  conflictCount: number;
  conflictResolved: number;
  travelDays: number;
  intensity: string;
  ritualCompletedAt: Date | null;
  prepItemsTotal: number;
  prepItemsCompleted: number;
  tasksTotal: number;
  tasksCompleted: number;
}

/**
 * Generate or update a week snapshot for a household
 */
export async function generateSnapshot(
  householdId: string,
  weekKey: string,
  events: Event[],
  conflicts: Conflict[],
  weekSummary: WeekSummary
): Promise<SnapshotData> {
  // Calculate balance
  const balance = calculateBalance(events, weekSummary);

  // Get ritual completion info
  const ritualWeek = await prisma.householdRitualWeek.findUnique({
    where: {
      householdId_weekKey: { householdId, weekKey },
    },
    include: {
      sessions: {
        include: {
          prepItems: true,
        },
      },
    },
  });

  // Calculate prep completion
  let prepItemsTotal = 0;
  let prepItemsCompleted = 0;
  ritualWeek?.sessions.forEach((session) => {
    prepItemsTotal += session.prepItems.length;
    prepItemsCompleted += session.prepItems.filter((p) => p.done).length;
  });

  // Get task completion for this week
  const tasks = await prisma.task.findMany({
    where: { householdId, weekKey },
  });
  const tasksTotal = tasks.length;
  const tasksCompleted = tasks.filter((t) => t.status === 'completed').length;

  // Get ritual completion timestamp
  const completedSession = ritualWeek?.sessions.find((s) => s.completedAt);
  const ritualCompletedAt = completedSession?.completedAt || null;

  // Count resolved conflicts (decisions made)
  let conflictResolved = 0;
  ritualWeek?.sessions.forEach((session) => {
    // We'd need to check DecisionState for this
    // For now, estimate based on ritual completion
    if (session.completedAt) {
      conflictResolved = conflicts.length;
    }
  });

  const snapshotData: SnapshotData = {
    parentAEvents: balance.parentA.events,
    parentBEvents: balance.parentB.events,
    parentAHandoffs: balance.parentA.handoffs,
    parentBHandoffs: balance.parentB.handoffs,
    parentASoloDays: balance.parentA.soloDays,
    parentBSoloDays: balance.parentB.soloDays,
    totalEvents: weekSummary.totalEvents,
    conflictCount: conflicts.length,
    conflictResolved,
    travelDays: weekSummary.travelDays,
    intensity: weekSummary.intensity,
    ritualCompletedAt,
    prepItemsTotal,
    prepItemsCompleted,
    tasksTotal,
    tasksCompleted,
  };

  // Upsert snapshot
  await prisma.weekSnapshot.upsert({
    where: {
      householdId_weekKey: { householdId, weekKey },
    },
    update: snapshotData,
    create: {
      householdId,
      weekKey,
      ...snapshotData,
    },
  });

  return snapshotData;
}

/**
 * Generate snapshot for ritual completion (simplified version without event data)
 * This is called when a ritual is completed to capture basic metrics
 */
export async function generateSnapshotForRitual(
  householdId: string,
  weekKey: string
): Promise<void> {
  try {
    // Get ritual completion info
    const ritualWeek = await prisma.householdRitualWeek.findUnique({
      where: {
        householdId_weekKey: { householdId, weekKey },
      },
      include: {
        sessions: {
          include: {
            prepItems: true,
            decisions: true,
          },
        },
      },
    });

    if (!ritualWeek) {
      console.warn('No ritual week found for snapshot generation');
      return;
    }

    // Calculate prep completion
    let prepItemsTotal = 0;
    let prepItemsCompleted = 0;
    ritualWeek.sessions.forEach((session) => {
      prepItemsTotal += session.prepItems.length;
      prepItemsCompleted += session.prepItems.filter((p) => p.done).length;
    });

    // Get task completion for this week
    const tasks = await prisma.task.findMany({
      where: { householdId, weekKey },
    });
    const tasksTotal = tasks.length;
    const tasksCompleted = tasks.filter((t) => t.status === 'completed').length;

    // Get ritual completion timestamp
    const completedSession = ritualWeek.sessions.find((s) => s.completedAt);
    const ritualCompletedAt = completedSession?.completedAt || null;

    // Count resolved conflicts (decisions made)
    let conflictResolved = 0;
    let conflictCount = 0;
    ritualWeek.sessions.forEach((session) => {
      const resolvedDecisions = session.decisions.filter((d) => d.resolved);
      conflictResolved += resolvedDecisions.length;
      conflictCount += session.decisions.length;
    });

    // Upsert snapshot with available data
    // Event-based metrics will be filled in later when events are available
    await prisma.weekSnapshot.upsert({
      where: {
        householdId_weekKey: { householdId, weekKey },
      },
      update: {
        ritualCompletedAt,
        prepItemsTotal,
        prepItemsCompleted,
        tasksTotal,
        tasksCompleted,
        conflictCount,
        conflictResolved,
      },
      create: {
        householdId,
        weekKey,
        ritualCompletedAt,
        prepItemsTotal,
        prepItemsCompleted,
        tasksTotal,
        tasksCompleted,
        conflictCount,
        conflictResolved,
        // Default values for event-based metrics
        parentAEvents: 0,
        parentBEvents: 0,
        parentAHandoffs: 0,
        parentBHandoffs: 0,
        parentASoloDays: 0,
        parentBSoloDays: 0,
        totalEvents: 0,
        travelDays: 0,
        intensity: 'light',
      },
    });
  } catch (error) {
    console.error('Failed to generate snapshot for ritual:', error);
    throw error;
  }
}

/**
 * Get historical snapshots for trends
 */
export async function getSnapshots(
  householdId: string,
  weeks: number = 8
): Promise<
  Array<{
    weekKey: string;
    parentAEvents: number;
    parentBEvents: number;
    totalEvents: number;
    conflictCount: number;
    intensity: string;
    ritualCompletedAt: Date | null;
    prepItemsCompleted: number;
    prepItemsTotal: number;
    tasksCompleted: number;
    tasksTotal: number;
  }>
> {
  const snapshots = await prisma.weekSnapshot.findMany({
    where: { householdId },
    orderBy: { weekKey: 'desc' },
    take: weeks,
  });

  return snapshots.reverse(); // Return in chronological order
}
