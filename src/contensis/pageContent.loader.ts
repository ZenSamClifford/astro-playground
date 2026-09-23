import type { LiveLoader } from 'astro/loaders';
import type { Entry } from 'contensis-delivery-api';
import { contentResolver } from '~/contensis.config';

/** Lookup for a single pageContent entry. The loader cannot reach the request,
 * so anything derived from headers (entry/node deep links, editor preview
 * version status) has to be passed in by the route. */
export type PageContentEntryFilter = {
  path?: string;
  entryId?: string;
  nodeId?: string;
  versionStatus?: string;
};

export type PageContentCollectionFilter = {
  pageSize?: number;
  pageIndex?: number;
  versionStatus?: string;
};

const CONTENT_TYPE_ID = 'pageContent';

export const pageContentLoader = (): LiveLoader<
  Entry,
  PageContentEntryFilter,
  PageContentCollectionFilter
> => ({
  name: 'contensis-pagecontent',

  // Stubbed for step 1 — `LiveLoader` declares both methods as required.
  loadEntry: async () => undefined,

  loadCollection: async ({ filter }) => {
    // Build the resolver per call: `contentResolver` mutates versionStatus on
    // the shared clientConfig, so a module-scope instance would freeze it.
    const resolver = contentResolver({ versionStatus: filter?.versionStatus });

    const { items } = await resolver.search(
      `sys.contentTypeId=${CONTENT_TYPE_ID} ORDER BY sys.version.created desc`,
      {
        pageSize: filter?.pageSize ?? 10,
        pageIndex: filter?.pageIndex ?? 0,
      }
    );

    return {
      entries: items.map(entry => ({ id: entry.sys.id, data: entry })),
    };
  },
});
