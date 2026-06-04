import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { Hono } from 'hono';

import { createAct } from '@act-sdk/core';
import { createExpressHandler } from '../dist/express/index.js';
import { createHonoHandler } from '../dist/hono/index.js';
import { createNextHandler } from '../dist/nextjs/index.js';
import { unauthorizedResponse } from '../dist/shared/web-mcp-handler.js';

function testConfig() {
  const act = createAct();
  act.action({
    id: 'ping',
    description: 'Returns ok',
    handler: async () => ({ ok: true }),
  });
  return { name: 'test-server', act };
}

test('unauthorizedResponse returns 401 with standard body', async () => {
  const res = unauthorizedResponse();
  assert.equal(res.status, 401);
  const body = await res.json();
  assert.equal(body.error, 'unauthorized');
  assert.match(body.message, /Bearer/);
});

test('createExpressHandler returns 401 when auth fails', async () => {
  const app = express();
  app.use('/mcp', createExpressHandler(testConfig(), { auth: async () => null }));

  const server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });

  const { port } = server.address();

  try {
    const res = await fetch(`http://127.0.0.1:${port}/mcp`, { method: 'GET' });
    assert.equal(res.status, 401);
  } finally {
    await new Promise((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
  }
});

test('createExpressHandler serves MCP without auth', async () => {
  const app = express();
  app.use('/mcp', createExpressHandler(testConfig()));

  const server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });

  const { port } = server.address();

  try {
    const res = await fetch(`http://127.0.0.1:${port}/mcp`, { method: 'GET' });
    assert.notEqual(res.status, 401);
  } finally {
    await new Promise((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
  }
});

test('createHonoHandler returns 401 when auth fails', async () => {
  const app = new Hono();
  app.use('/mcp/*', createHonoHandler(testConfig(), { auth: async () => null }));

  const res = await app.request('http://localhost/mcp');
  assert.equal(res.status, 401);
});

test('createNextHandler returns 401 when auth fails', async () => {
  const { GET } = createNextHandler(testConfig(), { auth: async () => null });
  const res = await GET(new Request('http://localhost/mcp'));
  assert.equal(res.status, 401);
});
