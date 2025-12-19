/*
 * Family OS — Week Analysis
 *
 * Analyzes calendar events to generate:
 * - Week summary statistics
 * - Conflict detection
 * - Prep items extraction
 */

import { Event, Conflict, WeekSummary } from '@/data/mock-data';

// ============================================
// WEEK DAYS
// ============================================

export function getCurrentWeek(): {
  label: string;
  range: string;
  year: number;
  days: { key: Event['day']; short: string; date: string; full: string }[];
} {
  const now = new Date();
  const dayOfWeek = now.getDay();
  // Adjust to Monday start (0 = Sunday, so Monday is 1)
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset);

  const days: { key: Event['day']; short: string; date: string; full: string }[] = [];
  const dayKeys: Event['day'][] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const shortNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  for (let i = 0; i < 7; i++) {
    const day = new Date(monday);
    day.setDate(monday.getDate() + i);
    const monthName = day.toLocaleDateString('en-US', { month: 'short' });
    days.push({
      key: dayKeys[i],
      short: shortNames[i],
      date: String(day.getDate()),
      full: `${dayNames[i]}, ${monthName} ${day.getDate()}`,
    });
  }

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const startMonth = monday.toLocaleDateString('en-US', { month: 'short' });
  const endMonth = sunday.toLocaleDateString('en-US', { month: 'short' });
  const range = startMonth === endMonth
    ? `${startMonth} ${monday.getDate()}–${sunday.getDate()}`
    : `${startMonth} ${monday.getDate()} – ${endMonth} ${sunday.getDate()}`;

  return {
    label: 'This week',
    range,
    year: monday.getFullYear(),
    days,
  };
}

// ============================================
// CONFLICT DETECTION
// ============================================

function parseTime(timeStr: string): number {
  // Parse "9:00 AM" or "2:30 PM" to minutes since midnight
  const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) return 0;

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const period = match[3].toUpperCase();

  if (period === 'PM' && hours !== 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;

  return hours * 60 + minutes;
}

function eventsOverlap(e1: Event, e2: Event): boolean {
  if (e1.day !== e2.day) return false;
  if (e1.parent === e2.parent || e1.parent === 'both' || e2.parent === 'both') return false;

  const start1 = parseTime(e1.time);
  const end1 = e1.endTime ? parseTime(e1.endTime) : start1 + 60; // Default 1 hour
  const start2 = parseTime(e2.time);
  const end2 = e2.endTime ? parseTime(e2.endTime) : start2 + 60;

  // Check overlap
  return start1 < end2 && start2 < end1;
}

function formatTimeRange(e1: Event, e2: Event): string {
  const times = [e1.time, e2.time];
  if (e1.endTime) times.push(e1.endTime);
  if (e2.endTime) times.push(e2.endTime);

  const sorted = times.sort((a, b) => parseTime(a) - parseTime(b));
  return `${sorted[0]} – ${sorted[sorted.length - 1]}`;
}

function getDayName(day: Event['day']): string {
  const names: Record<Event['day'], string> = {
    mon: 'Monday',
    tue: 'Tuesday',
    wed: 'Wednesday',
    thu: 'Thursday',
    fri: 'Friday',
    sat: 'Saturday',
    sun: 'Sunday',
  };
  return names[day];
}

export function detectConflicts(events: Event[]): Conflict[] {
  const conflicts: Conflict[] = [];
  const processedPairs = new Set<string>();

  // Detect schedule overlaps
  for (let i = 0; i < events.length; i++) {
    for (let j = i + 1; j < events.length; j++) {
      const e1 = events[i];
      const e2 = events[j];

      // Skip if same parent or "both" events
      if (e1.parent === e2.parent) continue;
      if (e1.parent === 'both' || e2.parent === 'both') continue;

      // Check for time overlap
      if (eventsOverlap(e1, e2)) {
        const pairKey = [e1.id, e2.id].sort().join('-');
        if (processedPairs.has(pairKey)) continue;
        processedPairs.add(pairKey);

        conflicts.push({
          id: `conflict-${e1.id}-${e2.id}`,
          timeRange: formatTimeRange(e1, e2),
          day: getDayName(e1.day),
          description: `${e1.title} overlaps with ${e2.title}`,
          humanContext: `${getDayName(e1.day)} has a scheduling conflict. "${e1.title}" and "${e2.title}" happen at the same time. One of you needs to flex here.`,
          type: 'overlap',
          severity: 'high',
          events: [e1.title, e2.title],
          question: `Can one of these be moved, or who handles which?`,
        });
      }
    }
  }

  // Detect travel + solo parenting days
  const dayEvents: Record<Event['day'], Event[]> = {
    mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [],
  };
  events.forEach(e => dayEvents[e.day].push(e));

  Object.entries(dayEvents).forEach(([day, dayEvts]) => {
    const travelEvents = dayEvts.filter(e => e.type === 'travel');
    const kidsEvents = dayEvts.filter(e => e.type === 'kids');

    if (travelEvents.length > 0 && kidsEvents.length > 0) {
      const travelingParent = travelEvents[0].parent;
      const soloParent = travelingParent === 'A' ? 'B' : 'A';

      conflicts.push({
        id: `coverage-${day}`,
        timeRange: 'All day',
        day: getDayName(day as Event['day']),
        description: `Solo parenting day — Parent ${travelingParent} traveling`,
        humanContext: `${getDayName(day as Event['day'])} is your heaviest day — Parent ${travelingParent} is traveling while Parent ${soloParent} handles kids events alone. This could be intense.`,
        type: 'coverage',
        severity: 'high',
        events: [...travelEvents, ...kidsEvents].map(e => e.title),
        question: `Do you need backup support for ${getDayName(day as Event['day'])}? Grandparent? Sitter?`,
      });
    }
  });

  // Detect tight logistics (back-to-back events with different needs)
  Object.entries(dayEvents).forEach(([day, dayEvts]) => {
    const sorted = [...dayEvts].sort((a, b) => parseTime(a.time) - parseTime(b.time));

    for (let i = 0; i < sorted.length - 1; i++) {
      const current = sorted[i];
      const next = sorted[i + 1];

      const currentEnd = current.endTime ? parseTime(current.endTime) : parseTime(current.time) + 60;
      const nextStart = parseTime(next.time);
      const gap = nextStart - currentEnd;

      // If gap is 30-90 minutes and involves transition (personal -> kids, etc.)
      if (gap > 0 && gap <= 90) {
        const isTransition =
          (current.type !== next.type) ||
          (current.parent !== next.parent && current.parent !== 'both' && next.parent !== 'both');

        if (isTransition && (next.type === 'personal' || current.type === 'kids')) {
          const conflictId = `logistics-${current.id}-${next.id}`;
          if (!conflicts.find(c => c.id === conflictId)) {
            conflicts.push({
              id: conflictId,
              timeRange: `${current.endTime || current.time} – ${next.time}`,
              day: getDayName(day as Event['day']),
              description: `Tight window between ${current.title} and ${next.title}`,
              humanContext: `There's only ${gap} minutes between "${current.title}" and "${next.title}". Factor in transition time.`,
              type: 'logistics',
              severity: 'medium',
              events: [current.title, next.title],
              question: `Is this transition realistic, or do you need to adjust timing?`,
            });
          }
        }
      }
    }
  });

  return conflicts;
}

