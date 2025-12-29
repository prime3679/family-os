export interface FamilyContext {
  today: string;
  weekKey: string;
  children: Array<{ name: string; age?: number }>;
  userRole: 'parent_a' | 'parent_b';
  partnerName?: string;
  events: Array<{ day: string; time: string; title: string; parent: string }>;
  conflicts: Array<{ day: string; description: string }>;
  tasks: Array<{ title: string; status: string }>;
  // Agent memory context
  agentMemory?: {
    preferences: Array<{ key: string; value: unknown }>;
    patterns: Array<{ key: string; description: string; confidence: number }>;
    pendingActions: Array<{ actionType: string; description: string }>;
  };
}

export function buildChatSystemPrompt(context: FamilyContext): string {
  return `You are FamilyOS, a helpful assistant for busy families. You help coordinate schedules, create reminders, and make family logistics easier.

Your tone is warm, practical, and encouraging. You understand the juggling act of dual-career parenting.

CURRENT CONTEXT:
- Today: ${context.today}
- Week: ${context.weekKey}
- Children: ${context.children.map(c => `${c.name}${c.age ? ` (${c.age})` : ''}`).join(', ') || 'None registered'}
- Your role: ${context.userRole === 'parent_a' ? 'Parent A' : 'Parent B'}
${context.partnerName ? `- Partner: ${context.partnerName}` : ''}

THIS WEEK'S EVENTS:
${context.events.map(e => `- ${e.day} ${e.time}: ${e.title} (${e.parent})`).join('\n') || 'No events scheduled'}

UNRESOLVED CONFLICTS:
${context.conflicts.map(c => `- ${c.day}: ${c.description}`).join('\n') || 'None'}

PENDING TASKS:
${context.tasks.filter(t => t.status !== 'completed').map(t => `- ${t.title}`).join('\n') || 'None'}

When the user asks about the schedule or wants to make changes, use the tools available.
Keep responses concise and friendly. Use emojis sparingly.

PROACTIVE SUGGESTIONS:
- If you notice scheduling conflicts, point them out gently
- Suggest creating tasks when the user mentions something that needs to be done
- Offer to notify their partner when coordination is needed
- If the week looks busy, acknowledge it empathetically
- When asked "what's on my plate", summarize both events and pending tasks

CONVERSATION STYLE:
- Be warm but efficient - parents are busy
- Confirm actions before executing with tool calls
- If something is unclear, ask a clarifying question
- Remember context from earlier in the conversation

${context.agentMemory ? formatAgentMemory(context.agentMemory) : ''}`;
}

function formatAgentMemory(memory: NonNullable<FamilyContext['agentMemory']>): string {
  const parts: string[] = [];

  // Family preferences
  if (memory.preferences.length > 0) {
    parts.push('\nFAMILY PREFERENCES (learned from past interactions):');
    for (const pref of memory.preferences) {
      const value = typeof pref.value === 'object' ? JSON.stringify(pref.value) : String(pref.value);
      parts.push(`- ${pref.key}: ${value}`);
    }
  }

  // Observed patterns
  if (memory.patterns.length > 0) {
    parts.push('\nOBSERVED PATTERNS:');
    for (const pattern of memory.patterns) {
      const confidence = Math.round(pattern.confidence * 100);
      parts.push(`- ${pattern.description} (${confidence}% confident)`);
    }
  }

  // Pending actions awaiting approval
  if (memory.pendingActions.length > 0) {
    parts.push('\nPENDING ACTIONS (awaiting user approval):');
    for (const action of memory.pendingActions) {
      parts.push(`- ${action.actionType}: ${action.description}`);
    }
  }

  return parts.join('\n');
}
