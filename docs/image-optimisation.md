# Image optimisation with the Contensis Image API

## 1. What this is and why

The Hero used to render the raw `sys.uri` from Contensis in a plain `<img>` with a hardcoded `width="1920"`, no `srcset` and no `sizes`. Every visitor got the full JPEG.

This branch registers a custom Astro external image service. Astro asks the service for a URL, the service builds a Contensis Image API URL, and Contensis does the resizing and re-encoding. No `sharp`, no `transform()`, no image work in the Node block.

Goals: fewer image bytes, better LCP and CLS, and less code per component (use `<Image>` and get a `srcset`).

Scope: structured image fields rendered by the Hero, and images inside Canvas (rich text) content (see "Canvas images" below).

## 2. How it works

```
entry image field
  -> mapImage()                 src/contensis.mappers.ts
       getDisplayDimensions()   src/lib/contensisImage.ts   (crop, w/h, properties)
  -> { src, alt, width, height }
  -> <ImageContensis> (Hero)    buildImageAttributes() in src/lib/imageAttributes.ts
       srcSetEntries()          one variant per allowed width
       buildVariantUrl()        w/h/crop kept, width/format/quality appended
  -> /image-library/x.jpeg?w=1920&h=1235&crop=1920,800,0,218&width=768&format=webp&quality=75
```

Step by step:

1. `sys.uri` on the asset already carries the editor's transformations, for example `?w=1920&h=1235&crop=1920,800,0,218`.
2. `mapImage` (in `contensis.mappers.ts`, used by `content`, `landing` and `form`) takes the field and returns `{ src, alt, width, height }`. `width` and `height` are the displayed size from `getDisplayDimensions` (section 4). An empty field maps to `null`.
3. `Hero.astro` is a thin wrapper around `ImageContensis` (see "ImageContensis" below): `sizes="hero"`, `priority` and a 1920x800 `fallbackSize`. The image service (`getSrcSet()`, `getURL()`) stays registered for any other `<Image>` use, and returns an SVG `src` unchanged from `getURL()` as a safety net, since the API ignores `w`, `h` and `crop` for SVG.
4. Astro does not build a `srcset` for external services itself, so the service implements `getSrcSet()`. It clamps each requested width to the allowed set (capped at the displayed width) and drops duplicates. The descriptor uses the true displayed size, so a 1000x400 crop gives `480w, 768w, 1000w` (the 1000w entry points at the 1024 URL, which the API serves at 1000 because it never upscales).
5. `getURL()` snaps the width with `clampWidth` and calls `buildVariantUrl()`.

### URL rewrite rule

Keep the stored `w`, `h` and `crop` unchanged and append `width=N&format=webp&quality=Q`.

| Param in `sys.uri` | Result |
|---|---|
| `w`, `h`, `crop` | kept unchanged |
| `width`, `format`, `quality` already present | dropped, then set by us |
| any other param | kept, sorted by key |
| `w`, `h` or `crop` that fail to parse (decimals, negatives, wrong crop shape) | kept as raw params, so the API sees what the editor stored |

Output order is fixed: `w`, `h`, `crop`, other params sorted by key, `width`, `format`, `quality`. One logical variant always produces one query string, so the CDN cache key is stable, and we never rely on the API's duplicate-param behaviour. `parseImageUri` never throws (a malformed percent escape is kept as raw text).

Why `w`, `h` and `crop` must stay, from the verified Image API semantics:

- A bare `crop=cw,ch,x,y` is applied to the full-size original, in native pixels.
- When `w`, `h` and `crop` are all present, the image is first resized to `w` x `h`, and the crop is taken in that resized space.
- `width` is applied last. It scales proportionally, never upscales, and overrides `w` when there is no crop.

So dropping `w`/`h` changes which region of the picture the crop selects. Example:

```
/image-library/bridge.xb7bbef80.jpeg?w=1920&h=1235&crop=1920,800,0,218&width=768&format=webp&quality=75
```

returns 768x320 of the right region.

### Lessons / how this was caught

