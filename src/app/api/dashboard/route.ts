import { NextResponse } from 'next/server';
import { getAuthUserWithHousehold } from '@/lib/auth-dev';
import { prisma } from '@/lib/db';
import { getWeekKey } from '@/lib/ritual/weekKey';

export async function GET() {
  try {
    const authUser = await getAuthUserWithHousehold();
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const weekKey = getWeekKey();

    // Fetch all data in parallel
    const [
      tasks,
      insights,
      ritualSession,
      partnerSession,
    ] = await Promise.all([
      // Get pending tasks for this week
      prisma.task.findMany({
        where: {
          householdId: authUser.householdId,
          weekKey,
          status: { in: ['pending', 'in_progress'] },
        },
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
        take: 5,
        include: { child: true },
      }),

      // Get active insights
      prisma.insight.findMany({
        where: {
          householdId: authUser.householdId,
          status: { in: ['pending', 'sent'] },
        },
        orderBy: [{ severity: 'desc' }, { createdAt: 'desc' }],
        take: 5,
      }),

      // Get current user's ritual session
      prisma.ritualSession.findFirst({
        where: {
          userId: authUser.userId,
          weekKey,
        },
      }),

      // Get partner's ritual session (need to find partner first via household)
      prisma.ritualSession.findFirst({
        where: {
          weekKey,
          userId: { not: authUser.userId },
          user: {
            householdId: authUser.householdId,
          },
        },
        include: {
          user: {
            select: { name: true, email: true },
          },
        },
      }),
    ]);

    // Count stats
    const [taskCount, conflictCount, insightCount] = await Promise.all([
      prisma.task.count({
        where: {
          householdId: authUser.householdId,
          weekKey,
          status: { in: ['pending', 'in_progress'] },
        },
      }),
      prisma.insight.count({
        where: {
          householdId: authUser.householdId,
          type: 'conflict',
          status: { in: ['pending', 'sent'] },
        },
      }),
      prisma.insight.count({
        where: {
          householdId: authUser.householdId,
          status: { in: ['pending', 'sent'] },
        },
      }),
    ]);

    // Determine partner status
    let partnerStatus: 'not_started' | 'in_progress' | 'completed' | 'no_partner' = 'no_partner';
    let partnerName: string | null = null;
    let partnerStep: number | null = null;

    if (partnerSession) {
      partnerName = partnerSession.user?.name || partnerSession.user?.email?.split('@')[0] || 'Partner';
      partnerStep = partnerSession.currentStep;
      if (partnerSession.completedAt) {
        partnerStatus = 'completed';
      } else if (partnerSession.currentStep > 0) {
        partnerStatus = 'in_progress';
      } else {
        partnerStatus = 'not_started';
      }
    }

    // Current user's ritual status
    let userRitualStatus: 'not_started' | 'in_progress' | 'completed' = 'not_started';
    if (ritualSession) {
      if (ritualSession.completedAt) {
        userRitualStatus = 'completed';
      } else if (ritualSession.currentStep > 0) {
        userRitualStatus = 'in_progress';
      }
    }

    return NextResponse.json({
      weekKey,
      stats: {
        pendingTasks: taskCount,
        conflicts: conflictCount,
        activeInsights: insightCount,
      },
      tasks: tasks.map((t) => ({
        id: t.id,
        title: t.title,
        priority: t.priority,
        status: t.status,
        childName: t.child?.name || null,
      })),
      insights: insights.map((i) => ({
        id: i.id,
        type: i.type,
        severity: i.severity,
        title: i.title,
        description: i.description,
      })),
      ritual: {
        userStatus: userRitualStatus,
        userStep: ritualSession?.currentStep || 0,
      },
      partner: {
        status: partnerStatus,
        name: partnerName,
        step: partnerStep,
      },
    });
  } catch (error) {
    console.error('Dashboard API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
