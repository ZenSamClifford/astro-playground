export const prerender = false;

import type { APIRoute } from 'astro';
import { apiProxy } from '~/contensis/api-proxy';

export const ALL = (async ({ request }) => {
  return apiProxy(request);
}) satisfies APIRoute;
