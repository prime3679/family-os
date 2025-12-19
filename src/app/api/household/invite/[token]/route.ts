/**
 * Household Invite Token API
 * GET /api/household/invite/[token] - Get invite details (public)
 * POST /api/household/invite/[token] - Accept invite (auth required)
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

interface RouteParams {
  params: Promise<{ token: string }>;
}

// GET: Get invite details (public - no auth required)
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { token } = await params;

    const invite = await prisma.householdInvite.findUnique({
      where: { token },
      include: {
        household: {
          select: { name: true },
        },
      },
    });

    if (!invite) {
      return NextResponse.json({ error: 'Invite not found' }, { status: 404 });
    }

    // Check if expired
    if (invite.expiresAt < new Date()) {
      return NextResponse.json(
        { error: 'Invite has expired', expired: true },
        { status: 410 }
      );
    }

    // Check if already accepted
    if (invite.status === 'accepted') {
      return NextResponse.json(
        { error: 'Invite has already been used', used: true },
        { status: 410 }
      );
    }

    // Get inviter name
    const inviter = await prisma.user.findUnique({
      where: { id: invite.invitedBy },
      select: { name: true },
    });

    return NextResponse.json({
      valid: true,
      invite: {
        email: invite.email,
        householdName: invite.household.name,
        inviterName: inviter?.name || 'Your partner',
        expiresAt: invite.expiresAt,
      },
    });
  } catch (error) {
    console.error('Failed to get invite:', error);
    return NextResponse.json(
      { error: 'Failed to get invite' },
      { status: 500 }
    );
  }
}

// POST: Accept invite (auth required)
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { token } = await params;

    const invite = await prisma.householdInvite.findUnique({
      where: { token },
      include: {
        household: {
          select: { id: true, name: true },
        },
      },
    });

    if (!invite) {
      return NextResponse.json({ error: 'Invite not found' }, { status: 404 });
    }

    // Check if expired
    if (invite.expiresAt < new Date()) {
      return NextResponse.json(
        { error: 'Invite has expired' },
        { status: 410 }
      );
    }

    // Check if already accepted
    if (invite.status === 'accepted') {
      return NextResponse.json(
        { error: 'Invite has already been used' },
        { status: 410 }
      );
    }

    // Get current user
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { household: true },
    });

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if user is already in the target household
    if (currentUser.householdId === invite.householdId) {
      return NextResponse.json(
        { error: 'You are already in this household' },
        { status: 400 }
      );
    }

    // Transaction: move user to new household and mark invite as accepted
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await prisma.$transaction(async (tx: any) => {
      // If user has their own household with no other members, delete it
      if (currentUser.householdId) {
        const otherMembers = await tx.user.count({
          where: {
            householdId: currentUser.householdId,
            id: { not: currentUser.id },
          },
        });

        if (otherMembers === 0) {
          // Delete user's empty household
          await tx.household.delete({
            where: { id: currentUser.householdId },
          });
        }
      }

      // Move user to new household
      await tx.user.update({
        where: { id: session.user.id },
        data: { householdId: invite.householdId },
      });

      // Update any existing FamilyMember to new household
      await tx.familyMember.updateMany({
        where: { userId: session.user.id },
        data: { householdId: invite.householdId },
      });

      // Mark invite as accepted
      await tx.householdInvite.update({
        where: { id: invite.id },
        data: { status: 'accepted' },
      });
    });

    return NextResponse.json({
      success: true,
      householdName: invite.household.name,
      message: `You have joined ${invite.household.name}!`,
    });
  } catch (error) {
    console.error('Failed to accept invite:', error);
    return NextResponse.json(
      { error: 'Failed to accept invite' },
      { status: 500 }
    );
  }
}
