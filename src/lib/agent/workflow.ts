/**
 * Agent Workflow System
 *
 * Manages pending actions and their lifecycle:
 * - Create pending actions for approval
 * - Approve, reject, or expire actions
 * - Execute approved actions
 * - Track outcomes for learning
 */

import { prisma } from '@/lib/db';
import type { Prisma } from '@prisma/client';
import { classifyRisk, recordOutcome, type RiskLevel } from './trust';

// Action statuses
export type ActionStatus =
  | 'pending'   // Waiting for approval
  | 'approved'  // User approved, ready to execute
  | 'rejected'  // User rejected
  | 'executed'  // Successfully executed
  | 'failed'    // Execution failed
  | 'expired';  // Timed out

export interface PendingActionData {
  [key: string]: unknown;
}

export interface PendingAction {
  id: string;
  householdId: string;
  userId: string;
  actionType: string;
  actionData: PendingActionData;
  status: ActionStatus;
  riskLevel: RiskLevel;
  reason: string | null;
  expiresAt: Date;
  executedAt: Date | null;
  outcome: PendingActionData | null;
  createdAt: Date;
  updatedAt: Date;
}

// Default expiration times by risk level (milliseconds)
const DEFAULT_EXPIRATION: Record<RiskLevel, number> = {
  low: 1 * 60 * 60 * 1000,      // 1 hour
  medium: 24 * 60 * 60 * 1000,  // 24 hours
  high: 7 * 24 * 60 * 60 * 1000, // 7 days
  critical: 24 * 60 * 60 * 1000, // 24 hours
};

/**
 * Create a pending action for approval
 */
export async function createPendingAction(
  householdId: string,
  userId: string,
  actionType: string,
  actionData: PendingActionData,
  options: {
    reason?: string;
    expiresIn?: number;
  } = {}
): Promise<PendingAction> {
  const classification = classifyRisk(actionType);
  const expiresIn = options.expiresIn ?? DEFAULT_EXPIRATION[classification.riskLevel];

  const action = await prisma.pendingAction.create({
    data: {
      householdId,
      userId,
      actionType,
      actionData: actionData as Prisma.JsonObject,
      riskLevel: classification.riskLevel,
      reason: options.reason,
      expiresAt: new Date(Date.now() + expiresIn),
    },
  });

  return mapToPendingAction(action);
}

/**
 * Get a pending action by ID
 */
export async function getPendingAction(
  actionId: string
): Promise<PendingAction | null> {
  const action = await prisma.pendingAction.findUnique({
    where: { id: actionId },
  });

  if (!action) return null;
  return mapToPendingAction(action);
}

/**
 * Get all pending actions for a household
 */
export async function getPendingActions(
  householdId: string,
  options: {
    status?: ActionStatus;
    includeExpired?: boolean;
  } = {}
): Promise<PendingAction[]> {
  const { status, includeExpired = false } = options;

  const where: Prisma.PendingActionWhereInput = {
    householdId,
  };

  if (status) {
    where.status = status;
  }

  if (!includeExpired) {
    where.OR = [
      { status: { not: 'pending' } }, // Non-pending are not expired
      { expiresAt: { gt: new Date() } }, // Pending and not expired
    ];
  }

  const actions = await prisma.pendingAction.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });

  return actions.map(mapToPendingAction);
}

/**
 * Get pending actions for a specific user
 */
export async function getUserPendingActions(
  userId: string
): Promise<PendingAction[]> {
  const actions = await prisma.pendingAction.findMany({
    where: {
      userId,
      status: 'pending',
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: 'desc' },
  });

  return actions.map(mapToPendingAction);
}

/**
 * Approve a pending action
 */
export async function approveAction(
  actionId: string
): Promise<PendingAction | null> {
  const action = await prisma.pendingAction.findUnique({
    where: { id: actionId },
  });

  if (!action || action.status !== 'pending') {
    return null;
  }

  // Check if expired
  if (action.expiresAt < new Date()) {
    await prisma.pendingAction.update({
      where: { id: actionId },
      data: { status: 'expired' },
    });
    return null;
  }

  const updated = await prisma.pendingAction.update({
    where: { id: actionId },
    data: { status: 'approved' },
  });

  return mapToPendingAction(updated);
}

/**
 * Reject a pending action
 */
