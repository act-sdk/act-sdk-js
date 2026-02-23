import type { z, ZodType } from 'zod';

export interface ActionMeta<TInput extends ZodType = ZodType> {
  id: string;
  description: string;
  input?: TInput;
}

// The handler the developer writes
export type ActionHandler<TInput extends ZodType = ZodType> = (
  args: z.infer<TInput>,
) => Promise<void> | void;

// What gets stored internally in the registry
export interface RegistryEntry {
  meta: ActionMeta;
  handler: ActionHandler;
}

// What gets sent to the cloud — no handler, no sensitive info
export interface ActionManifest {
  id: string;
  description: string;
  hasInput: boolean;
  inputSchema?: Record<string, unknown>;
}

// The wrapped function returned to the developer
export type WrappedAction<TInput extends ZodType = ZodType> = ((
  args: z.infer<TInput>,
) => Promise<void>) & {
  _actMeta: ActionMeta<TInput>;
};
