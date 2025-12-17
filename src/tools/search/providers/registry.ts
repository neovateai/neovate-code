import type { ProviderConfig, SearchProvider } from '../types';
import { TavilyProvider } from './tavily';

type ProviderConstructor = new (config: ProviderConfig) => SearchProvider;

export class ProviderRegistry {
  private providers: Map<string, ProviderConstructor> = new Map();

  constructor() {
    this.register('tavily', TavilyProvider);
  }

  register(name: string, provider: ProviderConstructor): void {
    this.providers.set(name, provider);
  }

  get(name: string, config: ProviderConfig): SearchProvider {
    const ProviderClass = this.providers.get(name);

    if (!ProviderClass) {
      throw new Error(`Search provider '${name}' not found`);
    }

    return new ProviderClass(config);
  }

  has(name: string): boolean {
    return this.providers.has(name);
  }

  list(): string[] {
    return Array.from(this.providers.keys());
  }
}

export const defaultRegistry = new ProviderRegistry();