An earlier version of the URL builder dropped `w` and `h` and kept only the crop. It served the wrong region of the picture, with a 200 and exactly the right output dimensions, so nothing looked broken. It was caught by code review and then confirmed by a pixel-level comparison: mean absolute difference about 58 for the wrong region against about 3 to 5 for the correct one. Any future change to URL building must be checked by comparing pixels, not just dimensions or bytes (see section 7).

### Validation

`validateOptions()` does not snap `width` or `height`: they stay as the true displayed size and become the `<img>` attributes. Snapping only happens where a URL is built (`getURL`) and in `getSrcSet`. It forces `format` to `webp` and settles quality:

- a number is used as is; no quality uses the default
- invalid quality (not a number, not an integer, below 1 or above `maxQuality`) throws in dev; in production it logs once and uses the default quality

`buildVariantUrl` has its own allow-list check (format, width, quality). Bad input there throws in dev; in production it warns and returns the original `sys.uri`. This matters because the API answers bad params with a 200 JPEG, so a failure would otherwise be silent.

`getHTMLAttributes()` defaults `loading` to `lazy` and `decoding` to `async` and strips `src`, `format`, `quality` and `widths` from the attributes.

## 3. Configuration

Settings are set in `astro.config.mjs` under `image.service.config`, as overrides over the defaults in `src/lib/contensisImageOptions.ts`. The service reads them from the `imageConfig` Astro passes to every hook and resolves them once with `resolveImageOptions()`, which merges the overrides over the defaults and validates the result. A bad value throws a clear `[contensisImage] Invalid image config` error when the service first runs.

| Option | Value | Notes |
|---|---|---|
| `widths` | `[480, 768, 1024, 1440, 1920]` | Non-empty, ascending, unique positive integers. The only widths ever requested. Anything else is snapped up to the next one. Also the default `srcset` widths, so callers do not pass `widths`. |
| `format` | `'webp'` | Only WebP is accepted. AVIF is ignored by the API. |
| `quality` | `75` | Default, 1 to `maxQuality`. |
| `maxQuality` | `90` | Top of the allow-list, 1 to 100. |

`astro.config.mjs`:

```js
image: {
  service: {
    entrypoint: './src/lib/contensisImageService.ts',
    config: {
      widths: [480, 768, 1024, 1440, 1920],
      format: 'webp',
      quality: 75,
      maxQuality: 90,
    },
  },
},
```

Use plain values there: `astro.config.mjs` cannot import TypeScript from `src`. Any option left out falls back to the default. The defaults and the `ImageOptions` type live in their own dependency-free file, so the service and the tests can load them without the `astro:env` virtual modules. Astro does not hot-reload the service: restart the dev server after changing the config or the service.

### Using this in another project

Copy these, keeping the relative imports working:

1. `src/lib/contensisImageOptions.ts`
2. `src/lib/contensisImage.ts`
3. `src/lib/contensisImageService.ts`
4. the three test files (`contensisImage.test.ts`, `contensisImageOptions.test.ts`, `contensisImageService.test.ts`, `imageAttributes.test.ts`) and the `test` script
5. the `mapImage` helper from `src/contensis.mappers.ts`, and use it for every image field you map
6. the `ImageContensis` component, `imageAttributes.ts` and `imageSizes.ts`, and `Hero.astro` as a usage example
7. the `image.service` block above in `astro.config.mjs`, with your own values in `config`

What we found on Astro 7 (7.3.4):

- A root-relative string `src` works with an external service. No `image.remotePatterns` and no `layout` config are needed.
- Astro does not build `srcset` for external services, so `getSrcSet()` is required. The service defaults `widths` to the configured ones, so on `<Image>` only `sizes` is needed.
- The `sys.uri` is relative and is served through the same host as the site, so no domain config is needed.

## 4. Dimension fallback

`width` and `height` on the `<img>` stop layout shift, so we need the displayed size. `getDisplayDimensions()` tries, in order:

