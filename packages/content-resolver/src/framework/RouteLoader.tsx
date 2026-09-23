import type { ContentResolverInstance } from '../models/index.js';

const RouteLoader = async ({
  contentResolver,
  headers,
  notFound,
  params,
  searchParams,
}: {
  /** configured content resolver to resolve page content and perform searches */
  contentResolver: ContentResolverInstance;
  /** headers from the incoming request, passed to the content resolver for resolving content using headers set at the request level */
  headers: Partial<Headers>;
  /** callback to trigger Next.js 404 page when content can't be resolved */
  notFound: () => any;
  /** enables dynamic routing with [...slug] to resolve content based on the URL path */
  params: { path?: string; slug?: string[] };
  /** enables search parameters to resolve content by entryId, nodeId, or a versionStatus */
  searchParams: { entryId?: string; nodeId?: string; versionStatus?: string };
}) => {
  const { slug, path } = params;
  const { entryId, nodeId, versionStatus } = searchParams;

  const resolve = contentResolver({ headers, versionStatus });

  const { component: ContentTypeComponent, ...pageData } = await resolve.page({
    slug,
    path,
    entryId,
    nodeId,
  });

  if (pageData.isPageNotFound || !ContentTypeComponent) {
    notFound();
  }

  return <ContentTypeComponent resolver={resolve} {...pageData} />;
};

export default RouteLoader;
