import Anthropic from '@anthropic-ai/sdk';
import type { Event, Conflict, WeekSummary } from '@/data/mock-data';

const anthropic = new Anthropic();

const DIGEST_SYSTEM_PROMPT = `You are a warm, supportive family coordinator writing a brief email digest. Your tone is:
- Conversational like a helpful friend
- Empathetic about the challenges of busy family life
- Brief and scannable (this is an email people read quickly)
- Encouraging without being cheesy

Write in first person addressing the reader directly. Keep it warm but concise.`;

/**
 * Generate AI narrative for weekly digest email
 */
export async function generateDigestNarrative({
  events,
  conflicts,
  weekSummary,
  userName,
}: {
  events: Event[];
  conflicts: Conflict[];
  weekSummary: WeekSummary;
  userName: string;
}): Promise<string> {
  // Build a concise summary for the AI
  const eventsByDay = events.reduce(
    (acc, e) => {
      acc[e.day] = (acc[e.day] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const prompt = `Write a brief 2-3 paragraph email digest for ${userName} about their upcoming week:

**Week Overview:**
- Total events: ${weekSummary.totalEvents}
- Week intensity: ${weekSummary.intensity}
- Busiest day: ${weekSummary.heaviestDay}
- Solo parenting days: ${weekSummary.soloParentingDays}
- Travel: ${weekSummary.travelDays > 0 ? `${weekSummary.travelDays} days` : 'None'}
- Conflicts: ${conflicts.length}

**Events by day:**
${Object.entries(eventsByDay)
  .map(([day, count]) => `- ${day}: ${count}`)
  .join('\n')}

Write a warm, honest summary that:
1. Acknowledges the week's reality (busy, light, or mixed)
2. Highlights 1-2 spots to pay attention to
3. Ends with a brief nudge to do the planning ritual together

Keep it under 100 words and conversational. No bullet points - flowing prose only.`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 300,
      system: DIGEST_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }],
    });

    const textBlock = response.content.find((block) => block.type === 'text');
    return textBlock?.text || getFallbackNarrative(weekSummary, userName);
  } catch (error) {
    console.error('Failed to generate digest narrative:', error);
    return getFallbackNarrative(weekSummary, userName);
  }
}

function getFallbackNarrative(summary: WeekSummary, userName: string): string {
  const intensity =
    summary.intensity === 'intense'
      ? "It's an intense week ahead"
      : summary.intensity === 'heavy'
        ? 'You have a heavy week coming up'
        : summary.intensity === 'moderate'
          ? 'Your week looks moderately busy'
          : 'Your week is looking light';

  return `Hey ${userName}! ${intensity} with ${summary.totalEvents} events. ${summary.heaviestDay} looks like your biggest day, so you might want to plan ahead for that one. Take a few minutes to run through your weekly planning ritual together - it'll help you both feel more prepared.`;
}
