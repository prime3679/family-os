/**
 * Agent Trust System
 *
 * Manages trust levels for different action types:
 * - Risk classification: Categorize actions by potential impact
 * - Trust scoring: Track success/failure rates per action type
 * - Auto-approve: Determine if actions can be auto-executed
 */

import { prisma } from '@/lib/db';

// Risk levels for actions
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

// Action categories
export type ActionCategory =
  | 'read'           // Query data, no side effects
  | 'write_internal' // Create/update internal data (tasks, insights)
  | 'write_calendar' // Modify Google Calendar
  | 'write_external' // Send notifications, emails
  | 'coordination';  // Actions affecting multiple people

// Known action types and their default classifications
const ACTION_CLASSIFICATIONS: Record<string, {
  category: ActionCategory;
  riskLevel: RiskLevel;
  description: string;
}> = {
  // Read operations (low risk)
  queryWeek: {
    category: 'read',
    riskLevel: 'low',
    description: 'Query calendar events for a week',
  },
  getConflicts: {
    category: 'read',
    riskLevel: 'low',
    description: 'Get scheduling conflicts',
  },

  // Internal write operations (low-medium risk)
  createTask: {
    category: 'write_internal',
    riskLevel: 'low',
    description: 'Create a new task',
  },
  markDone: {
    category: 'write_internal',
    riskLevel: 'low',
    description: 'Mark a task or insight as done',
  },

  // Calendar operations (medium risk)
  createEvent: {
    category: 'write_calendar',
    riskLevel: 'medium',
    description: 'Create a calendar event',
  },
  updateEvent: {
    category: 'write_calendar',
    riskLevel: 'medium',
    description: 'Update an existing calendar event',
  },
  deleteEvent: {
    category: 'write_calendar',
    riskLevel: 'high',
    description: 'Delete a calendar event',
  },

  // External communication (medium-high risk)
  notifyPartner: {
    category: 'write_external',
    riskLevel: 'medium',
    description: 'Send notification to partner',
  },
  draftEmail: {
    category: 'write_external',
    riskLevel: 'high',
    description: 'Draft an email to send',
  },
  sendEmail: {
    category: 'write_external',
    riskLevel: 'critical',
    description: 'Send an email externally',
  },

  // Coordination (medium-high risk)
  swapEvents: {
    category: 'coordination',
    riskLevel: 'medium',
    description: 'Swap responsibilities between parents',
  },
  requestSwap: {
    category: 'coordination',
    riskLevel: 'medium',
    description: 'Request a swap from partner',
  },
};

export interface ActionClassification {
  actionType: string;
  category: ActionCategory;
  riskLevel: RiskLevel;
  description: string;
  requiresApproval: boolean;
}

export interface TrustScore {
  actionType: string;
  successCount: number;
  failureCount: number;
  rejectCount: number;
  successRate: number;
  autoApprove: boolean;
  canAutoApprove: boolean; // Based on trust threshold
}

// Thresholds for auto-approval eligibility
const AUTO_APPROVE_THRESHOLDS = {
  low: { minSuccesses: 3, minSuccessRate: 0.9 },
  medium: { minSuccesses: 5, minSuccessRate: 0.95 },
  high: { minSuccesses: 10, minSuccessRate: 0.98 },
  critical: { minSuccesses: Infinity, minSuccessRate: 1.0 }, // Never auto-approve
};

/**
 * Classify an action by its risk level
 */
export function classifyRisk(actionType: string): ActionClassification {
  const classification = ACTION_CLASSIFICATIONS[actionType];

  if (classification) {
    return {
      actionType,
      ...classification,
      requiresApproval: classification.riskLevel !== 'low',
    };
  }

  // Unknown action - default to high risk requiring approval
  return {
    actionType,
    category: 'write_external',
    riskLevel: 'high',
    description: `Unknown action: ${actionType}`,
    requiresApproval: true,
  };
}

/**
 * Get trust score for an action type in a household
 */
