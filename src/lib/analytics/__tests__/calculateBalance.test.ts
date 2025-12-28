import { describe, it, expect } from 'vitest';
import { calculateBalance } from '../calculateBalance';
import type { Event } from '@/data/mock-data';

// Helper to create test events with required fields
let eventCounter = 0;
function createEvent(overrides: Partial<Event> & { day: Event['day']; time: string; title: string; parent: Event['parent']; type?: Event['type'] }): Event {
  eventCounter++;
  const hour = parseInt(overrides.time?.split(':')[0] || '9');
  const period: Event['period'] = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
  return {
    id: `test-${eventCounter}`,
    period,
    calendar: 'test-calendar',
    ...overrides,
  } as Event;
}

describe('calculateBalance', () => {
  it('returns balanced score when parents have equal events', () => {
    const events: Event[] = [
      createEvent({ day: 'mon', time: '9:00 AM', title: 'School drop-off', parent: 'A', type: 'kids' }),
      createEvent({ day: 'mon', time: '5:00 PM', title: 'School pickup', parent: 'B', type: 'kids' }),
      createEvent({ day: 'tue', time: '9:00 AM', title: 'Dentist', parent: 'A', type: 'kids' }),
      createEvent({ day: 'tue', time: '5:00 PM', title: 'Soccer practice', parent: 'B', type: 'kids' }),
    ];

    const result = calculateBalance(events);

    expect(result.parentA.events).toBe(2);
    expect(result.parentB.events).toBe(2);
    expect(result.balanceScore).toBe(50);
    expect(result.balanceLabel).toBe('balanced');
  });

  it('categorizes event types correctly for parent A', () => {
    const events: Event[] = [
      createEvent({ day: 'mon', time: '9:00 AM', title: 'School drop-off', parent: 'A', type: 'kids' }),
      createEvent({ day: 'mon', time: '10:00 AM', title: 'Work meeting', parent: 'A', type: 'work' }),
      createEvent({ day: 'mon', time: '6:00 PM', title: 'Gym', parent: 'A', type: 'personal' }),
    ];

    const result = calculateBalance(events);

    expect(result.parentA.kidsEvents).toBe(1);
    expect(result.parentA.workEvents).toBe(1);
    expect(result.parentA.personalEvents).toBe(1);
    expect(result.parentA.events).toBe(3);
  });

  it('categorizes event types correctly for parent B', () => {
    const events: Event[] = [
      createEvent({ day: 'mon', time: '9:00 AM', title: 'School drop-off', parent: 'B', type: 'kids' }),
      createEvent({ day: 'mon', time: '10:00 AM', title: 'Work meeting', parent: 'B', type: 'work' }),
      createEvent({ day: 'mon', time: '6:00 PM', title: 'Gym', parent: 'B', type: 'personal' }),
    ];

    const result = calculateBalance(events);

    expect(result.parentB.kidsEvents).toBe(1);
    expect(result.parentB.workEvents).toBe(1);
    expect(result.parentB.personalEvents).toBe(1);
    expect(result.parentB.events).toBe(3);
  });

  it('does not count "both" events toward individual parent loads', () => {
    const events: Event[] = [
      createEvent({ day: 'mon', time: '9:00 AM', title: 'School drop-off', parent: 'A', type: 'kids' }),
      createEvent({ day: 'mon', time: '5:00 PM', title: 'Family dinner', parent: 'both', type: 'personal' }),
      createEvent({ day: 'tue', time: '9:00 AM', title: 'School pickup', parent: 'B', type: 'kids' }),
    ];

    const result = calculateBalance(events);

    expect(result.parentA.events).toBe(1);
    expect(result.parentB.events).toBe(1);
    expect(result.totalEvents).toBe(3);
  });

  it('calculates imbalanced label when deviation is over 25', () => {
    const events: Event[] = [
      createEvent({ day: 'mon', time: '9:00 AM', title: 'Event 1', parent: 'A', type: 'kids' }),
      createEvent({ day: 'mon', time: '10:00 AM', title: 'Event 2', parent: 'A', type: 'kids' }),
      createEvent({ day: 'mon', time: '11:00 AM', title: 'Event 3', parent: 'A', type: 'kids' }),
      createEvent({ day: 'mon', time: '12:00 PM', title: 'Event 4', parent: 'A', type: 'kids' }),
      createEvent({ day: 'mon', time: '1:00 PM', title: 'Event 5', parent: 'B', type: 'kids' }),
    ];

    const result = calculateBalance(events);

    expect(result.parentA.events).toBe(4);
    expect(result.parentB.events).toBe(1);
    expect(result.balanceScore).toBe(80);
    expect(result.balanceLabel).toBe('imbalanced');
  });

  it('calculates slight-imbalance label when deviation is between 10 and 25', () => {
    // Need 7 parent A events and 3 parent B events = 70% = deviation of 20
    const events: Event[] = [
      createEvent({ day: 'mon', time: '9:00 AM', title: 'Event 1', parent: 'A', type: 'kids' }),
      createEvent({ day: 'mon', time: '10:00 AM', title: 'Event 2', parent: 'A', type: 'kids' }),
      createEvent({ day: 'mon', time: '11:00 AM', title: 'Event 3', parent: 'A', type: 'kids' }),
      createEvent({ day: 'mon', time: '12:00 PM', title: 'Event 4', parent: 'A', type: 'kids' }),
      createEvent({ day: 'mon', time: '1:00 PM', title: 'Event 5', parent: 'A', type: 'kids' }),
      createEvent({ day: 'mon', time: '2:00 PM', title: 'Event 6', parent: 'A', type: 'kids' }),
      createEvent({ day: 'mon', time: '3:00 PM', title: 'Event 7', parent: 'A', type: 'kids' }),
      createEvent({ day: 'mon', time: '4:00 PM', title: 'Event 8', parent: 'B', type: 'kids' }),
      createEvent({ day: 'mon', time: '5:00 PM', title: 'Event 9', parent: 'B', type: 'kids' }),
      createEvent({ day: 'mon', time: '6:00 PM', title: 'Event 10', parent: 'B', type: 'kids' }),
    ];

    const result = calculateBalance(events);

    expect(result.parentA.events).toBe(7);
    expect(result.parentB.events).toBe(3);
    expect(result.balanceScore).toBe(70); // 7/10 = 0.70 * 100 = 70
    expect(result.balanceLabel).toBe('slight-imbalance'); // deviation is 20, which is > 10 and <= 25
  });

  it('counts handoffs when parents switch during the day', () => {
    const events: Event[] = [
      createEvent({ day: 'mon', time: '9:00 AM', title: 'Morning drop-off', parent: 'A', type: 'kids' }),
      createEvent({ day: 'mon', time: '5:00 PM', title: 'Afternoon pickup', parent: 'B', type: 'kids' }),
      createEvent({ day: 'tue', time: '9:00 AM', title: 'Morning drop-off', parent: 'B', type: 'kids' }),
      createEvent({ day: 'tue', time: '5:00 PM', title: 'Afternoon pickup', parent: 'A', type: 'kids' }),
    ];

    const result = calculateBalance(events);

    expect(result.parentA.handoffs).toBe(1);
    expect(result.parentB.handoffs).toBe(1);
  });

  it('does not count handoffs when both parents have consecutive events', () => {
    const events: Event[] = [
      createEvent({ day: 'mon', time: '9:00 AM', title: 'Event 1', parent: 'A', type: 'kids' }),
      createEvent({ day: 'mon', time: '10:00 AM', title: 'Event 2', parent: 'A', type: 'kids' }),
      createEvent({ day: 'mon', time: '11:00 AM', title: 'Event 3', parent: 'A', type: 'kids' }),
    ];

    const result = calculateBalance(events);

    expect(result.parentA.handoffs).toBe(0);
    expect(result.parentB.handoffs).toBe(0);
  });

  it('does not count handoffs involving "both" events', () => {
    const events: Event[] = [
      createEvent({ day: 'mon', time: '9:00 AM', title: 'Morning drop-off', parent: 'A', type: 'kids' }),
      createEvent({ day: 'mon', time: '12:00 PM', title: 'Family lunch', parent: 'both', type: 'personal' }),
      createEvent({ day: 'mon', time: '5:00 PM', title: 'Afternoon pickup', parent: 'B', type: 'kids' }),
    ];

    const result = calculateBalance(events);

    expect(result.parentA.handoffs).toBe(0);
    expect(result.parentB.handoffs).toBe(0);
  });

  it('handles empty events array', () => {
    const events: Event[] = [];

    const result = calculateBalance(events);

    expect(result.parentA.events).toBe(0);
    expect(result.parentB.events).toBe(0);
    expect(result.totalEvents).toBe(0);
    expect(result.balanceScore).toBe(50);
    expect(result.balanceLabel).toBe('balanced');
  });

  it('uses weekSummary totalEvents when provided', () => {
    const events: Event[] = [
      createEvent({ day: 'mon', time: '9:00 AM', title: 'Event 1', parent: 'A', type: 'kids' }),
    ];

    const result = calculateBalance(events, { totalEvents: 10 } as any);

    expect(result.totalEvents).toBe(10);
  });

  it('handles PM times correctly for handoff calculation', () => {
    const events: Event[] = [
      createEvent({ day: 'mon', time: '9:00 AM', title: 'Morning', parent: 'A', type: 'kids' }),
      createEvent({ day: 'mon', time: '2:00 PM', title: 'Afternoon', parent: 'B', type: 'kids' }),
      createEvent({ day: 'mon', time: '7:00 PM', title: 'Evening', parent: 'A', type: 'kids' }),
    ];

    const result = calculateBalance(events);

    expect(result.parentA.handoffs).toBe(1);
    expect(result.parentB.handoffs).toBe(1);
  });

  it('handles 12:00 PM (noon) correctly', () => {
    const events: Event[] = [
      createEvent({ day: 'mon', time: '11:00 AM', title: 'Late morning', parent: 'A', type: 'kids' }),
      createEvent({ day: 'mon', time: '12:00 PM', title: 'Noon', parent: 'B', type: 'kids' }),
      createEvent({ day: 'mon', time: '1:00 PM', title: 'Early afternoon', parent: 'A', type: 'kids' }),
    ];

    const result = calculateBalance(events);

    expect(result.parentA.handoffs).toBe(1);
    expect(result.parentB.handoffs).toBe(1);
  });
});
