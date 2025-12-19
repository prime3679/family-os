/**
 * Family OS — AI Week Analysis Endpoint
 *
 * Pre-generates all AI insights for the week in one call.
 * Returns narrative, conflict explanations, prep suggestions, and affirmation.
 */

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { generateCompletion, isAIConfigured } from '@/lib/ai/provider';
import {
  SYSTEM_PROMPT,
  buildWeekNarrativePrompt,
  buildConflictExplanationPrompt,
  buildAffirmationPrompt,
  buildPrepSuggestionsPrompt,
  buildDecisionOptionsPrompt,
  parseAffirmationResponse,
  parsePrepSuggestions,
  parseDecisionOptions,
  WeekInsights,
} from '@/lib/ai/prompts';
import { Event, Conflict, WeekSummary } from '@/data/mock-data';

interface AnalyzeRequest {
  events: Event[];
  conflicts: Conflict[];
  weekSummary: WeekSummary;
}

export async function POST(request: Request) {
  try {
    // Check authentication - allow demo mode (unauthenticated) for testing
    const _session = await auth();
    // In production, uncomment this to require auth:
    // if (!_session?.user?.id) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    // Check if AI is configured
    if (!isAIConfigured()) {
      return NextResponse.json(
        { error: 'AI not configured', fallback: true },
        { status: 503 }
      );
    }

    const body: AnalyzeRequest = await request.json();
    const { events, conflicts, weekSummary } = body;

    // Filter events that need prep
    const eventsNeedingPrep = events.filter((e) => e.needsPrep);

    // Generate all insights in parallel
    const results = await Promise.all([
      // Week narrative
      generateCompletion({
        systemPrompt: SYSTEM_PROMPT,
        userPrompt: buildWeekNarrativePrompt(events, conflicts, weekSummary),
        maxTokens: 500,
      }).then((response) => ({ type: 'narrative' as const, response })),
      // Affirmation
      generateCompletion({
        systemPrompt: SYSTEM_PROMPT,
        userPrompt: buildAffirmationPrompt(weekSummary, conflicts.length),
        maxTokens: 200,
      }).then((response) => ({ type: 'affirmation' as const, response })),
      // Conflict explanations (one per conflict)
      ...conflicts.map((conflict) =>
        generateCompletion({
          systemPrompt: SYSTEM_PROMPT,
          userPrompt: buildConflictExplanationPrompt(conflict),
          maxTokens: 200,
        }).then((response) => ({
          type: 'conflict' as const,
          conflictId: conflict.id,
          response,
        }))
      ),
      // Prep suggestions (one per event needing prep)
      ...eventsNeedingPrep.map((event) =>
        generateCompletion({
          systemPrompt: SYSTEM_PROMPT,
          userPrompt: buildPrepSuggestionsPrompt(event),
          maxTokens: 300,
        }).then((response) => ({
          type: 'prep' as const,
          eventTitle: event.title,
          response,
        }))
      ),
      // Decision options (one per conflict)
      ...conflicts.map((conflict) =>
        generateCompletion({
          systemPrompt: SYSTEM_PROMPT,
          userPrompt: buildDecisionOptionsPrompt(conflict),
          maxTokens: 300,
        }).then((response) => ({
          type: 'decision' as const,
          conflictId: conflict.id,
          response,
        }))
      ),
    ]);

    // Extract responses by type
    const narrativeResponse =
      results.find((r) => r.type === 'narrative')?.response || '';
    const affirmationResponse =
      results.find((r) => r.type === 'affirmation')?.response || '';
    const conflictResponses = results.filter((r) => r.type === 'conflict') as Array<{
      type: 'conflict';
      conflictId: string;
      response: string;
    }>;
    const prepResponses = results.filter((r) => r.type === 'prep') as Array<{
      type: 'prep';
      eventTitle: string;
      response: string;
    }>;
    const decisionResponses = results.filter((r) => r.type === 'decision') as Array<{
      type: 'decision';
      conflictId: string;
      response: string;
    }>;

    // Build conflict insights map
    const conflictInsights: WeekInsights['conflictInsights'] = {};
    for (const { conflictId, response } of conflictResponses as Array<{
      conflictId: string;
      response: string;
    }>) {
      // Parse the response - it's a 2-3 sentence explanation with a question
      const lines = response.trim().split('\n').filter(Boolean);
      const explanation = lines.slice(0, -1).join(' ').trim() || response;
      const question =
        lines[lines.length - 1]?.includes('?')
          ? lines[lines.length - 1]
          : 'How would you like to handle this?';

      conflictInsights[conflictId] = {
        explanation,
        suggestions: [], // We'll generate these on demand via streaming
        question,
      };
    }

    // Parse affirmation
    const affirmation = parseAffirmationResponse(affirmationResponse);

    // Build prep suggestions map
    const prepSuggestions: WeekInsights['prepSuggestions'] = {};
    for (const { eventTitle, response } of prepResponses) {
      prepSuggestions[eventTitle] = parsePrepSuggestions(response);
    }

    // Build decision options map
    const decisionOptions: Record<string, string[]> = {};
    for (const { conflictId, response } of decisionResponses) {
      decisionOptions[conflictId] = parseDecisionOptions(response);
    }

    const insights: WeekInsights = {
      narrative: narrativeResponse,
      conflictInsights,
      prepSuggestions,
      decisionOptions,
      affirmation,
    };

    return NextResponse.json(insights);
  } catch (error) {
    console.error('AI analysis failed:', error);
    return NextResponse.json(
      {
        error: 'AI analysis failed',
        fallback: true,
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
