import { NextResponse } from 'next/server';
import { getAuthUserWithHousehold } from '@/lib/auth-dev';
import { prisma } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUserWithHousehold();
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const insight = await prisma.insight.findFirst({
      where: { id, householdId: authUser.householdId },
      include: {
        resolvedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!insight) {
      return NextResponse.json({ error: 'Insight not found' }, { status: 404 });
    }

    return NextResponse.json({ insight });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUserWithHousehold();
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Verify insight belongs to user's household
    const existing = await prisma.insight.findFirst({
      where: { id, householdId: authUser.householdId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Insight not found' }, { status: 404 });
    }

    const body = await request.json();
    const { status, resolution } = body;

    // Validate status
    const validStatuses = ['pending', 'sent', 'resolved', 'dismissed'];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    // Track resolution
    const isResolving = (status === 'resolved' || status === 'dismissed') &&
                        existing.status !== 'resolved' &&
                        existing.status !== 'dismissed';

    const insight = await prisma.insight.update({
      where: { id },
      data: {
        ...(status !== undefined && { status }),
        ...(resolution !== undefined && { resolution }),
        ...(isResolving && {
          resolvedAt: new Date(),
          resolvedById: authUser.userId,
        }),
      },
      include: {
        resolvedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({ insight });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
