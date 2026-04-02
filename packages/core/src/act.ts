import { type ZodTypeAny } from 'zod';
import { ActionRegistry } from './registry';
import { type ActionDef, type RegistryEntry } from './types';

export function createAct() {
  const registry = new ActionRegistry();

  return {
    action<TInput extends ZodTypeAny, TOutput>(
      def: ActionDef<TInput, TOutput>,
    ): (args: Parameters<typeof def.handler>[0]) => Promise<TOutput> | TOutput {
      registry.register(def as typeof def & RegistryEntry);
      return def.handler;
    },

    getRegistry(): ActionRegistry {
      return registry;
    },
  };
}

export type ActInstance = ReturnType<typeof createAct>;
