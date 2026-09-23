import { type Query, type VersionStatus, ZenqlQuery } from "contensis-core-api";
import { Client, type Entry } from "contensis-delivery-api";

import type {
  ContentTypePageWithComponent,
  CreateResolverContext,
  PageLoadOptions,
} from "./models/index.js";
import { prefix } from "./util.js";

/**
 * Content loader is a helper that fetches data from the Contensis Delivery API
 * @param options.headers - headers to include in the requests
 * @param options.versionStatus - override content version status (e.g. 'latest' or 'published')
 * @returns an object with page and search methods to fetch content
 */
export const contentResolver = (
  {
    headers,
    versionStatus,
  }: {
    headers?: Partial<Headers>;
    versionStatus?: string;
  } = {},
  context: CreateResolverContext,
) => {
  const { clientConfig, isDev, isSSR } = context;
  const log = isDev ? console.log : () => {};
  const warn = isDev ? console.warn : () => {};

  const getHeader = (name: string, h = headers) =>
    typeof h?.get === "function" ? h.get(name) : undefined;

  const hostname =
    getHeader("x-orig-host") ||
    getHeader("x-forwarded-host") ||
    getHeader("x-host") ||
    getHeader("host") ||
    (!isSSR && window.location.hostname) ||
    "";
  if (hostname.indexOf("localhost") > -1) clientConfig.versionStatus = "latest";

  const versionStatusHeader = getHeader("x-entry-versionstatus");
  if (versionStatus)
    clientConfig.versionStatus = versionStatus as VersionStatus;
  else if (["published", "latest"].includes(versionStatusHeader || "")) {
    clientConfig.versionStatus = versionStatusHeader as VersionStatus;
  }

  // const requestId = headers?.get('x-surrogate-request-id');
  if (isSSR)
    clientConfig.defaultHeaders = {
      // Add referer header for tracing
      referer: getHeader("referer") || hostname || "",
      "x-require-surrogate-key": "true",
      "x-astro-ssr": "true",
    };

  const client = new Client(clientConfig);

  const page = async <
    MappedEntry extends { [key: string]: any } = { [key: string]: any },
    EntryType extends Entry = Entry,
  >(
    o: PageLoadOptions,
  ): Promise<ContentTypePageWithComponent<MappedEntry, EntryType>> => {
    const pageData: ContentTypePageWithComponent<MappedEntry, EntryType> = {
      api: client,
      component: null,
    };

    const entryId = o.entryId || getHeader("x-entry-id", o.headers || headers);
    const nodeId = o.nodeId || getHeader("x-node-id", o.headers || headers);
    const path = o.path || (o.slug ? `/${o.slug.join("/")}` : undefined);

    // Add the request-scoped surrogate key store to the
    if (isSSR) {
      // Dynamic import aims to avoid Node-specific code in client bundle
      const { GlobalSurrogateTracker, SurrogateTracker } =
        await import("./server/nodejs.js");
      const requestId = getHeader("x-surrogate-request-id");
      const keyStore = requestId
        ? GlobalSurrogateTracker.getSurrogateStore(requestId)
        : SurrogateTracker.getSurrogateStore();

      if (keyStore) {
        client.clientConfig.responseHandler = {
          [200]: keyStore.handleApiResponse.bind(keyStore),
        };

        pageData.getSurrogateKeys = keyStore?.getSurrogateKeys.bind(keyStore);
      }
    }
    try {
      // Resolve the page data
      if (!entryId && !nodeId && !path) {
        warn(
          `${prefix()} No entryId, nodeId or path provided for contentLoader`,
        );
      } else if (nodeId) {
        log(`${prefix()} Resolve node: ${nodeId}`);
        const node = await client.nodes.get({ id: nodeId, entryFields: ["*"] });
        pageData.node = node;
        pageData.entry = node.entry as EntryType;
      } else if (entryId) {
        log(`${prefix()} Resolve entry: ${entryId}`);
        const entry = await client.entries.get(entryId);
        pageData.entry = entry as EntryType;
      } else if (path) {
        log(`${prefix()} Resolve path: ${path}`);
        const node = await client.nodes.get({ path, entryFields: ["*"] });
        pageData.node = node;
        pageData.entry = node.entry as EntryType;
      }

      // Resolve the component to render based on content type mapping
      if (pageData.entry?.sys.contentTypeId) {
        pageData.contentTypeId = pageData.entry.sys.contentTypeId;
        const contentType =
          context.contentTypeMappings?.[pageData.contentTypeId];
        if (contentType) {
          const componentModule =
            typeof contentType.component === "function"
              ? // This should do the dynamic import if the component is defined as a function,
                // otherwise it will just return the component (for static imports)
                await contentType.component()
              : contentType.component;
          const component =
            (componentModule as any)?.default ?? componentModule;
          pageData.component = component;
          // Map the entry to component props if a mapper is provided
          if (contentType.mapper) {
            const mappedEntry = contentType.mapper(pageData.entry);
            pageData.mappedEntry = mappedEntry;
            const entrySys = {
              sys: pageData.entry.sys,
              entryTitle: pageData.entry.entryTitle,
            };
            pageData.entry = entrySys as EntryType;
          }
        }
        // Stub in an empty mappedEntry if we haven't mapped one to avoid undefined
        // in the consumer component
        if (!pageData.mappedEntry) pageData.mappedEntry = {} as MappedEntry;
      }
    } catch (error: unknown) {
      console.error(`${prefix()} Error:`, error);
      if (
        error &&
        typeof error === "object" &&
        "status" in error &&
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
      ? Partial<Omit<ZenqlQuery, "toJSON" | "zenql">>
      : Partial<Omit<Query, "toJSON" | "where">>,
  ) => {
    log(`${prefix()} Search: ${query}`);

    let q: ZenqlQuery | Query;
    if (typeof query === "string") {
      const queryWithVersion = query.includes("sys.versionStatus")
        ? query
        : `sys.versionStatus=${client.clientConfig.versionStatus || "published"} AND ${query}`;
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
