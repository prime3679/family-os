import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getWeekKey } from '@/lib/ritual/weekKey';
import { sendPartnerNudgeEmail } from '@/lib/notifications/email/send';
import { sendNudgePush } from '@/lib/notifications/push/send';

// Cooldown period in milliseconds (1 hour)
const NUDGE_COOLDOWN_MS = 60 * 60 * 1000;

/**
 * POST - Send a nudge to partner
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { message } = body;

    // Get user with household info
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        familyMember: {
          include: {
            household: {
              include: {
                users: {
                  where: { id: { not: session.user.id } },
                  include: {
                    familyMember: true,
                    notificationPreference: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user?.familyMember?.household) {
      return NextResponse.json(
        { error: 'You need to be in a household to nudge' },
        { status: 400 }
      );
    }

    const partner = user.familyMember.household.users[0];
    if (!partner) {
      return NextResponse.json(
        { error: 'No partner found in household' },
        { status: 400 }
      );
    }

    const weekKey = getWeekKey();

    // Check for recent nudge (cooldown)
    const recentNudge = await prisma.partnerNudge.findFirst({
      where: {
        fromUserId: session.user.id,
        toUserId: partner.id,
        weekKey,
        sentAt: {
          gte: new Date(Date.now() - NUDGE_COOLDOWN_MS),
        },
      },
    });

    if (recentNudge) {
      const timeRemaining = Math.ceil(
        (NUDGE_COOLDOWN_MS - (Date.now() - recentNudge.sentAt.getTime())) / 60000
      );
      return NextResponse.json(
        {
          error: 'Cooldown active',
          message: `You can nudge again in ${timeRemaining} minutes`,
          cooldownMinutes: timeRemaining,
        },
        { status: 429 }
      );
    }

    // Create the nudge record
    const nudge = await prisma.partnerNudge.create({
      data: {
        fromUserId: session.user.id,
        toUserId: partner.id,
        householdId: user.familyMember.household.id,
        weekKey,
        message,
      },
    });

    const senderName = user.familyMember.displayName || user.name || 'Your partner';
    const recipientName = partner.familyMember?.displayName || partner.name || 'there';

    // Send notifications based on preferences
    const prefs = partner.notificationPreference;
    const results = { email: false, push: false };

    // Send push notification
    if (prefs?.pushEnabled && prefs?.pushNudge) {
      const pushResult = await sendNudgePush({
        toUserId: partner.id,
        senderName,
        message,
      });
      results.push = pushResult.success;
    }

    // Send email notification
    if (prefs?.emailPartnerComplete && partner.email) {
      const emailResult = await sendPartnerNudgeEmail({
        toUserId: partner.id,
        toEmail: partner.email,
        recipientName,
        senderName,
        message,
      });
      results.email = emailResult.success;
    }

    return NextResponse.json({
      success: true,
      nudgeId: nudge.id,
      notifications: results,
    });
  } catch (error) {
    console.error('Nudge error:', error);
    return NextResponse.json(
      { error: 'Failed to send nudge' },
      { status: 500 }
    );
  }
}

/**
 * GET - Check nudge status (cooldown remaining)
 */
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's household
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        familyMember: {
          include: {
            household: {
              include: {
                users: {
                  where: { id: { not: session.user.id } },
                },
              },
            },
          },
        },
      },
    });

    if (!user?.familyMember?.household?.users[0]) {
      return NextResponse.json({
        canNudge: false,
        reason: 'no_partner',
      });
    }

    const partner = user.familyMember.household.users[0];
    const weekKey = getWeekKey();

    // Check for recent nudge
    const recentNudge = await prisma.partnerNudge.findFirst({
      where: {
        fromUserId: session.user.id,
        toUserId: partner.id,
        weekKey,
        sentAt: {
          gte: new Date(Date.now() - NUDGE_COOLDOWN_MS),
        },
      },
      orderBy: { sentAt: 'desc' },
    });

    if (recentNudge) {
      const timeRemaining = Math.ceil(
        (NUDGE_COOLDOWN_MS - (Date.now() - recentNudge.sentAt.getTime())) / 60000
      );
      return NextResponse.json({
        canNudge: false,
        reason: 'cooldown',
        cooldownMinutes: timeRemaining,
        lastNudgeAt: recentNudge.sentAt,
      });
    }

    return NextResponse.json({
      canNudge: true,
    });
  } catch (error) {
    console.error('Nudge status error:', error);
    return NextResponse.json(
      { error: 'Failed to check nudge status' },
      { status: 500 }
    );
  }
}
