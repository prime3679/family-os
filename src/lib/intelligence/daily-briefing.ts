/**
 * Scout's Daily Briefing Generator
 *
 * Scout is FamilyOS's friendly assistant who scouts ahead to find
 * what matters in your day. Generates warm, helpful morning briefings:
 * - Today's events with context
 * - Partner's schedule (coordination is key!)
 * - Heads up on things that need attention
 * - Celebrates light days as much as it flags busy ones
 */

import { prisma } from '@/lib/db';
import { fetchGoogleCalendarEvents } from '@/lib/calendar/google';

export interface DailyBriefingResult {
  userId: string;
  displayName: string;
  phoneNumber: string;
  message: string;
  eventCount: number;
  partnerEventCount: number;
  insightCount: number;
}

export interface HouseholdBriefingResult {
  householdId: string;
  briefings: DailyBriefingResult[];
  errors: string[];
}

interface BriefingEvent {
  title: string;
  time: string;
  location?: string;
  isAllDay: boolean;
}

/**
 * Get today's boundaries (midnight to midnight)
 */
function getTodayBoundaries(): { start: Date; end: Date } {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  return { start, end };
}

/**
 * Format time for display (e.g., "9am", "3:30pm")
 */
function formatTime(date: Date): string {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'pm' : 'am';
  const displayHours = hours % 12 || 12;

  if (minutes === 0) {
    return `${displayHours}${ampm}`;
  }
  return `${displayHours}:${minutes.toString().padStart(2, '0')}${ampm}`;
}

/**
 * Get warm greeting based on time of day
 */
function getGreeting(firstName: string): string {
  const hour = new Date().getHours();
  const greetings = {
    morning: [
      `Good morning, ${firstName}! ☀️`,
      `Morning, ${firstName}! ☕`,
      `Hey ${firstName}! Rise and shine ✨`,
    ],
    afternoon: [
      `Good afternoon, ${firstName}!`,
      `Hey ${firstName}! Quick afternoon check-in 👋`,
    ],
    evening: [
      `Evening, ${firstName}! 🌙`,
      `Hey ${firstName}! Here's what's ahead`,
    ],
  };

  const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
  const options = greetings[timeOfDay];
  return options[Math.floor(Math.random() * options.length)];
}

/**
 * Get day of week name
 */
function getDayName(): string {
  return new Date().toLocaleDateString('en-US', { weekday: 'short' });
}

/**
 * Get month and day (e.g., "12/30")
 */
