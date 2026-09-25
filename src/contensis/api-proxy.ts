import { CONTENSIS_CMS_URL } from 'astro:env/server';

export const apiProxy = async (request: Request, targetUrl?: string) => {
  const { pathname, search } = new URL(request.url);
  const proxyURL = new URL(
    `${pathname}${search}`,
    targetUrl || CONTENSIS_CMS_URL
  );
  const proxyRequest = new Request(proxyURL, request);

  try {
    console.log(`Proxy api request to ${proxyURL}`);
    const response = await fetch(proxyRequest);

    // Remove headers that conflict with decoded body
    const headers = new Headers(response.headers);
    headers.delete('content-encoding');
    headers.delete('content-length');

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: headers,
    });
  } catch (reason) {
    const message =
      reason instanceof Error ? reason.message : 'Unexpected exception';
    return new Response(message, { status: 500 });
  }
};
