import { createAct, defineConfig } from '@act-sdk/core';

export const act = createAct();

export const actSdkConfig = defineConfig({
  apiKey: 'act_69de2cb125914350b719727dbec25878',
  projectId: 'proj_51b326c1f69b4fb782cf3453b2e26220',
  description: 'Demo Next.js app exposing AI-callable calculator actions',
  endpoint: 'https://act-sdk.dev',
});
