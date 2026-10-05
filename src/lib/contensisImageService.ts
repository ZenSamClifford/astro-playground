import type { ExternalImageService } from 'astro';
import {
  buildVariantUrl,
  clampWidth,
  isSvg,
  srcSetEntries,
  validateVariantOptions,
} from './contensisImage.ts';
import {
  type ImageOptions,
  resolveImageOptions,
} from './contensisImageOptions.ts';

// Loaded by Astro's Vite pipeline (and by the config loader for type resolution), so
// only dependency-free modules are imported here: no astro:env virtual modules.
// import.meta.env is Vite-only, hence the optional chaining and process fallback.
const isDev = (): boolean =>
  import.meta.env?.DEV ?? process.env.NODE_ENV !== 'production';

// Options come from `image.service.config` in astro.config.mjs, merged over the module
// defaults and validated. Cheap, so each hook resolves them; an invalid config throws
// with a clear message.
const optionsFor = (imageConfig: unknown): ImageOptions =>
  resolveImageOptions(
    (
      imageConfig as
        | { service?: { config?: Partial<ImageOptions> } }
        | undefined
    )?.service?.config
  );

const service: ExternalImageService = {
  // width and height are left as the true displayed size (they become the <img>
  // attributes and feed the srcset descriptors). Snapping to the allowed set happens
  // only where a URL is built (getURL), so the displayed size is never lost.
  validateOptions(options, imageConfig, logger) {
    const o = optionsFor(imageConfig);
    // No width asked for: ask for the largest variant rather than guessing.
    if (!(Number(options.width) > 0)) {
      options.width = clampWidth(Number.MAX_SAFE_INTEGER, undefined, o);
      options.height = undefined;
    }
    // Contensis does the encoding and only WebP is supported (AVIF is ignored by the API).
    options.format = o.format;

    const quality =
      options.quality == null ? o.quality : Number(options.quality);
    const result = validateVariantOptions(
      {
        width: clampWidth(Number(options.width), undefined, o),
        format: options.format as string,
        quality,
      },
      o
    );
    if (!result.ok) {
      // Dev fails loudly; production logs once here and carries on with the default, so
      // getURL and getSrcSet do not each repeat the warning.
      if (isDev()) throw new Error(`[contensisImage] ${result.reason}`);
      logger?.warn?.(
        `[contensisImage] ${result.reason}; using quality ${o.quality}`
      );
      options.quality = o.quality;
    } else options.quality = quality;
    return options;
  },

  getURL(options, imageConfig, logger) {
    const o = optionsFor(imageConfig);
    const src = typeof options.src === 'string' ? options.src : options.src.src;
    // Safety net for a global service: an SVG is never transformed.
    if (isSvg(src)) return src;
    return buildVariantUrl(
      src,
      {
        width: clampWidth(Number(options.width), undefined, o),
        format: options.format as string | undefined,
        quality:
          options.quality === undefined ? undefined : Number(options.quality),
      },
      { isDev: isDev(), logger, options: o }
    );
  },

  // Astro only builds a srcset from the service (getImage never does it for external
  // services), so `widths` on <Image> is turned into one variant per allowed width here.
  // Widths above the displayed width are folded into the cap, as the API never upscales.
  getSrcSet(options, imageConfig) {
    const o = optionsFor(imageConfig);
    // Default to the configured widths so callers need not pass `widths`.
    const widths = options.widths ?? o.widths;
    if (!widths?.length || !options.width) return [];
    // Mirror the getURL bypass: an SVG is never transformed, so it has no variants.
    const src = typeof options.src === 'string' ? options.src : options.src.src;
    if (isSvg(src)) return [];
    // The displayed height is carried over unchanged via the spread. getURL ignores it;
    // Astro only compares it in matchesValidatedTransform, where the width already
    // decides whether a transform is the primary one.
    return srcSetEntries(Number(options.width), o, widths).map(
      ({ width, descriptor }) => ({
        transform: { ...options, width, widths: undefined },
        descriptor,
      })
    );
  },

  getHTMLAttributes(options) {
    const { src, format, quality, widths, ...attributes } = options;
    return {
      ...attributes,
      loading: options.loading ?? 'lazy',
      decoding: options.decoding ?? 'async',
    };
  },
};

export default service;
