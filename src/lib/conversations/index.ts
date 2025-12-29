/**
 * Conversation helpers for Scout's unified memory system
 *
 * These functions manage conversations across SMS, Chat, and Ritual channels,
 * giving Scout persistent memory of all family interactions.
 */

import { prisma } from '@/lib/db';
import { getWeekKey } from '@/lib/ritual/weekKey';

export type ConversationChannel = 'sms' | 'chat' | 'ritual';
export type ConversationStatus = 'open' | 'resolved' | 'dismissed';
export type MessageRole = 'user' | 'assistant' | 'system';

export interface ToolCall {
  name: string;
  input: Record<string, unknown>;
  output?: unknown;
  status: 'pending' | 'approved' | 'rejected' | 'executed' | 'failed';
}

export interface MessageMetadata {
  // SMS-specific
  twilioSid?: string;
  from?: string;
  to?: string;
  // Chat-specific (future)
  clientTimestamp?: string;
}

/**
 * Get or create an open conversation for chat
 * For chat, we maintain one open conversation per user
 */
export async function getOrCreateChatConversation(
  userId: string,
  householdId: string
): Promise<string> {
  // Find existing open chat conversation
  const existing = await prisma.conversation.findFirst({
    where: {
      userId,
      householdId,
      channel: 'chat',
      status: 'open',
    },
    orderBy: { updatedAt: 'desc' },
  });

  if (existing) {
    return existing.id;
  }

  // Create new conversation
  const conversation = await prisma.conversation.create({
    data: {
      userId,
      householdId,
      channel: 'chat',
      status: 'open',
      weekKey: getWeekKey(),
    },
  });

  return conversation.id;
}

/**
 * Create a conversation for an SMS insight
 * Links the conversation to the insight for context
 */
export async function createSMSConversation(
  userId: string,
  householdId: string,
  insightId: string
): Promise<string> {
  const conversation = await prisma.conversation.create({
    data: {
      userId,
      householdId,
      channel: 'sms',
      status: 'open',
      weekKey: getWeekKey(),
      relatedInsightId: insightId,
    },
  });

  return conversation.id;
}

/**
 * Find conversation by related insight
 * Used when processing SMS replies
 */
export async function findConversationByInsight(
  insightId: string
): Promise<string | null> {
  const conversation = await prisma.conversation.findUnique({
    where: { relatedInsightId: insightId },
    select: { id: true },
  });

  return conversation?.id ?? null;
}

/**
 * Add a message to a conversation
 */
export async function addMessage(
  conversationId: string,
  role: MessageRole,
  content: string,
  channel: ConversationChannel,
  options?: {
    toolCalls?: ToolCall[];
    metadata?: MessageMetadata;
  }
): Promise<string> {
  const message = await prisma.message.create({
    data: {
      conversationId,
      role,
      content,
      channel,
      toolCalls: options?.toolCalls ? JSON.parse(JSON.stringify(options.toolCalls)) : null,
      metadata: options?.metadata ? JSON.parse(JSON.stringify(options.metadata)) : null,
    },
  });

  // Touch the conversation's updatedAt
  await prisma.conversation.update({
    where: { id: conversationId },
    data: { updatedAt: new Date() },
  });

  return message.id;
}

/**
 * Get messages for a conversation
 * Returns in chronological order
 */
export async function getConversationMessages(
  conversationId: string,
  limit = 50
): Promise<Array<{
  id: string;
  role: string;
  content: string;
  channel: string;
  toolCalls: ToolCall[] | null;
  createdAt: Date;
}>> {
  const messages = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: 'asc' },
    take: limit,
    select: {
      id: true,
      role: true,
      content: true,
      channel: true,
      toolCalls: true,
      createdAt: true,
    },
  });

  return messages.map((m: {
    id: string;
    role: string;
    content: string;
    channel: string;
    toolCalls: unknown;
    createdAt: Date;
  }) => ({
    ...m,
    toolCalls: m.toolCalls as ToolCall[] | null,
  }));
}

/**
 * Close a conversation (mark as resolved)
 */
export async function closeConversation(
  conversationId: string,
  status: 'resolved' | 'dismissed' = 'resolved'
): Promise<void> {
  await prisma.conversation.update({
    where: { id: conversationId },
    data: {
      status,
      closedAt: new Date(),
    },
  });
}

/**
 * Record a decision made during a conversation
 */
export async function recordDecision(
  conversationId: string,
  decisionType: string,
  decisionKey: string,
  decisionValue: string,
  reasoning?: string
): Promise<void> {
  await prisma.conversationDecision.create({
    data: {
      conversationId,
      decisionType,
      decisionKey,
      decisionValue,
      reasoning,
    },
  });
}

/**
 * Get recent conversations for a user (for activity feed)
 */
export async function getRecentConversations(
  householdId: string,
  options?: {
    channel?: ConversationChannel;
    status?: ConversationStatus | 'all';
    limit?: number;
    cursor?: string;
  }
): Promise<{
  conversations: Array<{
    id: string;
    channel: string;
    status: string;
    topic: string | null;
    createdAt: Date;
    updatedAt: Date;
    _count: { messages: number };
    messages: Array<{
      id: string;
      role: string;
      content: string;
      createdAt: Date;
    }>;
  }>;
  nextCursor?: string;
}> {
  const limit = options?.limit ?? 20;

  const where: Record<string, unknown> = { householdId };

  if (options?.channel) {
    where.channel = options.channel;
  }

  if (options?.status && options.status !== 'all') {
    where.status = options.status;
  }

  if (options?.cursor) {
    where.createdAt = { lt: new Date(options.cursor) };
  }

  const conversations = await prisma.conversation.findMany({
    where,
    orderBy: { updatedAt: 'desc' },
    take: limit + 1,
    select: {
      id: true,
      channel: true,
      status: true,
      topic: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { messages: true } },
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 2,
        select: {
          id: true,
          role: true,
          content: true,
          createdAt: true,
        },
      },
    },
  });

  const hasMore = conversations.length > limit;
  const items = hasMore ? conversations.slice(0, -1) : conversations;

  return {
    conversations: items.map((c: {
      id: string;
      channel: string;
      status: string;
      topic: string | null;
      createdAt: Date;
      updatedAt: Date;
      _count: { messages: number };
      messages: Array<{
        id: string;
        role: string;
        content: string;
        createdAt: Date;
      }>;
    }) => ({
      ...c,
      messages: [...c.messages].reverse(),
    })),
    nextCursor: hasMore ? items[items.length - 1].createdAt.toISOString() : undefined,
  };
}

/**
 * Get a single conversation with all messages
 */
export async function getConversationWithMessages(conversationId: string) {
  return prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      messages: {
        orderBy: { createdAt: 'asc' },
      },
      decisions: {
        orderBy: { createdAt: 'asc' },
      },
      relatedInsight: true,
    },
  });
}

/**
 * Update conversation topic (inferred by AI)
 */
export async function updateConversationTopic(
  conversationId: string,
  topic: string
): Promise<void> {
  await prisma.conversation.update({
    where: { id: conversationId },
    data: { topic },
  });
}
