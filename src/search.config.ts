/**
 * Settings for the search page (components/SearchPage). Imported by the
 * hydrated filter as well, so keep it to values that are safe in the browser.
 */
export const searchConfig = {
  // Results per page
  pageSize: 10,

  // Longer terms are cut to this length
  termMaxLength: 100,

  // Fields the term is matched against with freeText. Each one must exist on
  // every content type in searchTypes.
  searchFields: ['title', 'description'],

  // Fields returned for each result. SearchResults renders entryTitle and
  // description, and needs the sys fields for its key, link and badge.
  resultFields: [
    'entryTitle',
    'description',
    'sys.id',
    'sys.uri',
    'sys.contentTypeId',
  ],

  // The content types the filter offers, in display order. Hard-coded because
  // the `search` content type has no field for editors to choose them.
  searchTypes: [
    { id: 'content', label: 'Content' },
    { id: 'blog', label: 'Blog' },
  ],
} as const;
