import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { fetchGoogleCalendars } from '@/lib/calendar/google';

// GET: List all connected calendars and available Google calendars
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has Google account connected
    const account = await prisma.account.findFirst({
      where: {
        userId: session.user.id,
        provider: 'google',
      },
    });

    if (!account) {
      return NextResponse.json({
        connected: false,
        connectedCalendars: [],
        availableCalendars: [],
        message: 'No Google account connected',
      });
    }

    // Get connected calendars from database
    const familyMember = await prisma.familyMember.findUnique({
      where: { userId: session.user.id },
      include: { calendars: true },
    });

    // Fetch available calendars from Google
    let availableCalendars: Awaited<ReturnType<typeof fetchGoogleCalendars>> = [];
    try {
      availableCalendars = await fetchGoogleCalendars(session.user.id);
    } catch (error) {
      console.error('Failed to fetch Google calendars:', error);
    }

    return NextResponse.json({
      connected: true,
      familyMember: familyMember
        ? {
            id: familyMember.id,
            role: familyMember.role,
            displayName: familyMember.displayName,
          }
        : null,
      connectedCalendars: familyMember?.calendars || [],
      availableCalendars,
    });
  } catch (error) {
    console.error('Failed to fetch calendars:', error);
    return NextResponse.json(
      { error: 'Failed to fetch calendars' },
      { status: 500 }
    );
  }
}

// POST: Connect a new calendar or update calendar settings
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, calendarId, name, color, included, role, displayName } = body;

    // Get user with household
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { householdId: true, name: true },
    });

    if (!user?.householdId) {
      return NextResponse.json(
        { error: 'No household found. Please sign out and sign in again.' },
        { status: 400 }
      );
    }

    // Ensure family member exists
    let familyMember = await prisma.familyMember.findUnique({
      where: { userId: session.user.id },
    });

    if (!familyMember && (action === 'connect' || action === 'setup')) {
      // Create family member if doesn't exist
      familyMember = await prisma.familyMember.create({
        data: {
          userId: session.user.id,
          householdId: user.householdId,
          role: role || 'parent_a',
          displayName: displayName || user.name || 'Parent',
        },
      });
    }

    if (!familyMember) {
      return NextResponse.json(
        { error: 'Family member profile required' },
        { status: 400 }
      );
    }

    switch (action) {
      case 'setup':
        // Update family member profile
        await prisma.familyMember.update({
          where: { id: familyMember.id },
          data: {
            role: role || familyMember.role,
            displayName: displayName || familyMember.displayName,
          },
        });
        return NextResponse.json({ success: true, familyMember });

      case 'connect':
        // Connect a new calendar
        if (!calendarId || !name) {
          return NextResponse.json(
            { error: 'Calendar ID and name required' },
            { status: 400 }
          );
        }

        const newCalendar = await prisma.connectedCalendar.upsert({
          where: {
            familyMemberId_googleCalendarId: {
              familyMemberId: familyMember.id,
              googleCalendarId: calendarId,
            },
          },
          update: {
            name,
            color: color || '#7C6A5D',
            included: included !== false,
          },
          create: {
            familyMemberId: familyMember.id,
            googleCalendarId: calendarId,
            name,
            color: color || '#7C6A5D',
            included: included !== false,
          },
        });
        return NextResponse.json({ success: true, calendar: newCalendar });

      case 'toggle':
        // Toggle calendar inclusion
        if (!calendarId) {
          return NextResponse.json(
            { error: 'Calendar ID required' },
            { status: 400 }
          );
        }

        const updatedCalendar = await prisma.connectedCalendar.update({
          where: { id: calendarId },
          data: { included: included },
        });
        return NextResponse.json({ success: true, calendar: updatedCalendar });

      case 'disconnect':
        // Disconnect a calendar
        if (!calendarId) {
          return NextResponse.json(
            { error: 'Calendar ID required' },
            { status: 400 }
          );
        }

        await prisma.connectedCalendar.delete({
          where: { id: calendarId },
        });
        return NextResponse.json({ success: true });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Calendar operation failed:', error);
    return NextResponse.json(
      { error: 'Operation failed' },
      { status: 500 }
    );
  }
}
