/**
 * Settings for delivery queries built on the resolver (see lib/searchQueries).
 * Imported by the hydrated search filter as well, so keep it to plain values
 * that are safe in the browser.
 *
 * Each query is a named block with the same vocabulary: the content types it
 * covers, the fields it returns and its page size. To add a small query, add a
 * block under `listings` and a function in lib/searchQueries that reads it.
 */

// Content types that can appear in search and listings, in display order.
// Hard-coded because the `search` content type has no field for editors to
// choose them. Their labels are translated in i18n/ui.ts (see searchTypes.ts).
export const contentTypes = [{ id: 'content' }, { id: 'blog' }] as const;

// Reusable field sets. Every result needs the sys fields for its key and link.
const fields = {
  link: ['entryTitle', 'sys.id', 'sys.uri'],
  summary: [
    'entryTitle',
    'description',
    'sys.id',
    'sys.uri',
    'sys.contentTypeId',
  ],
} as const;

// Search page (components/SearchPage)
export const search = {
  contentTypes: contentTypes.map(type => type.id),
  fields: fields.summary,
  pageSize: 10,
  // Longer terms are cut to this length
  termMaxLength: 100,
  // Matched against the term with freeText. Each must exist on every content
  // type above.
  termFields: ['title', 'description'],
} as const;

// Small queries rendered on other templates
export const listings = {
  // Aside on the content template: entries sharing a category
  related: {
    contentTypes: ['content'],
    fields: fields.link,
    pageSize: 3,
    // String array field matched against the current entry's values
    matchField: 'categories',
  },
} as const;
