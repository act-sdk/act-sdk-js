import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';
import { createJiti } from 'jiti';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../../..');
const cliEntry = path.join(repoRoot, 'packages/cli/dist/index.js');
const coreEntry = pathToFileURL(path.join(repoRoot, 'packages/core/dist/index.js')).href;

async function createFixtureProject(overrides = {}) {
  const projectPath = await mkdtemp(path.join(tmpdir(), 'act-sdk-cli-test-'));

  await writeFile(
    path.join(projectPath, 'tsconfig.json'),
    JSON.stringify(
      {
        compilerOptions: {
          target: 'ES2022',
          module: 'ESNext',
          moduleResolution: 'Bundler',
          jsx: 'preserve',
          baseUrl: '.',
          paths: {
            '@/*': ['./*'],
          },
        },
      },
      null,
      2,
    ),
  );

  await writeFile(
    path.join(projectPath, 'act-sdk.config.ts'),
    overrides.config ??
      `
import { createAct, defineConfig } from '${coreEntry}';

export const act = createAct();

export const actSdkConfig = defineConfig({
  mode: 'cloud',
  apiKey: 'act_test_key',
  projectId: 'proj_test_123',
  description: 'Fixture app',
  endpoint: 'http://127.0.0.1:1',
});
`,
  );

  await mkdir(path.join(projectPath, 'app'), { recursive: true });
  await writeFile(
    path.join(projectPath, 'app/page.tsx'),
    overrides.page ??
      `
'use client';

import { act } from '../act-sdk.config';
import { z } from 'zod';

const addNumbers = act.action({
  id: 'addNumbers',
  description: 'Add two numbers together',
  input: z.object({
    a: z.number(),
    b: z.number(),
  }),
})(async () => {});

export default function Page() {
  return <div>{typeof addNumbers}</div>;
}
`,
  );

  await writeFile(
    path.join(projectPath, 'routes.ts'),
    overrides.routes ??
      `
import { act } from './act-sdk.config';

export const openUser = act.route({
  id: 'openUser',
  description: 'Open a user profile',
  path: '/users/:id',
});
`,
  );

  return projectPath;
}

async function runCli(args, { cwd = repoRoot } = {}) {
  return await new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(process.execPath, [cliEntry, ...args], {
      cwd,
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.on('error', rejectPromise);
    child.on('close', (code) => {
      resolvePromise({ code, stdout, stderr });
    });
  });
}

test('generate-manifest discovers actions from TSX files and routes from TS files', async () => {
  const projectPath = await createFixtureProject();

  const result = await runCli(['generate-manifest', '--project', projectPath]);

  assert.equal(result.code, 0, result.stderr);

  const manifest = JSON.parse(await readFile(path.join(projectPath, 'act.manifest.json'), 'utf8'));

  assert.deepEqual(
    manifest.actions.map((action) => action.id),
    ['addNumbers'],
  );
  assert.deepEqual(
    manifest.routes.map((route) => route.id),
    ['openUser'],
  );
  assert.deepEqual(manifest.actions[0].inputSchema.required, ['a', 'b']);
  assert.equal(manifest.routes[0].path, '/users/:id');
});

test('sync sends only actions and routes in the body and keeps project id in headers', async () => {
  const jiti = createJiti(import.meta.url, { interopDefault: true });
  const { sync } = await jiti.import(path.join(repoRoot, 'packages/cli/src/commands/sync.ts'));
  const projectPath = await createFixtureProject({
    config: `
import { createAct, defineConfig } from '${coreEntry}';

export const act = createAct();

export const actSdkConfig = defineConfig({
  mode: 'cloud',
  apiKey: 'act_test_key',
  projectId: 'proj_test_123',
  description: 'Fixture app',
  endpoint: 'https://sync.example.test',
});
`,
  });

  let receivedRequest;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    receivedRequest = {
      url: String(url),
      headers: init?.headers,
      body: JSON.parse(String(init?.body)),
    };

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  try {
    await sync({ project: projectPath }, {});
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.equal(receivedRequest.url, 'https://sync.example.test/api/actions/sync');
  assert.equal(receivedRequest.headers['x-project-id'], 'proj_test_123');
  assert.equal(receivedRequest.headers['x-api-key'], 'act_test_key');
  assert.deepEqual(Object.keys(receivedRequest.body).sort(), ['actions', 'routes']);
  assert.equal(receivedRequest.body.actions[0].actionId, 'addNumbers');
  assert.equal(receivedRequest.body.routes[0].routeId, 'openUser');
  assert.equal('projectId' in receivedRequest.body, false);
  assert.equal('projectDescription' in receivedRequest.body, false);
});
