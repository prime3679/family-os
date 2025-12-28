'use client';

import { useState, useCallback, useRef } from 'react';

interface ToolInvocation {
  toolName: string;
  args: Record<string, unknown>;
  state: 'pending' | 'confirmed' | 'cancelled' | 'error';
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  toolInvocations?: ToolInvocation[];
}

export function useFamilyChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | undefined>();
  const abortControllerRef = useRef<AbortController | null>(null);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  }, []);

  const stop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsLoading(false);
    }
  }, []);

  const submit = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();

    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);
    setError(undefined);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: newMessages.map(m => ({
            role: m.role,
            content: m.content,
          })),
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantContent = '';
      let toolCalls: ToolInvocation[] = [];

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);

          // Check for tool call markers in the stream
          // Format: [TOOL:toolName:{"arg":"value"}]
          const toolMatch = chunk.match(/\[TOOL:(\w+):(\{[^}]+\})\]/);
          if (toolMatch) {
            const [fullMatch, toolName, argsStr] = toolMatch;
            try {
              const args = JSON.parse(argsStr);
              toolCalls.push({
                toolName,
                args,
                state: 'pending',
              });
              // Remove tool marker from content
              assistantContent += chunk.replace(fullMatch, '');
            } catch {
              assistantContent += chunk;
            }
          } else {
            assistantContent += chunk;
          }

          setMessages([...newMessages, {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: assistantContent.trim(),
            toolInvocations: toolCalls.length > 0 ? [...toolCalls] : undefined,
          }]);
        }
      }

      setIsLoading(false);
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        setError(err);
        setIsLoading(false);
      }
    }
  }, [input, messages, isLoading]);

  const confirmTool = useCallback(async (messageId: string, toolName: string) => {
    // Find the message and tool invocation
    const message = messages.find(m => m.id === messageId);
    if (!message?.toolInvocations) return;

    const tool = message.toolInvocations.find(t => t.toolName === toolName);
    if (!tool) return;

    // Update state to show loading
    setMessages(prev => prev.map(m => {
      if (m.id !== messageId) return m;
      return {
        ...m,
        toolInvocations: m.toolInvocations?.map(t =>
          t.toolName === toolName ? { ...t, state: 'pending' as const } : t
        ),
      };
    }));

    try {
      const response = await fetch('/api/chat/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: toolName,
          data: tool.args,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to confirm action');
      }

      // Update state to confirmed
      setMessages(prev => prev.map(m => {
        if (m.id !== messageId) return m;
        return {
          ...m,
          toolInvocations: m.toolInvocations?.map(t =>
            t.toolName === toolName ? { ...t, state: 'confirmed' as const } : t
          ),
        };
      }));
    } catch {
      // Update state to error
      setMessages(prev => prev.map(m => {
        if (m.id !== messageId) return m;
        return {
          ...m,
          toolInvocations: m.toolInvocations?.map(t =>
            t.toolName === toolName ? { ...t, state: 'error' as const } : t
          ),
        };
      }));
    }
  }, [messages]);

  const cancelTool = useCallback((messageId: string, toolName: string) => {
    setMessages(prev => prev.map(m => {
      if (m.id !== messageId) return m;
      return {
        ...m,
        toolInvocations: m.toolInvocations?.map(t =>
          t.toolName === toolName ? { ...t, state: 'cancelled' as const } : t
        ),
      };
    }));
  }, []);

  const reload = useCallback(async () => {
    // Remove last assistant message and regenerate
    const lastMessages = messages.slice(0, -1);
    setMessages(lastMessages);
    await submit();
  }, [messages, submit]);

  return {
    messages,
    input,
    setInput,
    handleInputChange,
    submit,
    isLoading,
    error,
    reload,
    stop,
    confirmTool,
    cancelTool,
  };
}
