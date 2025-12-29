/**
 * Intelligence Cron Tests
 *
 * Tests the morning routine cron job that sends daily briefings,
 * processes emails, and runs intelligence analysis.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock all dependencies before imports
vi.mock('@/lib/db', () => ({
  prisma: {
    household: {
      findMany: vi.fn(),
    },
    account: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock('@/lib/intelligence', () => ({
  analyzeAllHouseholds: vi.fn(),
  generateHouseholdBriefings: vi.fn(),
}));

vi.mock('@/lib/calendar/webhook', () => ({
  renewExpiringChannels: vi.fn(),
}));

vi.mock('@/lib/sms', () => ({
  sendSMS: vi.fn(),
}));

vi.mock('@/lib/notifications/push/send', () => ({
  sendDailyBriefingPush: vi.fn(),
}));

vi.mock('@/lib/gmail/client', () => ({
  listMessages: vi.fn(),
}));

vi.mock('@/lib/gmail/classifier', () => ({
  classifyEmails: vi.fn(),
  quickRelevanceCheck: vi.fn(),
}));

vi.mock('@/lib/intelligence/email-patterns', () => ({
  processEmailsToInsights: vi.fn(),
}));

import { GET, POST } from '../intelligence/route';
import { prisma } from '@/lib/db';
import { analyzeAllHouseholds, generateHouseholdBriefings } from '@/lib/intelligence';
import { renewExpiringChannels } from '@/lib/calendar/webhook';
import { sendSMS } from '@/lib/sms';
import { sendDailyBriefingPush } from '@/lib/notifications/push/send';
import { listMessages } from '@/lib/gmail/client';
import { classifyEmails, quickRelevanceCheck } from '@/lib/gmail/classifier';
import { processEmailsToInsights } from '@/lib/intelligence/email-patterns';

// Get typed mock references
const mockPrisma = prisma as unknown as {
  household: { findMany: ReturnType<typeof vi.fn> };
  account: { findMany: ReturnType<typeof vi.fn> };
};
const mockAnalyzeAll = analyzeAllHouseholds as ReturnType<typeof vi.fn>;
const mockGenerateBriefings = generateHouseholdBriefings as ReturnType<typeof vi.fn>;
const mockRenewChannels = renewExpiringChannels as ReturnType<typeof vi.fn>;
const mockSendSMS = sendSMS as ReturnType<typeof vi.fn>;
const mockSendPush = sendDailyBriefingPush as ReturnType<typeof vi.fn>;
const mockListMessages = listMessages as ReturnType<typeof vi.fn>;
const mockClassifyEmails = classifyEmails as ReturnType<typeof vi.fn>;
const mockQuickRelevance = quickRelevanceCheck as ReturnType<typeof vi.fn>;
const mockProcessEmails = processEmailsToInsights as ReturnType<typeof vi.fn>;

describe('Intelligence Cron', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Authentication', () => {
    it('returns 401 when CRON_SECRET is set and auth header is missing', async () => {
      process.env.CRON_SECRET = 'test-secret';

      const request = new Request('http://localhost/api/cron/intelligence', {
        method: 'GET',
      });

      const response = await GET(request as any);

      expect(response.status).toBe(401);
      const json = await response.json();
      expect(json.error).toBe('Unauthorized');
    });

    it('returns 401 when CRON_SECRET is set and auth header is wrong', async () => {
      process.env.CRON_SECRET = 'test-secret';

      const request = new Request('http://localhost/api/cron/intelligence', {
        method: 'GET',
        headers: { authorization: 'Bearer wrong-secret' },
      });

      const response = await GET(request as any);

      expect(response.status).toBe(401);
    });

    it('allows request when CRON_SECRET matches', async () => {
      process.env.CRON_SECRET = 'test-secret';

      // Set up minimal mocks for successful execution
      mockPrisma.household.findMany.mockResolvedValue([]);
      mockPrisma.account.findMany.mockResolvedValue([]);
      mockRenewChannels.mockResolvedValue({ renewed: 0, errors: [] });
      mockAnalyzeAll.mockResolvedValue([]);

      const request = new Request('http://localhost/api/cron/intelligence', {
        method: 'GET',
        headers: { authorization: 'Bearer test-secret' },
      });

      const response = await GET(request as any);

      expect(response.status).toBe(200);
    });

    it('allows request when CRON_SECRET is not set', async () => {
      delete process.env.CRON_SECRET;

      mockPrisma.household.findMany.mockResolvedValue([]);
      mockPrisma.account.findMany.mockResolvedValue([]);
      mockRenewChannels.mockResolvedValue({ renewed: 0, errors: [] });
      mockAnalyzeAll.mockResolvedValue([]);

      const request = new Request('http://localhost/api/cron/intelligence', {
        method: 'GET',
      });

      const response = await GET(request as any);

      expect(response.status).toBe(200);
    });
  });

  describe('Daily Briefings', () => {
    beforeEach(() => {
      delete process.env.CRON_SECRET;
      mockPrisma.account.findMany.mockResolvedValue([]);
      mockRenewChannels.mockResolvedValue({ renewed: 0, errors: [] });
      mockAnalyzeAll.mockResolvedValue([]);
    });

    it('sends SMS and push notifications for each briefing', async () => {
      mockPrisma.household.findMany.mockResolvedValue([{ id: 'household1' }]);

      mockGenerateBriefings.mockResolvedValue({
        householdId: 'household1',
        briefings: [
          {
            userId: 'user1',
            displayName: 'John Doe',
            phoneNumber: '+1234567890',
            message: 'Good morning!',
            eventCount: 3,
          },
        ],
        errors: [],
      });

      mockSendSMS.mockResolvedValue({ success: true });
      mockSendPush.mockResolvedValue({ success: true });

      const request = new Request('http://localhost/api/cron/intelligence');
      const response = await GET(request as any);

      expect(response.status).toBe(200);
      const json = await response.json();

      expect(json.briefingsSent).toBe(1);
      expect(json.briefingPushSent).toBe(1);
      expect(mockSendSMS).toHaveBeenCalledWith({
        to: '+1234567890',
        body: 'Good morning!',
      });
    });

    it('tracks SMS errors', async () => {
      mockPrisma.household.findMany.mockResolvedValue([{ id: 'household1' }]);

      mockGenerateBriefings.mockResolvedValue({
        householdId: 'household1',
        briefings: [
          {
            userId: 'user1',
            displayName: 'John Doe',
            phoneNumber: '+1234567890',
            message: 'Good morning!',
            eventCount: 3,
          },
        ],
        errors: [],
      });

      mockSendSMS.mockResolvedValue({ success: false, error: 'SMS failed' });
      mockSendPush.mockResolvedValue({ success: false });

      const request = new Request('http://localhost/api/cron/intelligence');
      const response = await GET(request as any);

      const json = await response.json();

      expect(json.briefingsSent).toBe(0);
      expect(json.briefingErrors).toContain('SMS to John Doe failed: SMS failed');
    });

    it('processes multiple households', async () => {
      mockPrisma.household.findMany.mockResolvedValue([
        { id: 'household1' },
        { id: 'household2' },
      ]);

      mockGenerateBriefings
        .mockResolvedValueOnce({
          householdId: 'household1',
          briefings: [
            {
              userId: 'user1',
              displayName: 'User 1',
              phoneNumber: '+1111111111',
              message: 'Morning 1',
              eventCount: 1,
            },
          ],
          errors: [],
        })
        .mockResolvedValueOnce({
          householdId: 'household2',
          briefings: [
            {
              userId: 'user2',
              displayName: 'User 2',
              phoneNumber: '+2222222222',
              message: 'Morning 2',
              eventCount: 2,
            },
          ],
          errors: [],
        });

      mockSendSMS.mockResolvedValue({ success: true });
      mockSendPush.mockResolvedValue({ success: true });

      const request = new Request('http://localhost/api/cron/intelligence');
      const response = await GET(request as any);

      const json = await response.json();

      expect(json.briefingsSent).toBe(2);
      expect(mockSendSMS).toHaveBeenCalledTimes(2);
    });
  });

  describe('Email Processing', () => {
    beforeEach(() => {
      delete process.env.CRON_SECRET;
      mockPrisma.household.findMany.mockResolvedValue([]);
      mockRenewChannels.mockResolvedValue({ renewed: 0, errors: [] });
      mockAnalyzeAll.mockResolvedValue([]);
    });

    it('processes emails for users with Gmail connected', async () => {
      mockPrisma.account.findMany.mockResolvedValue([
        {
          userId: 'user1',
          provider: 'google',
          access_token: 'token',
          user: {
            id: 'user1',
            familyMember: {
              householdId: 'household1',
              household: {
                children: [{ name: 'Emma' }, { name: 'Jack' }],
              },
            },
          },
        },
      ]);

      const mockEmails = [
        { id: 'email1', subject: 'School Update', snippet: 'Emma...' },
        { id: 'email2', subject: 'Soccer Practice', snippet: 'Schedule change' },
      ];

      mockListMessages.mockResolvedValue({ messages: mockEmails });
      mockQuickRelevance.mockReturnValue(true);
      mockClassifyEmails.mockResolvedValue([
        { category: 'school', childName: 'Emma' },
        { category: 'activity', childName: null },
      ]);
      mockProcessEmails.mockResolvedValue(2);

      const request = new Request('http://localhost/api/cron/intelligence');
      const response = await GET(request as any);

      const json = await response.json();

      expect(json.emailsProcessed).toBe(2);
      expect(json.emailInsightsCreated).toBe(2);
      expect(mockClassifyEmails).toHaveBeenCalledWith(mockEmails, {
        childrenNames: ['Emma', 'Jack'],
      });
    });

    it('skips users without household', async () => {
      mockPrisma.account.findMany.mockResolvedValue([
        {
          userId: 'user1',
          provider: 'google',
          access_token: 'token',
          user: {
            id: 'user1',
            familyMember: null,
          },
        },
      ]);

      const request = new Request('http://localhost/api/cron/intelligence');
      const response = await GET(request as any);

      const json = await response.json();

      expect(json.emailsProcessed).toBe(0);
      expect(mockListMessages).not.toHaveBeenCalled();
    });

    it('filters irrelevant emails', async () => {
      mockPrisma.account.findMany.mockResolvedValue([
        {
          userId: 'user1',
          provider: 'google',
          access_token: 'token',
          user: {
            id: 'user1',
            familyMember: {
              householdId: 'household1',
              household: { children: [] },
            },
          },
        },
      ]);

      mockListMessages.mockResolvedValue({
        messages: [
          { id: 'email1', subject: 'Sale!' },
          { id: 'email2', subject: 'School Notice' },
        ],
      });

      // Only second email is relevant
      mockQuickRelevance.mockImplementation((email: { subject: string }) =>
        email.subject.includes('School')
      );
      mockClassifyEmails.mockResolvedValue([{ category: 'school' }]);
      mockProcessEmails.mockResolvedValue(1);

      const request = new Request('http://localhost/api/cron/intelligence');
      const response = await GET(request as any);

      const json = await response.json();

      expect(json.emailsProcessed).toBe(1);
    });
  });

  describe('Channel Renewal', () => {
    beforeEach(() => {
      delete process.env.CRON_SECRET;
      mockPrisma.household.findMany.mockResolvedValue([]);
      mockPrisma.account.findMany.mockResolvedValue([]);
      mockAnalyzeAll.mockResolvedValue([]);
    });

    it('reports renewed channels', async () => {
      mockRenewChannels.mockResolvedValue({ renewed: 5, errors: [] });

      const request = new Request('http://localhost/api/cron/intelligence');
      const response = await GET(request as any);

      const json = await response.json();

      expect(json.channelsRenewed).toBe(5);
      expect(json.channelErrors).toHaveLength(0);
    });

    it('reports channel renewal errors', async () => {
      mockRenewChannels.mockResolvedValue({
        renewed: 2,
        errors: ['Channel 1 failed', 'Channel 2 failed'],
      });

      const request = new Request('http://localhost/api/cron/intelligence');
      const response = await GET(request as any);

      const json = await response.json();

      expect(json.channelsRenewed).toBe(2);
      expect(json.channelErrors).toHaveLength(2);
    });
  });

  describe('Intelligence Analysis', () => {
    beforeEach(() => {
      delete process.env.CRON_SECRET;
      mockPrisma.household.findMany.mockResolvedValue([]);
      mockPrisma.account.findMany.mockResolvedValue([]);
      mockRenewChannels.mockResolvedValue({ renewed: 0, errors: [] });
    });

    it('aggregates household analysis results', async () => {
      mockAnalyzeAll.mockResolvedValue([
        { householdId: 'h1', insightsGenerated: 3, insightsSent: 2, errors: [] },
        { householdId: 'h2', insightsGenerated: 5, insightsSent: 4, errors: ['Warning'] },
      ]);

      const request = new Request('http://localhost/api/cron/intelligence');
      const response = await GET(request as any);

      const json = await response.json();

      expect(json.success).toBe(true);
      expect(json.householdsAnalyzed).toBe(2);
      expect(json.totalInsightsGenerated).toBe(8);
      expect(json.totalInsightsSent).toBe(6);
      expect(json.analysisErrors).toContain('Warning');
    });

    it('returns 500 when analysis fails', async () => {
      mockAnalyzeAll.mockRejectedValue(new Error('Analysis failed'));

      const request = new Request('http://localhost/api/cron/intelligence');
      const response = await GET(request as any);

      expect(response.status).toBe(500);

      const json = await response.json();
      expect(json.success).toBe(false);
      expect(json.error).toBe('Analysis failed');
    });
  });

  describe('POST endpoint', () => {
    it('delegates to GET handler', async () => {
      delete process.env.CRON_SECRET;
      mockPrisma.household.findMany.mockResolvedValue([]);
      mockPrisma.account.findMany.mockResolvedValue([]);
      mockRenewChannels.mockResolvedValue({ renewed: 0, errors: [] });
      mockAnalyzeAll.mockResolvedValue([]);

      const request = new Request('http://localhost/api/cron/intelligence', {
        method: 'POST',
      });

      const response = await POST(request as any);

      expect(response.status).toBe(200);
    });
  });
});
