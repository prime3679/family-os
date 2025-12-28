import { NextResponse } from 'next/server';
import { getAuthUserWithHousehold } from '@/lib/auth-dev';
import { prisma } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const authUser = await getAuthUserWithHousehold();
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // pending, sent, resolved, dismissed
    const type = searchParams.get('type'); // calendar_gap, conflict, etc.
    const limit = parseInt(searchParams.get('limit') || '50');

    const insights = await prisma.insight.findMany({
      where: {
        householdId: authUser.householdId,
        ...(status && { status }),
        ...(type && { type }),
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
      orderBy: [
        { status: 'asc' }, // pending first
        { severity: 'desc' }, // high severity first
        { createdAt: 'desc' },
      ],
      take: limit,
    });

    // Get counts by status
    const counts = await prisma.insight.groupBy({
      by: ['status'],
      where: {
        householdId: authUser.householdId,
      },
      _count: true,
    });

    const countMap = {
      pending: 0,
      sent: 0,
      resolved: 0,
      dismissed: 0,
    };
    counts.forEach((c) => {
      countMap[c.status as keyof typeof countMap] = c._count;
    });

    return NextResponse.json({
      insights,
      counts: countMap,
    });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
