import { DEFAULT_ACT_SDK_API_ENDPOINT } from '@act-sdk/core';
import { DefaultChatTransport, lastAssistantMessageIsCompleteWithToolCalls } from 'ai';
import { useCallback } from 'react';
import { useActSdkContext } from '../context';
import type { ActionToolOutput } from '../types';
import { useChat } from '@ai-sdk/react';

export function useAct() {
  const { act, config } = useActSdkContext();

  const { messages, status, error, sendMessage, setMessages, addToolOutput } = useChat({
    transport: new DefaultChatTransport({
      api: `${config.endpoint ?? DEFAULT_ACT_SDK_API_ENDPOINT}/api/chat/actions`,
      headers: {
        'x-api-key': config.apiKey,
        'x-project-id': config.projectId,
      },
      body: () => ({
        actions: act.listActions(),
        projectDescription: config.description,
      }),
    }),

    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    onToolCall: async ({ toolCall }) => {
      if (toolCall.dynamic) return;

      // toolCall.toolName IS the actionId now — each action is its own tool
      const actionId = toolCall.toolName;
      const payload = toolCall.input ?? {};

      try {
        await act.run(actionId, payload);

        addToolOutput({
          tool: actionId,
          toolCallId: toolCall.toolCallId,
          output: {
            actionId,
            status: 'success',
            message: `Action "${actionId}" completed successfully`,
            payload,
            timestamp: new Date().toISOString(),
          } satisfies ActionToolOutput,
        });
      } catch (err) {
        addToolOutput({
          tool: actionId,
          toolCallId: toolCall.toolCallId,
          output: {
            actionId,
            status: 'error',
            message: err instanceof Error ? err.message : 'Unknown error',
            payload,
            timestamp: new Date().toISOString(),
          } satisfies ActionToolOutput,
        });
      }
    },
  });

  const send = useCallback(
    (userMessage: string) => {
      sendMessage({ text: userMessage });
    },
    [sendMessage],
  );

  const run = useCallback(
    async (actionId: string, payload?: unknown) => {
      await act.run(actionId, payload);
    },
    [act],
  );

  const clearMessages = useCallback(() => setMessages([]), [setMessages]);

  return {
    messages,
    status,
    error,
    send,
    run,
    clearMessages,
    actions: act.listActions(),
  };
}