// ============================================
// WEEK SUMMARY
// ============================================

export function generateWeekSummary(events: Event[], conflicts: Conflict[]): WeekSummary {
  const totalEvents = events.length;

  // Count handoffs (events where parent changes within same day)
  const dayEvents: Record<Event['day'], Event[]> = {
    mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [],
  };
  events.forEach(e => dayEvents[e.day].push(e));

  let handoffs = 0;
  Object.values(dayEvents).forEach(dayEvts => {
    const sorted = [...dayEvts].sort((a, b) => parseTime(a.time) - parseTime(b.time));
    for (let i = 0; i < sorted.length - 1; i++) {
      const current = sorted[i];
      const next = sorted[i + 1];
      if (current.parent !== next.parent && current.parent !== 'both' && next.parent !== 'both') {
        handoffs++;
      }
    }
  });

  // Count travel days
  const travelDays = new Set(events.filter(e => e.type === 'travel').map(e => e.day)).size;

  // Count solo parenting days (days with travel + kids events)
  let soloParentingDays = 0;
  Object.entries(dayEvents).forEach(([, dayEvts]) => {
    const hasTravel = dayEvts.some(e => e.type === 'travel');
    const hasKids = dayEvts.some(e => e.type === 'kids');
    if (hasTravel && hasKids) soloParentingDays++;
  });

  // Find heaviest and lightest days
  const dayCounts = Object.entries(dayEvents).map(([day, evts]) => ({
    day: getDayName(day as Event['day']),
    count: evts.length,
  }));
  dayCounts.sort((a, b) => b.count - a.count);

  const heaviestDay = dayCounts[0]?.day || 'Unknown';
  const lightestDay = dayCounts.filter(d => d.count > 0).pop()?.day || dayCounts[dayCounts.length - 1]?.day || 'Unknown';

  // Calculate intensity
  const avgEventsPerDay = totalEvents / 7;
  const highPriorityConflicts = conflicts.filter(c => c.severity === 'high').length;

  let intensity: WeekSummary['intensity'] = 'light';
  if (avgEventsPerDay > 4 || highPriorityConflicts >= 2) intensity = 'intense';
  else if (avgEventsPerDay > 3 || highPriorityConflicts >= 1) intensity = 'heavy';
  else if (avgEventsPerDay > 2) intensity = 'moderate';

  // Generate narrative
  const narrativeParts: string[] = [];

  if (intensity === 'intense') {
    narrativeParts.push('This is a very full week.');
  } else if (intensity === 'heavy') {
    narrativeParts.push('This is a fuller week.');
  } else if (intensity === 'moderate') {
    narrativeParts.push('This week looks manageable.');
  } else {
    narrativeParts.push('This looks like a lighter week.');
  }

  if (heaviestDay) {
    narrativeParts.push(`${heaviestDay} stands out as the busiest day.`);
  }

  if (highPriorityConflicts > 0) {
    narrativeParts.push(`There ${highPriorityConflicts === 1 ? 'is' : 'are'} ${highPriorityConflicts} high-priority conflict${highPriorityConflicts === 1 ? '' : 's'} that need${highPriorityConflicts === 1 ? 's' : ''} attention.`);
  }

  if (travelDays > 0) {
    narrativeParts.push(`${travelDays} day${travelDays === 1 ? '' : 's'} involve${travelDays === 1 ? 's' : ''} travel.`);
  }

  const narrative = narrativeParts.join(' ');

  return {
    totalEvents,
    handoffs,
    travelDays,
    soloParentingDays,
    heaviestDay,
    lightestDay,
    intensity,
    narrative,
  };
}
