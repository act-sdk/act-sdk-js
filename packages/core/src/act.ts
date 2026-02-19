import type { ZodType } from 'zod';
import { ActionRegistry } from './registry';
import type { ActionMeta, ActionHandler, WrappedAction } from './types';

export function createAct() {
  const registry = new ActionRegistry();

  function action<TInput extends ZodType>(meta: ActionMeta<TInput>) {
    return function (handler: ActionHandler<TInput>): WrappedAction<TInput> {
      registry.register({
        meta: meta as ActionMeta,
        handler: handler as ActionHandler,
      });

      const wrapped = async (args: Parameters<typeof handler>[0]) => {
        if (meta.input) {
          const result = meta.input.safeParse(args);
          if (!result.success) {
            throw new Error(`[act] Invalid input for "${meta.id}": ${result.error.message}`);
          }
          return handler(result.data);
        }
        return handler(args);
      };

      wrapped._actMeta = meta;

      return wrapped;
    };
  }

  async function run(actionId: string, payload?: unknown): Promise<void> {
    const entry = registry.get(actionId);
    if (!entry) {
      throw new Error(`[act] Unknown action: "${actionId}"`);
    }
    await entry.handler(payload);
  }

  function listActions() {
    return registry.list();
  }

  return { action, run, listActions };
}

export type ActSdkInstance = ReturnType<typeof createAct>;
