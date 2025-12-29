import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserWithHousehold } from '@/lib/auth-dev';
import { prisma } from '@/lib/db';
import { createGoogleCalendarEvent } from '@/lib/calendar/write';
import { sendNudgePush } from '@/lib/notifications/push/send';
import { getWeekKey } from '@/lib/ritual/weekKey';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUserWithHousehold();
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { action, data } = await request.json();

    // Verify insight belongs to user's household
    const insight = await prisma.insight.findFirst({
      where: { id, householdId: authUser.householdId },
      include: {
        household: {
          include: {
            members: {
              include: { user: true },
            },
          },
        },
      },
    });

    if (!insight) {
      return NextResponse.json({ error: 'Insight not found' }, { status: 404 });
    }

    switch (action) {
      case 'add_to_calendar': {
        // Get user's primary calendar
        const familyMember = await prisma.familyMember.findUnique({
          where: { userId: authUser.userId },
          include: { calendars: { where: { included: true }, take: 1 } },
        });

        if (!familyMember?.calendars[0]) {
          return NextResponse.json(
            { error: 'No calendar connected. Please connect a calendar in settings.' },
            { status: 400 }
          );
        }

        // Parse event details from insight metadata
        const metadata = insight.metadata as {
          eventTitle?: string;
          eventDate?: string;
          duration?: number;
        } | null;

        const eventTitle = metadata?.eventTitle || insight.title;
        const startDate = metadata?.eventDate
          ? new Date(metadata.eventDate)
          : new Date();
        const durationMinutes = metadata?.duration || 60;
        const endDate = new Date(startDate.getTime() + durationMinutes * 60 * 1000);

        try {
          const eventId = await createGoogleCalendarEvent(
            authUser.userId,
            familyMember.calendars[0].googleCalendarId,
            {
              summary: eventTitle,
              description: `Created from FamilyOS insight: ${insight.description}`,
              start: startDate,
              end: endDate,
            }
          );

          // Mark insight as resolved
          await prisma.insight.update({
            where: { id },
            data: {
              status: 'resolved',
              resolution: `Added to calendar: ${eventTitle}`,
              resolvedAt: new Date(),
              resolvedById: authUser.userId,
            },
          });

          return NextResponse.json({
            success: true,
            message: 'Event added to calendar',
            eventId,
          });
        } catch (calendarError) {
          console.error('Calendar write error:', calendarError);
          return NextResponse.json(
            { error: 'Failed to add event to calendar' },
            { status: 500 }
          );
        }
      }

      case 'create_task': {
        const task = await prisma.task.create({
          data: {
            householdId: authUser.householdId,
            weekKey: getWeekKey(),
            title: data?.title || `Follow up: ${insight.title}`,
            description: insight.description,
            type: 'standalone',
            status: 'pending',
            priority: insight.severity === 'high' ? 'high' : 'normal',
            assignedTo: data?.assignedTo || 'both',
            createdBy: authUser.userId,
          },
        });

        return NextResponse.json({
          success: true,
          message: 'Task created',
          taskId: task.id,
        });
      }

      case 'notify_partner': {
        // Find partner
        const partner = insight.household.members.find(
          (m) => m.userId !== authUser.userId && m.role.startsWith('parent')
        );

        if (!partner?.userId) {
          return NextResponse.json({ error: 'No partner found' }, { status: 400 });
        }

        const user = await prisma.user.findUnique({
          where: { id: authUser.userId },
          include: { familyMember: true },
        });

        const senderName =
          user?.familyMember?.displayName || user?.name || 'Your partner';

        await sendNudgePush({
          toUserId: partner.userId,
          senderName,
          message: data?.message || `Re: ${insight.title}`,
        });

        // Create nudge record
        await prisma.partnerNudge.create({
          data: {
            fromUserId: authUser.userId,
            toUserId: partner.userId,
            householdId: authUser.householdId,
            weekKey: getWeekKey(),
            message: `Insight: ${insight.title}`,
          },
        });

        return NextResponse.json({
          success: true,
          message: `Notification sent to ${partner.displayName || 'your partner'}`,
        });
      }

      case 'mark_done': {
        await prisma.insight.update({
          where: { id },
          data: {
            status: 'resolved',
            resolution: data?.resolution || 'Marked as done',
            resolvedAt: new Date(),
            resolvedById: authUser.userId,
          },
        });

        return NextResponse.json({
          success: true,
          message: 'Marked as done',
        });
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Insight action error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
