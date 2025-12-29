import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock dependencies before importing the route
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    childProfile: {
      findFirst: vi.fn(),
    },
    task: {
      create: vi.fn(),
    },
    familyMember: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
    },
    partnerNudge: {
      create: vi.fn(),
    },
    notificationLog: {
      create: vi.fn(),
    },
    actionTrust: {
      upsert: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}));

vi.mock('@/lib/ritual/weekKey', () => ({
  getWeekKey: vi.fn(() => '2024-W52'),
}));

vi.mock('@/lib/calendar/write', () => ({
  createGoogleCalendarEvent: vi.fn().mockResolvedValue('event-123'),
}));

import { POST } from '../confirm/route';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

describe('POST /api/chat/confirm', () => {
  const mockAuth = auth as ReturnType<typeof vi.fn>;
  const mockPrisma = prisma as unknown as {
    user: { findUnique: ReturnType<typeof vi.fn> };
    childProfile: { findFirst: ReturnType<typeof vi.fn> };
    task: { create: ReturnType<typeof vi.fn> };
    familyMember: { findFirst: ReturnType<typeof vi.fn>; findUnique: ReturnType<typeof vi.fn> };
    partnerNudge: { create: ReturnType<typeof vi.fn> };
    notificationLog: { create: ReturnType<typeof vi.fn> };
    actionTrust: { upsert: ReturnType<typeof vi.fn>; findUnique: ReturnType<typeof vi.fn> };
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValueOnce(null);

    const request = new Request('http://localhost/api/chat/confirm', {
      method: 'POST',
      body: JSON.stringify({ action: 'createTask', data: { title: 'Test' } }),
    });

    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  it('returns 400 when user has no household', async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: 'user1' } });
    mockPrisma.user.findUnique.mockResolvedValueOnce({
      id: 'user1',
      householdId: null,
      household: null,
    });

    const request = new Request('http://localhost/api/chat/confirm', {
      method: 'POST',
      body: JSON.stringify({ action: 'createTask', data: { title: 'Test' } }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);

    const json = await response.json();
    expect(json.error).toBe('No household found');
  });

  describe('createTask action', () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue({ user: { id: 'user1' } });
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user1',
        householdId: 'household1',
        household: { id: 'household1' },
        familyMember: { role: 'parent_a' },
      });
    });

    it('creates a task successfully', async () => {
      const mockTask = {
        id: 'task1',
        title: 'Test Task',
        status: 'pending',
        priority: 'normal',
        assignedTo: 'both',
      };

      mockPrisma.task.create.mockResolvedValueOnce(mockTask);

      const request = new Request('http://localhost/api/chat/confirm', {
        method: 'POST',
        body: JSON.stringify({
          action: 'createTask',
          data: { title: 'Test Task' },
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);

      const json = await response.json();
      expect(json.success).toBe(true);
      expect(json.task).toEqual(mockTask);
      expect(json.message).toContain('Test Task');
    });

    it('creates task with child association', async () => {
      const mockChild = { id: 'child1', name: 'Emma' };
      const mockTask = {
        id: 'task1',
        title: 'Pack Emma bag',
        childId: 'child1',
        child: mockChild,
      };

      mockPrisma.childProfile.findFirst.mockResolvedValueOnce(mockChild);
      mockPrisma.task.create.mockResolvedValueOnce(mockTask);

      const request = new Request('http://localhost/api/chat/confirm', {
        method: 'POST',
        body: JSON.stringify({
          action: 'createTask',
          data: { title: 'Pack Emma bag', childName: 'Emma' },
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);

      expect(mockPrisma.childProfile.findFirst).toHaveBeenCalledWith({
        where: {
          householdId: 'household1',
          name: { contains: 'Emma', mode: 'insensitive' },
        },
      });

      const json = await response.json();
      expect(json.task.childId).toBe('child1');
    });

    it('creates task with priority and assignee', async () => {
      mockPrisma.task.create.mockResolvedValueOnce({
        id: 'task1',
        title: 'Urgent task',
        priority: 'high',
        assignedTo: 'parent_a',
      });

      const request = new Request('http://localhost/api/chat/confirm', {
        method: 'POST',
        body: JSON.stringify({
          action: 'createTask',
          data: {
            title: 'Urgent task',
            priority: 'high',
            assignedTo: 'parent_a',
          },
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);

      expect(mockPrisma.task.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            priority: 'high',
            assignedTo: 'parent_a',
          }),
        })
      );
    });
  });

  describe('createEvent action', () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue({ user: { id: 'user1' } });
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user1',
        householdId: 'household1',
        household: { id: 'household1' },
      });
      mockPrisma.familyMember.findUnique.mockResolvedValue({
        userId: 'user1',
        calendars: [{ googleCalendarId: 'calendar-123', name: 'Primary', included: true }],
      });
    });

    it('creates event on Google Calendar', async () => {
      const request = new Request('http://localhost/api/chat/confirm', {
        method: 'POST',
        body: JSON.stringify({
          action: 'createEvent',
          data: {
            title: 'Soccer practice',
            day: 'tue',
            time: '4:00 PM',
          },
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);

      const json = await response.json();
      expect(json.success).toBe(true);
      expect(json.message).toContain('Soccer practice');
    });

    it('returns 400 when no calendar connected', async () => {
      mockPrisma.familyMember.findUnique.mockResolvedValueOnce({
        userId: 'user1',
        calendars: [],
      });

      const request = new Request('http://localhost/api/chat/confirm', {
        method: 'POST',
        body: JSON.stringify({
          action: 'createEvent',
          data: {
            title: 'Soccer practice',
            day: 'tue',
            time: '4:00 PM',
          },
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);

      const json = await response.json();
      expect(json.error).toContain('calendar');
    });
  });

  describe('notifyPartner action', () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue({ user: { id: 'user1' } });
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user1',
        householdId: 'household1',
        household: { id: 'household1' },
      });
    });

    it('sends notification to partner', async () => {
      const mockPartner = {
        userId: 'user2',
        user: { id: 'user2', name: 'Partner' },
        role: 'parent_b',
      };

      mockPrisma.familyMember.findFirst.mockResolvedValueOnce(mockPartner);
      mockPrisma.partnerNudge.create.mockResolvedValueOnce({ id: 'nudge1' });
      mockPrisma.notificationLog.create.mockResolvedValueOnce({});

      const request = new Request('http://localhost/api/chat/confirm', {
        method: 'POST',
        body: JSON.stringify({
          action: 'notifyPartner',
          data: { message: "Running late!", urgent: false },
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);

      const json = await response.json();
      expect(json.success).toBe(true);
      expect(json.message).toContain('Partner');
    });

    it('returns 400 when no partner found', async () => {
      mockPrisma.familyMember.findFirst.mockResolvedValueOnce(null);

      const request = new Request('http://localhost/api/chat/confirm', {
        method: 'POST',
        body: JSON.stringify({
          action: 'notifyPartner',
          data: { message: "Running late!" },
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);

      const json = await response.json();
      expect(json.error).toBe('No partner found');
    });

    it('marks urgent messages appropriately', async () => {
      const mockPartner = {
        userId: 'user2',
        user: { id: 'user2', name: 'Partner' },
        role: 'parent_b',
      };

      mockPrisma.familyMember.findFirst.mockResolvedValueOnce(mockPartner);
      mockPrisma.partnerNudge.create.mockResolvedValueOnce({ id: 'nudge1' });
      mockPrisma.notificationLog.create.mockResolvedValueOnce({});

      const request = new Request('http://localhost/api/chat/confirm', {
        method: 'POST',
        body: JSON.stringify({
          action: 'notifyPartner',
          data: { message: "Emergency!", urgent: true },
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);

      expect(mockPrisma.partnerNudge.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            message: expect.stringContaining('[URGENT]'),
          }),
        })
      );
    });
  });

  describe('swapEvents action', () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue({ user: { id: 'user1' } });
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user1',
        householdId: 'household1',
        household: { id: 'household1' },
      });
    });

    it('creates swap proposal', async () => {
      const mockPartner = {
        userId: 'user2',
        user: { id: 'user2', name: 'Partner' },
        role: 'parent_b',
      };

      mockPrisma.familyMember.findFirst.mockResolvedValueOnce(mockPartner);
      mockPrisma.partnerNudge.create.mockResolvedValueOnce({ id: 'nudge1' });
      mockPrisma.notificationLog.create.mockResolvedValueOnce({});

      const request = new Request('http://localhost/api/chat/confirm', {
        method: 'POST',
        body: JSON.stringify({
          action: 'swapEvents',
          data: {
            day1: 'mon',
            day2: 'wed',
            eventDescription: 'School pickup',
          },
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);

      const json = await response.json();
      expect(json.success).toBe(true);
      expect(json.message).toContain('mon');
      expect(json.message).toContain('wed');
    });
  });

  it('returns 400 for unknown action', async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: 'user1' } });
    mockPrisma.user.findUnique.mockResolvedValueOnce({
      id: 'user1',
      householdId: 'household1',
      household: { id: 'household1' },
    });

    const request = new Request('http://localhost/api/chat/confirm', {
      method: 'POST',
      body: JSON.stringify({
        action: 'unknownAction',
        data: {},
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);

    const json = await response.json();
    expect(json.error).toBe('Unknown action');
  });
});
