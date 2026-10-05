import { type ImageOptions, imageOptions } from './contensisImageOptions.ts';

interface Crop {
  w: number;
  h: number;
  x: number;
  y: number;
}

interface ParsedImageUri {
  path: string;
  w?: number;
  h?: number;
  crop?: Crop;
  /** The crop value exactly as stored (decoded), re-emitted verbatim by buildVariantUrl. */
  cropRaw?: string;
  /**
   * Params we do not understand, kept (sorted by key) so they survive a rebuild. This
   * includes w, h or crop values that failed to parse: they are carried through rather
   * than silently dropped, so the URL still says what the editor stored.
   */
  extra: [string, string][];
}

interface VariantOptions {
  width: number;
  format?: string;
  quality?: number;
}

interface Logger {
  warn: (message: string) => void;
}

interface ValidationContext {
  isDev: boolean;
  logger?: Logger;
  options?: ImageOptions;
}

const toInt = (value: string | null | undefined): number | undefined => {
  if (value === null || value === undefined || !/^\d+$/.test(value.trim())) {
    return undefined;
  }
  const n = Number(value);
  return n > 0 ? n : undefined;
};

const parseCrop = (value: string): Crop | undefined => {
  const parts = value.split(',').map(p => p.trim());
  if (parts.length < 2 || parts.length > 4) return undefined;
  const nums = parts.map(p => (/^\d+$/.test(p) ? Number(p) : Number.NaN));
  if (nums.some(Number.isNaN)) return undefined;
  const [w, h, x = 0, y = 0] = nums;
  if (w <= 0 || h <= 0) return undefined;
  return { w, h, x, y };
};

const safeDecode = (value: string): string => {
  try {
    return decodeURIComponent(value);
  } catch {
    // Malformed percent escape: keep the raw text. Parsing must never throw, or one bad
    // stored uri would fail the whole page render in the mapper.
    return value;
  }
};

/**
 * Parse a Contensis sys.uri (e.g. `/image-library/a.jpeg?w=1920&h=1235&crop=1920,800,0,218`).
 * Never throws. A w, h or crop value that does not parse (decimals, negatives, wrong
 * number of crop parts) is kept as a raw extra param, so the built URL still carries it
 * and the API decides what to do with it, instead of it vanishing.
 */
export const parseImageUri = (uri: string): ParsedImageUri => {
  const noHash = uri.split('#')[0];
  const qIndex = noHash.indexOf('?');
  const path = qIndex === -1 ? noHash : noHash.slice(0, qIndex);
  const query = qIndex === -1 ? '' : noHash.slice(qIndex + 1);
  const parsed: ParsedImageUri = { path, extra: [] };
  if (!query) return parsed;

  // Parsed by hand rather than URLSearchParams so crop commas are never re-encoded
  // and a later duplicate simply wins (we never rely on API duplicate precedence).
  for (const pair of query.split('&')) {
    if (!pair) continue;
    const eq = pair.indexOf('=');
    const key = eq === -1 ? pair : pair.slice(0, eq);
    const value = eq === -1 ? '' : pair.slice(eq + 1);
    if (key === 'w' || key === 'h') {
      const n = toInt(value);
      if (n === undefined) parsed.extra.push([key, value]);
      else parsed[key] = n;
    } else if (key === 'crop') {
      const raw = safeDecode(value);
      const crop = parseCrop(raw);
      if (crop) {
        parsed.crop = crop;
        parsed.cropRaw = raw;
      } else parsed.extra.push([key, value]);
    }
    // Parameters we always set ourselves are dropped from the carried-over set.
    else if (key === 'width' || key === 'format' || key === 'quality') continue;
    else parsed.extra.push([key, value]);
  }
  parsed.extra.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return parsed;
};

