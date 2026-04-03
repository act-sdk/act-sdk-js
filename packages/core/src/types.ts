import { z, type ZodTypeAny } from 'zod';

export interface ActionContext {
  authInfo?: unknown;
}

export interface ActionDef<TInput extends ZodTypeAny = ZodTypeAny, TOutput = unknown> {
  id: string;
  description: string;
  input?: TInput;
  handler: (args: z.infer<TInput>, context?: ActionContext) => Promise<TOutput> | TOutput;
}

export type RegistryEntry = ActionDef<ZodTypeAny, unknown>;
