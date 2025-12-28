/**
 * Family OS — Ritual State Persistence API
 *
 * GET  /api/ritual/state?week=2024-W50  → Load state for a week
 * PUT  /api/ritual/state                → Save/update state
 * DELETE /api/ritual/state?week=...     → Reset week's state
 */

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getWeekKey } from '@/lib/ritual/weekKey';
import { sendPartnerCompleteEmail } from '@/lib/notifications/email/send';
import { sendPartnerCompletePush } from '@/lib/notifications/push/send';
import { generateSnapshotForRitual } from '@/lib/analytics/generateSnapshot';

export interface RitualStateResponse {
  weekKey: string;
  currentStep: number;
  prepItems: Record<string, boolean>;
  decisions: Record<string, { resolved: boolean; resolution?: string }>;
  completedAt?: string;
}

/**
 * GET - Load ritual state for a week
 */
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const weekKey = searchParams.get('week') || getWeekKey();

    const ritualSession = await prisma.ritualSession.findUnique({
      where: {
        userId_weekKey: {
          userId: session.user.id,
          weekKey,
        },
      },
      include: {
        prepItems: true,
        decisions: true,
      },
    });

    if (!ritualSession) {
      // Return empty state for new week
      return NextResponse.json({
        weekKey,
        currentStep: 1,
        prepItems: {},
        decisions: {},
      } as RitualStateResponse);
    }

    // Transform to response format
    const prepItems: Record<string, boolean> = {};
    for (const item of ritualSession.prepItems) {
      prepItems[item.itemKey] = item.done;
    }

    const decisions: Record<string, { resolved: boolean; resolution?: string }> = {};
    for (const decision of ritualSession.decisions) {
      decisions[decision.conflictId] = {
        resolved: decision.resolved,
        resolution: decision.resolution || undefined,
      };
    }

    return NextResponse.json({
      weekKey: ritualSession.weekKey,
      currentStep: ritualSession.currentStep,
      prepItems,
      decisions,
      completedAt: ritualSession.completedAt?.toISOString(),
    } as RitualStateResponse);
  } catch (error) {
    console.error('Failed to load ritual state:', error);
    return NextResponse.json(
      { error: 'Failed to load ritual state' },
      { status: 500 }
    );
  }
}

interface UpdateStateRequest {
  weekKey?: string;
  currentStep?: number;
  prepItems?: Record<string, boolean>;
  decisions?: Record<string, { resolved: boolean; resolution?: string }>;
  completedAt?: string | null;
}

/**
 * PUT - Save/update ritual state
 */
export async function PUT(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: UpdateStateRequest = await request.json();
    const weekKey = body.weekKey || getWeekKey();

    // Check if user has a household for partner sync
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { householdId: true },
    });

    // Get or create household week if user has a household
    let householdWeekId: string | undefined;
    if (user?.householdId) {
      const householdWeek = await prisma.householdRitualWeek.upsert({
        where: {
          householdId_weekKey: {
            householdId: user.householdId,
            weekKey,
          },
        },
        update: {
          status: 'in_progress', // Mark as in progress when any partner is active
        },
        create: {
          householdId: user.householdId,
          weekKey,
          status: 'in_progress',
        },
      });
      householdWeekId = householdWeek.id;
    }

    // Upsert the ritual session
    const ritualSession = await prisma.ritualSession.upsert({
      where: {
        userId_weekKey: {
          userId: session.user.id,
          weekKey,
        },
      },
      update: {
        currentStep: body.currentStep,
        completedAt: body.completedAt ? new Date(body.completedAt) : undefined,
        householdWeekId,
      },
      create: {
        userId: session.user.id,
        weekKey,
        currentStep: body.currentStep || 1,
        completedAt: body.completedAt ? new Date(body.completedAt) : undefined,
        householdWeekId,
      },
    });

    // Update prep items if provided
    if (body.prepItems) {
      for (const [itemKey, done] of Object.entries(body.prepItems)) {
        await prisma.prepItemState.upsert({
          where: {
            ritualSessionId_itemKey: {
              ritualSessionId: ritualSession.id,
              itemKey,
            },
          },
          update: { done },
          create: {
            ritualSessionId: ritualSession.id,
            itemKey,
            done,
          },
        });
      }
    }

    // Update decisions if provided
    if (body.decisions) {
      for (const [conflictId, state] of Object.entries(body.decisions)) {
        await prisma.decisionState.upsert({
          where: {
            ritualSessionId_conflictId: {
              ritualSessionId: ritualSession.id,
              conflictId,
            },
          },
          update: {
            resolved: state.resolved,
            resolution: state.resolution || null,
          },
          create: {
            ritualSessionId: ritualSession.id,
            conflictId,
            resolved: state.resolved,
            resolution: state.resolution || null,
          },
        });
      }
    }

    // Send notifications to partner when ritual is completed
    if (body.completedAt && user?.householdId) {
      // Fire and forget - don't block the response
      notifyPartnerOfCompletion(session.user.id, user.householdId, weekKey).catch(console.error);

      // Generate snapshot for analytics
      generateSnapshotForRitual(user.householdId, weekKey).catch(console.error);
    }

    return NextResponse.json({ success: true, weekKey });
  } catch (error) {
    console.error('Failed to save ritual state:', error);
    return NextResponse.json(
      { error: 'Failed to save ritual state' },
      { status: 500 }
    );
  }
}

/**
 * Helper function to notify partner when ritual is completed
 */
async function notifyPartnerOfCompletion(
  userId: string,
  householdId: string,
  weekKey: string
) {
  try {
    // Get the completing user and their partner
    const completingUser = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        familyMember: true,
      },
    });

    // Get partner in the same household
    const partner = await prisma.user.findFirst({
      where: {
        householdId,
        id: { not: userId },
      },
      include: {
        familyMember: true,
        notificationPreference: true,
      },
    });

    if (!partner || !partner.email) {
      return;
    }

    const senderName = completingUser?.familyMember?.displayName || completingUser?.name || 'Your partner';
    const recipientName = partner.familyMember?.displayName || partner.name || 'there';

    // Format week range for email
    const [year, week] = weekKey.split('-W');
    const weekStart = new Date(parseInt(year), 0, 1 + (parseInt(week) - 1) * 7);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    const weekRange = `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;

    const prefs = partner.notificationPreference;

    // Send push notification
    if (prefs?.pushEnabled && prefs?.pushPartnerComplete) {
      await sendPartnerCompletePush({
        toUserId: partner.id,
        partnerName: senderName,
      });
    }

    // Send email notification
    if (prefs?.emailPartnerComplete) {
      await sendPartnerCompleteEmail({
        toUserId: partner.id,
        toEmail: partner.email,
        recipientName,
        partnerName: senderName,
        weekRange,
      });
    }
  } catch (error) {
    console.error('Failed to notify partner of completion:', error);
  }
}

/**
 * DELETE - Reset/clear a week's ritual state
 */
export async function DELETE(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const weekKey = searchParams.get('week') || getWeekKey();

    await prisma.ritualSession.deleteMany({
      where: {
        userId: session.user.id,
        weekKey,
      },
    });

    return NextResponse.json({ success: true, weekKey });
  } catch (error) {
    console.error('Failed to reset ritual state:', error);
    return NextResponse.json(
      { error: 'Failed to reset ritual state' },
      { status: 500 }
    );
  }
}
