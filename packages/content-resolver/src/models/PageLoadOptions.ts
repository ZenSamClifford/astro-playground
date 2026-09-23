export type PageLoadOptions = Partial<{
  /** As we can't access path in Next.js instead we have [...slug] */
  slug: string[];
  path: string;
  entryId: string;
  nodeId: string;
  headers: Headers;
  request: Request;
  response: Response;
  versionStatus?: string;
}>;
