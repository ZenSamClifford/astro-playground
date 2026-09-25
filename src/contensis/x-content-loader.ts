import { type Query, ZenqlQuery, type VersionStatus } from 'contensis-core-api';
import { Client } from 'contensis-delivery-api';
import { PUBLIC_PROJECT, PUBLIC_ACCESS_TOKEN } from 'astro:env/client';

import type { Entry, Node } from 'contensis-delivery-api';
import type { ClientConfig } from 'contensis-delivery-api/lib/client/client-config';

export type PageLoaderOptions = Partial<{
  slug: string[]; // can't access path in Next.js instead we have [...slug]
  path: string;
  entryId: string;
  nodeId: string;
  headers: Headers;
  request: Request;
  response: Response;
  versionStatus?: string;
}>;

export type PageData = {
  entry?: Entry;
  node?: Node;
  isPageNotFound?: boolean;
  api: Client;
  getSurrogateKeys?: () => string[];
};

const isDev = import.meta.env.DEV;
const isSSR = typeof window === 'undefined';

const log = isDev ? console.log : () => {};
const warn = isDev ? console.warn : () => {};

export type ContentLoader = ReturnType<typeof contentLoader>;
/**
 * Content loader is a helper that fetches data from the Contensis Delivery API
 * @param options.headers - headers to include in the requests
 * @param options.versionStatus - override content version status (e.g. 'latest' or 'published')
 * @returns an object with page and search methods to fetch content
 */
export const contentLoader = ({
  headers,
  versionStatus,
}: {
  headers?: Headers;
  versionStatus?: string;
} = {}) => {
  const clientConfig = {
    // CONTENSIS_API_URL stays on import.meta.env: this loader also runs client-side
    // (see the `typeof window` check above), where astro:env/server is unavailable.
    rootUrl: import.meta.env.CONTENSIS_API_URL as string,
    projectId: PUBLIC_PROJECT,
    accessToken: PUBLIC_ACCESS_TOKEN,
  } as ClientConfig;

  const hostname =
    headers?.get('x-orig-host') ||
    headers?.get('x-forwarded-host') ||
    headers?.get('x-host') ||
    headers?.get('host') ||
    (!isSSR && window.location.hostname) ||
    '';
  if (hostname.indexOf('localhost') > -1) clientConfig.versionStatus = 'latest';

  const versionStatusHeader = headers?.get('x-entry-versionstatus');
  if (versionStatus)
    clientConfig.versionStatus = versionStatus as VersionStatus;
  else if (['published', 'latest'].includes(versionStatusHeader || '')) {
    clientConfig.versionStatus = versionStatusHeader as VersionStatus;
  }

  // const requestId = headers?.get('x-surrogate-request-id');
  if (isSSR)
    clientConfig.defaultHeaders = {
      // Add referer header for tracing
      referer: headers?.get('referer') || hostname || '',
      'x-require-surrogate-key': 'true',
      'x-astro-ssr': 'true',
    };

  const client = new Client(clientConfig);

  const page = async (o: PageLoaderOptions): Promise<PageData> => {
    const pageData: PageData = { api: client };

    const entryId = o.entryId || (o.headers || headers)?.get('x-entry-id');
    const nodeId = o.nodeId || (o.headers || headers)?.get('x-node-id');
    const path = o.path || (o.slug ? `/${o.slug.join('/')}` : undefined);

    if (isSSR) {
      // Dynamic import avoids Node-specific code in client bundle
      const { SurrogateKeyStore, SurrogateTracker } = await import(
        './x-surrogate-keys'
      );

      const keyStore =
        SurrogateTracker.getSurrogateStore() || new SurrogateKeyStore();

      if (keyStore) {
        client.clientConfig.responseHandler = {
          200: keyStore.handleApiResponse.bind(keyStore),
        };

        pageData.getSurrogateKeys = keyStore?.getSurrogateKeys.bind(keyStore);
      }
    }
    try {
      if (!entryId && !path) {
        warn('No entryId or path provided for contentLoader');
      } else if (nodeId) {
        log(`[cl] Resolve node: ${nodeId}`);
        const node = await client.nodes.get({ id: nodeId, entryFields: ['*'] });
        pageData.node = node;
        pageData.entry = node.entry;
      } else if (entryId) {
        log(`[cl] Resolve entry: ${entryId}`);
        const entry = await client.entries.get(entryId);
        pageData.entry = entry;
      } else if (path) {
        log(`[cl] Resolve path: ${path}`);
        const node = await client.nodes.get({ path, entryFields: ['*'] });
        pageData.node = node;
        pageData.entry = node.entry;
      }
    } catch (error: unknown) {
      console.error(`[cl] Error:`, error);
      if (
        error &&
        typeof error === 'object' &&
        'status' in error &&
        error.status === 404
      ) {
        pageData.isPageNotFound = true;
      } else {
        throw error;
      }
    }
    return pageData;
  };

  const search = async <T extends string | Query>(
    query: T,
    options: T extends string
      ? Partial<Omit<ZenqlQuery, 'toJSON' | 'zenql'>>
      : Partial<Omit<Query, 'toJSON' | 'where'>>
  ) => {
    log(`[cl] Search: ${query}`);

    let q: ZenqlQuery | Query;
    if (typeof query === 'string') {
      const queryWithVersion = query.includes('sys.versionStatus')
        ? query
        : `sys.versionStatus=${client.clientConfig.versionStatus || 'published'} AND ${query}`;
      q = new ZenqlQuery(queryWithVersion);
      Object.assign(q, options);
    } else {
      q = query;
      Object.assign(q, options);
    }
    return await client.entries.search(q);
  };

  return {
    api: client,
    page,
    search,
  };
};