| Step | Source | Used for |
|---|---|---|
| 1 | `crop=w,h,x,y` in the uri (then in `transformations`) | Cropped fields: the displayed size and ratio |
| 2 | `w` and `h` in the uri (then in `transformations`) | Size-only fields, e.g. `w=600&h=250` |
| 3 | `asset.sys.properties.width/height` | Original file size. A lone `w` or `h` takes that side from the uri and derives the other from the original ratio (rounded), so `?w=450` on a 4000x3000 original is 450x338. |
| 4 | none | Returns `undefined`. Hero falls back to 1920x800 and warns in dev. |

Verified shapes:

- `sys.uri`: carries the transformations as a query string. This is the main source.
- `transformations`: `null` for unconstrained fields and for exact-match constrained fields (bare uri). Otherwise a query-style string like `w=450&h=300` or `w=1200&h=600&crop=600,600,0,0`.
- `sys.properties`: `{ width, height }` of the original file. SVGs report 0/0, and 0/0 is never trusted.

### linkDepth finding

`sys.properties` is only present at `linkDepth >= 1`. At `linkDepth` 0 the asset comes back as a bare link with just a uri. So for an image with no crop and no size (a bare uri) at `linkDepth` 0, step 3 has nothing to read. `getDisplayDimensions` logs a dev-only warning in that case.

We did not change `linkDepth`. To be raised with product dev separately.

## ImageContensis

`src/components/ImageContensis/ImageContensis.astro` owns the image rules so a consumer cannot get them wrong. It takes a mapped image field and renders one `<img>`.

| Prop | Type | Notes |
|---|---|---|
| `image` | `MappedImage \| null \| undefined` | `{ src, alt, width?, height? }` from `mapImage`. Renders nothing when null or undefined. |
| `sizes` | preset name or string | A name from `src/lib/imageSizes.ts` (`hero`, `article`, `page`) or a raw `sizes` string. Default `(min-width: 768px) 50vw, 100vw`. |
| `priority` | `boolean` | Above the fold: `loading="eager"` and `fetchpriority="high"`, and `src` is the largest variant. |
| `fallbackSize` | `{ width, height }` | Used only when the image has no dimensions, e.g. the Hero passes 1920x800 because its section is a fixed 12/5 box. Without it, an image of unknown size renders without `width` and `height`, and a dev warning says so. |
| `class` and other `<img>` attributes | `HTMLAttributes<'img'>` | Passed through. `src`, `alt`, `width`, `height`, `sizes`, `srcset`, `loading`, `decoding` and `fetchpriority` are owned by the component. |

Rules it applies (in `buildImageAttributes`, `src/lib/imageAttributes.ts`, shared with the canvas renderer):

- WebP `srcset` over the configured widths, capped at the displayed width, with the stored `w`, `h` and `crop` kept in every URL.
- `width` and `height` from the image, else `fallbackSize`, else omitted.
- `loading="lazy"` only when a size is known (a lazy image with no reserved box causes layout shift); otherwise no `loading` attribute, so it stays eager. `priority` forces eager plus `fetchpriority="high"`.
- `decoding="async"` on transformed images, and `alt` always written (`alt=""` when empty).
- An SVG renders a plain `<img>` with `src`, `alt` and `class` only.

One code path: the component renders a plain `<img>` from `buildImageAttributes` rather than Astro's `<Image>`. `<Image>` would only call our service, which calls the same helpers, and it would put a second implementation of the rules (and its own attribute handling) between the component and the output. The canvas renderer calls the same function and escapes the values for its HTML string.

```astro
---
import ImageContensis from '~/components/ImageContensis/ImageContensis.astro';
---
<!-- a structured image field, mapped with mapImage -->
<ImageContensis image={mappedEntry.image} sizes="article" class="rounded-lg" />

<!-- the Hero: above the fold, in a fixed-ratio box -->
<ImageContensis
  class="absolute inset-0 -z-10 size-full object-cover"
  image={image}
  sizes="hero"
  priority
  fallbackSize={{ width: 1920, height: 800 }}
/>
```

