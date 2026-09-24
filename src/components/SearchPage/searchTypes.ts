import { searchConfig } from '~/search.config';

const { searchTypes } = searchConfig;

export const allTypes = 'all';

export type SearchType = (typeof searchTypes)[number]['id'] | typeof allTypes;

export const toSearchType = (value: string | null): SearchType =>
  searchTypes.some(type => type.id === value)
    ? (value as SearchType)
    : allTypes;

export const searchTypeLabel = (contentTypeId: string) =>
  searchTypes.find(type => type.id === contentTypeId)?.label ?? contentTypeId;
