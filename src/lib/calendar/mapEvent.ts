import { Event } from '@/data/mock-data';
import { GoogleCalendarEvent } from './google';

type DayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';
type Period = 'morning' | 'afternoon' | 'evening';
type EventType = 'work' | 'kids' | 'personal' | 'family' | 'travel';
type Parent = 'A' | 'B' | 'both';

/**
 * Format time as "9:00 AM"
 */
function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Get day key from date
 */
function getDayKey(date: Date): DayKey {
  const days: DayKey[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  return days[date.getDay()];
}

/**
 * Get period of day from date
 */
function getPeriod(date: Date): Period {
  const hour = date.getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

/**
 * Infer event type from title and description
 */
function inferEventType(event: GoogleCalendarEvent): EventType {
  const title = (event.summary || '').toLowerCase();
  const description = (event.description || '').toLowerCase();
  const text = `${title} ${description}`;

  // Travel indicators
  if (
    text.includes('flight') ||
    text.includes('travel') ||
    text.includes('airport') ||
    text.includes('hotel') ||
    text.includes('trip')
  ) {
    return 'travel';
  }

  // Kids indicators
  if (
    text.includes('school') ||
    text.includes('daycare') ||
    text.includes('pediatr') ||
    text.includes('soccer') ||
    text.includes('practice') ||
    text.includes('recital') ||
    text.includes('pickup') ||
    text.includes('drop off') ||
    text.includes('dropoff') ||
    text.includes('kid') ||
    text.includes('child') ||
    text.includes('emma') || // Common kid name
    text.includes('noah') ||
    text.includes('swim') ||
    text.includes('lesson')
  ) {
    return 'kids';
  }

  // Work indicators
  if (
    text.includes('meeting') ||
    text.includes('standup') ||
    text.includes('review') ||
    text.includes('1:1') ||
    text.includes('call') ||
    text.includes('conf') ||
    text.includes('sync') ||
    text.includes('interview') ||
    text.includes('presentation') ||
    text.includes('sprint') ||
    text.includes('retro')
  ) {
    return 'work';
  }

  // Family indicators
  if (
    text.includes('family') ||
    text.includes('dinner') ||
    text.includes('brunch') ||
    text.includes('birthday') ||
    text.includes('anniversary') ||
    text.includes('holiday') ||
    text.includes('grandma') ||
    text.includes('grandpa') ||
    text.includes('visit')
  ) {
    return 'family';
  }

  return 'personal';
}

/**
 * Determine if event likely needs preparation
 */
function inferNeedsPrep(event: GoogleCalendarEvent): boolean {
  const title = (event.summary || '').toLowerCase();
  const description = (event.description || '').toLowerCase();
  const text = `${title} ${description}`;

  // Events that typically need prep
  const prepIndicators = [
    'doctor',
    'dentist',
    'pediatr',
    'appointment',
    'interview',
    'presentation',
    'flight',
    'travel',
    'trip',
    'party',
    'birthday',
    'meeting with',
    'client',
    'review',
  ];

  return prepIndicators.some((indicator) => text.includes(indicator));
}

interface MapEventOptions {
  calendarId: string;
  calendarName: string;
  parentRole: 'parent_a' | 'parent_b';
  ownerName: string;
}

/**
 * Map a Google Calendar event to our Event type
 */
export function mapGoogleEvent(
  googleEvent: GoogleCalendarEvent,
  options: MapEventOptions
): Event | null {
  // Skip events without start time
  if (!googleEvent.start?.dateTime && !googleEvent.start?.date) {
    return null;
  }

  // Handle all-day events (date only) vs timed events
  const isAllDay = !googleEvent.start.dateTime;
  const startDate = new Date(
    googleEvent.start.dateTime || googleEvent.start.date || ''
  );

  // For all-day events, set a default morning time
  if (isAllDay) {
    startDate.setHours(9, 0, 0, 0);
  }

  const endDate = googleEvent.end?.dateTime
    ? new Date(googleEvent.end.dateTime)
    : undefined;

  const parent: Parent = options.parentRole === 'parent_a' ? 'A' : 'B';

  return {
    id: `${options.calendarId}-${googleEvent.id}`,
    title: googleEvent.summary || '(No title)',
    time: formatTime(startDate),
    endTime: endDate ? formatTime(endDate) : undefined,
    day: getDayKey(startDate),
    period: getPeriod(startDate),
    parent,
    ownerName: options.ownerName,
    calendar: options.calendarName,
    type: inferEventType(googleEvent),
    needsPrep: inferNeedsPrep(googleEvent),
  };
}

/**
 * Map multiple Google Calendar events
 */
export function mapGoogleEvents(
  googleEvents: GoogleCalendarEvent[],
  options: MapEventOptions
): Event[] {
  return googleEvents
    .map((event) => mapGoogleEvent(event, options))
    .filter((event): event is Event => event !== null);
}
