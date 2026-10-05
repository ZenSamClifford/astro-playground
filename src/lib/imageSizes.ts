// Named `sizes` presets, each mirroring a real layout. Change a preset together with the
// layout classes it names.
//
// hero: the Hero sits in `main.p-8` (2rem each side) and `div.max-w-5xl` (64rem = 1024px),
//   so it is 100vw - 4rem until the viewport reaches 1024px + 4rem = 1088px, then 1024px.
// article: ContentArticle and LandingPage render canvas in `main.p-8` around a column of
//   `max-w-[37em]` on a `.typeset-article` element, whose font-size is 18px below 768px
//   (--typeset-size 16px x 1.125) and 16px from 768px. So the column is at most 666px
//   below 768px (reached at a 730px viewport, 730 - 64 = 666) and 592px from 768px (the
//   lg grid track is also 37em of 16px = 592px).
// page: ContentPage has `main` with 2em (32px) padding and no maximum width.
const presets = {
  hero: '(min-width: 1088px) 1024px, calc(100vw - 4rem)',
  article:
    '(min-width: 768px) 592px, (min-width: 730px) 666px, calc(100vw - 4rem)',
  page: 'calc(100vw - 4rem)',
} as const;

export type ImageSizesPreset = keyof typeof presets;

/** Assumes nothing about the layout: full width on narrow screens, half from 768px up. */
export const DEFAULT_SIZES = '(min-width: 768px) 50vw, 100vw';

/** A preset name resolves to its value; any other string is used as is. */
export const resolveSizes = (
  sizes?: ImageSizesPreset | (string & {})
): string =>
  sizes === undefined
    ? DEFAULT_SIZES
    : ((presets as Record<string, string>)[sizes] ?? sizes);
