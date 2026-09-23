import { createRequire } from 'node:module';
import path from 'node:path';
import { defineConfig, envField } from 'astro/config';

import react from '@astrojs/react';

import node from '@astrojs/node';

// @contensis/forms ships its stylesheet at dist/contensis-forms.css, but its
// package `exports` field only exposes the `.` entry, so a bare deep import
// (`@contensis/forms/dist/contensis-forms.css`) is blocked. Resolve the JS
// entry (which IS exported) and derive the sibling CSS path so the alias works
// regardless of where the package is hoisted.
const require = createRequire(import.meta.url);
const contensisFormsCss = path.join(
  path.dirname(require.resolve('@contensis/forms')),
  'contensis-forms.css'
);

// https://astro.build/config
export default defineConfig({
  integrations: [react()],
  output: 'server',

  adapter: node({
    mode: 'standalone',
  }),

  build: {
    // Contensis blocks only serve paths under a declared static path, and `/static`
    // is the default one injected when a block declares none. The Request Handler
    // rewrites literal `/static/...` strings in served HTML, JS and CSS to a
    // `/_{hash}_{blockVersionId}/static/...` prefix, and only the prefixed form
    // resolves. Astro's default `_astro` directory sits outside that path, so every
    // bundled asset would 404 once deployed. Renaming it here changes both the
    // directory under dist/client and the emitted URL. `base` would be wrong: it
    // prefixes page routes too, and those must stay as node-resolved friendly paths.
    assets: 'static',
  },

  vite: {
    resolve: {
      alias: {
        '@contensis/forms/styles.css': contensisFormsCss,
      },
    },
  },

  env: {
    schema: {
      // Public — bundled to client + server, accessed via astro:env/client
      PUBLIC_PROJECT: envField.string({ context: 'client', access: 'public' }),
      PUBLIC_ACCESS_TOKEN: envField.string({
        context: 'client',
        access: 'public',
      }),
      // Optional: only set when the ESM Forms render tab is configured
      PUBLIC_ALIAS: envField.string({
        context: 'client',
        access: 'public',
        optional: true,
      }),
      // Secret — never bundled, read at runtime, accessed via astro:env/server.
      // Optional: only set when the Management API form feature is configured.
      CONTENSIS_CLIENT_ID: envField.string({
        context: 'server',
        access: 'secret',
        optional: true,
      }),
      CONTENSIS_CLIENT_SECRET: envField.string({
        context: 'server',
        access: 'secret',
        optional: true,
      }),
      // Server-only proxy target URL, not exposed to the client
      CONTENSIS_CMS_URL: envField.string({
        context: 'server',
        access: 'public',
      }),
      // Website host that serves CMS asset paths (/image-library, /asset-library),
      // e.g. https://preview-{alias}.cloud.contensis.com (or live-) — the cms- host
      // returns 404 for these paths. Optional: when unset, asset paths fall through
      // to the content route and return 404 in local dev.
      CONTENSIS_ASSETS_URL: envField.string({
        context: 'server',
        access: 'public',
        optional: true,
      }),
      // NOTE: CONTENSIS_API_URL is intentionally NOT declared here. It is used in the
      // client-reachable contensis.config.ts where it must be undefined in the browser
      // (the delivery client then proxies through /api/...). astro:env/server cannot be
      // imported client-side, so it stays on import.meta.env.CONTENSIS_API_URL.
    },
  },
});
