import type { Translate, UiKey } from '~/i18n/ui';
import { contentTypes } from '~/search.config';

export const allTypes = 'all';

export type SearchType = (typeof contentTypes)[number]['id'] | typeof allTypes;

export const toSearchType = (value: string | null): SearchType =>
  contentTypes.some(type => type.id === value)
    ? (value as SearchType)
    : allTypes;

// Translation key for each content type's label (see i18n/ui.ts)
const typeLabelKey: Record<string, UiKey> = {
  content: 'typeContent',
  blog: 'typeBlog',
};

/** The translated label for a content type, or its id when it has none */
export const typeLabel = (t: Translate, contentTypeId: string) =>
  typeLabelKey[contentTypeId] ? t(typeLabelKey[contentTypeId]) : contentTypeId;
