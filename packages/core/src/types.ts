import type { z, ZodType } from 'zod';

export interface ActionMeta<TInput extends ZodType = ZodType> {
  id: string;
  description: string;
  input?: TInput;
}

export type ActionHandler<TInput extends ZodType = ZodType> = (
  args: z.infer<TInput>,
) => Promise<void> | void;

export interface RegistryEntry {
  meta: ActionMeta;
  handler: ActionHandler;
}

export interface ActionManifest {
  id: string;
  description: string;
  hasInput: boolean;
  inputSchema?: Record<string, unknown>;
}

export type WrappedAction<TInput extends ZodType = ZodType> = ((
  args: z.infer<TInput>,
) => Promise<void>) & {
  _actMeta: ActionMeta<TInput>;
};
