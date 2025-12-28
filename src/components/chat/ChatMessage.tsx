import { ChatToolResult } from './ChatToolResult';

interface ToolInvocation {
  toolName: string;
  args: Record<string, unknown>;
  state: 'pending' | 'confirmed' | 'cancelled' | 'error';
}

interface ChatMessageProps {
  message: {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    toolInvocations?: ToolInvocation[];
  };
  onToolConfirm?: (messageId: string, toolName: string) => Promise<void>;
  onToolCancel?: (messageId: string, toolName: string) => void;
}

export function ChatMessage({ message, onToolConfirm, onToolCancel }: ChatMessageProps) {
  const isUser = message.role === 'user';

  // Check if this message has tool invocations
  const hasToolCalls = message.toolInvocations && message.toolInvocations.length > 0;

  return (
    <div className="mb-4">
      {/* Text content */}
      {message.content && (
        <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
          <div
            className={`
              max-w-[80%] px-4 py-2.5 rounded-2xl
              ${isUser
                ? 'bg-accent-primary text-white rounded-br-sm'
                : 'bg-surface-alt text-text-primary rounded-bl-sm'
              }
            `}
          >
            <p className="text-base leading-relaxed whitespace-pre-wrap break-words">
              {message.content}
            </p>
          </div>
        </div>
      )}

      {/* Tool invocations */}
      {hasToolCalls && message.toolInvocations?.map((tool, index) => {
        const proposal = buildProposalFromTool(tool);
        if (!proposal) return null;

        return (
          <ChatToolResult
            key={`${message.id}-tool-${index}`}
            proposal={proposal}
            status={tool.state}
            onConfirm={async () => {
              if (onToolConfirm) {
                await onToolConfirm(message.id, tool.toolName);
              }
            }}
            onCancel={() => {
              if (onToolCancel) {
                onToolCancel(message.id, tool.toolName);
              }
            }}
          />
        );
      })}
    </div>
  );
}

function buildProposalFromTool(tool: ToolInvocation) {
  const args = tool.args as Record<string, string | number | undefined>;

  switch (tool.toolName) {
    case 'createTask':
      return {
        type: 'createTask' as const,
        title: args.title as string,
        description: args.description as string | undefined,
        assignedTo: args.assignedTo as 'parent_a' | 'parent_b' | 'both' | undefined,
        priority: args.priority as 'low' | 'normal' | 'high' | undefined,
        childName: args.childName as string | undefined,
      };
    case 'createEvent':
      return {
        type: 'createEvent' as const,
        title: args.title as string,
        day: args.day as string,
        time: args.time as string,
        duration: args.duration as number | undefined,
        parent: args.parent as 'parent_a' | 'parent_b' | 'both' | undefined,
      };
    default:
      return null;
  }
}