export async function rejectAction(
  actionId: string,
  reason?: string
): Promise<PendingAction | null> {
  const action = await prisma.pendingAction.findUnique({
    where: { id: actionId },
  });

  if (!action || action.status !== 'pending') {
    return null;
  }

  const updated = await prisma.pendingAction.update({
    where: { id: actionId },
    data: {
      status: 'rejected',
      outcome: reason ? { rejectionReason: reason } : undefined,
    },
  });

  // Record rejection for learning
  await recordOutcome(action.householdId, action.actionType, 'rejected');

  return mapToPendingAction(updated);
}

/**
 * Mark an action as executed with outcome
 */
export async function markExecuted(
  actionId: string,
  outcome: PendingActionData
): Promise<PendingAction | null> {
  const action = await prisma.pendingAction.findUnique({
    where: { id: actionId },
  });

  if (!action) return null;

  const updated = await prisma.pendingAction.update({
    where: { id: actionId },
    data: {
      status: 'executed',
      executedAt: new Date(),
      outcome: outcome as Prisma.JsonObject,
    },
  });

  // Record success for learning
  await recordOutcome(action.householdId, action.actionType, 'success');

  return mapToPendingAction(updated);
}

/**
 * Mark an action as failed
 */
export async function markFailed(
  actionId: string,
  error: string
): Promise<PendingAction | null> {
  const action = await prisma.pendingAction.findUnique({
    where: { id: actionId },
  });

  if (!action) return null;

  const updated = await prisma.pendingAction.update({
    where: { id: actionId },
    data: {
      status: 'failed',
      outcome: { error },
    },
  });

  // Record failure for learning
  await recordOutcome(action.householdId, action.actionType, 'failure');

  return mapToPendingAction(updated);
}

/**
 * Expire old pending actions (run periodically)
 */
export async function expireOldActions(): Promise<number> {
  const result = await prisma.pendingAction.updateMany({
    where: {
      status: 'pending',
      expiresAt: { lt: new Date() },
    },
    data: {
      status: 'expired',
    },
  });

  return result.count;
}

/**
 * Clean up old completed/failed/expired actions (run periodically)
 */
export async function cleanupOldActions(
  olderThanDays: number = 30
): Promise<number> {
  const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);

  const result = await prisma.pendingAction.deleteMany({
    where: {
      status: { in: ['executed', 'failed', 'expired', 'rejected'] },
      updatedAt: { lt: cutoff },
    },
  });

  return result.count;
}

/**
 * Get action history for analytics
 */
export async function getActionHistory(
  householdId: string,
  options: {
    actionType?: string;
    days?: number;
    limit?: number;
  } = {}
): Promise<PendingAction[]> {
  const { actionType, days = 30, limit = 100 } = options;

  const where: Prisma.PendingActionWhereInput = {
    householdId,
    createdAt: {
      gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000),
    },
  };

  if (actionType) {
    where.actionType = actionType;
  }

  const actions = await prisma.pendingAction.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  return actions.map(mapToPendingAction);
}

/**
 * Get action statistics for a household
 */
export async function getActionStats(
  householdId: string,
  days: number = 30
): Promise<{
  total: number;
  pending: number;
  executed: number;
  failed: number;
  rejected: number;
  expired: number;
  byType: Record<string, number>;
}> {
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const actions = await prisma.pendingAction.findMany({
    where: {
      householdId,
      createdAt: { gte: cutoff },
    },
    select: {
      status: true,
      actionType: true,
    },
  });

  const stats = {
    total: actions.length,
    pending: 0,
    executed: 0,
    failed: 0,
    rejected: 0,
    expired: 0,
    byType: {} as Record<string, number>,
  };

  for (const action of actions) {
    // Count by status
    switch (action.status) {
      case 'pending':
        stats.pending++;
        break;
      case 'executed':
        stats.executed++;
        break;
      case 'failed':
        stats.failed++;
        break;
      case 'rejected':
        stats.rejected++;
        break;
      case 'expired':
        stats.expired++;
        break;
    }

    // Count by type
    stats.byType[action.actionType] = (stats.byType[action.actionType] || 0) + 1;
  }

  return stats;
}

// ============================================================================
// Helper functions
// ============================================================================

function mapToPendingAction(action: {
  id: string;
  householdId: string;
  userId: string;
  actionType: string;
  actionData: Prisma.JsonValue;
  status: string;
  riskLevel: string;
  reason: string | null;
  expiresAt: Date;
  executedAt: Date | null;
  outcome: Prisma.JsonValue;
  createdAt: Date;
  updatedAt: Date;
}): PendingAction {
  return {
    ...action,
    status: action.status as ActionStatus,
    riskLevel: action.riskLevel as RiskLevel,
    actionData: action.actionData as PendingActionData,
    outcome: action.outcome as PendingActionData | null,
  };
}
