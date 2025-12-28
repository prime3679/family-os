import { NextResponse } from 'next/server';
import { getAuthUserWithHousehold } from '@/lib/auth-dev';
import { prisma } from '@/lib/db';
import { getWeekKey } from '@/lib/ritual/weekKey';

export async function GET(request: Request) {
  try {
    const authUser = await getAuthUserWithHousehold();
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const weekKey = searchParams.get('week') || getWeekKey();
    const status = searchParams.get('status'); // Optional filter

    const tasks = await prisma.task.findMany({
      where: {
        householdId: authUser.householdId,
        weekKey,
        ...(status && { status }),
      },
      include: {
        child: true,
      },
      orderBy: [
        { priority: 'desc' }, // high first
        { createdAt: 'asc' },
      ],
    });

    return NextResponse.json({ tasks, weekKey });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const authUser = await getAuthUserWithHousehold();
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: authUser.userId },
      select: { familyMember: { select: { role: true } } },
    });

    const body = await request.json();
    const {
      title,
      description,
      type = 'standalone',
      priority = 'normal',
      assignedTo,
      dueDate,
      childId,
      eventId,
      weekKey,
    } = body;

    if (!title?.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    // Default assignedTo to current user's role if not specified
    const defaultAssignedTo = assignedTo || user?.familyMember?.role || 'both';

    const task = await prisma.task.create({
      data: {
        householdId: authUser.householdId,
        weekKey: weekKey || getWeekKey(),
        title: title.trim(),
        description: description?.trim() || null,
        type,
        priority,
        assignedTo: defaultAssignedTo,
        dueDate: dueDate ? new Date(dueDate) : null,
        childId: childId || null,
        eventId: eventId || null,
        createdBy: authUser.userId,
      },
      include: {
        child: true,
      },
    });

    return NextResponse.json({ task });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
