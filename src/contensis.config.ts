import { PUBLIC_ACCESS_TOKEN, PUBLIC_PROJECT } from 'astro:env/client';
import { createContentResolver } from '@contensis/content-resolver';
import * as contentTypes from './contensis.mappers';

export const contentResolver = createContentResolver({
  clientConfig: {
    // The non-public env variables are not exposed to the client bundle,
    // So when we use this client-side the rootUrl will be empty
    // The API calls will pass through our api proxy instead (pages/api/[...slug].ts)
    // It can be changed to a public variable however this will use CORS
    // CONTENSIS_API_URL stays on import.meta.env: this module is imported by client
    // components, and astro:env/server cannot be referenced in client-reachable code.
    rootUrl: import.meta.env.CONTENSIS_API_URL as string,
    projectId: PUBLIC_PROJECT,
    accessToken: PUBLIC_ACCESS_TOKEN,
  },
  contentTypeMappings: {
    ...contentTypes,
    contensis17382Ct: contentTypes.contentPageReact,
    pageContent: contentTypes.contentPageAstro,
  },
  isDev: import.meta.env.DEV,
});
