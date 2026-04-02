import test from 'node:test';
import assert from 'node:assert/strict';

import { createAct, manifestToTools } from '../dist/index.js';

test('createAct rejects duplicate ids across actions and routes', () => {
  const act = createAct();

  act.action({
    id: 'shared-id',
    description: 'An action',
  })(async () => {});

  assert.throws(
    () =>
      act.route({
        id: 'shared-id',
        description: 'A route',
        path: '/users/:id',
      }),
    /Duplicate route id "shared-id"/,
  );
});

test('listActions throws a clear error for non-Zod schemas', () => {
  const act = createAct();

  act.action({
    id: 'custom-schema',
    description: 'Uses a custom safeParse schema',
    input: {
      safeParse(payload) {
        return { success: true, data: payload };
      },
    },
  })(async () => {});

  assert.throws(
    () => act.listActions(),
    /Cannot serialize action "custom-schema" input schema into the manifest because it is not a Zod schema/,
  );
});

test('manifestToTools rejects duplicate ids across actions and routes', () => {
  assert.throws(
    () =>
      manifestToTools({
        actions: [
          {
            id: 'shared-id',
            description: 'An action',
            hasInput: false,
          },
        ],
        routes: [
          {
            id: 'shared-id',
            description: 'A route',
            path: '/users/:id',
            hasInput: false,
          },
        ],
      }),
    /Duplicate route id "shared-id" in manifest/,
  );
});
