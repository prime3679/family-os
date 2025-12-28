/**
 * Intelligence Patterns - FamilyOS
 *
 * Pattern detection rules for proactive family coordination.
 * Each pattern detects a specific type of issue and generates insights.
 */

import type { InsightType, TemplateData } from '@/lib/sms';

export interface CalendarEvent {
  id: string;
  summary: string;
  start: Date;
  end: Date;
  calendarId: string;
  ownerId: string; // FamilyMember ID
  ownerName: string;
}

export interface Child {
  id: string;
  name: string;
}

export interface HouseholdContext {
  householdId: string;
  parentA: { id: string; name: string; userId: string };
  parentB: { id: string; name: string; userId: string } | null;
  children: Child[];
}

export interface DetectedInsight {
  type: InsightType;
  severity: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  templateData: TemplateData;
  eventIds: string[];
  targetUserId: string; // Who should receive this insight
}

/**
 * Detect calendar gaps - events on one parent's calendar but not the other's
 *
 * Example: "Emma's recital is on Sarah's calendar but not yours"
 */
export function detectCalendarGaps(
  events: CalendarEvent[],
  context: HouseholdContext
): DetectedInsight[] {
  if (!context.parentB) return []; // Need two parents

  const insights: DetectedInsight[] = [];

  // Group events by similarity (same title, same day)
  const parentAEvents = events.filter(e => e.ownerId === context.parentA.id);
  const parentBEvents = events.filter(e => e.ownerId === context.parentB!.id);

  // Check for events parent A has that parent B doesn't
  for (const event of parentAEvents) {
    const hasMatch = parentBEvents.some(e => isSimilarEvent(event, e));
    if (!hasMatch && isChildRelatedEvent(event.summary, context.children)) {
      insights.push({
        type: 'calendar_gap',
        severity: 'medium',
        title: `${event.summary} missing from ${context.parentB.name}'s calendar`,
        description: `This event is only on ${context.parentA.name}'s calendar`,
        templateData: {
          eventName: event.summary,
          partnerName: context.parentA.name,
          day: formatDay(event.start),
        },
        eventIds: [event.id],
        targetUserId: context.parentB.userId,
      });
    }
  }

  // Check for events parent B has that parent A doesn't
  for (const event of parentBEvents) {
    const hasMatch = parentAEvents.some(e => isSimilarEvent(event, e));
    if (!hasMatch && isChildRelatedEvent(event.summary, context.children)) {
      insights.push({
        type: 'calendar_gap',
        severity: 'medium',
        title: `${event.summary} missing from ${context.parentA.name}'s calendar`,
        description: `This event is only on ${context.parentB.name}'s calendar`,
        templateData: {
          eventName: event.summary,
          partnerName: context.parentB.name,
          day: formatDay(event.start),
        },
        eventIds: [event.id],
        targetUserId: context.parentA.userId,
      });
    }
  }

  return insights;
}

/**
 * Detect schedule conflicts - overlapping events between parents
 */
export function detectConflicts(
  events: CalendarEvent[],
  context: HouseholdContext
): DetectedInsight[] {
  if (!context.parentB) return [];

  const insights: DetectedInsight[] = [];

  const parentAEvents = events.filter(e => e.ownerId === context.parentA.id);
  const parentBEvents = events.filter(e => e.ownerId === context.parentB!.id);

  for (const eventA of parentAEvents) {
    for (const eventB of parentBEvents) {
      if (eventsOverlap(eventA, eventB)) {
        // Both parents have overlapping events - potential conflict
        insights.push({
          type: 'conflict',
          severity: 'high',
          title: `Schedule overlap: ${eventA.summary} vs ${eventB.summary}`,
          description: `Both parents have events at the same time`,
          templateData: {
            time: formatTime(eventA.start),
            day: formatDay(eventA.start),
            partnerName: context.parentB.name,
          },
          eventIds: [eventA.id, eventB.id],
          targetUserId: context.parentA.userId, // Notify parent A first
        });
      }
    }
  }

  return insights;
}

/**
 * Detect coverage gaps - times when no one is available
 */
export function detectCoverageGaps(
  events: CalendarEvent[],
  context: HouseholdContext
): DetectedInsight[] {
  // This is more complex - need to know required coverage times
  // For now, we'll detect when both parents have events during school pickup hours
  const insights: DetectedInsight[] = [];

  if (!context.parentB) return [];

  // Define typical pickup windows (3-4pm on weekdays)
  const weekdays = getWeekdaysInRange(new Date(), 7);

  for (const day of weekdays) {
    const pickupStart = new Date(day);
    pickupStart.setHours(15, 0, 0, 0); // 3pm
    const pickupEnd = new Date(day);
    pickupEnd.setHours(16, 30, 0, 0); // 4:30pm

    const parentABusy = events.some(
      e => e.ownerId === context.parentA.id && eventsOverlapTimeRange(e, pickupStart, pickupEnd)
    );
    const parentBBusy = events.some(
      e => e.ownerId === context.parentB!.id && eventsOverlapTimeRange(e, pickupStart, pickupEnd)
    );

    if (parentABusy && parentBBusy && context.children.length > 0) {
      insights.push({
        type: 'coverage_gap',
        severity: 'high',
        title: `No coverage for pickup ${formatDay(day)}`,
        description: 'Both parents have events during typical pickup time',
        templateData: {
          time: '3-4:30pm',
          day: formatDay(day),
          childName: context.children[0]?.name,
        },
        eventIds: [],
        targetUserId: context.parentA.userId,
      });
    }
  }

  return insights;
}

