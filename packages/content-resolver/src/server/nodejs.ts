import type { AsyncLocalStorage as AsyncLocalStorageType } from 'node:async_hooks';
import { SurrogateKeyStore } from '../surrogate-keys/store.js';
import { prefix } from '../util.js';

let surrogateKeyStorage: AsyncLocalStorageType<SurrogateKeyStore> | null = null;

const importSurrogateKeyStorage = async (): Promise<
  AsyncLocalStorageType<SurrogateKeyStore>
> => {
  if (!surrogateKeyStorage) {
    const { AsyncLocalStorage } = await import('node:async_hooks');
    surrogateKeyStorage = new AsyncLocalStorage<SurrogateKeyStore>();
  }
  return surrogateKeyStorage;
};

export class SurrogateTracker {
  static async run<T>(callback: () => T): Promise<T> {
    const storage = await importSurrogateKeyStorage();
    const store = new SurrogateKeyStore();
    return storage.run(store, callback);
  }

  static getSurrogateStore(): SurrogateKeyStore | undefined {
    const store = surrogateKeyStorage?.getStore();
    if (!store) {
      // Return a new instance to avoid breaking functionality, but warn about missing store
      console.warn(
        `${prefix(':SurrogateTracker')} No surrogate key store found. Make sure to wrap your content loading logic with SurrogateTracker.run()`
      );
      return new SurrogateKeyStore();
    }
    return store;
  }

  static setCacheKeyHeaders(headers: Headers) {
    const store = SurrogateTracker.getSurrogateStore();
    const keys = store?.getSurrogateKeys() || [];
    headers.set('Surrogate-Key', keys.join(' '));
  }
}

// Use globalThis to ensure state is shared across all module instances
// (Next.js RSC and custom server may load this module separately)
const SURROGATE_KEY_SYMBOL = Symbol.for('surrogate-key-store');

type SurrogateKeyGlobal = Map<string, SurrogateKeyStore>;

const getGlobalStore = (): SurrogateKeyGlobal => {
  const g = globalThis as typeof globalThis & {
    [SURROGATE_KEY_SYMBOL]?: SurrogateKeyGlobal;
  };
  if (!g[SURROGATE_KEY_SYMBOL]) {
    g[SURROGATE_KEY_SYMBOL] = new Map<string, SurrogateKeyStore>();
  }
  return g[SURROGATE_KEY_SYMBOL];
};

export class GlobalSurrogateTracker {
  static new() {
    const requestId = crypto.randomUUID();
    const store = getGlobalStore();
    if (!store.has(requestId))
      store.set(requestId, new SurrogateKeyStore());
    return requestId;
  }
  static delete(requestId: string | null) {
    const store = getGlobalStore();
    if (requestId && store.has(requestId)) store.delete(requestId);
  }
  static getSurrogateStore(requestId: string | null) {
    const store = getGlobalStore();
    if (requestId) return store.get(requestId);
  }
}
