import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getWeekKey } from '@/lib/ritual/weekKey';
import { sendEmail } from '@/lib/notifications/email/client';
import { UserEmail } from '@/lib/notifications/email/templates/user-email';

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

        return NextResponse.json({
          success: true,
          task,
          message: `Task "${title}" created successfully`,
        });
      }

      case 'createEvent': {
        // For now, events are placeholder - would integrate with Google Calendar
        const { title, day, time, parent } = data;

        return NextResponse.json({
          success: true,
          message: `Event "${title}" would be created for ${day} at ${time}. Calendar integration coming soon!`,
          event: { title, day, time, parent },
        });
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