Use `ImageContensis` for an image field you render yourself. Use `createAstroCanvasRenderer` for images inside Canvas (rich text) content: it applies the same rules to the `_image` blocks.

## Canvas images

Canvas image blocks are `{ id, type: '_image', value: { altText, caption?, asset, transformations } }`. Delivery returns `transformations` as a query-style string (`w=450&h=300`, `crop=400,300,100,50`, `w=600&h=400&crop=300,300,10,20`) or `null`, and `asset.sys.uri` carries the same query. So `getDisplayDimensions` works unchanged on the block value. At `linkDepth` 0 the asset has only `sys.uri`; at `linkDepth` 1 it also has `sys.properties.width/height` (SVG reports 0x0).

`src/lib/canvasRenderer.ts` exports `createCanvasRenderer(options?)`, a `createRenderer` from `@contensis/canvas-html` with one override, `_image`. It is plain TypeScript with no `astro:` imports, so tests load it under node. The three canvas call sites (`ContentPage`, `ContentArticle`, `LandingPage`) use it through `createAstroCanvasRenderer({ sizes? })` in `src/lib/canvasRendererAstro.ts`. That small module is the only one with `astro:` imports: it passes `imageConfig.service.config` from `astro:assets` (so `astro.config.mjs` stays the single source of truth), `import.meta.env.DEV` and a `console.warn`.

| Option | Default | Notes |
|---|---|---|
| `sizes` | `'(min-width: 768px) 50vw, 100vw'` | The `sizes` attribute for every canvas image. Generic on purpose (full width on narrow screens, half width from 768px up): set it per call site to match your layout. It is a call-site option, not part of `astro.config.mjs`. |
| `imageOptions` | defaults | Same overrides as the service config (widths, quality, and so on). Invalid values throw when the renderer is created. |
| `isDev` | `false` | Dev only: warn when an image has no known dimensions. |
| `onWarn` | none | Receives the dev warning. |

What each image becomes:

- `src` is a 768 variant (capped by the displayed width when known), `srcset` is one WebP variant per allowed width, built by the same `srcSetEntries` helper the service uses, so descriptors are capped at the real displayed width and never duplicated.
- The variant URLs keep the stored `w`, `h` and `crop` and append `width`, `format` and `quality` (the same rule as the Hero).
- `decoding="async"` always, and `loading="lazy"` only when `width` and `height` are known. A bare image at `linkDepth` 0 has no intrinsic size, so it gets no `loading` attribute and stays eager (the browser default): a lazy image with no reserved box pushes content down when it loads. Measured on the branch preview at a 500px viewport with 7 bare images: CLS 0.2355 with lazy bare images against 0 on the old build, which was eager. They stay eager until dimensions are available at `linkDepth` 0 (a product dev ask). No `fetchpriority`.
- `width` and `height` only when the displayed size is known (crop, then `w`/`h`, then `sys.properties`). Otherwise they are left out and a dev warning is logged. Nothing is guessed.
- `alt` is always written, as `alt=""` when empty. Attribute values are HTML-escaped, so `&` in a URL becomes `&amp;`.
- A caption becomes `<figure>` plus `<figcaption>`. The stock renderer also copied the caption into a `title` attribute; that duplicate is dropped.
- SVG is not transformed: it renders as a plain `<img src alt>` with no `srcset`, `width` or `height`. The service's `getSrcSet()` also returns no entries for an SVG, matching its `getURL()` bypass. An image with no asset uri renders nothing, and in dev logs a warning naming the block id.
- In dev, `getDisplayDimensions` warns whenever a size cannot be resolved: no `sys.properties` (a link), or properties with 0 or null width or height. An SVG stays silent, since it has no pixel size.

Known consequence: a bare image (no crop, no size) at `linkDepth` 0 has no dimensions, so it has no `width`/`height` and can cause layout shift while loading. Raising `linkDepth` for the canvas field fixes it (properties then exist), at the cost of a larger response. We did not change `linkDepth`.

