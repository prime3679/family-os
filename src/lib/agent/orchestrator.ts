/**
 * Agent Orchestrator
 *
 * The main API for the FamilyOS agent. Coordinates between:
 * - Memory: What the agent knows about this household
 * - Trust: What actions can be auto-approved
 * - Workflow: Pending actions awaiting approval
 *
 * Provides a unified interface for:
 * - Getting context for chat prompts
 * - Processing tool calls (auto-execute or queue for approval)
 * - Handling action confirmations
 */

import { getMemorySummary, type Memory, type MemoryValue, rememberPreference, recordFeedback } from './memory';
import { classifyRisk, shouldAutoApprove, type ActionClassification, type TrustScore } from './trust';
import {
  createPendingAction,
  approveAction,
  rejectAction,
  markExecuted,
  markFailed,
  getUserPendingActions,
  type PendingAction,
  type PendingActionData,
} from './workflow';

export interface AgentContext {
  householdId: string;
  userId: string;
  preferences: Memory[];
  patterns: Memory[];
  recentFeedback: Memory[];
  pendingActions: PendingAction[];
}

export interface ToolCallResult {
  autoExecuted: boolean;
  pendingActionId?: string;
  result?: unknown;
  error?: string;
  requiresApproval: boolean;
  approvalReason?: string;
}

/**
 * Get full agent context for chat prompts
 */
export async function getAgentContext(
  householdId: string,
  userId: string
): Promise<AgentContext> {
  const [memorySummary, pendingActions] = await Promise.all([
    getMemorySummary(householdId),
    getUserPendingActions(userId),
  ]);

  return {
    householdId,
    userId,
    ...memorySummary,
    pendingActions,
  };
}

/**
 * Format agent context for inclusion in chat prompts
 */
export function formatContextForPrompt(context: AgentContext): string {
  const parts: string[] = [];

  // Add preferences
  if (context.preferences.length > 0) {
    parts.push('## Family Preferences');
    for (const pref of context.preferences) {
      const value = typeof pref.value === 'object' && pref.value !== null
        ? JSON.stringify(pref.value)
        : String(pref.value);
      parts.push(`- ${pref.key}: ${value}`);
    }
    parts.push('');
  }

  // Add patterns
  if (context.patterns.length > 0) {
    parts.push('## Observed Patterns');
    for (const pattern of context.patterns) {
      const desc = (pattern.value as MemoryValue)?.description || pattern.key;
      parts.push(`- ${desc} (confidence: ${(pattern.confidence * 100).toFixed(0)}%)`);
    }
    parts.push('');
  }

  // Add pending actions
  if (context.pendingActions.length > 0) {
    parts.push('## Pending Actions Awaiting Approval');
    for (const action of context.pendingActions) {
      parts.push(`- ${action.actionType}: ${JSON.stringify(action.actionData)}`);
    }
    parts.push('');
  }

  return parts.join('\n');
}

/**
 * Process a tool call - either auto-execute or queue for approval
 */
export async function processToolCall(
  householdId: string,
  userId: string,
  actionType: string,
  actionData: PendingActionData,
  executor?: () => Promise<unknown>
): Promise<ToolCallResult> {
  // Classify the action
  const classification = classifyRisk(actionType);

  // Check if should auto-approve
  const autoApproveCheck = await shouldAutoApprove(householdId, actionType);

  if (autoApproveCheck.autoApprove && executor) {
    // Auto-execute
    try {
      const result = await executor();

      // Record success for learning
      await recordFeedback(householdId, actionType, 'succeeded', {
        actionData,
        result,
      });

      return {
        autoExecuted: true,
        result,
        requiresApproval: false,
      };
    } catch (error) {
      // Record failure for learning
      await recordFeedback(householdId, actionType, 'failed', {
        actionData,
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        autoExecuted: true,
        error: error instanceof Error ? error.message : 'Execution failed',
        requiresApproval: false,
      };
    }
  }

  // Queue for approval
  const pendingAction = await createPendingAction(
    householdId,
    userId,
    actionType,
    actionData,
    {
      reason: classification.description,
    }
  );

  return {
    autoExecuted: false,
    pendingActionId: pendingAction.id,
    requiresApproval: true,
    approvalReason: autoApproveCheck.reason,
  };
}

/**
 * Confirm a pending action and execute it
 */
export async function confirmAction(
  actionId: string,
  executor: () => Promise<unknown>
): Promise<{
  success: boolean;
  result?: unknown;
  error?: string;
}> {
  // Approve the action
  const action = await approveAction(actionId);
  if (!action) {
    return { success: false, error: 'Action not found or already processed' };
  }

  try {
    // Execute
    const result = await executor();

    // Mark as executed
    await markExecuted(actionId, {
      result: result as PendingActionData,
      executedAt: new Date().toISOString(),
    });

    // Record success feedback
    await recordFeedback(action.householdId, action.actionType, 'succeeded', {
      actionData: action.actionData,
      result,
    });

    return { success: true, result };
  } catch (error) {
    // Mark as failed
    const errorMessage = error instanceof Error ? error.message : 'Execution failed';
    await markFailed(actionId, errorMessage);

    // Record failure feedback
    await recordFeedback(action.householdId, action.actionType, 'failed', {
      actionData: action.actionData,
      error: errorMessage,
    });

    return { success: false, error: errorMessage };
  }
}

/**
 * Reject a pending action
 */
export async function rejectPendingAction(
  actionId: string,
  reason?: string
): Promise<{ success: boolean }> {
  const action = await rejectAction(actionId, reason);
  if (!action) {
    return { success: false };
  }

  // Record rejection feedback
  await recordFeedback(action.householdId, action.actionType, 'rejected', {
    actionData: action.actionData,
    reason,
  });

  return { success: true };
}

/**
 * Learn a preference from user input
 */
export async function learnPreference(
  householdId: string,
  key: string,
  value: MemoryValue,
  explicit: boolean = true
): Promise<Memory> {
  return rememberPreference(
    householdId,
    key,
    value,
    explicit ? 'user_explicit' : 'inferred'
  );
}

/**
 * Get action classification and trust info for display
 */
export async function getActionInfo(
  householdId: string,
  actionType: string
): Promise<{
  classification: ActionClassification;
  trust: TrustScore;
  autoApprove: { autoApprove: boolean; reason: string };
}> {
  const [classification, autoApprove] = await Promise.all([
    Promise.resolve(classifyRisk(actionType)),
    shouldAutoApprove(householdId, actionType),
  ]);

  // Import here to avoid circular dependency
  const { getTrust } = await import('./trust');
  const trust = await getTrust(householdId, actionType);

  return {
    classification,
    trust,
    autoApprove,
  };
}

// Re-export commonly used functions
export { classifyRisk, type RiskLevel, type ActionClassification } from './trust';
export { type Memory, type MemoryType, type MemorySource } from './memory';
export { type PendingAction, type ActionStatus } from './workflow';
