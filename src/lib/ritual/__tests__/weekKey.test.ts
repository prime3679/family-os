import { describe, it, expect } from 'vitest';
import { getWeekKey, getWeekStart, getWeekEnd } from '../weekKey';

describe('getWeekKey', () => {
  it('returns ISO week format string', () => {
    const date = new Date('2024-12-26'); // Thursday in week 52 of 2024
    const weekKey = getWeekKey(date);

    expect(weekKey).toMatch(/^\d{4}-W\d{2}$/);
    expect(weekKey).toBe('2024-W52');
  });

  it('pads week numbers with leading zero', () => {
    const date = new Date('2024-01-03'); // Early January (week 1)
    const weekKey = getWeekKey(date);

    expect(weekKey).toBe('2024-W01');
  });

  it('handles year boundary correctly - late December belongs to current year', () => {
    const date = new Date('2024-12-30'); // Monday of week 52 in 2024
    const weekKey = getWeekKey(date);

    // Dec 30, 2024 is actually week 52 of 2024, not week 1 of 2025
    expect(weekKey).toBe('2024-W52');
  });

  it('handles year boundary correctly - early January may belong to previous year', () => {
    const date = new Date('2024-01-01'); // Monday, Jan 1 2024
    const weekKey = getWeekKey(date);

    // Jan 1, 2024 is in week 52 of 2023 based on ISO week calculation
    expect(weekKey).toBe('2023-W52');
  });

  it('returns same week key for consecutive days in the middle of a week', () => {
    // Test that consecutive days return the same week key
    const wednesday = new Date('2024-12-11'); // Mid-week date
    const thursday = new Date('2024-12-12');
    const friday = new Date('2024-12-13');

    const wednesdayKey = getWeekKey(wednesday);

    expect(getWeekKey(thursday)).toBe(wednesdayKey);
    expect(getWeekKey(friday)).toBe(wednesdayKey);
  });

  it('uses current date when no argument provided', () => {
    const weekKey = getWeekKey();

    expect(weekKey).toMatch(/^\d{4}-W\d{2}$/);
  });

  it('handles leap year correctly', () => {
    const date = new Date('2024-02-29'); // Leap day
    const weekKey = getWeekKey(date);

    expect(weekKey).toMatch(/^\d{4}-W\d{2}$/);
    expect(weekKey).toBe('2024-W09');
  });
});

describe('getWeekStart', () => {
  it('returns Monday of the current week', () => {
    const date = new Date('2024-12-26'); // Thursday
    const weekStart = getWeekStart(date);

    expect(weekStart.getDay()).toBe(1); // Monday
    expect(weekStart.getDate()).toBe(23); // Dec 23 is the Monday
  });

  it('always returns a Monday', () => {
    // Test various days to ensure they all return Monday as week start
    const dates = [
      new Date('2024-12-10'), // Tuesday
      new Date('2024-12-11'), // Wednesday
      new Date('2024-12-12'), // Thursday
      new Date('2024-12-13'), // Friday
    ];

    dates.forEach(date => {
      const weekStart = getWeekStart(date);
      expect(weekStart.getDay()).toBe(1); // All should return Monday
    });
  });

  it('handles Sunday correctly (returns previous Monday)', () => {
    const sunday = new Date('2024-12-29');
    const weekStart = getWeekStart(sunday);

    expect(weekStart.getDay()).toBe(1);
    expect(weekStart.getDate()).toBe(23);
  });

  it('sets time to midnight', () => {
    const date = new Date('2024-12-26T15:30:45.123');
    const weekStart = getWeekStart(date);

    expect(weekStart.getHours()).toBe(0);
    expect(weekStart.getMinutes()).toBe(0);
    expect(weekStart.getSeconds()).toBe(0);
    expect(weekStart.getMilliseconds()).toBe(0);
  });

  it('uses current date when no argument provided', () => {
    const weekStart = getWeekStart();

    expect(weekStart.getDay()).toBe(1); // Monday
  });

  it('handles month boundary correctly', () => {
    const date = new Date('2024-12-01'); // Sunday, Dec 1
    const weekStart = getWeekStart(date);

    expect(weekStart.getDay()).toBe(1);
    expect(weekStart.getMonth()).toBe(10); // November (0-indexed)
    expect(weekStart.getDate()).toBe(25);
  });
});

describe('getWeekEnd', () => {
  it('returns Sunday of the current week', () => {
    const date = new Date('2024-12-26'); // Thursday
    const weekEnd = getWeekEnd(date);

    expect(weekEnd.getDay()).toBe(0); // Sunday
    expect(weekEnd.getDate()).toBe(29); // Dec 29 is the Sunday
  });

  it('always returns a Sunday', () => {
    // Test various days to ensure they all return Sunday as week end
    const dates = [
      new Date('2024-12-10'), // Tuesday
      new Date('2024-12-11'), // Wednesday
      new Date('2024-12-12'), // Thursday
      new Date('2024-12-13'), // Friday
    ];

    dates.forEach(date => {
      const weekEnd = getWeekEnd(date);
      expect(weekEnd.getDay()).toBe(0); // All should return Sunday
    });
  });

  it('returns same date if already Sunday', () => {
    const sunday = new Date('2024-12-29');
    const weekEnd = getWeekEnd(sunday);

    expect(weekEnd.getDay()).toBe(0);
    expect(weekEnd.getDate()).toBe(29);
  });

  it('sets time to end of day', () => {
    const date = new Date('2024-12-26T10:30:45.123');
    const weekEnd = getWeekEnd(date);

    expect(weekEnd.getHours()).toBe(23);
    expect(weekEnd.getMinutes()).toBe(59);
    expect(weekEnd.getSeconds()).toBe(59);
    expect(weekEnd.getMilliseconds()).toBe(999);
  });

  it('uses current date when no argument provided', () => {
    const weekEnd = getWeekEnd();

    expect(weekEnd.getDay()).toBe(0); // Sunday
  });

  it('handles month boundary correctly', () => {
    const date = new Date('2024-11-28'); // Thursday, Nov 28
    const weekEnd = getWeekEnd(date);

    expect(weekEnd.getDay()).toBe(0);
    expect(weekEnd.getMonth()).toBe(11); // December (0-indexed)
    expect(weekEnd.getDate()).toBe(1);
  });

  it('week end is exactly 6 days and 23:59:59.999 after week start', () => {
    const date = new Date('2024-12-26');
    const weekStart = getWeekStart(date);
    const weekEnd = getWeekEnd(date);

    const diffMs = weekEnd.getTime() - weekStart.getTime();
    const expectedMs = 6 * 24 * 60 * 60 * 1000 + 23 * 60 * 60 * 1000 + 59 * 60 * 1000 + 59 * 1000 + 999;

    expect(diffMs).toBe(expectedMs);
  });
});