Choosing `sizes`: the default is `(min-width: 768px) 50vw, 100vw`. The call sites pass the named presets in `src/lib/imageSizes.ts` (`article` for `ContentArticle` and `LandingPage`, `page` for `ContentPage`), whose comment block names the layout classes each mirrors, so change them together:

| Call site | `sizes` | Why |
|---|---|---|
| `ContentArticle`, `LandingPage` | `(min-width: 768px) 592px, (min-width: 730px) 666px, calc(100vw - 4rem)` | `main.p-8` (2rem each side) around a column of `max-w-[37em]` on a `.typeset-article` element. Its font size is 18px below 768px (`--typeset-size` 16px x 1.125) and 16px from 768px, so the column is at most 666px below 768px (reached at a 730px viewport, since 730 - 64 = 666) and 592px from 768px. The `lg` grid track is `37em` of 16px, also 592px. |
| `ContentPage` | `calc(100vw - 4rem)` | `main` has 2em (32px) padding and no maximum width. |

Measured in Chrome on a production build: the prose column is 592px at 1440, 900 and 768px viewports, 666px at 740px and 436px at 500px, as computed.

Why not a plain `50vw`: a phone, where the image usually fills the column, would ask for about half the pixels it needs. For a 900x600 image at `linkDepth` 1 (srcset 480w, 768w, 900w), a 390px viewport at DPR 3 needs 1170 pixels and picks 900w (the largest) with `100vw` below 768px, but needs only 585 and picks 768w under a plain `50vw`. A 1440px viewport at DPR 1 picks 768w under the default (needs 720).

Copy checklist for another project: `canvasRenderer.ts` and its test with `src/lib/fixtures/`, `canvasRendererAstro.ts`, `imageAttributes.ts`, `imageSizes.ts` and the shared `srcSetEntries` in `contensisImage.ts`, and in each component `createAstroCanvasRenderer({ sizes })` in place of `createRenderer()`, with `sizes` a preset or computed from your own layout. The image service and `astro.config.mjs` block from section 3 are required too.

## 5. Contensis Image API facts (verified)

| Behaviour | Result |
|---|---|
| `width`, `format`, `quality` | Supported |
| `format=webp` | Supported, returns `image/webp` |
| `format=avif` | Silently ignored, original format returned |
| Bad params (bad format, quality out of range, etc.) | 200 with a JPEG, no error |
| `Accept` header negotiation | None. Format must be in the URL. |
| Upscaling | Never. A `width` above the original returns the original size. |
| `crop` alone | Applied to the original in native pixels |
| `w` + `h` + `crop` | Resize to `w` x `h` first, crop taken in that space |
| `width` | Applied last, proportional; overrides `w` when there is no crop |
| Duplicate params | Last wins (we do not depend on it) |
| SVG | `w`, `h`, `crop` ignored |
| Cache | Each distinct query string is its own cache entry |

Caching headers observed on WebP variants (served by the Contensis Varnish, `x-host` preview host):

- `cache-control: public, max-age=31536000`
- `etag` present, `accept-ranges: bytes`, `x-content-type-options: nosniff`
- no `Vary` header, even with `Accept-Encoding: gzip`; no `content-encoding` (WebP is not recompressed). No `Vary` is correct here because the format is in the URL.

The public contensis.com site returned an empty `cache-control` on images when checked. Spot-check headers on the real production hostname after deploy; this is not done yet.

Other notes: drafts get a different hashed uri, and previews must request `versionStatus=latest` explicitly (search ignored it in testing). Stored `size` values can exceed the source because the API will not upscale, so do not treat them as real pixels.

## 6. Results

Production build, Lighthouse 12 CLI, mobile, simulated Slow 4G, 3 runs per page (scores, LCP and FCP identical across runs, LCP within 1 ms). Baseline is the same branch before any image change.

### Mobile

