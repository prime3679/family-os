/**
 * Family OS — AI Provider Abstraction
 *
 * Supports both Claude (Anthropic) and OpenAI with a unified interface.
 * Set AI_PROVIDER env var to 'anthropic' or 'openai' to switch.
 */

import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';

export type AIProvider = 'anthropic' | 'openai';

export interface AIMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AIGenerateOptions {
  systemPrompt: string;
  userPrompt: string;
  maxTokens?: number;
  temperature?: number;
}

export interface AIStreamOptions extends AIGenerateOptions {
  onToken?: (token: string) => void;
}

// Singleton clients
let anthropicClient: Anthropic | null = null;
let openaiClient: OpenAI | null = null;

function getAnthropicClient(): Anthropic {
  if (!anthropicClient) {
    anthropicClient = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }
  return anthropicClient;
}

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openaiClient;
}

/**
 * Get current AI provider from environment
 */
export function getCurrentProvider(): AIProvider {
  const provider = process.env.AI_PROVIDER?.toLowerCase();
  if (provider === 'openai') return 'openai';
  return 'anthropic'; // Default to Claude
}

/**
 * Generate a completion using the configured AI provider
 */
export async function generateCompletion(options: AIGenerateOptions): Promise<string> {
  const provider = getCurrentProvider();
  const { systemPrompt, userPrompt, maxTokens = 1024, temperature = 0.7 } = options;

  if (provider === 'anthropic') {
    const client = getAnthropicClient();
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    // Extract text from response
    const textBlock = response.content.find((block) => block.type === 'text');
    return textBlock?.type === 'text' ? textBlock.text : '';
  } else {
    const client = getOpenAIClient();
    const response = await client.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: maxTokens,
      temperature,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    });

    return response.choices[0]?.message?.content || '';
  }
}

/**
 * Generate a streaming completion
 */
export async function* streamCompletion(
  options: AIGenerateOptions
): AsyncGenerator<string, void, unknown> {
  const provider = getCurrentProvider();
  const { systemPrompt, userPrompt, maxTokens = 1024 } = options;

  if (provider === 'anthropic') {
    const client = getAnthropicClient();
    const stream = await client.messages.stream({
      model: 'claude-sonnet-4-20250514',
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    for await (const event of stream) {
      if (
        event.type === 'content_block_delta' &&
        event.delta.type === 'text_delta'
      ) {
        yield event.delta.text;
      }
    }
  } else {
    const client = getOpenAIClient();
    const stream = await client.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: maxTokens,
      stream: true,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        yield content;
      }
    }
  }
}

/**
 * Check if AI is configured and available
 */
export function isAIConfigured(): boolean {
  const provider = getCurrentProvider();
  if (provider === 'anthropic') {
    return !!process.env.ANTHROPIC_API_KEY;
  }
  return !!process.env.OPENAI_API_KEY;
}
