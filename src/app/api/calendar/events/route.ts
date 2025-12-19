import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import {
  fetchGoogleCalendarEvents,
  getWeekBoundaries,
} from '@/lib/calendar/google';
import { mapGoogleEvents } from '@/lib/calendar/mapEvent';
import { Event } from '@/data/mock-data';

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's household
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { householdId: true },
    });

    if (!user?.householdId) {
      return NextResponse.json({
        events: [],
        message: 'No household found. Please set up your family first.',
      });
    }

    // Get connected calendars for family members in this household only
    const familyMembers = await prisma.familyMember.findMany({
      where: { householdId: user.householdId },
      include: {
        calendars: {
          where: { included: true },
        },
        user: {
          select: { id: true },
        },
      },
    });

    if (familyMembers.length === 0) {
      return NextResponse.json({
        events: [],
        message: 'No calendars connected. Connect a calendar to see events.',
      });
    }

    const { start, end } = getWeekBoundaries();
    const allEvents: Event[] = [];

    // Fetch events from each connected calendar
    for (const member of familyMembers) {
      for (const calendar of member.calendars) {
        try {
          const googleEvents = await fetchGoogleCalendarEvents(
            member.user.id,
            calendar.googleCalendarId,
            start,
            end
          );

          const mappedEvents = mapGoogleEvents(googleEvents, {
            calendarId: calendar.id,
            calendarName: calendar.name,
            parentRole: member.role as 'parent_a' | 'parent_b',
            ownerName: member.displayName,
          });

          allEvents.push(...mappedEvents);

          // Update last synced time
          await prisma.connectedCalendar.update({
            where: { id: calendar.id },
            data: { lastSyncedAt: new Date() },
          });
        } catch (error) {
          console.error(
            `Failed to fetch events from calendar ${calendar.name}:`,
            error
          );
          // Continue with other calendars even if one fails
        }
      }
    }

    // Sort events by day and time
    const dayOrder = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
    const periodOrder = ['morning', 'afternoon', 'evening'];

    allEvents.sort((a, b) => {
      const dayDiff = dayOrder.indexOf(a.day) - dayOrder.indexOf(b.day);
      if (dayDiff !== 0) return dayDiff;

      const periodDiff =
        periodOrder.indexOf(a.period) - periodOrder.indexOf(b.period);
      if (periodDiff !== 0) return periodDiff;

      return a.time.localeCompare(b.time);
    });

    return NextResponse.json({
      events: allEvents,
      weekStart: start.toISOString(),
      weekEnd: end.toISOString(),
    });
  } catch (error) {
    console.error('Failed to fetch calendar events:', error);
    return NextResponse.json(
      { error: 'Failed to fetch events' },
      { status: 500 }
    );
  }
}
