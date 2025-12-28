import type { Event, WeekSummary } from '@/data/mock-data';

export interface ParentBalance {
  events: number;
  kidsEvents: number;
  workEvents: number;
  personalEvents: number;
  handoffs: number;
  soloDays: number;
}

export interface BalanceResult {
  parentA: ParentBalance;
  parentB: ParentBalance;
  totalEvents: number;
  balanceScore: number; // 0-100, 50 = perfectly balanced
  balanceLabel: 'balanced' | 'slight-imbalance' | 'imbalanced';
}

/**
 * Calculate balance metrics between parents from events
 */
export function calculateBalance(
  events: Event[],
  weekSummary?: WeekSummary
): BalanceResult {
  const parentA: ParentBalance = {
    events: 0,
    kidsEvents: 0,
    workEvents: 0,
    personalEvents: 0,
    handoffs: 0,
    soloDays: 0,
  };

  const parentB: ParentBalance = {
    events: 0,
    kidsEvents: 0,
    workEvents: 0,
    personalEvents: 0,
    handoffs: 0,
    soloDays: 0,
  };

  // Count events by parent
  events.forEach((event) => {
    if (event.parent === 'A') {
      parentA.events++;
      if (event.type === 'kids') parentA.kidsEvents++;
      if (event.type === 'work') parentA.workEvents++;
      if (event.type === 'personal') parentA.personalEvents++;
    } else if (event.parent === 'B') {
      parentB.events++;
      if (event.type === 'kids') parentB.kidsEvents++;
      if (event.type === 'work') parentB.workEvents++;
      if (event.type === 'personal') parentB.personalEvents++;
    }
    // 'both' events count toward neither parent's individual load
  });

  // Calculate handoffs per parent (simplified - who hands off to who)
  const dayEvents = groupEventsByDay(events);
  Object.values(dayEvents).forEach((dayEvts) => {
    const sorted = [...dayEvts].sort((a, b) => parseTime(a.time) - parseTime(b.time));
    for (let i = 0; i < sorted.length - 1; i++) {
      const current = sorted[i];
      const next = sorted[i + 1];
      if (current.parent !== next.parent && current.parent !== 'both' && next.parent !== 'both') {
        if (current.parent === 'A') parentA.handoffs++;
        else parentB.handoffs++;
      }
    }
  });

  // Calculate balance score (50 = perfect, 0 or 100 = completely one-sided)
  const totalParentEvents = parentA.events + parentB.events;
  let balanceScore = 50;
  let balanceLabel: BalanceResult['balanceLabel'] = 'balanced';

  if (totalParentEvents > 0) {
    const ratio = parentA.events / totalParentEvents;
    balanceScore = Math.round(ratio * 100);

    // Normalize to 0-100 where 50 is balanced
    const deviation = Math.abs(50 - balanceScore);
    if (deviation > 25) {
      balanceLabel = 'imbalanced';
    } else if (deviation > 10) {
      balanceLabel = 'slight-imbalance';
    }
  }

  return {
    parentA,
    parentB,
    totalEvents: weekSummary?.totalEvents || events.length,
    balanceScore,
    balanceLabel,
  };
}

function groupEventsByDay(events: Event[]): Record<string, Event[]> {
  return events.reduce(
    (acc, event) => {
      acc[event.day] = acc[event.day] || [];
      acc[event.day].push(event);
      return acc;
    },
    {} as Record<string, Event[]>
  );
}

function parseTime(timeStr: string): number {
  const [time, period] = timeStr.split(' ');
  const [hours, minutes] = time.split(':').map(Number);
  let h = hours;
  if (period?.toLowerCase() === 'pm' && h !== 12) h += 12;
  if (period?.toLowerCase() === 'am' && h === 12) h = 0;
  return h * 60 + (minutes || 0);
}
