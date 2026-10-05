import { createRequire } from 'node:module';
import path from 'node:path';
import { defineConfig, envField } from 'astro/config';

import react from '@astrojs/react';

import node from '@astrojs/node';

import tailwindcss from '@tailwindcss/vite';

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

// The stylesheet is written for a standalone form page: it resets `*`, `html`,
// `body`, `img`, `p` and form controls, and declares its variables on `:root`.
// Imported as is, it restyles the whole site. Wrapping it in `@scope` limits every
// rule to descendants of `.contensis-form-scope`, so the `html` and `body` rules
// match nothing, and `:root` becomes `:scope` to keep the variables on the wrapper.
function scopeContensisFormsCss() {
  return {
    name: 'scope-contensis-forms-css',
    enforce: 'pre',
    transform(code, id) {
      if (id.split('?')[0] !== contensisFormsCss) return null;
      return {
        code: `@scope (.contensis-form-scope) {\n${code.replace(':root', ':scope')}\n}`,
        map: null,
      };
    },
  };
}

// https://astro.build/config
export default defineConfig({
  integrations: [react()],
  output: 'server',

  adapter: node({
    mode: 'standalone',
  }),

  // Contensis resizes and re-encodes images itself (Image API), so the service only builds
  // variant URLs: no sharp, no transform(). See src/lib/contensisImageService.ts.
  image: {
    service: {
      entrypoint: './src/lib/contensisImageService.ts',
      // These override the defaults in src/lib/contensisImageOptions.ts. Plain values
      // only: this file cannot import TypeScript from src. Invalid values throw when the
      // service loads.
      config: {
        // The only widths ever requested from the Image API (ascending). Other widths
        // are snapped up to the next one, and these also build the Hero srcset.
        widths: [480, 768, 1024, 1440, 1920],
        // Output format. Only 'webp' is supported (the API ignores AVIF).
        format: 'webp',
        // Default quality (1 to maxQuality) when a caller does not pass one.
        quality: 75,
        // Upper bound of the accepted quality range (1 to maxQuality).
        maxQuality: 90,
      },
    },
  },

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

    plugins: [tailwindcss(), scopeContensisFormsCss()],

    // Contensis blocks reject images over 512 MB, and the standalone adapter leaves
    // every `dependencies` package external, so each one ships whole in the runtime
    // node_modules. lucide-react alone is ~45 MB of icons we use a handful of. Bundling
    // these into the server build tree-shakes them to what is imported, which is why
    // they live in devDependencies and `pnpm prune --prod` drops them. Only bundle
    // a package whose own dependencies are also runtime dependencies (cva needs clsx,
    // which astro brings): anything left external but dev-only is pruned, the build
    // still passes, and the server dies with ERR_MODULE_NOT_FOUND. @base-ui/react fails
    // that test, so it stays in dependencies.
    ssr: {
      noExternal: ['lucide-react', 'class-variance-authority', 'cn'],
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