/** True for SVG assets, by extension (the API ignores w/h/crop for them). */
export const isSvg = (uriOrPath: string | null | undefined): boolean => {
  if (!uriOrPath) return false;
  const path = uriOrPath.split(/[?#]/)[0];
  return path.toLowerCase().endsWith('.svg');
};

/**
 * Nearest allowed width at or above the request. When the original width is known the
 * result is capped at the smallest allowed width >= the original (the API never
 * upscales, so that variant is just the original file), or the largest allowed width
 * if the original is bigger than every one. Never returns a width outside the set.
 */
export const clampWidth = (
  requested: number,
  originalWidth?: number,
  options: ImageOptions = imageOptions
): number => {
  const sorted = [...options.widths].sort((a, b) => a - b);
  const largest = sorted[sorted.length - 1];
  const snapped = sorted.find(w => w >= requested) ?? largest;
  if (originalWidth === undefined || !(originalWidth > 0)) return snapped;
  const cap = sorted.find(w => w >= originalWidth) ?? largest;
  return Math.min(snapped, cap);
};

type ValidationResult =
  | { ok: true; width: number; format: string; quality: number }
  | { ok: false; reason: string };

/** Allow-list check only; no throwing or logging. */
export const validateVariantOptions = (
  input: VariantOptions,
  options: ImageOptions = imageOptions
): ValidationResult => {
  const format = input.format ?? options.format;
  const quality = input.quality ?? options.quality;
  if (format !== options.format) {
    return {
      ok: false,
      reason: `Unsupported image format "${format}" (allowed: ${options.format})`,
    };
  }
  if (!Number.isInteger(input.width) || !options.widths.includes(input.width)) {
    return {
      ok: false,
      reason: `Unsupported image width "${input.width}" (allowed: ${options.widths.join(', ')})`,
    };
  }
  if (
    !Number.isInteger(quality) ||
    quality < 1 ||
    quality > options.maxQuality
  ) {
    return {
      ok: false,
      reason: `Unsupported image quality "${quality}" (allowed: 1 to ${options.maxQuality})`,
    };
  }
  return { ok: true, width: input.width, format, quality };
};

/**
 * Build a Contensis Image API variant URL. The stored w, h and crop are kept unchanged and
 * `width`, `format` and `quality` are appended.
 *
 * Why w/h must stay: with w, h and crop together the API first resizes the image to
 * w x h and then takes the crop in that resized space. A bare crop is instead applied to
 * the full-size original in native pixels. Dropping w/h would therefore serve a different
 * region (the wrong part of the picture). `width` is applied last, scales proportionally,
 * never upscales, and overrides w (h scaled) when there is no crop.
 *
 * Parameter order is fixed (w, h, crop, other params sorted by key, width, format,
 * quality) so one logical variant always gives one query string. Invalid options throw in
 * dev; in production they warn and return the original uri.
 */
export const buildVariantUrl = (
  uri: string,
  variant: VariantOptions,
  context: ValidationContext
): string => {
  const validated = validateVariantOptions(variant, context.options);
  if (!validated.ok) {
    const message = `[contensisImage] ${validated.reason} for ${uri}`;
    if (context.isDev) throw new Error(message);
    (context.logger ?? console).warn(`${message}; using original uri`);
    return uri;
  }
  const { path, w, h, cropRaw, extra } = parseImageUri(uri);
  const params: string[] = [];
  if (w) params.push(`w=${w}`);
  if (h) params.push(`h=${h}`);
  if (cropRaw) params.push(`crop=${cropRaw}`);
  for (const [key, value] of extra)
    params.push(value === '' ? key : `${key}=${value}`);
  params.push(
    `width=${validated.width}`,
    `format=${validated.format}`,
    `quality=${validated.quality}`
  );
  return `${path}?${params.join('&')}`;
};

/**
 * The variants of a srcset: one per distinct allowed width, ascending. `width` is the
 * width the URL asks the API for. With a known displayed width, widths above it fold into
 * the smallest allowed width that covers it, and the descriptor is the real size (the API
 * never upscales), so a 450px image on the 480 URL is described as `450w`. Without one the
 * fixed set is used as is. Shared by the image service and the canvas renderer.
 */
export const srcSetEntries = (
  displayedWidth: number | undefined,
  options: ImageOptions = imageOptions,
  widths: readonly number[] = options.widths
): { width: number; descriptor: string }[] =>
  [...new Set(widths.map(w => clampWidth(w, displayedWidth, options)))]
    .sort((a, b) => a - b)
    .map(width => ({
      width,
      descriptor: `${displayedWidth !== undefined && displayedWidth < width ? displayedWidth : width}w`,
    }));

interface Dimensions {
  width: number;
  height: number;
}

export interface ImageFieldValue {
  altText?: string | null;
  caption?: string | null;
  asset?: {
    sys?: {
      uri?: string | null;
      properties?: { width?: number | null; height?: number | null } | null;
    } | null;
  } | null;
  /**
   * The API's string form, e.g. "w=450&h=300" or "crop=400,300,100,50". Only used when
   * the uri carries neither a crop nor a size.
   */
  transformations?: string | null;
}

// String form as returned by the API, e.g. "w=450&h=300" or "w=1200&h=600&crop=600,600,0,0":
// the same query syntax as a uri, so reuse its parser.
const dimsFromTransformations = (
  transformations: string | null | undefined
): { crop?: Dimensions; size?: Dimensions } => {
  if (!transformations) return {};
  const { w, h, crop } = parseImageUri(
    `?${transformations.replace(/^\?/, '')}`
  );
  return {
    crop: crop ? { width: crop.w, height: crop.h } : undefined,
    size: w && h ? { width: w, height: h } : undefined,
  };
};

/**
 * Displayed size of an image field, via the plan's fallback order:
 * 1 crop, 2 w/h, 3 asset.sys.properties (original file, only when no crop/size),
 * 4 undefined (caller uses a CSS aspect-ratio default).
 * `onWarn` fires (callers gate it to dev) whenever the size cannot be resolved, except for SVG.
 */
export const getDisplayDimensions = (
  field: ImageFieldValue | null | undefined,
  onWarn?: (message: string) => void
): Dimensions | undefined => {
  const sys = field?.asset?.sys;
  const uri = sys?.uri;
  if (!uri) return undefined;

  const parsed = parseImageUri(uri);
  if (parsed.crop) return { width: parsed.crop.w, height: parsed.crop.h };
  if (parsed.w && parsed.h) return { width: parsed.w, height: parsed.h };

  const fromTransforms = dimsFromTransformations(field?.transformations);
  if (fromTransforms.crop) return fromTransforms.crop;
  if (fromTransforms.size) return fromTransforms.size;

  const pw = sys?.properties?.width;
  const ph = sys?.properties?.height;
  if (pw && ph) {
    // A lone w or h keeps the original ratio. Both cannot be set here (handled above).
    if (parsed.w)
      return { width: parsed.w, height: Math.round((parsed.w * ph) / pw) };
    if (parsed.h)
      return { width: Math.round((parsed.h * pw) / ph), height: parsed.h };
    return { width: pw, height: ph };
  }

  // An SVG has no pixel size, so undefined is expected and silent.
  if (!isSvg(uri)) {
    onWarn?.(
      sys?.properties
        ? `[contensisImage] ${uri} has no crop or size and its sys.properties have no usable width and height; dimensions unavailable`
        : `[contensisImage] ${uri} has no crop or size and the asset is only a link (no sys.properties); dimensions unavailable`
    );
  }
  return undefined;
};

export interface MappedImage {
  src: string;
  alt: string;
  /** Displayed size (crop, then w/h, then original); undefined when unknown. */
  width?: number;
  height?: number;
}
