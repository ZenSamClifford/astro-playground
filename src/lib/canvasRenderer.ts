import { createRenderer, image } from '@contensis/canvas-html';
import {
  getDisplayDimensions,
  type ImageFieldValue,
  isSvg,
} from './contensisImage.ts';
import {
  type ImageOptions,
  resolveImageOptions,
} from './contensisImageOptions.ts';
import { buildImageAttributes } from './imageAttributes.ts';
import { type ImageSizesPreset, resolveSizes } from './imageSizes.ts';

export interface CanvasRendererOptions {
  /**
   * The `sizes` attribute for every canvas image. The default assumes nothing about the
   * layout: full width on narrow screens, half width from 768px up. A preset name from
   * imageSizes.ts or a raw sizes string.
   */
  sizes?: ImageSizesPreset | (string & {});
  /** Overrides over the image defaults; pass `imageConfig.service.config` from Astro. */
  imageOptions?: Partial<ImageOptions>;
  /** Dev only: warn when an image has no known dimensions. */
  isDev?: boolean;
  onWarn?: (message: string) => void;
}

// Only quotes are escaped by the package's attribute writer, so & < > are handled here.
const escapeAttr = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * A canvas renderer whose images use the same Contensis Image API variants as the Hero:
 * the shared rules in imageAttributes.ts. Everything else is the stock
 * @contensis/canvas-html output. SVG, and images with no uri, are not transformed.
 * Width and height are only emitted when the displayed size is known (crop, w/h, or
 * sys.properties at linkDepth 1); a bare image at linkDepth 0 has none and can shift layout.
 */
export const createCanvasRenderer = (options: CanvasRendererOptions = {}) => {
  const { isDev = false, onWarn } = options;
  const sizes = resolveSizes(options.sizes);
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
          const a = buildImageAttributes(
            { src: uri, alt: value?.altText, ...dims, sizes },
            context
          );
          img = image({
            ...props,
            src: escapeAttr(a.src),
            alt: escapeAttr(a.alt),
            title: undefined,
            srcset: escapeAttr(a.srcset ?? ''),
            sizes: escapeAttr(a.sizes ?? ''),
            width: a.width,
            height: a.height,
            loading: a.loading,
            decoding: a.decoding,
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
