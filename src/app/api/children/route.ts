import { NextResponse } from 'next/server';
import { getAuthUserWithHousehold } from '@/lib/auth-dev';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const authUser = await getAuthUserWithHousehold();
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const children = await prisma.childProfile.findMany({
      where: { householdId: authUser.householdId },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({ children });
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

    const body = await request.json();
    const { name, color, avatarEmoji, birthdate } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const child = await prisma.childProfile.create({
      data: {
        householdId: authUser.householdId,
        name: name.trim(),
        color: color || '#C17F59',
        avatarEmoji: avatarEmoji || null,
        birthdate: birthdate ? new Date(birthdate) : null,
      },
    });

    return NextResponse.json({ child });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
