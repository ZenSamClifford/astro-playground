import { defineMiddleware } from 'astro:middleware';
import { CONTENSIS_ASSETS_URL } from 'astro:env/server';
// import { SurrogateTracker } from './contensis/surrogate-keys';
import { SurrogateTracker } from '@contensis/content-resolver/nodejs';
import { apiProxy } from './contensis/api-proxy';
import { loadPrimaryNavigation } from './contensis/primaryNavigation';
import { contentResolver } from './contensis.config';

// CMS-managed asset paths rendered into canvas/entry content as root-relative
// urls. In production these are served by Contensis cloud routing before the
// request reaches the app, so they only need proxying when running locally.
const cmsAssetPaths = ['/image-library/', '/asset-library/'];

export const onRequest = defineMiddleware(async (context, next) => {
  if (context.url.pathname.startsWith('/api/')) return next();

  // The node adapter serves real files out of dist/client before middleware runs, so
  // anything under /static/ reaching here is a miss. /static is the block's declared
  // static path, which skips node lookup and arrives straight at the block, so falling
  // through would answer a hashed JS request with 200 text/html and fail the module
  // load with nothing to diagnose from.
  if (context.url.pathname.startsWith('/static/'))
    return new Response('Not found\n', {
      status: 404,
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    });

  if (
    CONTENSIS_ASSETS_URL &&
    cmsAssetPaths.some(path => context.url.pathname.startsWith(path))
  )
    return apiProxy(context.request, CONTENSIS_ASSETS_URL);

  return SurrogateTracker.run(async () => {
    // Start the Site View fetch now so it runs alongside the page's own lookup;
    // the Layout awaits it. The resolver's client sends the SSR headers that ask
    // for surrogate keys, and binding this request's store as the response
    // handler adds the Site View keys to the page, so a Site View change purges it.
    const { api } = contentResolver({
      headers: context.request.headers,
      versionStatus: context.url.searchParams.get('versionStatus') ?? undefined,
    });
    const store = SurrogateTracker.getSurrogateStore();
    if (store)
      api.clientConfig.responseHandler = {
        200: store.handleApiResponse.bind(store),
      };
    context.locals.primaryNavigation = loadPrimaryNavigation(api);

    const response = await next();

    // Wait for the response body to fully render
    // This ensures all child components have finished fetching data
    const body = await response.text();
    SurrogateTracker.setCacheKeyHeaders(response.headers);
    console.info(
      `[middleware] ${store?.getSurrogateKeys().length} surrogate keys from API calls [${Array.from(
        store?.apiCalls.values() || []
      )
        .map(call => call.surrogateKeys.length)
        .join(', ')}] in ${context.url.pathname}`
    );

    // Returning the response here without awaiting the body supports streaming,
    // but all surrogate keys won't be included until the entire body has rendered,.
    // By creating a new response after rendering,
    // we can ensure all surrogate keys are included in the initial response headers.
    // return response;

    // Create a new response with the rendered body
    return new Response(body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
  });
});