| Page | Metric | Baseline | After | Change |
|---|---|---|---|---|
| `/content` (landing) | Perf score | 0.71 | 0.75 | +0.04 |
| | LCP | 6.15 s | 4.80 s | -22% |
| | FCP | 3.38 s | 3.53 s | +4% |
| | CLS | 0 | 0.00024 | negligible |
| | TBT | 0 | 0 | none |
| | Hero bytes | 299,008 (jpeg) | 24,270 (webp, 768w) | -91.9% |
| article (`/content/the-office-kettle-...`) | Perf score | 0.70 | 0.76 | +0.06 |
| | LCP | 6.00 s | 4.65 s | -22% |
| | FCP | 3.53 s | 3.53 s | none |
| | CLS | 0 | 0 | none |
| | TBT | 0 | 0 | none |
| | Hero bytes | 240,597 (jpeg) | 12,462 (webp, 768w) | -94.8% |

Mobile picked the 768w variant on both pages (measured with `sizes="100vw"`, about 412 CSS px at DPR 1.75; the corrected `sizes` below gives the same pick there). The Hero is the only image request on each page and is the LCP element. The production HTML has `src` (width 1920) plus a five-entry `srcset`, `sizes="(min-width: 1088px) 1024px, calc(100vw - 4rem)"`, `fetchpriority="high"` and `loading="eager"`, and all five variants return 200 `image/webp`.

### Desktop (1 run per page, measured with `sizes="100vw"`, 1440w chosen)

| Page | Score | LCP | FCP | CLS | Hero bytes | Old jpeg | Change |
|---|---|---|---|---|---|---|---|
| landing | 0.98 | 1.00 s | 0.74 s | 0.00007 | 98,359 | 299,008 | -67.1% |
| article | 0.98 | 1.00 s | 0.74 s | 0 | 61,026 | 240,597 | -74.6% |

That run used `sizes="100vw"`, but the Hero only renders 1024px wide on a 1440px window, so the browser fetched the 1440w variant when 1024w was enough. The Hero `sizes` now describes the real rendered width (see "Hero `sizes`" below). With it, a 1440px window at DPR 1 picks 1024w: 43,402 B on `/content` (-85.5% against the old 299,008 B JPEG) and 22,856 B on the article page (-90.5% against 240,597 B). Lighthouse was not rerun after this change, so the scores and times above are from the 1440w run.

### Hero `sizes`

The templates (`LandingPage`, `ContentArticle`, `FormPage`) wrap the Hero in `main.p-8` (2rem padding each side) and `div.max-w-5xl` (64rem, 1024px). So the Hero is `100vw - 4rem` wide until the viewport reaches 1024px + 4rem = 1088px, and 1024px wide after that. `Hero.astro` passes `sizes="hero"`, the `hero` preset in `src/lib/imageSizes.ts` (`(min-width: 1088px) 1024px, calc(100vw - 4rem)`), whose comment names these values: change them together if the layout changes.

Checked on the production build in Chrome (cache ignored, page reloaded after each change, since browsers do not downgrade a loaded image):

| Viewport | DPR | Rendered width | Variant picked | Bytes |
|---|---|---|---|---|
| 1440 | 1 | 1024 | 1024w | 43,402 |
| 500 | 1 | 436 | 480w | 9,470 |
| 1440 | 2 | 1024 | 1920w | 232,162 |
| 500 | 2 | 436 | 1024w | 43,402 |
| 1440 (article page) | 1 | 1024 | 1024w | 22,856 |

### Variant sizes (bytes)

| Width | `/content` | article |
|---|---|---|
| 480 | 9,470 | 3,898 |
| 768 | 23,378 | 11,578 |
| 1024 | 43,402 | 22,856 |
| 1440 | 97,422 | 60,118 |
| 1920 | 232,162 | 157,232 |

### Pixel check

Mean absolute difference on greyscale, variant against the stored-uri JPEG downscaled to the same width. About 5 or below is a match.

| Check | MAD |
|---|---|
| `/content` 768 vs stored at 768 | 3.80 |
| `/content` 1440 vs stored at 1440 | 4.81 |
| article 768 vs stored at 768 | 2.94 |
| article 1440 vs stored at 1440 | 4.04 |
| control: `/content` 768 vs the article's stored image | 45.41 |
| control: article 768 vs the `/content` stored image | 45.81 |
| control: `/content` 1440 vs the article's stored image | 45.60 |
| control: article 1440 vs the `/content` stored image | 46.17 |

