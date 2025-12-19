/**
 * Family OS — AI Streaming Endpoint
 *
 * Streams detailed explanations on demand.
 * Used for "Tell me more" interactions in the ritual flow.
 */

import { auth } from '@/lib/auth';
import { streamCompletion, isAIConfigured } from '@/lib/ai/provider';
import {
  SYSTEM_PROMPT,
  buildPrepSuggestionsPrompt,
  buildDecisionOptionsPrompt,
} from '@/lib/ai/prompts';
import { Event, Conflict } from '@/data/mock-data';

interface StreamRequest {
  type: 'prep' | 'decision' | 'detail';
  context: {
    event?: Event;
    conflict?: Conflict;
    question?: string;
  };
}

export async function POST(request: Request) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user?.id) {
      return new Response('Unauthorized', { status: 401 });
    }

    // Check if AI is configured
    if (!isAIConfigured()) {
      return new Response('AI not configured', { status: 503 });
    }

    const body: StreamRequest = await request.json();
    const { type, context } = body;

    let userPrompt: string;

    switch (type) {
      case 'prep':
        if (!context.event) {
          return new Response('Event context required', { status: 400 });
        }
        userPrompt = buildPrepSuggestionsPrompt(context.event);
        break;

      case 'decision':
        if (!context.conflict) {
          return new Response('Conflict context required', { status: 400 });
        }
        userPrompt = buildDecisionOptionsPrompt(context.conflict);
        break;

      case 'detail':
        if (!context.question) {
          return new Response('Question required', { status: 400 });
        }
        userPrompt = context.question;
        break;

      default:
        return new Response('Invalid request type', { status: 400 });
    }

    // Create a readable stream from the AI response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const token of streamCompletion({
            systemPrompt: SYSTEM_PROMPT,
            userPrompt,
            maxTokens: 500,
          })) {
            controller.enqueue(encoder.encode(token));
          }
          controller.close();
        } catch (error) {
          console.error('Streaming error:', error);
          controller.error(error);
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    console.error('AI streaming failed:', error);
    return new Response('Streaming failed', { status: 500 });
  }
}
