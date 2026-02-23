import { createAct, defineConfig } from '@act-sdk/core';

export const act = createAct();

export const actSdkConfig = defineConfig({
  apiKey: 'demo-api-key',
  projectId: 'demo-project-id',
  description: 'Demo Next.js app exposing AI-callable fixed add numbers action',
  endpoint: 'http://localhost:3000',
});
