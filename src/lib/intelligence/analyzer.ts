/**
 * Intelligence Analyzer - FamilyOS
 *
 * Runs all pattern detection and generates insights for a household.
 */

import { prisma } from '@/lib/db';
import { fetchGoogleCalendarEvents, getWeekBoundaries } from '@/lib/calendar/google';
import { sendSMS, generateSMSMessage, type InsightType } from '@/lib/sms';
import {
  detectCalendarGaps,
  detectConflicts,
  detectCoverageGaps,
  detectLoadImbalance,
  detectPrepReminders,
  type CalendarEvent,
  type HouseholdContext,
  type DetectedInsight,
} from './patterns';

export interface AnalysisResult {
  householdId: string;
  insightsGenerated: number;
  insightsSent: number;
  errors: string[];
}

/**
 * Analyze a household and generate insights
 */
export async function analyzeHousehold(householdId: string): Promise<AnalysisResult> {
  const result: AnalysisResult = {
    householdId,
    insightsGenerated: 0,
    insightsSent: 0,
    errors: [],
  };

  try {
    // Load household context
    const household = await prisma.household.findUnique({
      where: { id: householdId },
      include: {
        members: {
          include: {
            user: true,
            calendars: { where: { included: true } },
          },
        },
        children: true,
      },
    });

    if (!household) {
      result.errors.push('Household not found');
      return result;
    }

    // Build context
    const parents = household.members.filter(m => m.role === 'parent_a' || m.role === 'parent_b');
    if (parents.length === 0) {
      result.errors.push('No parents found in household');
      return result;
    }

    const parentA = parents.find(p => p.role === 'parent_a') || parents[0];
    const parentB = parents.find(p => p.role === 'parent_b');

    const context: HouseholdContext = {
      householdId,
      parentA: {
        id: parentA.id,
        name: parentA.displayName,
        userId: parentA.userId,
      },
      parentB: parentB
        ? {
            id: parentB.id,
            name: parentB.displayName,
            userId: parentB.userId,
          }
        : null,
      children: household.children.map(c => ({ id: c.id, name: c.name })),
    };

    // Fetch calendar events for the week
    const { start, end } = getWeekBoundaries();
    const events: CalendarEvent[] = [];

    for (const member of parents) {
      for (const calendar of member.calendars) {
        try {
          const calEvents = await fetchGoogleCalendarEvents(
            member.userId,
            calendar.googleCalendarId,
            start,
            end
          );

          for (const event of calEvents) {
            if (!event.start?.dateTime && !event.start?.date) continue;

            const startDate = event.start.dateTime
              ? new Date(event.start.dateTime)
              : new Date(event.start.date + 'T00:00:00');

            const endDate = event.end?.dateTime
              ? new Date(event.end.dateTime)
              : event.end?.date
              ? new Date(event.end.date + 'T23:59:59')
              : new Date(startDate.getTime() + 60 * 60 * 1000);

            events.push({
              id: event.id,
              summary: event.summary || 'Untitled Event',
              start: startDate,
              end: endDate,
              calendarId: calendar.googleCalendarId,
              ownerId: member.id,
              ownerName: member.displayName,
            });
          }
        } catch (error) {
          console.error(`Error fetching calendar ${calendar.googleCalendarId}:`, error);
          result.errors.push(`Failed to fetch calendar for ${member.displayName}`);
        }
      }
    }

    if (events.length === 0) {
      console.log('No calendar events found for household', householdId);
      return result;
    }

    // Run all pattern detections
    const allInsights: DetectedInsight[] = [
      ...detectCalendarGaps(events, context),
      ...detectConflicts(events, context),
      ...detectCoverageGaps(events, context),
      ...detectLoadImbalance(events, context),
      ...detectPrepReminders(events, context),
    ];

    result.insightsGenerated = allInsights.length;

    // Deduplicate against existing insights
    for (const insight of allInsights) {
      const existing = await prisma.insight.findFirst({
        where: {
          householdId,
          type: insight.type,
          title: insight.title,
          status: { in: ['pending', 'sent'] },
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // Last 24 hours
        },
      });

      if (existing) {
        console.log('Skipping duplicate insight:', insight.title);
        continue;
      }

      // Generate SMS message
      const smsMessage = generateSMSMessage(insight.type as InsightType, insight.templateData);

      // Create insight in database
      const dbInsight = await prisma.insight.create({
        data: {
          householdId,
          type: insight.type,
          severity: insight.severity,
          title: insight.title,
          description: insight.description,
          smsMessage,
          eventIds: insight.eventIds,
          metadata: insight.templateData ? JSON.parse(JSON.stringify(insight.templateData)) : undefined,
        },
      });

      // Send SMS to target user
      const targetUser = await prisma.user.findUnique({
        where: { id: insight.targetUserId },
      });

      if (targetUser?.phoneNumber && targetUser.phoneVerified) {
        const sendResult = await sendSMS({
          to: targetUser.phoneNumber,
          body: smsMessage,
        });

        if (sendResult.success) {
          await prisma.insight.update({
            where: { id: dbInsight.id },
            data: {
              status: 'sent',
              sentAt: new Date(),
            },
          });
          result.insightsSent++;
        } else {
          result.errors.push(`Failed to send SMS to ${targetUser.email}: ${sendResult.error}`);
        }
      } else {
        console.log('User has no verified phone number:', insight.targetUserId);
      }
    }

    return result;
  } catch (error) {
    console.error('Error analyzing household:', error);
    result.errors.push(error instanceof Error ? error.message : 'Unknown error');
    return result;
  }
}

/**
 * Analyze all households (for cron job)
 */
export async function analyzeAllHouseholds(): Promise<AnalysisResult[]> {
  const households = await prisma.household.findMany({
    where: {
      members: {
        some: {
          calendars: {
            some: { included: true },
          },
        },
      },
    },
    select: { id: true },
  });

  const results: AnalysisResult[] = [];

  for (const household of households) {
    console.log('Analyzing household:', household.id);
    const result = await analyzeHousehold(household.id);
    results.push(result);
  }

  return results;
}
