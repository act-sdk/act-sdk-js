import { DEFAULT_ACT_API_ENDPOINT } from '@act/core';
import { DefaultChatTransport, lastAssistantMessageIsCompleteWithToolCalls } from 'ai';
import { useCallback } from 'react';
import { useActSdkContext } from '../context';
import type { ActionToolOutput } from '../types';
import { useChat } from '@ai-sdk/react';

export function useAct() {
  const { act, config } = useActSdkContext();

  const { messages, status, error, sendMessage, setMessages, addToolOutput } = useChat({
    transport: new DefaultChatTransport({
      api: `${config.endpoint ?? DEFAULT_ACT_API_ENDPOINT}/api/chat/actions`,
      headers: {
        'x-api-key': config.apiKey,
        'x-project-id': config.projectId,
      },
      body: {
        actions: config.actions,
        projectDescription: config.description,
      },
    }),

    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,

    onToolCall: async ({ toolCall }) => {
      if (toolCall.toolName !== 'execute_action') return;

      const { actionId, payload } = toolCall.input as {
        actionId: string;
        payload?: unknown;
      };

      try {
        await act.run(actionId, payload);

        const output: ActionToolOutput = {
          actionId,
          status: 'success',
          message: `Action "${actionId}" completed successfully`,
          payload: payload ?? null,
          timestamp: new Date().toISOString(),
        };

        addToolOutput({
          tool: 'execute_action',
          toolCallId: toolCall.toolCallId,
          output,
        });
      } catch (err) {
        const output: ActionToolOutput = {
          actionId,
          status: 'error',
          message: err instanceof Error ? err.message : 'Unknown error',
          payload: payload ?? null,
          timestamp: new Date().toISOString(),
        };

        addToolOutput({
          tool: 'execute_action',
          toolCallId: toolCall.toolCallId,
          output,
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
    actions: config.actions,
  };
}
