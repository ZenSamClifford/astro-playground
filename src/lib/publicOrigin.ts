/** The origin visitors use to reach the site, for absolute URLs such as the
 * canonical link. Behind the Contensis request handler the `Host` header is the
 * block's internal host and `x-orig-host` carries the public one. The scheme is
 * https everywhere except localhost. */
export const publicOrigin = (request: Request, url: URL): string => {
  const host = request.headers.get('x-orig-host');
  if (!host) return url.origin;
  return `${host.startsWith('localhost') ? 'http' : 'https'}://${host}`;
};
