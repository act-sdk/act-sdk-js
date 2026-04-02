import { type RegistryEntry } from './types';

export class ActionRegistry {
  private actions = new Map<string, RegistryEntry>();

  register(entry: RegistryEntry): void {
    if (this.actions.has(entry.id)) {
      throw new Error(`Action "${entry.id}" is already registered`);
    }
    this.actions.set(entry.id, entry);
  }

  get(id: string): RegistryEntry | undefined {
    return this.actions.get(id);
  }

  all(): RegistryEntry[] {
    return Array.from(this.actions.values());
  }

  has(id: string): boolean {
    return this.actions.has(id);
  }

  size(): number {
    return this.actions.size;
  }
}
