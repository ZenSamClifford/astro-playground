import { imageConfig } from 'astro:assets';
import { createCanvasRenderer } from './canvasRenderer.ts';

/**
 * The canvas renderer wired to Astro: image options come from `image.service.config` in
 * astro.config.mjs, and dev warnings go to the console. Kept apart from canvasRenderer.ts
 * so that file has no `astro:` imports and node tests can load it. Pass `sizes` to match
 * the layout the canvas is rendered in.
 */
export const createAstroCanvasRenderer = (options: { sizes?: string } = {}) =>
  createCanvasRenderer({
    ...options,
    imageOptions: imageConfig.service.config,
    isDev: import.meta.env.DEV,
    onWarn: message => console.warn(message),
  });
