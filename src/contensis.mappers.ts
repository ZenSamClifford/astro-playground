import type { Block } from '@contensis/canvas-html';
import { defineMapping } from '@contensis/content-resolver';
import {
  getDisplayDimensions,
  type ImageFieldValue,
  type MappedImage,
} from './lib/contensisImage';

// The asset uri already carries the field's crop transformations
const mapImage = (
  field: ImageFieldValue | null | undefined
): MappedImage | null => {
  const src = field?.asset?.sys?.uri;
  if (!src) return null;
  const dimensions = getDisplayDimensions(field, message => {
    if (import.meta.env.DEV) console.warn(message);
  });
  return {
    src,
    alt: field?.altText ?? '',
    width: dimensions?.width,
    height: dimensions?.height,
  };
};

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
    image: MappedImage | null;
    canvas: Block[];
    categories: string[];
  },
  {
    title: string;
    image: ImageFieldValue | null;
    canvas: Block[];
    categories?: string[];
  }
>({
  component: () => import('./components/ContentArticle/ContentArticle.astro'),
  mapper: entry => {
    return {
      mappedTitle: entry.title,
      image: mapImage(entry.image),
      canvas: entry.canvas,
      categories: entry.categories ?? [],
    };
  },
});

export const form = defineMapping<
  {
    mappedTitle: string;
    description: string | null;
    image: MappedImage | null;
    categories: string[];
    formId: string | null;
  },
  {
    title: string;
    description?: string;
    image: ImageFieldValue | null;
    categories?: string[];
    form?: { id?: string; sys?: { id?: string } } | null;
  }
>({
  component: () => import('./components/FormPage/FormPage.astro'),
  mapper: entry => {
    return {
      mappedTitle: entry.title,
      description: entry.description ?? null,
      image: mapImage(entry.image),
      categories: entry.categories ?? [],
      // A content type picker value: the id of the form content type
      formId: entry.form?.sys?.id ?? entry.form?.id ?? null,
    };
  },
});

export type LandingComposerItem =
  | { type: 'text'; value: Block[] }
  | { type: 'quote'; value: { text: string; source: string } };

export const landing = defineMapping<
  {
    mappedTitle: string;
    image: MappedImage | null;
    composer: LandingComposerItem[];
  },
  {
    title: string;
    image: ImageFieldValue | null;
    composer: LandingComposerItem[] | null;
  }
>({
  component: () => import('./components/LandingPage/LandingPage.astro'),
  mapper: entry => {
    return {
      mappedTitle: entry.title,
      image: mapImage(entry.image),
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
