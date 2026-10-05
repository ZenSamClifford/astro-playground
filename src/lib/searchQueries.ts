import type { ContentResolver } from '@contensis/content-resolver';
import type { IExpression } from 'contensis-core-api';
import { Op, OrderBy, Query } from 'contensis-delivery-api';
import { listings } from '~/search.config';

/**
 * Server-side helpers for delivery queries built on the resolver. Settings
 * live in search.config.ts. For a new small query (a mini listing, say), add
 * a function here that builds on baseQuery and runs through runQuery.
 */

type SearchOptions = Parameters<ContentResolver['search']>[1];

// A Query object skips the resolver's zenql version handling, so the version
// status has to be matched here
export const baseQuery = (
  resolver: ContentResolver,
  ...ops: IExpression[]
): Query =>
  new Query(
    Op.equalTo(
      'sys.versionStatus',
      resolver.api.clientConfig.versionStatus || 'published'
    ),
    ...ops
  );

// A failed search returns null so the caller can degrade rather than fail the
// whole page
export const runQuery = async (
  resolver: ContentResolver,
  query: Query,
  options?: SearchOptions
) => {
  try {
    return await resolver.search(query, options ?? {});
  } catch (error) {
    console.error('Search failed', error);
    return null;
  }
};

// Other entries that share at least one category with the current one,
// newest first
export const findRelated = async (
  resolver: ContentResolver,
  { entryId, categories }: { entryId: string; categories: string[] }
) => {
  const { contentTypes, fields, pageSize, matchField } = listings.related;
  if (!categories.length) return [];

  const query = baseQuery(
    resolver,
    Op.in('sys.contentTypeId', ...contentTypes),
    Op.in(matchField, ...categories),
    Op.not(Op.equalTo('sys.id', entryId)),
    Op.exists('sys.uri', true)
  );
  query.orderBy = OrderBy.desc('sys.version.created');

  const results = await runQuery(resolver, query, {
    pageSize,
    fields: [...fields],
  });
  return results?.items ?? [];
};
