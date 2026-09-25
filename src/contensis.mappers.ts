import type { Block } from '@contensis/canvas-html';
import { defineMapping } from '@contensis/content-resolver';

export const contentPageAstro = defineMapping<
  { mappedTitle: string; canvas: Block[] },
  { title: string; myContentField: boolean; canvas: Block[] }
>({
  component: () => import('./components/ContentPage/ContentPage.astro'),
  mapper: entry => {
    return {
      mappedTitle: `Mapped ${entry.sys.contentTypeId}: ${entry.entryTitle}`,
      canvas: entry.canvas,
    };
  },
});

export const contentPageReact = defineMapping<
  { mappedTitle: string },
  { title: string; myContentField: boolean }
>({
  component: () => import('./components/ContentPage/ContentPage.tsx'),
  mapper: entry => {
    return {
      mappedTitle: `Mapped ${entry.sys.contentTypeId}: ${entry.entryTitle}`,
    };
  },
});

export const pageHome = defineMapping<
  { mappedTitle: string; entryId: string; contentTypeId: string },
  { title: string }
>({
  component: () => import('./components/PageHome/PageHome.astro'),
  mapper: entry => {
    return {
      mappedTitle: entry.title,
      entryId: entry.sys.id,
      contentTypeId: entry.sys.contentTypeId,
    };
  },
});

export const homePage = defineMapping<
  { mappedTitle: string },
  { title: string; myHomeField: boolean }
>({
  component: () => import('./components/Welcome.astro'),
  mapper: entry => {
    // entry is typed as { title: string; myHomeField: boolean } & StrictEntry
    return {
      mappedTitle: `Mapped ${entry.sys.contentTypeId}: ${entry.title}`,
    };
  },
});

export const blog = defineMapping<
  { mappedTitle: string; entryId: string; contentTypeId: string },
  { title: string }
>({
  component: () => import('./components/PageHome/PageHome.astro'),
  mapper: entry => {
    return {
      mappedTitle: entry.title,
      entryId: entry.sys.id,
      contentTypeId: entry.sys.contentTypeId,
    };
  },
});

export const content = defineMapping<
  {
    mappedTitle: string;
    image: { src: string; alt: string } | null;
    canvas: Block[];
  },
  {
    title: string;
    image: { altText?: string; asset?: { sys: { uri?: string } } } | null;
    canvas: Block[];
  }
>({
  component: () => import('./components/ContentArticle/ContentArticle.astro'),
  mapper: entry => {
    // The asset uri already carries the field's crop transformations
    const imageUri = entry.image?.asset?.sys.uri;
    return {
      mappedTitle: entry.title,
      image: imageUri
        ? { src: imageUri, alt: entry.image?.altText ?? '' }
        : null,
      canvas: entry.canvas,
    };
  },
});

export type LandingComposerItem =
  | { type: 'text'; value: Block[] }
  | { type: 'quote'; value: { text: string; source: string } };

export const landing = defineMapping<
  {
    mappedTitle: string;
    image: { src: string; alt: string } | null;
    composer: LandingComposerItem[];
  },
  {
    title: string;
    image: { altText?: string; asset?: { sys: { uri?: string } } } | null;
    composer: LandingComposerItem[] | null;
  }
>({
  component: () => import('./components/LandingPage/LandingPage.astro'),
  mapper: entry => {
    // The asset uri already carries the field's crop transformations
    const imageUri = entry.image?.asset?.sys.uri;
    return {
      mappedTitle: entry.title,
      image: imageUri
        ? { src: imageUri, alt: entry.image?.altText ?? '' }
        : null,
      composer: entry.composer ?? [],
    };
  },
});

export const search = defineMapping<{ mappedTitle: string }, { title: string }>(
  {
    component: () => import('./components/SearchPage/SearchPage.astro'),
    mapper: entry => ({ mappedTitle: entry.title }),
  }
);
