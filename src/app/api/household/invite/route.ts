/**
 * Household Invite API
 * POST /api/household/invite - Create an invite
 * GET /api/household/invite - List pending invites for household
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

// POST: Create a new invite
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { email } = await request.json();

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    // Get user's household
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { household: true },
    });

    if (!user?.householdId) {
      return NextResponse.json(
        { error: 'No household found' },
        { status: 400 }
      );
    }

    // Check if invite already exists for this email
    const existingInvite = await prisma.householdInvite.findUnique({
      where: {
        householdId_email: {
          householdId: user.householdId,
          email: email.toLowerCase(),
        },
      },
    });

    if (existingInvite) {
      if (existingInvite.status === 'accepted') {
        return NextResponse.json(
          { error: 'This person has already joined your household' },
          { status: 400 }
        );
      }
      // Update existing pending invite with new expiry
      const updated = await prisma.householdInvite.update({
        where: { id: existingInvite.id },
        data: {
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
          status: 'pending',
        },
      });
      return NextResponse.json({
        success: true,
        invite: {
          token: updated.token,
          email: updated.email,
          expiresAt: updated.expiresAt,
        },
        inviteUrl: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/invite/${updated.token}`,
      });
    }

    // Create new invite
    const invite = await prisma.householdInvite.create({
      data: {
        householdId: user.householdId,
        email: email.toLowerCase(),
        invitedBy: session.user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    return NextResponse.json({
      success: true,
      invite: {
        token: invite.token,
        email: invite.email,
        expiresAt: invite.expiresAt,
      },
      inviteUrl: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/invite/${invite.token}`,
    });
  } catch (error) {
    console.error('Failed to create invite:', error);
    return NextResponse.json(
      { error: 'Failed to create invite' },
      { status: 500 }
    );
  }
}

// GET: List pending invites for user's household
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { householdId: true },
    });

    if (!user?.householdId) {
      return NextResponse.json({ invites: [] });
    }

    const invites = await prisma.householdInvite.findMany({
      where: {
        householdId: user.householdId,
        status: 'pending',
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      invites: invites.map((inv) => ({
        id: inv.id,
        email: inv.email,
        status: inv.status,
        expiresAt: inv.expiresAt,
        createdAt: inv.createdAt,
      })),
    });
  } catch (error) {
    console.error('Failed to list invites:', error);
    return NextResponse.json(
      { error: 'Failed to list invites' },
      { status: 500 }
    );
  }
}
