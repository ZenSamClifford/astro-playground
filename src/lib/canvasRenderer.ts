import { createRenderer, image } from '@contensis/canvas-html';
import {
  buildVariantUrl,
  clampWidth,
  getDisplayDimensions,
  type ImageFieldValue,
  isSvg,
  srcSetEntries,
} from './contensisImage.ts';
import {
  type ImageOptions,
  resolveImageOptions,
} from './contensisImageOptions.ts';

export interface CanvasRendererOptions {
  /**
   * The `sizes` attribute for every canvas image. The default assumes nothing about the
   * layout: full width on narrow screens, half width from 768px up.
   */
  sizes?: string;
  /** Overrides over the image defaults; pass `imageConfig.service.config` from Astro. */
  imageOptions?: Partial<ImageOptions>;
  /** Dev only: warn when an image has no known dimensions. */
  isDev?: boolean;
  onWarn?: (message: string) => void;
}

// Only quotes are escaped by the package's attribute writer, so & < > are handled here.
const escapeAttr = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Width of the plain `src` fallback, used by browsers without srcset support.
const FALLBACK_WIDTH = 768;

/**
 * A canvas renderer whose images use the same Contensis Image API variants as the Hero:
 * WebP `srcset` over the fixed widths, w/h/crop kept. Everything else is the
 * stock @contensis/canvas-html output. SVG, and images with no uri, are not transformed.
 * Width and height are only emitted when the displayed size is known (crop, w/h, or
 * sys.properties at linkDepth 1); a bare image at linkDepth 0 has none and can shift layout.
 */
export const createCanvasRenderer = (options: CanvasRendererOptions = {}) => {
  const {
    sizes = '(min-width: 768px) 50vw, 100vw',
    isDev = false,
    onWarn,
  } = options;
  const o = resolveImageOptions(options.imageOptions);
  const context = {
    isDev,
    logger: { warn: (message: string) => onWarn?.(message) },
    options: o,
  };

  return createRenderer({
    blocks: {
      _image: props => {
        const value = props.block?.value;
        const uri = value?.asset?.sys?.uri;
        if (!uri) {
          if (isDev)
            onWarn?.(
              `[canvasRenderer] image block ${props.block?.id} has no asset uri; skipped`
            );
          return '';
        }

        const caption = value?.caption;
        const alt = escapeAttr(value?.altText ?? '');
        // The caption is rendered as a figcaption, so the stock `title` duplicate is dropped.
        let img: string;
        if (isSvg(uri)) {
          img = image({
            ...props,
            src: escapeAttr(uri),
            alt,
            title: undefined,
          });
        } else {
          const dims = getDisplayDimensions(
            value as ImageFieldValue,
            isDev ? onWarn : undefined
          );
          const url = (width: number) =>
            escapeAttr(buildVariantUrl(uri, { width }, context));
          img = image({
            ...props,
            src: url(clampWidth(FALLBACK_WIDTH, dims?.width, o)),
            alt,
            title: undefined,
            srcset: srcSetEntries(dims?.width, o)
              .map(e => `${url(e.width)} ${e.descriptor}`)
              .join(', '),
            sizes: escapeAttr(sizes),
            width: dims?.width,
            height: dims?.height,
            // Lazy only with a reserved box: a lazy image without width and height
            // pushes content down when it loads (measured CLS 0.2355 vs 0), so those stay
            // eager (the browser default).
            loading: dims ? 'lazy' : undefined,
            decoding: 'async',
          });
        }
        return caption
          ? props.h(
              'figure',
              {},
              img,
              props.h('figcaption', {}, props.hText(caption))
            )
          : img;
      },
    },
  });
};
