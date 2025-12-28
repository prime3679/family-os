/**
 * Family OS — Partner Decisions Comparison API
 *
 * GET  /api/ritual/decisions?week=2024-W50  → Compare both partners' decisions
 * POST /api/ritual/decisions                 → Set synced/final decision for a conflict
 */

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getWeekKey } from '@/lib/ritual/weekKey';

export interface DecisionComparison {
  conflictId: string;
  myResolution: string | null;
  partnerResolution: string | null;
  matches: boolean;
  finalResolution: string | null;
}

export interface PartnerDecisionsResponse {
  weekKey: string;
  hasPartner: boolean;
  myDecisions: Record<string, { resolved: boolean; resolution?: string }>;
  partnerDecisions: Record<string, { resolved: boolean; resolution?: string }>;
  comparisons: DecisionComparison[];
  conflictingDecisions: string[]; // IDs where decisions differ
  allSynced: boolean;
}

/**
 * GET - Compare both partners' decisions for current week
 */
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const weekKey = searchParams.get('week') || getWeekKey();

    // Get user's household
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        household: {
          include: {
            members: true,
          },
        },
      },
    });

    if (!user?.household) {
      // No household - return only my decisions
      const mySession = await prisma.ritualSession.findUnique({
        where: {
          userId_weekKey: {
            userId: session.user.id,
            weekKey,
          },
        },
        include: {
          decisions: true,
        },
      });

      const myDecisions: Record<string, { resolved: boolean; resolution?: string }> = {};
      for (const d of mySession?.decisions || []) {
        myDecisions[d.conflictId] = {
          resolved: d.resolved,
          resolution: d.resolution || undefined,
        };
      }

      return NextResponse.json({
        weekKey,
        hasPartner: false,
        myDecisions,
        partnerDecisions: {},
        comparisons: [],
        conflictingDecisions: [],
        allSynced: true,
      } as PartnerDecisionsResponse);
    }

    const partner = user.household.members.find(m => m.userId !== session.user.id);
    const hasPartner = !!partner;

    // Get both partners' sessions
    const memberUserIds = user.household.members.map(m => m.userId);
    const sessions = await prisma.ritualSession.findMany({
      where: {
        userId: { in: memberUserIds },
        weekKey,
      },
      include: {
        decisions: true,
      },
    });

    const mySession = sessions.find(s => s.userId === session.user.id);
    const partnerSession = partner ? sessions.find(s => s.userId === partner.userId) : null;

    // Build decision records
    const myDecisions: Record<string, { resolved: boolean; resolution?: string }> = {};
    for (const d of mySession?.decisions || []) {
      myDecisions[d.conflictId] = {
        resolved: d.resolved,
        resolution: d.resolution || undefined,
      };
    }

    const partnerDecisions: Record<string, { resolved: boolean; resolution?: string }> = {};
    for (const d of partnerSession?.decisions || []) {
      partnerDecisions[d.conflictId] = {
        resolved: d.resolved,
        resolution: d.resolution || undefined,
      };
    }

    // Build comparisons for all conflict IDs
    const allConflictIds = new Set([
      ...Object.keys(myDecisions),
      ...Object.keys(partnerDecisions),
    ]);

    const comparisons: DecisionComparison[] = [];
    const conflictingDecisions: string[] = [];

    for (const conflictId of allConflictIds) {
      const myRes = myDecisions[conflictId]?.resolution || null;
      const partnerRes = partnerDecisions[conflictId]?.resolution || null;
      const matches = myRes === partnerRes;

      comparisons.push({
        conflictId,
        myResolution: myRes,
        partnerResolution: partnerRes,
        matches,
        finalResolution: matches ? myRes : null,
      });

      if (!matches && myRes && partnerRes) {
        conflictingDecisions.push(conflictId);
      }
    }

    const allSynced = conflictingDecisions.length === 0 && comparisons.length > 0;

    return NextResponse.json({
      weekKey,
      hasPartner,
      myDecisions,
      partnerDecisions,
      comparisons,
      conflictingDecisions,
      allSynced,
    } as PartnerDecisionsResponse);
  } catch (error) {
    console.error('Failed to get partner decisions:', error);
    return NextResponse.json(
      { error: 'Failed to get partner decisions' },
      { status: 500 }
    );
  }
}

interface SyncDecisionRequest {
  weekKey?: string;
  conflictId: string;
  resolution: string;
}

/**
 * POST - Set the final synced decision for a conflict
 * This updates both partners' decisions to the agreed-upon resolution
 */
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: SyncDecisionRequest = await request.json();
    const weekKey = body.weekKey || getWeekKey();

    if (!body.conflictId || !body.resolution) {
      return NextResponse.json(
        { error: 'conflictId and resolution are required' },
        { status: 400 }
      );
    }

    // Get user's household
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        household: {
          include: {
            members: true,
          },
        },
      },
    });

    if (!user?.household) {
      return NextResponse.json({ error: 'No household found' }, { status: 400 });
    }

    // Get both partners' sessions
    const memberUserIds = user.household.members.map(m => m.userId);
    const sessions = await prisma.ritualSession.findMany({
      where: {
        userId: { in: memberUserIds },
        weekKey,
      },
    });

    // Update both partners' decisions to the synced resolution
    for (const ritualSession of sessions) {
      await prisma.decisionState.upsert({
        where: {
          ritualSessionId_conflictId: {
            ritualSessionId: ritualSession.id,
            conflictId: body.conflictId,
          },
        },
        update: {
          resolved: true,
          resolution: body.resolution,
        },
        create: {
          ritualSessionId: ritualSession.id,
          conflictId: body.conflictId,
          resolved: true,
          resolution: body.resolution,
        },
      });
    }

    // Check if all decisions are now synced
    const updatedSessions = await prisma.ritualSession.findMany({
      where: {
        userId: { in: memberUserIds },
        weekKey,
      },
      include: {
        decisions: true,
      },
    });

    // Check for remaining conflicts
    const decisionsA = updatedSessions[0]?.decisions || [];
    const decisionsB = updatedSessions[1]?.decisions || [];

    let hasConflicts = false;
    for (const dA of decisionsA) {
      const dB = decisionsB.find(d => d.conflictId === dA.conflictId);
      if (dB && dA.resolution !== dB.resolution) {
        hasConflicts = true;
        break;
      }
    }

    // Update household week status if all synced
    if (!hasConflicts) {
      await prisma.householdRitualWeek.updateMany({
        where: {
          householdId: user.household.id,
          weekKey,
        },
        data: {
          status: 'completed',
        },
      });
    }

    return NextResponse.json({
      success: true,
      conflictId: body.conflictId,
      resolution: body.resolution,
      allSynced: !hasConflicts,
    });
  } catch (error) {
    console.error('Failed to sync decision:', error);
    return NextResponse.json(
      { error: 'Failed to sync decision' },
      { status: 500 }
    );
  }
}