export async function getTrust(
  householdId: string,
  actionType: string
): Promise<TrustScore> {
  const trust = await prisma.actionTrust.findUnique({
    where: {
      householdId_actionType: {
        householdId,
        actionType,
      },
    },
  });

  const successCount = trust?.successCount ?? 0;
  const failureCount = trust?.failureCount ?? 0;
  const rejectCount = trust?.rejectCount ?? 0;
  const total = successCount + failureCount + rejectCount;
  const successRate = total > 0 ? successCount / total : 0;

  const classification = classifyRisk(actionType);
  const threshold = AUTO_APPROVE_THRESHOLDS[classification.riskLevel];

  const canAutoApprove =
    successCount >= threshold.minSuccesses &&
    successRate >= threshold.minSuccessRate;

  return {
    actionType,
    successCount,
    failureCount,
    rejectCount,
    successRate,
    autoApprove: trust?.autoApprove ?? false,
    canAutoApprove,
  };
}

/**
 * Check if an action should be auto-approved
 */
export async function shouldAutoApprove(
  householdId: string,
  actionType: string
): Promise<{ autoApprove: boolean; reason: string }> {
  const classification = classifyRisk(actionType);

  // Critical actions never auto-approve
  if (classification.riskLevel === 'critical') {
    return { autoApprove: false, reason: 'Critical actions require explicit approval' };
  }

  // Low-risk read operations can always auto-execute
  if (classification.riskLevel === 'low' && classification.category === 'read') {
    return { autoApprove: true, reason: 'Read-only operation' };
  }

  const trust = await getTrust(householdId, actionType);

  // User has explicitly enabled auto-approve
  if (trust.autoApprove) {
    return { autoApprove: true, reason: 'User enabled auto-approve' };
  }

  // Trust threshold met
  if (trust.canAutoApprove) {
    return {
      autoApprove: false, // Still require approval until user enables
      reason: `Trust threshold met (${trust.successCount} successes, ${(trust.successRate * 100).toFixed(0)}% success rate). Enable auto-approve?`,
    };
  }

  return {
    autoApprove: false,
    reason: classification.requiresApproval
      ? `${classification.riskLevel} risk action requires approval`
      : 'Approval required',
  };
}

/**
 * Record an action outcome (for learning)
 */
export async function recordOutcome(
  householdId: string,
  actionType: string,
  outcome: 'success' | 'failure' | 'rejected'
): Promise<TrustScore> {
  const updateData: {
    successCount?: { increment: number };
    failureCount?: { increment: number };
    rejectCount?: { increment: number };
    lastUsedAt: Date;
  } = {
    lastUsedAt: new Date(),
  };

  switch (outcome) {
    case 'success':
      updateData.successCount = { increment: 1 };
      break;
    case 'failure':
      updateData.failureCount = { increment: 1 };
      break;
    case 'rejected':
      updateData.rejectCount = { increment: 1 };
      break;
  }

  await prisma.actionTrust.upsert({
    where: {
      householdId_actionType: {
        householdId,
        actionType,
      },
    },
    update: updateData,
    create: {
      householdId,
      actionType,
      successCount: outcome === 'success' ? 1 : 0,
      failureCount: outcome === 'failure' ? 1 : 0,
      rejectCount: outcome === 'rejected' ? 1 : 0,
      lastUsedAt: new Date(),
    },
  });

  return getTrust(householdId, actionType);
}

/**
 * Enable or disable auto-approve for an action type
 */
export async function setAutoApprove(
  householdId: string,
  actionType: string,
  enabled: boolean
): Promise<TrustScore> {
  await prisma.actionTrust.upsert({
    where: {
      householdId_actionType: {
        householdId,
        actionType,
      },
    },
    update: {
      autoApprove: enabled,
    },
    create: {
      householdId,
      actionType,
      autoApprove: enabled,
    },
  });

  return getTrust(householdId, actionType);
}

/**
 * Get all trust scores for a household
 */
export async function getAllTrust(householdId: string): Promise<TrustScore[]> {
  const allTrust = await prisma.actionTrust.findMany({
    where: { householdId },
  });

  return Promise.all(
    allTrust.map(t => getTrust(householdId, t.actionType))
  );
}

/**
 * Get suggestions for actions that could be auto-approved
 */
export async function getAutoApproveSuggestions(
  householdId: string
): Promise<TrustScore[]> {
  const allTrust = await getAllTrust(householdId);
  return allTrust.filter(t => t.canAutoApprove && !t.autoApprove);
}

/**
 * Reset trust for an action type (after changes)
 */
export async function resetTrust(
  householdId: string,
  actionType: string
): Promise<void> {
  await prisma.actionTrust.deleteMany({
    where: {
      householdId,
      actionType,
    },
  });
}
