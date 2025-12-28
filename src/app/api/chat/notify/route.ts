import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getWeekKey } from '@/lib/ritual/weekKey';

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { message, urgent } = await req.json();

    if (!message) {
      return Response.json({ error: 'Message is required' }, { status: 400 });
    }

    // Get user's household and partner
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        familyMember: true,
        household: {
          include: {
            members: {
              include: { user: true },
            },
          },
        },
      },
    });

    if (!user?.household) {
      return Response.json({ error: 'User not in a household' }, { status: 400 });
    }

    // Find partner (the other parent in the household)
    const partner = user.household.members.find(
      m => m.userId !== session.user?.id && m.role?.startsWith('parent')
    );

    if (!partner?.user) {
      return Response.json({ error: 'No partner found in household' }, { status: 400 });
    }

    // Create a nudge record to track the message
    const nudge = await prisma.partnerNudge.create({
      data: {
        fromUserId: session.user.id,
        toUserId: partner.userId,
        householdId: user.household.id,
        weekKey: getWeekKey(),
        message: urgent ? `[URGENT] ${message}` : message,
      },
    });

    // Log the notification attempt
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

    // In a real app, you'd also send a push notification here
    // For now, we just create the database records

    return Response.json({
      success: true,
      message: `Message sent to ${partner.user.name || 'your partner'}`,
      nudgeId: nudge.id,
    });
  } catch (error) {
    console.error('Notify API error:', error);
    return Response.json({ error: 'Failed to send notification' }, { status: 500 });
  }
}
