/**
 * Family OS — Household Ritual Status API
 *
 * GET  /api/ritual/household?week=2024-W50  → Get household ritual status + partner progress
 * POST /api/ritual/household                 → Update household ritual week status
 */

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getWeekKey } from '@/lib/ritual/weekKey';

export interface PartnerProgress {
  userId: string;
  name: string;
  step: number;
  completedAt: string | null;
  isMe: boolean;
}

export interface HouseholdRitualResponse {
  weekKey: string;
  status: 'pending' | 'in_progress' | 'needs_sync' | 'completed';
  hasPartner: boolean;
  myProgress: PartnerProgress | null;
  partnerProgress: PartnerProgress | null;
  needsSync: boolean;
}

/**
 * GET - Get household ritual status for current week
 */
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const weekKey = searchParams.get('week') || getWeekKey();

    // Get user's household membership
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        household: {
          include: {
            members: {
              include: {
                user: true,
              },
            },
          },
        },
        familyMember: true,
      },
    });

    if (!user?.household) {
      // User has no household - solo mode
      return NextResponse.json({
        weekKey,
        status: 'pending',
        hasPartner: false,
        myProgress: null,
        partnerProgress: null,
        needsSync: false,
      } as HouseholdRitualResponse);
    }

    const household = user.household;
    const householdMembers = household.members;
    const partner = householdMembers.find(m => m.userId !== session.user.id);
    const hasPartner = !!partner;

    // Get or create household ritual week
    let householdWeek = await prisma.householdRitualWeek.findUnique({
      where: {
        householdId_weekKey: {
          householdId: household.id,
          weekKey,
        },
      },
      include: {
        sessions: {
          include: {
            user: true,
          },
        },
      },
    });

    // If no household week exists yet, create one
    if (!householdWeek) {
      householdWeek = await prisma.householdRitualWeek.create({
        data: {
          householdId: household.id,
          weekKey,
          status: 'pending',
        },
        include: {
          sessions: {
            include: {
              user: true,
            },
          },
        },
      });
    }

    // Get all household members' ritual sessions for this week
    const memberUserIds = householdMembers.map(m => m.userId);
    const sessions = await prisma.ritualSession.findMany({
      where: {
        userId: { in: memberUserIds },
        weekKey,
      },
      include: {
        user: true,
        decisions: true,
      },
    });

    // Link any unlinked sessions to this household week
    const unlinkedSessions = sessions.filter(s => !s.householdWeekId);
    if (unlinkedSessions.length > 0) {
      await prisma.ritualSession.updateMany({
        where: {
          id: { in: unlinkedSessions.map(s => s.id) },
        },
        data: {
          householdWeekId: householdWeek.id,
        },
      });
    }

    // Build progress for each partner
    const mySession = sessions.find(s => s.userId === session.user.id);
    const partnerSession = partner ? sessions.find(s => s.userId === partner.userId) : null;

    const myMember = householdMembers.find(m => m.userId === session.user.id);

    const myProgress: PartnerProgress | null = mySession
      ? {
          userId: session.user.id,
          name: myMember?.displayName || user.name || 'You',
          step: mySession.currentStep,
          completedAt: mySession.completedAt?.toISOString() || null,
          isMe: true,
        }
      : null;

    const partnerProgress: PartnerProgress | null = partnerSession && partner
      ? {
          userId: partner.userId,
          name: partner.displayName,
          step: partnerSession.currentStep,
          completedAt: partnerSession.completedAt?.toISOString() || null,
          isMe: false,
        }
      : partner
      ? {
          userId: partner.userId,
          name: partner.displayName,
          step: 0, // Not started
          completedAt: null,
          isMe: false,
        }
      : null;

    // Calculate household status
    const myCompleted = mySession?.completedAt !== null && mySession?.completedAt !== undefined;
    const partnerCompleted = partnerSession?.completedAt !== null && partnerSession?.completedAt !== undefined;

    let status: 'pending' | 'in_progress' | 'needs_sync' | 'completed' = 'pending';

    if (!mySession && !partnerSession) {
      status = 'pending';
    } else if (myCompleted && partnerCompleted) {
      // Both completed - check if decisions need sync
      const myDecisions = mySession?.decisions || [];
      const partnerDecisions = partnerSession?.decisions || [];

      // Find conflicts where decisions differ
      const decisionConflicts = myDecisions.filter(md => {
        const pd = partnerDecisions.find(p => p.conflictId === md.conflictId);
        return pd && md.resolution !== pd.resolution;
      });

      if (decisionConflicts.length > 0) {
        status = 'needs_sync';
      } else {
        status = 'completed';
      }
    } else if (mySession || partnerSession) {
      status = 'in_progress';
    }

    // Update household week status if changed
    if (householdWeek.status !== status) {
      await prisma.householdRitualWeek.update({
        where: { id: householdWeek.id },
        data: { status },
      });
    }

    const needsSync = status === 'needs_sync';

    return NextResponse.json({
      weekKey,
      status,
      hasPartner,
      myProgress,
      partnerProgress,
      needsSync,
    } as HouseholdRitualResponse);
  } catch (error) {
    console.error('Failed to get household ritual status:', error);
    return NextResponse.json(
      { error: 'Failed to get household ritual status' },
      { status: 500 }
    );
  }
}

interface UpdateHouseholdRequest {
  weekKey?: string;
  status?: 'pending' | 'in_progress' | 'needs_sync' | 'completed';
}

/**
 * POST - Update household ritual week status
 */
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: UpdateHouseholdRequest = await request.json();
    const weekKey = body.weekKey || getWeekKey();

    // Get user's household
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { householdId: true },
    });

    if (!user?.householdId) {
      return NextResponse.json({ error: 'No household found' }, { status: 400 });
    }

    // Update or create household week
    const householdWeek = await prisma.householdRitualWeek.upsert({
      where: {
        householdId_weekKey: {
          householdId: user.householdId,
          weekKey,
        },
      },
      update: {
        status: body.status,
      },
      create: {
        householdId: user.householdId,
        weekKey,
        status: body.status || 'pending',
      },
    });

    return NextResponse.json({ success: true, weekKey, status: householdWeek.status });
  } catch (error) {
    console.error('Failed to update household ritual status:', error);
    return NextResponse.json(
      { error: 'Failed to update household ritual status' },
      { status: 500 }
    );
  }
}
