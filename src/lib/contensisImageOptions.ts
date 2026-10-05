// Dependency-free so it can be imported by the image service, tests and client code
// without pulling in astro:env virtual modules (see contensis.config.ts).
export interface ImageOptions {
  /** Fixed set of widths the Contensis Image API is asked for. */
  widths: readonly number[];
  /** WebP only: the API ignores AVIF and does no Accept negotiation. */
  format: 'webp';
  /** Default quality, 1 to maxQuality. */
  quality: number;
  /** Upper bound of the quality allow-list. */
  maxQuality: number;
}

export const imageOptions: ImageOptions = {
  widths: [480, 768, 1024, 1440, 1920],
  format: 'webp',
  quality: 75,
  maxQuality: 90,
};

const isPositiveInt = (n: unknown): n is number =>
  typeof n === 'number' && Number.isInteger(n) && n > 0;

/**
 * Merge overrides (from `image.service.config` in astro.config.mjs) over the defaults
 * and validate the result. Throws a clear error on invalid config, so a bad value fails
 * when the service loads rather than producing odd URLs later.
 */
export const resolveImageOptions = (
  overrides: Partial<ImageOptions> | null | undefined = {}
): ImageOptions => {
  const defined = Object.fromEntries(
    Object.entries(overrides ?? {}).filter(([, v]) => v !== undefined)
  );
  const merged = { ...imageOptions, ...defined } as ImageOptions;
  const fail = (message: string): never => {
    throw new Error(`[contensisImage] Invalid image config: ${message}`);
  };

  const { widths, format, quality, maxQuality } = merged;
  if (!Array.isArray(widths) || widths.length === 0)
    fail('widths must be a non-empty array');
  if (!widths.every(isPositiveInt)) fail('widths must be positive integers');
  if (widths.some((w, i) => i > 0 && w <= widths[i - 1]))
    fail('widths must be unique and in ascending order');
  if (format !== 'webp')
    fail(`format must be "webp" (got "${String(format)}")`);
  if (!isPositiveInt(maxQuality) || maxQuality > 100)
    fail(
      `maxQuality must be an integer from 1 to 100 (got ${String(maxQuality)})`
    );
  if (!isPositiveInt(quality) || quality > maxQuality)
    fail(
      `quality must be an integer from 1 to maxQuality (${maxQuality}), got ${String(quality)}`
    );
  return { widths: [...widths], format, quality, maxQuality };
};
