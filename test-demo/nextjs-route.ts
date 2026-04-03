import { createNextHandler } from '@act-sdk/adapters/nextjs';
import { config } from './act-sdk.config.js';

// fake JWT
async function verifyJWT(token: string) {
  if (!token || !token.startsWith('demo-')) {
    return null;
  }

  const userId = token.replace('demo-', '');
  return { userId };
}

export const { GET, POST, DELETE } = createNextHandler(config, {
  auth: async (req) => {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) return null;

    const token = authHeader.split(' ')[1];
    if (!token) return null;

    return verifyJWT(token);
  },
});
