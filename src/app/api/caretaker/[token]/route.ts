/**
 * Public Caretaker Access API
 * GET /api/caretaker/[token] - Get household info for caretaker (no auth required)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { fetchGoogleCalendarEvents } from '@/lib/calendar/google';
import { mapGoogleEvents } from '@/lib/calendar/mapEvent';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    // Find the caretaker access link
    const caretakerAccess = await prisma.caretakerAccess.findUnique({
      where: { token },
      include: {
        household: {
          include: {
            children: true,
            members: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    phoneNumber: true,
                  },
                },
                calendars: {
                  where: { included: true },
                },
              },
            },
          },
        },
      },
    });

    if (!caretakerAccess) {
      return NextResponse.json({ error: 'Invalid access link' }, { status: 404 });
    }

    // Check if the link is still valid
    const now = new Date();
    if (now < caretakerAccess.validFrom) {
      return NextResponse.json(
        { error: 'This access link is not yet valid' },
        { status: 403 }
      );
    }

    if (now > caretakerAccess.validUntil) {
      return NextResponse.json(
        { error: 'This access link has expired' },
        { status: 403 }
      );
    }

    // Update access tracking
    await prisma.caretakerAccess.update({
      where: { id: caretakerAccess.id },
      data: {
        accessedAt: now,
        accessCount: { increment: 1 },
      },
    });

    // Get today's date boundaries
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    // Fetch today's events from all connected calendars
    const todayEvents = [];
    for (const member of caretakerAccess.household.members) {
      for (const calendar of member.calendars) {
        try {
          const googleEvents = await fetchGoogleCalendarEvents(
            member.user.id,
            calendar.googleCalendarId,
            todayStart,
            todayEnd
          );

          const mappedEvents = mapGoogleEvents(googleEvents, {
            calendarId: calendar.id,
            calendarName: calendar.name,
            parentRole: member.role as 'parent_a' | 'parent_b',
            ownerName: member.displayName,
          });

          todayEvents.push(...mappedEvents);
        } catch (error) {
          console.error(`Failed to fetch events from calendar ${calendar.name}:`, error);
          // Continue with other calendars
        }
      }
    }

    // Sort events by time
    const periodOrder = ['morning', 'afternoon', 'evening'];
    todayEvents.sort((a, b) => {
      const periodDiff = periodOrder.indexOf(a.period) - periodOrder.indexOf(b.period);
      if (periodDiff !== 0) return periodDiff;
      return a.time.localeCompare(b.time);
    });

    // Calculate child ages
    const children = caretakerAccess.household.children.map((child) => {
      let age: number | undefined;
      if (child.birthdate) {
        const today = new Date();
        const birthDate = new Date(child.birthdate);
        age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }
      }
      return {
        name: child.name,
        color: child.color,
        avatarEmoji: child.avatarEmoji,
        age,
      };
    });

    // Get parent contact info
    const parents = caretakerAccess.household.members.map((member) => ({
      name: member.displayName,
      email: member.user.email,
      phoneNumber: member.user.phoneNumber || undefined,
    }));

    return NextResponse.json({
      caretakerName: caretakerAccess.name,
      householdName: caretakerAccess.household.name,
      children,
      parents,
      todayEvents: todayEvents.map((event) => ({
        id: event.id,
        title: event.title,
        time: event.time,
        period: event.period,
        ownerName: event.ownerName || 'Unknown',
        calendar: event.calendar,
      })),
      validUntil: caretakerAccess.validUntil,
      notes: caretakerAccess.notes,
    });
  } catch (error) {
    console.error('Failed to fetch caretaker access data:', error);
    return NextResponse.json(
      { error: 'Failed to load caretaker information' },
      { status: 500 }
    );
  }
}