/**
 * Detect load imbalance - one parent has significantly more events
 */
export function detectLoadImbalance(
  events: CalendarEvent[],
  context: HouseholdContext
): DetectedInsight[] {
  if (!context.parentB) return [];

  const parentACount = events.filter(e => e.ownerId === context.parentA.id).length;
  const parentBCount = events.filter(e => e.ownerId === context.parentB!.id).length;

  // Only flag if difference is significant (more than 2x)
  if (parentACount > parentBCount * 2 && parentACount > 5) {
    return [{
      type: 'load_imbalance',
      severity: 'low',
      title: `${context.parentA.name} has ${parentACount} events, ${context.parentB.name} has ${parentBCount}`,
      description: 'Significant imbalance in scheduled events',
      templateData: {
        count: parentACount,
        partnerName: context.parentB.name,
      },
      eventIds: [],
      targetUserId: context.parentA.userId,
    }];
  }

  if (parentBCount > parentACount * 2 && parentBCount > 5) {
    return [{
      type: 'load_imbalance',
      severity: 'low',
      title: `${context.parentB.name} has ${parentBCount} events, ${context.parentA.name} has ${parentACount}`,
      description: 'Significant imbalance in scheduled events',
      templateData: {
        count: parentBCount,
        partnerName: context.parentA.name,
      },
      eventIds: [],
      targetUserId: context.parentB.userId,
    }];
  }

  return [];
}

/**
 * Detect prep reminders - events coming up that need preparation
 */
export function detectPrepReminders(
  events: CalendarEvent[],
  context: HouseholdContext
): DetectedInsight[] {
  const insights: DetectedInsight[] = [];
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  const dayAfter = new Date(tomorrow);
  dayAfter.setDate(dayAfter.getDate() + 1);

  // Find events tomorrow that need prep
  const tomorrowEvents = events.filter(e => e.start >= tomorrow && e.start < dayAfter);

  for (const event of tomorrowEvents) {
    const prepNeeded = getPrepForEvent(event.summary);
    if (prepNeeded) {
      insights.push({
        type: 'prep_reminder',
        severity: 'medium',
        title: `Prep for ${event.summary} tomorrow`,
        description: prepNeeded,
        templateData: {
          eventName: event.summary,
          day: 'tomorrow',
          action: prepNeeded,
        },
        eventIds: [event.id],
        targetUserId: event.ownerId === context.parentA.id
          ? context.parentA.userId
          : context.parentB?.userId || context.parentA.userId,
      });
    }
  }

  return insights;
}

// ============================================
// Helper Functions
// ============================================

function isSimilarEvent(a: CalendarEvent, b: CalendarEvent): boolean {
  // Same day and similar title
  const sameDay = a.start.toDateString() === b.start.toDateString();
  const similarTitle = a.summary.toLowerCase().includes(b.summary.toLowerCase()) ||
    b.summary.toLowerCase().includes(a.summary.toLowerCase());
  return sameDay && similarTitle;
}

function isChildRelatedEvent(summary: string, children: Child[]): boolean {
  const lowerSummary = summary.toLowerCase();

  // Check if event mentions any child's name
  for (const child of children) {
    if (lowerSummary.includes(child.name.toLowerCase())) {
      return true;
    }
  }

  // Check for common child-related keywords
  const childKeywords = [
    'school', 'pickup', 'dropoff', 'practice', 'lesson', 'recital',
    'game', 'match', 'tournament', 'birthday', 'playdate', 'doctor',
    'dentist', 'pediatric', 'dance', 'soccer', 'basketball', 'swim',
    'gymnastics', 'piano', 'violin', 'tutoring', 'daycare', 'camp'
  ];

  return childKeywords.some(keyword => lowerSummary.includes(keyword));
}

function eventsOverlap(a: CalendarEvent, b: CalendarEvent): boolean {
  return a.start < b.end && b.start < a.end;
}

function eventsOverlapTimeRange(event: CalendarEvent, start: Date, end: Date): boolean {
  return event.start < end && event.end > start;
}

function getWeekdaysInRange(start: Date, days: number): Date[] {
  const result: Date[] = [];
  const current = new Date(start);

  for (let i = 0; i < days; i++) {
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not weekend
      result.push(new Date(current));
    }
    current.setDate(current.getDate() + 1);
  }

  return result;
}

function formatDay(date: Date): string {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (date.toDateString() === today.toDateString()) {
    return 'today';
  }
  if (date.toDateString() === tomorrow.toDateString()) {
    return 'tomorrow';
  }

  return date.toLocaleDateString('en-US', { weekday: 'long' });
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function getPrepForEvent(summary: string): string | null {
  const lowerSummary = summary.toLowerCase();

  if (lowerSummary.includes('soccer') || lowerSummary.includes('game') || lowerSummary.includes('practice')) {
    return 'Gear packed?';
  }
  if (lowerSummary.includes('swim')) {
    return 'Swimsuit and towel ready?';
  }
  if (lowerSummary.includes('dance') || lowerSummary.includes('recital')) {
    return 'Costume and shoes ready?';
  }
  if (lowerSummary.includes('birthday') || lowerSummary.includes('party')) {
    return 'Gift wrapped?';
  }
  if (lowerSummary.includes('doctor') || lowerSummary.includes('dentist')) {
    return 'Insurance card ready?';
  }
  if (lowerSummary.includes('camp') || lowerSummary.includes('overnight')) {
    return 'Bag packed?';
  }

  return null;
}
