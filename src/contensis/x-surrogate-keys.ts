import { AsyncLocalStorage } from 'node:async_hooks';

const surrogateKeyStorage = new AsyncLocalStorage<SurrogateKeyStore>();


export class SurrogateTracker {
  static run<T>(callback: () => T): T {
    const store = new SurrogateKeyStore();
    return surrogateKeyStorage.run(store, callback);
  }

  static getSurrogateStore(): SurrogateKeyStore | undefined {
    return surrogateKeyStorage.getStore();
  }
}

export class SurrogateKeyStore {
  apiCalls: { url: string; statusCode: number; surrogateKeys: string[] }[] = [];
  surrogateKeys: Set<string> = new Set();

  handleApiResponse(response: Response) {
    const surrogateKeyHeader = response.headers.get('surrogate-key');
    const url = response.url;
    const statusCode = response.status;
    const surrogateKeys = surrogateKeyHeader
      ? surrogateKeyHeader.split(' ').filter(Boolean)
      : [];
    this.apiCalls.push({ url, statusCode, surrogateKeys });
    surrogateKeys.forEach(key => this.surrogateKeys.add(key));
  }

  getSurrogateKeys(): string[] {
    return Array.from(this.surrogateKeys);
  }
}