function getDateShort(): string {
  const d = new Date();
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

/**
 * Get Scout's take on the day's busyness
 */
function getDayVibe(eventCount: number, hasInsights: boolean): string {
  if (eventCount === 0) {
    return hasInsights
      ? "Clear calendar, but I spotted something 👀"
      : "You've got a blank slate today! 🎯";
  }
  if (eventCount === 1) {
    return "Light day — just one thing on the books";
  }
  if (eventCount <= 3) {
    return `Manageable day ahead (${eventCount} events)`;
  }
  if (eventCount <= 5) {
    return `Busy one today (${eventCount} events) — you've got this! 💪`;
  }
  return `Packed day ahead (${eventCount} events) — pace yourself! 🏃`;
}

/**
 * Generate Scout's daily briefing message
 */
function generateBriefingMessage(
  displayName: string,
  myEvents: BriefingEvent[],
  partnerName: string | null,
  partnerEventCount: number,
  insights: { title: string; severity: string }[]
): string {
  const firstName = displayName.split(' ')[0];
  const dayLabel = `${getDayName()} ${getDateShort()}`;

  const lines: string[] = [];

  // Warm greeting
  lines.push(getGreeting(firstName));
  lines.push('');

  // Day summary with personality
  lines.push(`📅 ${dayLabel}`);
  lines.push(getDayVibe(myEvents.length, insights.length > 0));

  // Events (only if there are any)
  if (myEvents.length > 0) {
    lines.push('');
    const eventsToShow = myEvents.slice(0, 5);
    for (const event of eventsToShow) {
      const timeStr = event.isAllDay ? '🌅 All day' : event.time;
      const locationStr = event.location ? ` @ ${event.location}` : '';
      lines.push(`• ${timeStr} ${event.title}${locationStr}`);
    }

    if (myEvents.length > 5) {
      lines.push(`• +${myEvents.length - 5} more`);
    }
  }

  // Insights - Scout found something!
  if (insights.length > 0) {
    lines.push('');
    const urgentCount = insights.filter((i) => i.severity === 'high' || i.severity === 'urgent').length;
    if (urgentCount > 0) {
      lines.push(`🚨 I spotted ${urgentCount} thing${urgentCount > 1 ? 's' : ''} that need${urgentCount === 1 ? 's' : ''} attention:`);
    } else {
      lines.push('👀 Heads up:');
    }
    for (const insight of insights.slice(0, 3)) {
      lines.push(`• ${insight.title}`);
    }
  }

  // Partner summary - warm framing
  if (partnerName) {
    lines.push('');
    const partnerFirstName = partnerName.split(' ')[0];
    if (partnerEventCount === 0) {
      lines.push(`${partnerFirstName}'s calendar is clear today`);
    } else if (partnerEventCount === 1) {
      lines.push(`${partnerFirstName} has 1 thing scheduled`);
    } else if (partnerEventCount <= 3) {
      lines.push(`${partnerFirstName} has ${partnerEventCount} events`);
    } else {
      lines.push(`${partnerFirstName}'s got a full day too (${partnerEventCount} events)`);
    }
  }

  // Scout's sign-off
  lines.push('');
  lines.push('— Scout 🔍');
  lines.push('Reply HELP for commands');

  return lines.join('\n');
}

/**
 * Generate daily briefing for a specific user
 */
export async function generateUserBriefing(
  userId: string,
  householdId: string
): Promise<DailyBriefingResult | null> {
  try {
    // Get user with family member info and calendars
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        familyMember: {
          include: {
            calendars: { where: { included: true } },
            household: {
              include: {
                members: {
                  include: {
                    user: true,
                    calendars: { where: { included: true } },
                  },
                },
                insights: {
                  where: {
                    status: { in: ['pending', 'sent'] },
                  },
                  orderBy: { createdAt: 'desc' },
                  take: 5,
                },
              },
            },
          },
        },
      },
    });

    if (!user?.familyMember || !user.phoneNumber || !user.phoneVerified) {
      return null;
    }

    const { start, end } = getTodayBoundaries();
    const myEvents: BriefingEvent[] = [];

    // Fetch events from user's calendars
    for (const calendar of user.familyMember.calendars) {
      try {
        const events = await fetchGoogleCalendarEvents(
          userId,
          calendar.googleCalendarId,
          start,
          end
        );

        for (const event of events) {
          if (!event.summary) continue;

          const isAllDay = !event.start?.dateTime;
          let timeStr = '';

          if (event.start?.dateTime) {
            timeStr = formatTime(new Date(event.start.dateTime));
          }

          myEvents.push({
            title: event.summary,
            time: timeStr,
            location: event.location,
            isAllDay,
          });
        }
      } catch (error) {
        console.error(`Failed to fetch calendar ${calendar.name}:`, error);
      }
    }

    // Sort by time (all-day events first, then by time)
    myEvents.sort((a, b) => {
      if (a.isAllDay && !b.isAllDay) return -1;
      if (!a.isAllDay && b.isAllDay) return 1;
      return a.time.localeCompare(b.time);
    });

    // Get partner info and events
    let partnerName: string | null = null;
    let partnerEventCount = 0;

    const partner = user.familyMember.household.members.find(
      (m) => m.userId !== userId
    );

    if (partner) {
      partnerName = partner.displayName;

      // Count partner's events for today
      for (const calendar of partner.calendars) {
        try {
          const events = await fetchGoogleCalendarEvents(
            partner.userId,
            calendar.googleCalendarId,
            start,
            end
          );
          partnerEventCount += events.filter((e) => e.summary).length;
        } catch {
          // Ignore errors fetching partner's calendar
        }
      }
    }

    // Get active insights
    const insights = user.familyMember.household.insights.map((i) => ({
      title: i.title,
      severity: i.severity,
    }));

    // Generate the message
    const message = generateBriefingMessage(
      user.familyMember.displayName,
      myEvents,
      partnerName,
      partnerEventCount,
      insights
    );

    return {
      userId,
      displayName: user.familyMember.displayName,
      phoneNumber: user.phoneNumber,
      message,
      eventCount: myEvents.length,
      partnerEventCount,
      insightCount: insights.length,
    };
  } catch (error) {
    console.error(`Failed to generate briefing for user ${userId}:`, error);
    return null;
  }
}

/**
 * Generate daily briefings for all members of a household
 */
export async function generateHouseholdBriefings(
  householdId: string
): Promise<HouseholdBriefingResult> {
  const result: HouseholdBriefingResult = {
    householdId,
    briefings: [],
    errors: [],
  };

  try {
    const household = await prisma.household.findUnique({
      where: { id: householdId },
      include: {
        members: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!household) {
      result.errors.push('Household not found');
      return result;
    }

    for (const member of household.members) {
      const briefing = await generateUserBriefing(member.userId, householdId);
      if (briefing) {
        result.briefings.push(briefing);
      }
    }

    return result;
  } catch (error) {
    result.errors.push(error instanceof Error ? error.message : 'Unknown error');
    return result;
  }
}

/**
 * Generate daily briefings for all households (for cron job)
 */
export async function generateAllBriefings(): Promise<{
  householdsProcessed: number;
  briefingsGenerated: number;
  errors: string[];
}> {
  const result = {
    householdsProcessed: 0,
    briefingsGenerated: 0,
    errors: [] as string[],
  };

  try {
    // Find all households with at least one member with a verified phone
    const households = await prisma.household.findMany({
      where: {
        members: {
          some: {
            user: {
              phoneVerified: true,
              phoneNumber: { not: null },
            },
          },
        },
      },
      select: { id: true },
    });

    for (const household of households) {
      const householdResult = await generateHouseholdBriefings(household.id);
      result.householdsProcessed++;
      result.briefingsGenerated += householdResult.briefings.length;
      result.errors.push(...householdResult.errors);
    }

    return result;
  } catch (error) {
    result.errors.push(error instanceof Error ? error.message : 'Unknown error');
    return result;
  }
}
