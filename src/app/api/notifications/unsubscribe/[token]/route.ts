import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

interface RouteParams {
  params: Promise<{ token: string }>;
}

/**
 * GET - Check if unsubscribe token is valid
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { token } = await params;

  try {
    const prefs = await prisma.notificationPreference.findUnique({
      where: { unsubscribeToken: token },
      include: {
        user: {
          select: { email: true },
        },
      },
    });

    if (!prefs) {
      return NextResponse.json(
        { error: 'Invalid or expired unsubscribe link' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      valid: true,
      email: prefs.user.email,
    });
  } catch (error) {
    console.error('Unsubscribe check error:', error);
    return NextResponse.json(
      { error: 'Failed to verify link' },
      { status: 500 }
    );
  }
}

/**
 * POST - Process unsubscribe request
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { token } = await params;

  try {
    const prefs = await prisma.notificationPreference.findUnique({
      where: { unsubscribeToken: token },
      include: {
        user: {
          select: { email: true },
        },
      },
    });

    if (!prefs) {
      return NextResponse.json(
        { error: 'Invalid or expired unsubscribe link' },
        { status: 404 }
      );
    }

    // Disable email digest
    await prisma.notificationPreference.update({
      where: { id: prefs.id },
      data: {
        emailDigest: false,
      },
    });

    // Log the unsubscribe
    await prisma.notificationLog.create({
      data: {
        userId: prefs.userId,
        type: 'unsubscribe',
        channel: 'email',
        status: 'sent',
        metadata: { method: 'email_link' },
      },
    });

    return NextResponse.json({
      success: true,
      email: prefs.user.email,
      message: 'Successfully unsubscribed from email digests',
    });
  } catch (error) {
    console.error('Unsubscribe error:', error);
    return NextResponse.json(
      { error: 'Failed to process unsubscribe request' },
      { status: 500 }
    );
  }
}
