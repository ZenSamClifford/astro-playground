'use client';

import { useCallback, useEffect, useState, type ComponentType } from 'react';
import type { ContentResolverInstance } from '../models/index.js';

type ResolvedPage = {
  ContentTypeComponent: ComponentType<any>;
  resolve: ReturnType<ContentResolverInstance>;
  pageData: Record<string, any>;
};

const ClientRouteLoader = ({
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
  const [resolvedPage, setResolvedPage] = useState<ResolvedPage | null>(null);

  const resolvePage = useCallback(() => {
    const { slug, path } = params;
    const { entryId, nodeId, versionStatus } = searchParams;

    const resolve = contentResolver({ headers, versionStatus });

    resolve
      .page({ slug, path, entryId, nodeId })
      .then(({ component: ContentTypeComponent, ...pageData }) => {
        setResolvedPage({ ContentTypeComponent, resolve, pageData });
      });
  }, [contentResolver, headers, params, searchParams]);

  if (typeof window == 'undefined') resolvePage();

  useEffect(() => {
    resolvePage();
  }, [resolvePage]);

  if (!resolvedPage) return null;

  const { ContentTypeComponent, resolve, pageData } = resolvedPage;

  if (pageData.isPageNotFound || !ContentTypeComponent) {
    return notFound();
  }

  return <ContentTypeComponent resolver={resolve} {...pageData} />;
};

export default ClientRouteLoader;
