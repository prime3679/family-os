/**
 * Household Members API
 * GET /api/household/members - List household members
 */

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's household with all members
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        household: {
          include: {
            users: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
              },
            },
            members: {
              select: {
                id: true,
                userId: true,
                displayName: true,
                role: true,
                color: true,
                calendars: {
                  where: { included: true },
                  select: { id: true },
                },
              },
            },
          },
        },
      },
    });

    if (!user?.household) {
      return NextResponse.json({ members: [] });
    }

    // Combine user info with family member info
    const members = user.household.users.map((householdUser) => {
      const familyMember = user.household!.members.find(
        (m) => m.userId === householdUser.id
      );

      return {
        id: householdUser.id,
        name: householdUser.name,
        email: householdUser.email,
        image: householdUser.image,
        displayName: familyMember?.displayName || householdUser.name,
        role: familyMember?.role || null,
        hasConnectedCalendars: (familyMember?.calendars?.length ?? 0) > 0,
        isCurrentUser: householdUser.id === session.user.id,
      };
    });

    return NextResponse.json({
      householdName: user.household.name,
      members,
    });
  } catch (error) {
    console.error('Failed to list household members:', error);
    return NextResponse.json(
      { error: 'Failed to list members' },
      { status: 500 }
    );
  }
}
