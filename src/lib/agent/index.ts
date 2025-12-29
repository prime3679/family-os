/**
 * Agent Module - FamilyOS Persistent Agent Core
 *
 * Provides a stateful agent with:
 * - Memory: Persistent storage of preferences, patterns, and context
 * - Trust: Risk classification and auto-approval learning
 * - Workflow: Pending action management and execution
 * - Orchestrator: Unified API for chat integration
 */

// Memory exports
export {
  remember,
  recall,
  recallOne,
  forget,
  forgetAll,
  adjustConfidence,
  cleanupExpired,
  getMemorySummary,
  rememberPreference,
  rememberPattern,
  recordFeedback,
  storeContext,
  type Memory,
  type MemoryType,
  type MemorySource,
  type MemoryValue,
  type RememberOptions,
} from './memory';

// Trust exports
export {
  classifyRisk,
  getTrust,
  shouldAutoApprove,
  recordOutcome,
  setAutoApprove,
  getAllTrust,
  getAutoApproveSuggestions,
  resetTrust,
  type RiskLevel,
  type ActionCategory,
  type ActionClassification,
  type TrustScore,
} from './trust';

// Workflow exports
export {
  createPendingAction,
  getPendingAction,
  getPendingActions,
  getUserPendingActions,
  approveAction,
  rejectAction,
  markExecuted,
  markFailed,
  expireOldActions,
  cleanupOldActions,
  getActionHistory,
  getActionStats,
  type ActionStatus,
  type PendingAction,
  type PendingActionData,
} from './workflow';

// Orchestrator exports (main API)
export {
  getAgentContext,
  formatContextForPrompt,
  processToolCall,
  confirmAction,
  rejectPendingAction,
  learnPreference,
  getActionInfo,
  type AgentContext,
  type ToolCallResult,
} from './orchestrator';
