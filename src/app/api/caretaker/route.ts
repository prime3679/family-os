/**
 * Caretaker Access API
 * POST /api/caretaker - Create a new caretaker access link
 * GET /api/caretaker - List caretaker links for household
 * DELETE /api/caretaker - Revoke a link
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { checkRateLimit } from '@/lib/rate-limit';

// POST: Create a new caretaker access link
export async function POST(request: NextRequest) {
  try {
    // Rate limiting: 10 requests per minute per IP
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
    if (!checkRateLimit(`caretaker:${ip}`, 10, 60000)) {
      return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
    }

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, validFrom, validUntil, notes } = await request.json();

    // Validate required fields
    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    if (!validFrom || !validUntil) {
      return NextResponse.json({ error: 'Valid date range is required' }, { status: 400 });
    }

    // Get user's household
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { householdId: true },
    });

    if (!user?.householdId) {
      return NextResponse.json({ error: 'No household found' }, { status: 400 });
    }

    // Validate dates
    const fromDate = new Date(validFrom);
    const untilDate = new Date(validUntil);

    if (isNaN(fromDate.getTime()) || isNaN(untilDate.getTime())) {
      return NextResponse.json({ error: 'Invalid date format' }, { status: 400 });
    }

    if (untilDate <= fromDate) {
      return NextResponse.json({ error: 'Valid until date must be after valid from date' }, { status: 400 });
    }

    // Create caretaker access link
    const caretakerAccess = await prisma.caretakerAccess.create({
      data: {
        householdId: user.householdId,
        name,
        validFrom: fromDate,
        validUntil: untilDate,
        notes: notes || null,
        createdById: session.user.id,
      },
    });

    const accessUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/caretaker/${caretakerAccess.token}`;

    return NextResponse.json({
      success: true,
      link: {
        id: caretakerAccess.id,
        token: caretakerAccess.token,
        name: caretakerAccess.name,
        validFrom: caretakerAccess.validFrom,
        validUntil: caretakerAccess.validUntil,
        notes: caretakerAccess.notes,
        accessUrl,
        createdAt: caretakerAccess.createdAt,
      },
    });
  } catch (error) {
    console.error('Failed to create caretaker access:', error);
    return NextResponse.json(
      { error: 'Failed to create caretaker access link' },
      { status: 500 }
    );
  }
}

// GET: List caretaker access links for user's household
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
      return NextResponse.json({ links: [] });
    }

    const links = await prisma.caretakerAccess.findMany({
      where: {
        householdId: user.householdId,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      links: links.map((link) => ({
        id: link.id,
        token: link.token,
        name: link.name,
        validFrom: link.validFrom,
        validUntil: link.validUntil,
        notes: link.notes,
        accessedAt: link.accessedAt,
        accessCount: link.accessCount,
        accessUrl: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/caretaker/${link.token}`,
        createdAt: link.createdAt,
      })),
    });
  } catch (error) {
    console.error('Failed to list caretaker links:', error);
    return NextResponse.json(
      { error: 'Failed to list caretaker access links' },
      { status: 500 }
    );
  }
}

// DELETE: Revoke a caretaker access link
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const linkId = searchParams.get('id');

    if (!linkId) {
      return NextResponse.json({ error: 'Link ID is required' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { householdId: true },
    });

    if (!user?.householdId) {
      return NextResponse.json({ error: 'No household found' }, { status: 400 });
    }

    // Verify the link belongs to the user's household before deleting
    const link = await prisma.caretakerAccess.findUnique({
      where: { id: linkId },
      select: { householdId: true },
    });

    if (!link || link.householdId !== user.householdId) {
      return NextResponse.json({ error: 'Link not found' }, { status: 404 });
    }

    await prisma.caretakerAccess.delete({
      where: { id: linkId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete caretaker link:', error);
    return NextResponse.json(
      { error: 'Failed to delete caretaker access link' },
      { status: 500 }
    );
  }
}
