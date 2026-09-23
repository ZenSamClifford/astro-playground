import { headers as nextHeaders } from 'next/headers';
import { notFound } from 'next/navigation';
import type { ContentResolverInstance } from '../models/index.js';

const ContentLoader = async ({
  contentResolver,
  params,
  searchParams,
}: {
  contentResolver: ContentResolverInstance;
  params: Promise<{ slug: string[] }>;
  searchParams: Promise<{ entryId?: string; nodeId?: string }>;
}) => {
  const { slug } = await params;
  const { entryId, nodeId } = await searchParams;
  const headers = await nextHeaders();

  const resolve = contentResolver({ headers });

  const { component: ContentTypeComponent, ...pageData } = await resolve.page({
    slug,
    entryId,
    nodeId,
  });

  if (pageData.isPageNotFound || !ContentTypeComponent) {
    notFound();
  }

  return <ContentTypeComponent resolver={resolve} {...pageData} />;
};

export default ContentLoader;
