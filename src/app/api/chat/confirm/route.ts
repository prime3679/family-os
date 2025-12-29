import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getWeekKey } from '@/lib/ritual/weekKey';
import { sendEmail } from '@/lib/notifications/email/client';
import { UserEmail } from '@/lib/notifications/email/templates/user-email';
import { createGoogleCalendarEvent } from '@/lib/calendar/write';
import { recordOutcome, recordFeedback } from '@/lib/agent';

/**
 * Parse day name and time into a Date object
 */
function parseEventDateTime(day: string, time: string): Date {
  const now = new Date();
  let targetDate: Date;

  // Check if day is already ISO format
  if (/^\d{4}-\d{2}-\d{2}/.test(day)) {
    targetDate = new Date(day);
  } else {
    // Day name like "Monday", "Tuesday", etc.
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const targetDayIndex = dayNames.findIndex((d) => d === day.toLowerCase());

    if (targetDayIndex === -1) {
      // Default to today if parsing fails
      targetDate = new Date(now);
    } else {
      const currentDay = now.getDay();
      let daysUntilTarget = targetDayIndex - currentDay;
      if (daysUntilTarget <= 0) daysUntilTarget += 7; // Next week if today or past
      targetDate = new Date(now);
      targetDate.setDate(now.getDate() + daysUntilTarget);
    }
  }

  // Parse time (handles "14:00" or "2:00 PM")
  const timeMatch = time.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (timeMatch) {
    let hours = parseInt(timeMatch[1], 10);
    const minutes = parseInt(timeMatch[2], 10);
    const meridiem = timeMatch[3];

    if (meridiem) {
      if (meridiem.toUpperCase() === 'PM' && hours !== 12) hours += 12;
      if (meridiem.toUpperCase() === 'AM' && hours === 12) hours = 0;
    }

    targetDate.setHours(hours, minutes, 0, 0);
  }

  return targetDate;
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, data } = await req.json();

    // Get user's household
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        household: true,
        familyMember: true,
      },
    });

    if (!user?.householdId) {
      return NextResponse.json({ error: 'No household found' }, { status: 400 });
    }

    switch (action) {
      case 'createTask': {
        const { title, description, assignedTo, priority, childName } = data;

        // Find child by name if provided
        let childId: string | undefined;
        if (childName) {
          const child = await prisma.childProfile.findFirst({
            where: {
              householdId: user.householdId,
              name: { contains: childName, mode: 'insensitive' },
            },
          });
          if (child) {
            childId = child.id;
          }
        }

        const task = await prisma.task.create({
          data: {
            householdId: user.householdId,
            weekKey: getWeekKey(),
            title,
            description: description || null,
            type: 'standalone',
            status: 'pending',
            priority: priority || 'normal',
            assignedTo: assignedTo || 'both',
            childId: childId || null,
            createdBy: session.user.id,
          },
          include: {
            child: true,
          },
        });

        // Record success for agent learning
        await recordOutcome(user.householdId, 'createTask', 'success');

        return NextResponse.json({
          success: true,
          task,
          message: `Task "${title}" created successfully`,
        });
      }

      case 'createEvent': {
        const { title, day, time, duration, description } = data;

        // Get user's primary calendar
        const familyMember = await prisma.familyMember.findUnique({
          where: { userId: session.user.id },
          include: { calendars: { where: { included: true }, take: 1 } },
        });

        if (!familyMember?.calendars[0]) {
          return NextResponse.json(
            { error: 'No calendar connected. Please connect a calendar in settings.' },
            { status: 400 }
          );
        }

        // Parse the date and time
        const startDate = parseEventDateTime(day, time);
        const durationMinutes = duration || 60;
        const endDate = new Date(startDate.getTime() + durationMinutes * 60 * 1000);

        try {
          const eventId = await createGoogleCalendarEvent(
            session.user.id,
            familyMember.calendars[0].googleCalendarId,
            {
              summary: title,
              description: description || 'Created via FamilyOS chat',
              start: startDate,
              end: endDate,
            }
          );

          // Format the date nicely for the response
          const formattedDate = startDate.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'short',
            day: 'numeric',
          });
          const formattedTime = startDate.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
          });

          // Record success for agent learning
          await recordOutcome(user.householdId, 'createEvent', 'success');

          return NextResponse.json({
            success: true,
            message: `Event "${title}" created for ${formattedDate} at ${formattedTime}`,
            eventId,
            event: { title, day, time, duration: durationMinutes },
          });
        } catch (error) {
          console.error('Failed to create calendar event:', error);
          // Record failure for agent learning
          await recordOutcome(user.householdId, 'createEvent', 'failure');
          return NextResponse.json(
            { error: 'Failed to create calendar event. Please try again.' },
            { status: 500 }
          );
        }
      }

      case 'notifyPartner': {
        const { message, urgent } = data;

        // Find partner
        const partner = await prisma.familyMember.findFirst({
          where: {
            householdId: user.householdId,
            userId: { not: session.user.id },
            role: { startsWith: 'parent' },
          },
          include: { user: true },
        });

        if (!partner) {
          return NextResponse.json({ error: 'No partner found' }, { status: 400 });
        }

        // Create nudge record
        const nudge = await prisma.partnerNudge.create({
          data: {
            fromUserId: session.user.id,
            toUserId: partner.userId,
            householdId: user.householdId,
            weekKey: getWeekKey(),
            message: urgent ? `[URGENT] ${message}` : message,
          },
        });

        // Log notification
        await prisma.notificationLog.create({
          data: {
            userId: partner.userId,
            type: urgent ? 'push_urgent_partner' : 'push_partner_message',
            channel: 'push',
            status: 'sent',
            metadata: {
              nudgeId: nudge.id,
              fromUserId: session.user.id,
              message,
              urgent,
            },
          },
        });

        // Record success for agent learning
        await recordOutcome(user.householdId, 'notifyPartner', 'success');

        return NextResponse.json({
          success: true,
          message: `Message sent to ${partner.user?.name || 'your partner'}`,
          nudgeId: nudge.id,
        });
      }

      case 'swapEvents': {
        const { day1, day2, eventDescription } = data;

        // Find partner
        const partner = await prisma.familyMember.findFirst({
          where: {
            householdId: user.householdId,
            userId: { not: session.user.id },
            role: { startsWith: 'parent' },
          },
          include: { user: true },
        });

        if (!partner) {
          return NextResponse.json({ error: 'No partner found' }, { status: 400 });
        }

        // Create swap proposal as a nudge
        const swapMessage = `Swap proposal: ${eventDescription || 'duties'} - swap ${day1} ↔ ${day2}`;

        const nudge = await prisma.partnerNudge.create({
          data: {
            fromUserId: session.user.id,
            toUserId: partner.userId,
            householdId: user.householdId,
            weekKey: getWeekKey(),
            message: swapMessage,
          },
        });

        // Log notification
        await prisma.notificationLog.create({
          data: {
            userId: partner.userId,
            type: 'push_swap_proposal',
            channel: 'push',
            status: 'sent',
            metadata: {
              nudgeId: nudge.id,
              fromUserId: session.user.id,
              day1,
              day2,
              eventDescription,
            },
          },
        });

        // Record success for agent learning
        await recordOutcome(user.householdId, 'swapEvents', 'success');

        return NextResponse.json({
          success: true,
          message: `Swap proposal sent to ${partner.user?.name || 'your partner'}: ${day1} ↔ ${day2}`,
          proposalId: nudge.id,
        });
      }

      case 'draftEmail': {
        const { to, subject, body } = data;

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(to)) {
          return NextResponse.json({
            error: `Invalid email address: "${to}". Please provide a valid email address.`,
          }, { status: 400 });
        }

        // Get sender name
        const senderName = user.name || user.email?.split('@')[0] || 'A FamilyOS user';

        // Send email using Resend
        const result = await sendEmail({
          to,
          subject,
          react: UserEmail({
            senderName,
            recipientEmail: to,
            subject,
            body,
          }),
        });

        if (!result.success) {
          // Record failure for agent learning
          await recordOutcome(user.householdId, 'draftEmail', 'failure');
          return NextResponse.json({
            error: result.error || 'Failed to send email',
          }, { status: 500 });
        }

        // Log the email
        await prisma.notificationLog.create({
          data: {
            userId: session.user.id,
            type: 'chat_email',
            channel: 'email',
            status: 'sent',
            metadata: {
              to,
              subject,
              emailId: result.id,
            },
          },
        });

        // Record success for agent learning
        await recordOutcome(user.householdId, 'draftEmail', 'success');

        return NextResponse.json({
          success: true,
          message: `Email sent to ${to}`,
          emailId: result.id,
        });
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Chat confirm error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
