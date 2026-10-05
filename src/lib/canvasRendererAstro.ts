import { imageConfig } from 'astro:assets';
import { createCanvasRenderer } from './canvasRenderer.ts';
import type { ImageSizesPreset } from './imageSizes.ts';

/**
 * The canvas renderer wired to Astro: image options come from `image.service.config` in
 * astro.config.mjs, and dev warnings go to the console. Kept apart from canvasRenderer.ts
 * so that file has no `astro:` imports and node tests can load it. Pass `sizes` (a preset name from
 * imageSizes.ts or a raw string) to match the layout the canvas is rendered in.
 */
export const createAstroCanvasRenderer = (
  options: { sizes?: ImageSizesPreset | (string & {}) } = {}
) =>
  createCanvasRenderer({
    ...options,
    imageOptions: imageConfig.service.config,
    isDev: import.meta.env.DEV,
    onWarn: message => console.warn(message),
  });
