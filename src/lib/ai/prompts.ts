/**
 * Family OS — AI Prompt Templates
 *
 * Warm, supportive prompts for generating family calendar insights.
 */

import { Event, Conflict, WeekSummary } from '@/data/mock-data';

export const SYSTEM_PROMPT = `You are a warm, supportive family coordinator helping dual-career parents prepare for their week ahead. Your tone is:
- Empathetic and understanding (you know parenting is hard)
- Practical and actionable (suggest real solutions)
- Encouraging without being cheesy
- Direct but kind (acknowledge challenges honestly)

You speak directly to the couple using "you" and "your". Avoid corporate jargon, scheduling-app speak, or overly formal language. Sound like a helpful friend who happens to be great at logistics.`;

/**
 * Generate prompt for week narrative
 */
export function buildWeekNarrativePrompt(
  events: Event[],
  conflicts: Conflict[],
  summary: WeekSummary
): string {
  const eventsByDay = events.reduce((acc, e) => {
    acc[e.day] = (acc[e.day] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const conflictSummary = conflicts.map((c) => `- ${c.day}: ${c.description}`).join('\n');

  return `Here's the calendar data for this week:

**Week Overview:**
- Total events: ${summary.totalEvents}
- Intensity: ${summary.intensity}
- Busiest day: ${summary.heaviestDay}
- Handoffs between parents: ${summary.handoffs}
- Travel days: ${summary.travelDays}
- Solo parenting days: ${summary.soloParentingDays}

**Events by day:**
${Object.entries(eventsByDay)
  .map(([day, count]) => `- ${day}: ${count} events`)
  .join('\n')}

**Conflicts detected:**
${conflictSummary || 'None detected'}

Write a 2-3 paragraph summary that:
1. Opens with an honest assessment of the week's intensity
2. Highlights the 1-2 spots that need the most attention
3. Ends with a brief, genuine encouragement

Keep it conversational and under 150 words.`;
}

/**
 * Generate prompt for conflict explanation
 */
export function buildConflictExplanationPrompt(conflict: Conflict): string {
  return `Here's a scheduling conflict that needs explaining:

**Conflict Type:** ${conflict.type}
**Day:** ${conflict.day}
**Time:** ${conflict.timeRange}
**Events involved:** ${conflict.events.join(', ')}
**Severity:** ${conflict.severity}

Write a warm, 2-3 sentence explanation that:
1. Acknowledges why this is tricky
2. Suggests who might need to adjust (without being prescriptive)
3. Ends with a specific question to help them decide

Example tone: "Tuesday morning is tight. Emma's dentist starts at 10, but the product review kicks off 30 minutes in. One of you needs to flex here—could the meeting be moved, or should one of you skip the first half?"`;
}

/**
 * Generate prompt for prep item suggestions
 */
export function buildPrepSuggestionsPrompt(event: Event): string {
  return `Generate prep items for this family event:

**Event:** ${event.title}
**Day:** ${event.day}
**Time:** ${event.time}
**Type:** ${event.type || 'general'}
**Who's handling it:** Parent ${event.parent}

Suggest 3-5 practical prep items that a busy parent might forget. Be specific to this type of event. Format as a simple bulleted list.

Examples of good prep items:
- For a dentist appointment: "Check insurance card is in wallet"
- For travel: "Share flight details with partner"
- For a kids event: "Pack snacks for the wait"

Keep items actionable and specific.`;
}

/**
 * Generate prompt for decision options
 */
export function buildDecisionOptionsPrompt(conflict: Conflict): string {
  return `Given this scheduling conflict, suggest resolution options:

**Conflict:** ${conflict.description}
**Day:** ${conflict.day}
**Time:** ${conflict.timeRange}
**Events:** ${conflict.events.join(' vs ')}
**Type:** ${conflict.type}

Suggest 3 realistic options for resolving this. Each option should be:
- Specific (not generic like "reschedule something")
- Fair to both parents
- Practical given the conflict type

Format as a numbered list with brief explanations.`;
}

/**
 * Generate prompt for personalized affirmation
 */
export function buildAffirmationPrompt(
  summary: WeekSummary,
  conflictCount: number
): string {
  return `Generate a personalized closing message for parents who just reviewed their week:

**Week intensity:** ${summary.intensity}
**Total events:** ${summary.totalEvents}
**Conflicts addressed:** ${conflictCount}
**Busiest day:** ${summary.heaviestDay}
**Solo parenting days:** ${summary.soloParentingDays}

Write:
1. A short headline (3-5 words, encouraging)
2. A 2-3 sentence message that acknowledges what they're facing and affirms their preparation

Avoid:
- Generic platitudes ("You've got this!")
- Minimizing the week's challenges
- Being overly cheerful if the week is intense

Be genuine and specific to their situation.`;
}

/**
 * Parse AI response for week insights
 */
export interface WeekInsights {
  narrative: string;
  conflictInsights: Record<
    string,
    {
      explanation: string;
      suggestions: string[];
      question: string;
    }
  >;
  prepSuggestions: Record<string, string[]>;
  decisionOptions: Record<string, string[]>;
  affirmation: {
    headline: string;
    message: string;
  };
}

/**
 * Parse affirmation response
 */
export function parseAffirmationResponse(response: string): {
  headline: string;
  message: string;
} {
  const lines = response.trim().split('\n').filter(Boolean);
  const headline = lines[0]?.replace(/^#+\s*/, '').replace(/^\*+/, '').replace(/\*+$/, '').trim() || "You're ready.";
  const message = lines.slice(1).join(' ').trim() || "You've looked at your week honestly and made a plan. That's more than most.";
  return { headline, message };
}

/**
 * Parse prep suggestions response
 */
export function parsePrepSuggestions(response: string): string[] {
  return response
    .split('\n')
    .filter((line) => line.trim().startsWith('-') || line.trim().startsWith('*'))
    .map((line) => line.replace(/^[-*]\s*/, '').trim())
    .filter(Boolean);
}

/**
 * Parse decision options response
 */
export function parseDecisionOptions(response: string): string[] {
  return response
    .split('\n')
    .filter((line) => /^\d+[\.\)]\s/.test(line.trim()))
    .map((line) => line.replace(/^\d+[\.\)]\s*/, '').trim())
    .filter(Boolean);
}
