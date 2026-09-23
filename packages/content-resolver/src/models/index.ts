import type {
  ContentTypeMapping,
  ContentTypeMappings,
} from './ContentTypeMapping.js';
import type { contentResolver } from '../resolver.js';
import type {
  Config as ClientConfig,
  Entry,
  StrictEntry,
} from 'contensis-delivery-api';

export type CreateResolverContext = Readonly<{
  clientConfig: ClientConfig;
  contentTypeMappings?: ContentTypeMappings;
  isDev?: boolean;
  isSSR?: boolean;
}>;

export type ContentResolver = ReturnType<typeof contentResolver>;
export type ContentResolverOptions = Parameters<typeof contentResolver>[0];
export type ContentResolverInstance = (
  resolverOptions: ContentResolverOptions
) => ContentResolver;

/**
 * Helper to define a content type mapping with full type inference.
 * Enforces that the mapper's input/output types are consistent.
 */
export function defineMapping<
  ComponentProps,
  EntryType = Entry,
  ComponentType = any,
>(
  mapping: ContentTypeMapping<
    ComponentProps,
    EntryType & StrictEntry,
    ComponentType
  >
): ContentTypeMapping<ComponentProps, EntryType & StrictEntry, ComponentType> {
  return mapping;
}

export * from './ContentTypeMapping.js';
export * from './ContentTypePageProps.js';
export * from './PageLoadOptions.js';
export * from './RouteLoaderProps.js';
