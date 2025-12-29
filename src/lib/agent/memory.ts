/**
 * Agent Memory System
 *
 * Provides persistent memory for the FamilyOS agent:
 * - Preferences: User-stated or inferred preferences
 * - Patterns: Recurring behaviors detected over time
 * - Feedback: User reactions to agent actions
 * - Context: Short-term conversation/session context
 */

import { prisma } from '@/lib/db';
import type { Prisma } from '@prisma/client';

// Memory types
export type MemoryType = 'preference' | 'pattern' | 'feedback' | 'context';

// Sources of memory
export type MemorySource =
  | 'user_explicit'    // User directly told us
  | 'inferred'         // We figured it out from behavior
  | 'action_outcome'   // Learned from action results
  | 'conversation';    // From chat context

export interface MemoryValue {
  [key: string]: unknown;
}

export interface Memory {
  id: string;
  type: MemoryType;
  key: string;
  value: MemoryValue;
  confidence: number;
  source: MemorySource;
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface RememberOptions {
  confidence?: number;
  source?: MemorySource;
  expiresIn?: number; // milliseconds
}

/**
 * Store a memory for a household
 */
export async function remember(
  householdId: string,
  type: MemoryType,
  key: string,
  value: MemoryValue,
  options: RememberOptions = {}
): Promise<Memory> {
  const {
    confidence = 1.0,
    source = 'inferred',
    expiresIn,
  } = options;

  const expiresAt = expiresIn ? new Date(Date.now() + expiresIn) : null;

  const memory = await prisma.agentMemory.upsert({
    where: {
      householdId_type_key: {
        householdId,
        type,
        key,
      },
    },
    update: {
      value: value as Prisma.JsonObject,
      confidence,
      source,
      expiresAt,
    },
    create: {
      householdId,
      type,
      key,
      value: value as Prisma.JsonObject,
      confidence,
      source,
      expiresAt,
    },
  });

  return {
    ...memory,
    type: memory.type as MemoryType,
    value: memory.value as MemoryValue,
    source: memory.source as MemorySource,
  };
}

/**
 * Recall memories for a household
 */
export async function recall(
  householdId: string,
  options: {
    type?: MemoryType;
    key?: string;
    minConfidence?: number;
    includeExpired?: boolean;
  } = {}
): Promise<Memory[]> {
  const {
    type,
    key,
    minConfidence = 0,
    includeExpired = false,
  } = options;

  const where: Prisma.AgentMemoryWhereInput = {
    householdId,
    confidence: { gte: minConfidence },
  };

  if (type) {
    where.type = type;
  }

  if (key) {
    where.key = key;
  }

  if (!includeExpired) {
    where.OR = [
      { expiresAt: null },
      { expiresAt: { gt: new Date() } },
    ];
  }

  const memories = await prisma.agentMemory.findMany({
    where,
    orderBy: [
      { confidence: 'desc' },
      { updatedAt: 'desc' },
    ],
  });

  return memories.map(m => ({
    ...m,
    type: m.type as MemoryType,
    value: m.value as MemoryValue,
    source: m.source as MemorySource,
  }));
}

/**
 * Recall a single memory by key
 */
export async function recallOne(
  householdId: string,
  type: MemoryType,
  key: string
): Promise<Memory | null> {
  const memory = await prisma.agentMemory.findUnique({
    where: {
      householdId_type_key: {
        householdId,
        type,
        key,
      },
    },
  });

  if (!memory) return null;

  // Check expiration
  if (memory.expiresAt && memory.expiresAt < new Date()) {
    return null;
  }

  return {
    ...memory,
    type: memory.type as MemoryType,
    value: memory.value as MemoryValue,
    source: memory.source as MemorySource,
  };
}

/**
 * Forget a specific memory
 */
export async function forget(
  householdId: string,
  type: MemoryType,
  key: string
): Promise<boolean> {
  try {
    await prisma.agentMemory.delete({
      where: {
        householdId_type_key: {
          householdId,
          type,
          key,
        },
      },
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Forget all memories of a type
 */
export async function forgetAll(
  householdId: string,
  type?: MemoryType
): Promise<number> {
  const result = await prisma.agentMemory.deleteMany({
    where: {
      householdId,
      ...(type && { type }),
    },
  });
  return result.count;
}

/**
 * Adjust confidence of a memory (for learning)
 */
export async function adjustConfidence(
  householdId: string,
  type: MemoryType,
  key: string,
  delta: number
): Promise<Memory | null> {
  const existing = await recallOne(householdId, type, key);
  if (!existing) return null;

  const newConfidence = Math.max(0, Math.min(1, existing.confidence + delta));

  // If confidence drops too low, forget it
  if (newConfidence < 0.1) {
    await forget(householdId, type, key);
    return null;
  }

  const updated = await prisma.agentMemory.update({
    where: {
      householdId_type_key: {
        householdId,
        type,
        key,
      },
    },
    data: {
      confidence: newConfidence,
    },
  });

  return {
    ...updated,
    type: updated.type as MemoryType,
    value: updated.value as MemoryValue,
    source: updated.source as MemorySource,
  };
}

/**
 * Clean up expired memories (call periodically)
 */
export async function cleanupExpired(): Promise<number> {
  const result = await prisma.agentMemory.deleteMany({
    where: {
      expiresAt: {
        lt: new Date(),
      },
    },
  });
  return result.count;
}

/**
 * Get memory summary for a household (for chat context)
 */
export async function getMemorySummary(householdId: string): Promise<{
  preferences: Memory[];
  patterns: Memory[];
  recentFeedback: Memory[];
}> {
  const [preferences, patterns, recentFeedback] = await Promise.all([
    recall(householdId, { type: 'preference', minConfidence: 0.5 }),
    recall(householdId, { type: 'pattern', minConfidence: 0.7 }),
    prisma.agentMemory.findMany({
      where: {
        householdId,
        type: 'feedback',
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
  ]);

  return {
    preferences,
    patterns,
    recentFeedback: recentFeedback.map(m => ({
      ...m,
      type: m.type as MemoryType,
      value: m.value as MemoryValue,
      source: m.source as MemorySource,
    })),
  };
}

// ============================================================================
// Convenience functions for common memory operations
// ============================================================================

/**
 * Remember a user preference
 */
export async function rememberPreference(
  householdId: string,
  key: string,
  value: MemoryValue,
  source: MemorySource = 'user_explicit'
): Promise<Memory> {
  return remember(householdId, 'preference', key, value, {
    confidence: source === 'user_explicit' ? 1.0 : 0.8,
    source,
  });
}

/**
 * Remember a detected pattern
 */
export async function rememberPattern(
  householdId: string,
  key: string,
  value: MemoryValue,
  confidence: number = 0.7
): Promise<Memory> {
  return remember(householdId, 'pattern', key, value, {
    confidence,
    source: 'inferred',
  });
}

/**
 * Record user feedback on an action
 */
export async function recordFeedback(
  householdId: string,
  actionType: string,
  outcome: 'approved' | 'rejected' | 'succeeded' | 'failed',
  details?: MemoryValue
): Promise<Memory> {
  const key = `${actionType}_${Date.now()}`;
  return remember(householdId, 'feedback', key, {
    actionType,
    outcome,
    ...details,
  }, {
    source: 'action_outcome',
    expiresIn: 30 * 24 * 60 * 60 * 1000, // 30 days
  });
}

/**
 * Store conversation context (short-term)
 */
export async function storeContext(
  householdId: string,
  key: string,
  value: MemoryValue
): Promise<Memory> {
  return remember(householdId, 'context', key, value, {
    source: 'conversation',
    expiresIn: 60 * 60 * 1000, // 1 hour
  });
}