The real comparisons sit at 3 to 5 and the wrong-region controls at about 45, so the test discriminates. The production build serves the right crop region.

### Caveats

- Both pages are FCP-bound at about 3.5 s under simulated throttling, so the LCP gain is about 22% and cannot go much further. FCP did not move because it is not image related.
- The 1920 variant is only about 22% smaller than the old JPEG body (232,162 B against 297,966 B). The big wins are on smaller viewports.
- Desktop has no old-build baseline. I did not check out the old code, so the desktop comparison is bytes only.
- Lighthouse throttling is simulated, so absolute times are indicative. The byte figures are real transfers.
- Measured against the local Node server proxying the preview host, not the production CDN.
- The tiny `/content` CLS of 0.00024 (desktop 0.00007) was not investigated.

## 7. Testing

```sh
pnpm test
```

That runs `node --test src/lib/*.test.ts` (101 tests, no extra install). They cover URI parsing (including values that fail to parse and malformed escapes), SVG detection, width clamping and caps, the allow-list, deterministic URL building with `w`/`h`/`crop` kept (dev throw, production warn and fallback), the fallback steps including `transformations` string forms and null safety, and the service (`validateOptions` then `getSrcSet`, true displayed size in descriptors, no duplicate descriptors, the SVG bypass, HTML attributes), the shared image rules and `sizes` presets (`imageAttributes.test.ts`), and the canvas renderer (`canvasRenderer.test.ts`, rendering real delivery blocks kept in `src/lib/fixtures/`).

`testImage` scenarios checked against real entries at `linkDepth` 0 and 1 (the `zz-test` entries):

- unconstrained jpeg, bare uri
- exact-match constrained fields (`imageHeightFixed`, `imageWidthFixed`, `imageWidthHeightFixed`)
- png, webp, gif, svg
- size-only and crop-only uris
- larger-than-source size and crop
- png with size and with crop
- empty field (`mapImage` returns `null`)

Dimensions resolved per the fallback table, SVG was left untouched, and the dev warning fired only for bare-uri images at `linkDepth` 0.

Clean-up still pending: the `zz-test` entries (14) and assets (8) are still in the CMS. Delete the entries first, then the assets.

### How to pixel-check a variant

Dimensions and bytes are not enough (see the lessons note in section 2). To check a variant:

1. Download the variant URL and the stored-uri image (the plain `sys.uri` with its own `w`/`h`/`crop`).
2. Downscale the stored image to the variant's width with `sips`, and convert both to BMP with `sips -s format bmp`.
3. Compute the mean absolute difference over the greyscale pixels.
4. About 5 or below is a match. A wrong region is around 45 or higher.
5. Also compare the variant against a different image as a control, to prove the test can fail.

The scripts used for this are not in the repo; this is the method.

## 8. Known gaps and future work

- **`linkDepth` 0, bare uri:** no dimensions, so the Hero uses a 1920x800 fallback and the srcset has all five widths, even if the original is much smaller.
- **Crop larger than the source:** the API returns a smaller image, but we report the crop size as the displayed size, so the `width`/`height` attributes are wrong.
- **Size-only fields round up one step:** `w=450` requests 480, `w=600` requests 768. This is by design (fixed width set), but the variant is slightly bigger than needed.
- **Canvas images at `linkDepth` 0 without a crop or size have no `width`/`height`**, so they can shift layout as they load (see "Canvas images").
- **No AVIF and no `<picture>` fallback.** The API ignores AVIF and does no Accept negotiation, so WebP only.
- **`pnpm astro check` has 8 existing errors elsewhere** (the content-resolver Next loader, `contensis-core-api` imports in Forms, `searchQueries.ts`, the deprecated SimpleSearch). None are in the image code.
- **Production headers not spot-checked yet** (section 5).
- **`linkDepth` behaviour** needs raising with product dev (properties only at `linkDepth >= 1`).
