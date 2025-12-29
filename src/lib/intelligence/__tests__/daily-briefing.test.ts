/**
 * Daily Briefing Tests
 *
 * Tests the daily briefing generation for FamilyOS morning SMS notifications.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock dependencies before imports
vi.mock('@/lib/db', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    household: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

vi.mock('@/lib/calendar/google', () => ({
  fetchGoogleCalendarEvents: vi.fn(),
}));

import {
  generateUserBriefing,
  generateHouseholdBriefings,
  generateAllBriefings,
} from '../daily-briefing';
import { prisma } from '@/lib/db';
import { fetchGoogleCalendarEvents } from '@/lib/calendar/google';

// Get reference to mocks
const mockPrisma = prisma as unknown as {
  user: { findUnique: ReturnType<typeof vi.fn> };
  household: {
    findUnique: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
  };
};
const mockFetchCalendar = fetchGoogleCalendarEvents as ReturnType<typeof vi.fn>;

describe('Daily Briefing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset time-based functions with a fixed time
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-12-30T08:30:00'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('generateUserBriefing', () => {
    it('returns null when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await generateUserBriefing('user1', 'household1');

      expect(result).toBeNull();
    });

    it('returns null when user has no phone number', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user1',
        phoneNumber: null,
        phoneVerified: false,
        familyMember: {
          displayName: 'Test User',
          calendars: [],
          household: { members: [], insights: [] },
        },
      });

      const result = await generateUserBriefing('user1', 'household1');

      expect(result).toBeNull();
    });

    it('returns null when phone not verified', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user1',
        phoneNumber: '+1234567890',
        phoneVerified: false,
        familyMember: {
          displayName: 'Test User',
          calendars: [],
          household: { members: [], insights: [] },
        },
      });

      const result = await generateUserBriefing('user1', 'household1');

      expect(result).toBeNull();
    });

    it('generates briefing with no events', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user1',
        phoneNumber: '+1234567890',
        phoneVerified: true,
        familyMember: {
          displayName: 'John Doe',
          calendars: [],
          household: {
            members: [],
            insights: [],
          },
        },
      });

      const result = await generateUserBriefing('user1', 'household1');

      expect(result).not.toBeNull();
      expect(result?.userId).toBe('user1');
      expect(result?.displayName).toBe('John Doe');
      expect(result?.eventCount).toBe(0);
      // Scout has varied greetings - check for John and morning energy
      expect(result?.message).toMatch(/John.*[☀️☕✨]/);
      // Scout celebrates clear days
      expect(result?.message).toContain('blank slate');
      // Scout signs off
      expect(result?.message).toContain('— Scout 🔍');
    });

    it('generates briefing with events from calendar', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user1',
        phoneNumber: '+1234567890',
        phoneVerified: true,
        familyMember: {
          displayName: 'John Doe',
          calendars: [
            { googleCalendarId: 'cal1', name: 'Primary', included: true },
          ],
          household: {
            members: [],
            insights: [],
          },
        },
      });

      mockFetchCalendar.mockResolvedValue([
        {
          id: 'event1',
          summary: 'Team Meeting',
          start: { dateTime: '2024-12-30T09:00:00' },
          end: { dateTime: '2024-12-30T10:00:00' },
        },
        {
          id: 'event2',
          summary: 'Lunch with Client',
          start: { dateTime: '2024-12-30T12:30:00' },
          end: { dateTime: '2024-12-30T13:30:00' },
          location: 'Restaurant XYZ',
        },
      ]);

      const result = await generateUserBriefing('user1', 'household1');

      expect(result).not.toBeNull();
      expect(result?.eventCount).toBe(2);
      expect(result?.message).toContain('Team Meeting');
      expect(result?.message).toContain('9am');
      expect(result?.message).toContain('Lunch with Client');
      expect(result?.message).toContain('@ Restaurant XYZ');
    });

    it('includes all-day events', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user1',
        phoneNumber: '+1234567890',
        phoneVerified: true,
        familyMember: {
          displayName: 'John Doe',
          calendars: [
            { googleCalendarId: 'cal1', name: 'Primary', included: true },
          ],
          household: {
            members: [],
            insights: [],
          },
        },
      });

      mockFetchCalendar.mockResolvedValue([
        {
          id: 'event1',
          summary: "Emma's Birthday",
          start: { date: '2024-12-30' },
          end: { date: '2024-12-31' },
        },
      ]);

      const result = await generateUserBriefing('user1', 'household1');

      expect(result?.message).toContain("Emma's Birthday");
      expect(result?.message).toContain('All day');
    });

    it('includes partner event count', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user1',
        phoneNumber: '+1234567890',
        phoneVerified: true,
        familyMember: {
          displayName: 'John Doe',
          calendars: [],
          household: {
            members: [
              {
                userId: 'user2',
                displayName: 'Jane Doe',
                calendars: [
                  { googleCalendarId: 'cal2', name: 'Work', included: true },
                ],
              },
            ],
            insights: [],
          },
        },
      });

      mockFetchCalendar.mockResolvedValue([
        { id: 'event1', summary: 'Partner Meeting' },
        { id: 'event2', summary: 'Partner Call' },
        { id: 'event3', summary: 'Partner Lunch' },
      ]);

      const result = await generateUserBriefing('user1', 'household1');

      expect(result?.partnerEventCount).toBe(3);
      // Scout uses warm partner framing
      expect(result?.message).toContain('Jane has 3 events');
    });

    it('includes insights in heads up section', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user1',
        phoneNumber: '+1234567890',
        phoneVerified: true,
        familyMember: {
          displayName: 'John Doe',
          calendars: [],
          household: {
            members: [],
            insights: [
              { title: 'School early release today', severity: 'warning' },
              { title: 'Soccer practice moved to 5pm', severity: 'info' },
            ],
          },
        },
      });

      const result = await generateUserBriefing('user1', 'household1');

      expect(result?.insightCount).toBe(2);
      // Scout uses friendly "Heads up:" with emoji
      expect(result?.message).toContain('Heads up:');
      expect(result?.message).toContain('School early release today');
      expect(result?.message).toContain('Soccer practice moved to 5pm');
    });

    it('limits events to 5 with overflow indicator', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user1',
        phoneNumber: '+1234567890',
        phoneVerified: true,
        familyMember: {
          displayName: 'John Doe',
          calendars: [
            { googleCalendarId: 'cal1', name: 'Primary', included: true },
          ],
          household: {
            members: [],
            insights: [],
          },
        },
      });

      mockFetchCalendar.mockResolvedValue(
        Array.from({ length: 8 }, (_, i) => ({
          id: `event${i}`,
          summary: `Event ${i + 1}`,
          start: { dateTime: `2024-12-30T${9 + i}:00:00` },
        }))
      );

      const result = await generateUserBriefing('user1', 'household1');

      expect(result?.eventCount).toBe(8);
      // Scout keeps it concise
      expect(result?.message).toContain('+3 more');
    });
  });

  describe('generateHouseholdBriefings', () => {
    it('returns error when household not found', async () => {
      mockPrisma.household.findUnique.mockResolvedValue(null);

      const result = await generateHouseholdBriefings('household1');

      expect(result.errors).toContain('Household not found');
      expect(result.briefings).toHaveLength(0);
    });

    it('generates briefings for all household members', async () => {
      mockPrisma.household.findUnique.mockResolvedValue({
        id: 'household1',
        members: [
          { userId: 'user1', user: { id: 'user1' } },
          { userId: 'user2', user: { id: 'user2' } },
        ],
      });

      mockPrisma.user.findUnique
        .mockResolvedValueOnce({
          id: 'user1',
          phoneNumber: '+1111111111',
          phoneVerified: true,
          familyMember: {
            displayName: 'John Doe',
            calendars: [],
            household: { members: [], insights: [] },
          },
        })
        .mockResolvedValueOnce({
          id: 'user2',
          phoneNumber: '+2222222222',
          phoneVerified: true,
          familyMember: {
            displayName: 'Jane Doe',
            calendars: [],
            household: { members: [], insights: [] },
          },
        });

      const result = await generateHouseholdBriefings('household1');

      expect(result.briefings).toHaveLength(2);
      expect(result.briefings[0].displayName).toBe('John Doe');
      expect(result.briefings[1].displayName).toBe('Jane Doe');
    });

    it('skips members without verified phones', async () => {
      mockPrisma.household.findUnique.mockResolvedValue({
        id: 'household1',
        members: [
          { userId: 'user1', user: { id: 'user1' } },
          { userId: 'user2', user: { id: 'user2' } },
        ],
      });

      mockPrisma.user.findUnique
        .mockResolvedValueOnce({
          id: 'user1',
          phoneNumber: '+1111111111',
          phoneVerified: true,
          familyMember: {
            displayName: 'John Doe',
            calendars: [],
            household: { members: [], insights: [] },
          },
        })
        .mockResolvedValueOnce({
          id: 'user2',
          phoneNumber: null,
          phoneVerified: false,
          familyMember: null,
        });

      const result = await generateHouseholdBriefings('household1');

      expect(result.briefings).toHaveLength(1);
      expect(result.briefings[0].displayName).toBe('John Doe');
    });
  });

  describe('generateAllBriefings', () => {
    it('processes all households with verified phones', async () => {
      mockPrisma.household.findMany.mockResolvedValue([
        { id: 'household1' },
        { id: 'household2' },
      ]);

      mockPrisma.household.findUnique
        .mockResolvedValueOnce({
          id: 'household1',
          members: [{ userId: 'user1', user: { id: 'user1' } }],
        })
        .mockResolvedValueOnce({
          id: 'household2',
          members: [{ userId: 'user2', user: { id: 'user2' } }],
        });

      mockPrisma.user.findUnique
        .mockResolvedValueOnce({
          id: 'user1',
          phoneNumber: '+1111111111',
          phoneVerified: true,
          familyMember: {
            displayName: 'User 1',
            calendars: [],
            household: { members: [], insights: [] },
          },
        })
        .mockResolvedValueOnce({
          id: 'user2',
          phoneNumber: '+2222222222',
          phoneVerified: true,
          familyMember: {
            displayName: 'User 2',
            calendars: [],
            household: { members: [], insights: [] },
          },
        });

      const result = await generateAllBriefings();

      expect(result.householdsProcessed).toBe(2);
      expect(result.briefingsGenerated).toBe(2);
      expect(result.errors).toHaveLength(0);
    });

    it('returns zero when no households have verified phones', async () => {
      mockPrisma.household.findMany.mockResolvedValue([]);

      const result = await generateAllBriefings();

      expect(result.householdsProcessed).toBe(0);
      expect(result.briefingsGenerated).toBe(0);
    });
  });

  describe('Time formatting', () => {
    it('uses morning greetings before noon', async () => {
      vi.setSystemTime(new Date('2024-12-30T08:00:00'));

      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user1',
        phoneNumber: '+1234567890',
        phoneVerified: true,
        familyMember: {
          displayName: 'John Doe',
          calendars: [],
          household: { members: [], insights: [] },
        },
      });

      const result = await generateUserBriefing('user1', 'household1');
      // Scout uses varied morning greetings with emoji
      expect(result?.message).toMatch(/(Good morning|Morning|Rise and shine)/);
    });

    it('uses afternoon greetings from noon to 5pm', async () => {
      vi.setSystemTime(new Date('2024-12-30T14:00:00'));

      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user1',
        phoneNumber: '+1234567890',
        phoneVerified: true,
        familyMember: {
          displayName: 'John Doe',
          calendars: [],
          household: { members: [], insights: [] },
        },
      });

      const result = await generateUserBriefing('user1', 'household1');
      // Scout uses varied afternoon greetings
      expect(result?.message).toMatch(/(afternoon|check-in)/i);
    });

    it('uses evening greetings after 5pm', async () => {
      vi.setSystemTime(new Date('2024-12-30T18:00:00'));

      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user1',
        phoneNumber: '+1234567890',
        phoneVerified: true,
        familyMember: {
          displayName: 'John Doe',
          calendars: [],
          household: { members: [], insights: [] },
        },
      });

      const result = await generateUserBriefing('user1', 'household1');
      // Scout uses varied evening greetings
      expect(result?.message).toMatch(/(Evening|what's ahead)/i);
    });
  });
});
