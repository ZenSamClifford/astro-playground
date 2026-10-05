import {
  buildVariantUrl,
  clampWidth,
  isSvg,
  srcSetEntries,
} from './contensisImage.ts';
import { DEFAULT_SIZES } from './imageSizes.ts';
import { type ImageOptions, imageOptions } from './contensisImageOptions.ts';

export interface ImageAttributeInput {
  /** A Contensis asset uri, with the field's w/h/crop query. */
  src: string;
  alt?: string | null;
  /** Displayed size, when known (crop, then w/h, then sys.properties). */
  width?: number;
  height?: number;
  /** An already resolved `sizes` value. */
  sizes?: string;
  /** Above the fold: eager and high fetch priority. */
  priority?: boolean;
  /** Used only when the image has no dimensions of its own, e.g. a fixed-ratio box. */
  fallbackSize?: { width: number; height: number };
}

export interface ImageAttributes {
  src: string;
  alt: string;
  srcset?: string;
  sizes?: string;
  width?: number;
  height?: number;
  loading?: 'lazy' | 'eager';
  fetchpriority?: 'high';
  decoding?: 'async';
}

export interface ImageAttributeContext {
  options?: ImageOptions;
  isDev?: boolean;
  logger?: { warn: (message: string) => void };
}

// Width of the plain `src` fallback for non-priority images, for browsers without srcset.
const FALLBACK_WIDTH = 768;

/**
 * The one place the image rules live, used by the ImageContensis component and the canvas
 * renderer. Values are plain (unescaped); the caller escapes them for HTML.
 *
 * - SVG is never transformed: just src and alt.
 * - WebP `srcset` over the fixed widths, capped at the displayed width (srcSetEntries),
 *   with the stored w/h/crop kept in every URL (buildVariantUrl).
 * - width and height from the image, else the fallback size, else omitted.
 * - loading is lazy only when width and height are known. A lazy image with no reserved
 *   box pushes content down when it loads (measured CLS 0.2355 against 0), so those
 *   stay eager (no attribute). `priority` forces eager plus fetchpriority high.
 * - alt is always written, as "" when empty.
 */
export const buildImageAttributes = (
  input: ImageAttributeInput,
  context: ImageAttributeContext = {}
): ImageAttributes => {
  const alt = input.alt ?? '';
  if (isSvg(input.src)) return { src: input.src, alt };

  const options = context.options ?? imageOptions;
  const buildContext = {
    isDev: context.isDev ?? false,
    logger: context.logger,
    options,
  };
  const known = input.width && input.height;
  const size = known
    ? { width: input.width as number, height: input.height as number }
    : input.fallbackSize;
  const url = (width: number) =>
    buildVariantUrl(input.src, { width }, buildContext);
  // A priority image's src is the largest variant (what the browser would pick on a wide
  // screen); others use a mid-size one.
  const srcWidth = input.priority ? Number.MAX_SAFE_INTEGER : FALLBACK_WIDTH;

  return {
    src: url(clampWidth(srcWidth, size?.width, options)),
    alt,
    srcset: srcSetEntries(size?.width, options)
      .map(e => `${url(e.width)} ${e.descriptor}`)
      .join(', '),
    sizes: input.sizes ?? DEFAULT_SIZES,
    width: size?.width,
    height: size?.height,
    loading: input.priority ? 'eager' : size ? 'lazy' : undefined,
    fetchpriority: input.priority ? 'high' : undefined,
    decoding: 'async',
  };
};
