import { contentTypes } from '~/search.config';

export const allTypes = 'all';

export type SearchType = (typeof contentTypes)[number]['id'] | typeof allTypes;

export const toSearchType = (value: string | null): SearchType =>
  contentTypes.some(type => type.id === value)
    ? (value as SearchType)
    : allTypes;

export const searchTypeLabel = (contentTypeId: string) =>
  contentTypes.find(type => type.id === contentTypeId)?.label ?? contentTypeId;
