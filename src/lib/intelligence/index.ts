/**
 * Intelligence Module - FamilyOS
 *
 * Proactive analysis engine for family coordination.
 */

export { analyzeHousehold, analyzeAllHouseholds, type AnalysisResult } from './analyzer';

export {
  detectCalendarGaps,
  detectConflicts,
  detectCoverageGaps,
  detectLoadImbalance,
  detectPrepReminders,
  type CalendarEvent,
  type HouseholdContext,
  type DetectedInsight,
} from './patterns';

export {
  generateUserBriefing,
  generateHouseholdBriefings,
  generateAllBriefings,
  type DailyBriefingResult,
  type HouseholdBriefingResult,
} from './daily-briefing';
