import type {
  ContentResolverInstance,
  ContentResolverOptions,
  CreateResolverContext,
} from './models/index.js';
import { contentResolver } from './resolver.js';

export * from './models/index.js';

/**
 * Typically called once per application and driven with environment-specific global variables, creates a content resolver instance with the provided client configuration.
 *
 * The content resolver is a helper that fetches data from the Contensis Delivery API and can be used throughout the application to load content.
 * @param context client configuration for the content resolver, API settings for the Delivery API.
 * @returns a content resolver function that accepts options and returns a content resolver instance
 */
export const createContentResolver = (
  context: CreateResolverContext
): ContentResolverInstance => {
  // Return a connected content resolver with the provided context
  return (options: ContentResolverOptions) =>
    contentResolver(options, {
      isSSR: typeof window === 'undefined',
      ...context,
    });
};
