import { zodToJsonSchema } from 'zod-to-json-schema';
import type { RegistryEntry, ActionManifest } from './types';

export class ActionRegistry {
  private map = new Map<string, RegistryEntry>();

  register(entry: RegistryEntry): void {
    if (this.map.has(entry.meta.id)) {
      console.warn(`[act] Action "${entry.meta.id}" already registered, overwriting`);
    }
    this.map.set(entry.meta.id, entry);
  }

  get(id: string): RegistryEntry | undefined {
    return this.map.get(id);
  }

  has(id: string): boolean {
    return this.map.has(id);
  }

  list(): ActionManifest[] {
    return Array.from(this.map.values()).map(({ meta }) => ({
      id: meta.id,
      description: meta.description,
      hasInput: !!meta.input,
      inputSchema: meta.input
        ? (zodToJsonSchema(meta.input, { target: 'openApi3' }) as Record<string, unknown>)
        : undefined,
    }));
  }

  clear(): void {
    this.map.clear();
  }
}
