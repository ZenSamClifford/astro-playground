import { defineLiveCollection } from 'astro:content';
import { pageContentLoader } from '~/contensis/pageContent.loader';

/** Live collections must be declared in this file — `defineLiveCollection`
 * throws for any importer whose filename does not contain `live.config`. */
export const collections = {
  pageContent: defineLiveCollection({ loader: pageContentLoader() }),
};
