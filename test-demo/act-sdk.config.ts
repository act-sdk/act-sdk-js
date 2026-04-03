import { createAct } from '@act-sdk/core';
import { z } from 'zod';

const act = createAct();

// Example action with no auth required
act.action({
  id: 'greet',
  description: 'Greet a user by name',
  input: z.object({
    name: z.string(),
  }),
  handler: async ({ name }) => {
    return { message: `Hello, ${name}!` };
  },
});

// Example action that uses auth context
act.action({
  id: 'getProfile',
  description: 'Get the authenticated user profile',
  input: z.object({}),
  handler: async (args, context) => {
    const userId = (context?.authInfo as { userId: string })?.userId;

    if (!userId) {
      throw new Error('Not authenticated');
    }

    return {
      userId,
      profile: {
        email: `user-${userId}@example.com`,
        name: `User ${userId}`,
      },
    };
  },
});

// Example action with context and input
act.action({
  id: 'createPost',
  description: 'Create a post for the authenticated user',
  input: z.object({
    title: z.string(),
    content: z.string(),
  }),
  handler: async ({ title, content }, context) => {
    const userId = (context?.authInfo as { userId: string })?.userId;

    if (!userId) {
      throw new Error('Not authenticated');
    }

    return {
      id: `post-${Date.now()}`,
      userId,
      title,
      content,
      createdAt: new Date().toISOString(),
    };
  },
});

export const config = {
  name: 'Test MCP Server',
  version: '1.0.0',
  description: 'A test MCP server configuration',
  act,
};
