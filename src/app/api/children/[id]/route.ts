import { NextResponse } from 'next/server';
import { getAuthUserWithHousehold } from '@/lib/auth-dev';
import { prisma } from '@/lib/db';

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

    // Verify child belongs to user's household
    const existing = await prisma.childProfile.findFirst({
      where: { id, householdId: authUser.householdId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Child not found' }, { status: 404 });
    }

    const body = await request.json();
    const { name, color, avatarEmoji, birthdate } = body;

    const child = await prisma.childProfile.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(color !== undefined && { color }),
        ...(avatarEmoji !== undefined && { avatarEmoji }),
        ...(birthdate !== undefined && { birthdate: birthdate ? new Date(birthdate) : null }),
      },
    });

    return NextResponse.json({ child });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUserWithHousehold();
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Verify child belongs to user's household
    const existing = await prisma.childProfile.findFirst({
      where: { id, householdId: authUser.householdId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Child not found' }, { status: 404 });
    }

    await prisma.childProfile.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
